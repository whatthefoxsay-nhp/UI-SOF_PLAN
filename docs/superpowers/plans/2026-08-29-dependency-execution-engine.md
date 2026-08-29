# Dependency & Execution Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Stage/Task dependency DAG (ALL/ANY join) with a computed READY/BLOCKED execution state, replacing the current strictly-sequential `order_no` stage advance, so stages and tasks can run in parallel and be gated correctly — plus realistic seed data to exercise it.

**Architecture:** Two new template-level dependency tables (`wf_stage_dependency`, `wf_task_template_dependency`) configured once in the Workflow Designer, cloned into two instance-level tables (`wf_project_stage_dependency`, `wf_project_task_dependency`) at project creation. A synchronous recompute function runs at the existing single choke point (`wf_apply_task_status`) and at stage-advance time, flipping a new `execution_state` column between `READY`/`BLOCKED`. No new infrastructure (no queue/worker) — this stack is request/response only everywhere else.

**Tech Stack:** PHP 8.3 + mysqli (workflow-api, no framework), MySQL 8, React 18 + antd (frontend), no automated test suite anywhere in this stack (manual verification via `npm start` + standalone PHP test harnesses stubbing the DB layer, same pattern used in the prior Kế hoạch-sync feature).

**Spec:** `docs/superpowers/specs/2026-08-29-dependency-execution-engine-design.md`

## Global Constraints

- **No version control on either PHP backend folder** (`c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/` and `.../services.sof.vn/`) — every edit there is live and unrecoverable via git. Read the full target function before editing it. Write a standalone PHP test harness (stub `wf_query`/`wf_execute`/etc., `require` the real edited file) before considering a backend task done, same technique used throughout the prior sync feature.
- Only `dependency_type = 'FS'` (Finish-to-Start) is evaluated this phase. The column exists on every dependency table for future extensibility; do not implement SS/FF/SF logic.
- `dependency_join_type` lives on the **dependent** node (`wf_stage.dependency_join_type`, `wf_task_template.dependency_join_type`, and their instance-table mirrors), not per-edge. Values are the literal strings `'ALL'` or `'ANY'`, validated in application code (this schema's existing convention — no SQL ENUM).
- "Done" for dependency-satisfaction purposes is: task → its current Kanban column has `is_done_status=1` in the project's column snapshot; stage → `wf_project_stage.status='DONE'`. Do not invent a second "done" concept.
- `wf_project.current_stage_id` becomes display-only (see spec §3.3) — do not add new code that treats it as a gate.
- Every new/modified PHP function needs a `php -l` syntax check before being considered done (`"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" -l <file>` from Git Bash, or the equivalent path found via `Get-ChildItem C:\laragon\bin\php`).
- MySQL connection for any standalone script/test harness: `mysqli_connect('localhost', 'root', '')` then `mysqli_select_db($link, 'hao_erp_sofv5_0')` — this bypasses the session-based `checksc.php` flow, which is appropriate for CLI scripts (confirmed working in this session).
- Laragon must be running (MySQL + Apache) for any live verification — check with `Get-Process | Where-Object {$_.ProcessName -match "mysqld|httpd"}` before assuming a live call will work; start via `Start-Process "C:\laragon\laragon.exe"` if not running and wait ~10s for auto-start.
- **Task order matters and is not arbitrary**: Task 3 (recompute engine) must land before Task 4 (project creation), because Task 4's project-creation flow calls the recompute functions Task 3 defines. Do not reorder.

---

### Task 1: DB schema migration + current_stage_id usage check

**Files:**
- Create: `docs/superpowers/plans/sql/2026-08-29-dependency-execution-engine.sql`
- Read only (verification): `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/ProjectDetail.jsx`

**Interfaces:**
- Produces: 4 new tables (`wf_stage_dependency`, `wf_task_template_dependency`, `wf_project_stage_dependency`, `wf_project_task_dependency`) and 6 new columns (`wf_stage.dependency_join_type`, `wf_task_template.dependency_join_type`, `wf_project_stage.dependency_join_type`, `wf_project_stage.execution_state`, `wf_project_task.dependency_join_type`, `wf_project_task.execution_state`) that every later task in this plan reads/writes.

- [ ] **Step 1: Write the migration SQL file**

```sql
-- Dependency & Execution Engine schema (audit Phase 1)
-- Apply against database hao_erp_sofv5_0 (both workflow-api and legacy
-- backend share this one DB per logged-in session).

ALTER TABLE wf_stage ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER completion_condition;
ALTER TABLE wf_task_template ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER default_priority;
ALTER TABLE wf_project_stage ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER completion_condition;
ALTER TABLE wf_project_stage ADD COLUMN execution_state VARCHAR(10) NOT NULL DEFAULT 'READY' AFTER status;
ALTER TABLE wf_project_task ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER priority;
ALTER TABLE wf_project_task ADD COLUMN execution_state VARCHAR(10) NOT NULL DEFAULT 'READY' AFTER status;

CREATE TABLE wf_stage_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  stage_id INT NOT NULL,
  depends_on_stage_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_stage_dep (stage_id, depends_on_stage_id),
  KEY idx_wf_stage_dep_stage (stage_id),
  KEY idx_wf_stage_dep_depends_on (depends_on_stage_id),
  CONSTRAINT fk_wf_stage_dep_stage FOREIGN KEY (stage_id) REFERENCES wf_stage(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_stage_dep_depends_on FOREIGN KEY (depends_on_stage_id) REFERENCES wf_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wf_task_template_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  task_template_id INT NOT NULL,
  depends_on_task_template_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_task_tpl_dep (task_template_id, depends_on_task_template_id),
  KEY idx_wf_task_tpl_dep_task (task_template_id),
  KEY idx_wf_task_tpl_dep_depends_on (depends_on_task_template_id),
  CONSTRAINT fk_wf_task_tpl_dep_task FOREIGN KEY (task_template_id) REFERENCES wf_task_template(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_task_tpl_dep_depends_on FOREIGN KEY (depends_on_task_template_id) REFERENCES wf_task_template(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wf_project_stage_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  project_id INT NOT NULL,
  stage_id INT NOT NULL,
  depends_on_stage_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_pstage_dep (stage_id, depends_on_stage_id),
  KEY idx_wf_pstage_dep_project (project_id),
  KEY idx_wf_pstage_dep_stage (stage_id),
  KEY idx_wf_pstage_dep_depends_on (depends_on_stage_id),
  CONSTRAINT fk_wf_pstage_dep_project FOREIGN KEY (project_id) REFERENCES wf_project(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_pstage_dep_stage FOREIGN KEY (stage_id) REFERENCES wf_project_stage(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_pstage_dep_depends_on FOREIGN KEY (depends_on_stage_id) REFERENCES wf_project_stage(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wf_project_task_dependency (
  id INT NOT NULL AUTO_INCREMENT,
  project_id INT NOT NULL,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wf_ptask_dep (task_id, depends_on_task_id),
  KEY idx_wf_ptask_dep_project (project_id),
  KEY idx_wf_ptask_dep_task (task_id),
  KEY idx_wf_ptask_dep_depends_on (depends_on_task_id),
  CONSTRAINT fk_wf_ptask_dep_project FOREIGN KEY (project_id) REFERENCES wf_project(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_ptask_dep_task FOREIGN KEY (task_id) REFERENCES wf_project_task(id) ON DELETE CASCADE,
  CONSTRAINT fk_wf_ptask_dep_depends_on FOREIGN KEY (depends_on_task_id) REFERENCES wf_project_task(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

- [ ] **Step 2: Apply the migration**

Run each statement against `hao_erp_sofv5_0` (a standalone PHP script using `mysqli_connect('localhost','root','')` + `mysqli_select_db($link,'hao_erp_sofv5_0')` + `mysqli_multi_query`, or any MySQL client available). Confirm Laragon's MySQL is running first.

- [ ] **Step 3: Verify the migration**

Run `SHOW CREATE TABLE wf_stage_dependency;` (and the other 3 new tables) and `DESCRIBE wf_project_task;` (confirm `execution_state` and `dependency_join_type` present) against `hao_erp_sofv5_0`. All existing rows in `wf_project_task`/`wf_project_stage` must show `execution_state='READY'` (the column default) — confirm with `SELECT execution_state, COUNT(*) FROM wf_project_task GROUP BY execution_state;` (expect one row, all READY, since no dependency rows exist yet).

- [ ] **Step 4: Check `current_stage_id` usage in ProjectDetail.jsx**

Read `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/ProjectDetail.jsx` in full and grep it for `current_stage_id`. Report in your task report whether it's read anywhere and, if so, exactly what it's used for (e.g. default-selected stage tab). This is a read-only check — do not modify the file in this task. If it IS used as a gate (not just a display default), flag this prominently as a concern for a later UI task's implementer to account for, since spec §3.3 assumes it is display-only.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/sql/2026-08-29-dependency-execution-engine.sql
git commit -m "Add DB migration for Dependency & Execution Engine schema"
```
(The schema itself lives in the non-git MySQL server, not in git — this commits only the migration script for reference, matching how the prior sync feature's SQL file was tracked.)

---

### Task 2: Workflow Designer backend — dependency CRUD, cycle detection, clone

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/db.php`
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php`

**Interfaces:**
- Consumes: the 4 new tables from Task 1.
- Produces: `wf_would_create_cycle($edges, $nodeId, $newDependsOnId)` (db.php, generic — reusable by any dependency graph in this codebase); `wf_load_workflow_full()` now returns `depends_on_stage_ids` per stage and `depends_on_task_template_ids` per task, both arrays of ints; `wf_h_stage_save` and `wf_h_task_template_save` now accept `dependency_join_type` (`'ALL'`|`'ANY'`, default `'ALL'`) and `depends_on_stage_ids`/`depends_on_task_template_ids` (arrays of ints) in their input and persist them; `wf_h_workflow_clone` now also clones both dependency tables. Task 4 (project creation) and Task 5 (WorkflowManager.jsx) both depend on these exact field names.

- [ ] **Step 1: Add the generic cycle-detection helper to `db.php`**

Add this function anywhere in `db.php` (e.g. right after `wf_generate_task_code`):

```php
// Kiem tra vong lap truoc khi them 1 canh phu thuoc moi vao do thi. $edges
// la mang cac cap [upstream_id, downstream_id] HIEN CO (downstream phu
// thuoc upstream), CHUA bao gom canh dang xet. Tra ve true neu them canh
// $newDependsOnId (upstream moi) -> $nodeId (downstream) se tao vong lap -
// tuc la $nodeId da co the "di toi" $newDependsOnId qua cac canh hien co,
// nghia la $newDependsOnId da phu thuoc (truc tiep/gian tiep) vao $nodeId.
function wf_would_create_cycle($edges, $nodeId, $newDependsOnId)
{
    if ($nodeId === $newDependsOnId) return true;
    $adjacency = [];
    foreach ($edges as [$upstream, $downstream]) {
        $adjacency[$upstream][] = $downstream;
    }
    $visited = [];
    $stack = [$nodeId];
    while (count($stack) > 0) {
        $cur = array_pop($stack);
        if ($cur === $newDependsOnId) return true;
        if (isset($visited[$cur])) continue;
        $visited[$cur] = true;
        foreach ($adjacency[$cur] ?? [] as $next) $stack[] = $next;
    }
    return false;
}
```

- [ ] **Step 2: Write a standalone test harness for the cycle helper**

Before touching any live handler, create `C:\Users\pn644\AppData\Local\Temp\claude\e--SOF-PLAN-SOF-PLAN\3df7fe3b-c2f7-437d-9d6c-52297368653e\scratchpad\test_wf_cycle.php` (or your own scratch path) that `require`s the real `db.php` and asserts:
- No edges, any node/candidate → `false`.
- `$nodeId === $newDependsOnId` → `true` (self-dependency).
- Edges `[[1,2],[2,3]]` (2 depends on 1, 3 depends on 2), candidate "make 1 depend on 3" (`nodeId=1, newDependsOnId=3`) → `true` (1←2←3 already, so 3←1 closes the loop... verify this direction carefully by tracing the function by hand before asserting, since getting the edge direction backwards here would silently let real cycles through in Step 3-5).
- Same edges, candidate "make 4 depend on 1" (`nodeId=4, newDependsOnId=1`) → `false` (4 is unconnected, not a cycle).
Run it (`php -f test_wf_cycle.php`), confirm all assertions pass, and only then proceed.

- [ ] **Step 3: Extend `wf_load_workflow_full` to return dependency arrays**

In `workflow.php`, inside the `foreach ($stages as &$stage)` loop (after the existing `$stage['departments'] = ...` line), add:

```php
$stageDeps = wf_query("SELECT depends_on_stage_id FROM wf_stage_dependency WHERE stage_id=?", 'i', [$stage['id']]);
$stage['depends_on_stage_ids'] = array_map(fn($d) => (int)$d['depends_on_stage_id'], $stageDeps);
```

Inside the nested `foreach ($tasks as &$task)` loop (after the existing `$task['confirm_departments'] = ...` line), add:

```php
$taskDeps = wf_query("SELECT depends_on_task_template_id FROM wf_task_template_dependency WHERE task_template_id=?", 'i', [$task['id']]);
$task['depends_on_task_template_ids'] = array_map(fn($d) => (int)$d['depends_on_task_template_id'], $taskDeps);
```

(`dependency_join_type` needs no extra query — it's already a column on `wf_stage`/`wf_task_template`, returned by the existing `SELECT *`.)

- [ ] **Step 4: Extend `wf_h_stage_save` with dependency handling**

At the top of the function (after the existing `$departments = ...` line), add:

```php
$dependencyJoinType = strtoupper(trim((string)($input['dependency_join_type'] ?? 'ALL')));
if (!in_array($dependencyJoinType, ['ALL', 'ANY'], true)) $dependencyJoinType = 'ALL';
$dependsOnStageIds = is_array($input['depends_on_stage_ids'] ?? null)
    ? array_values(array_unique(array_map('intval', $input['depends_on_stage_ids'])))
    : [];
```

Include `dependency_join_type` in the existing UPDATE statement's column list when `$id > 0` (add `dependency_join_type=?` to the SET clause and `$dependencyJoinType` to the params, adjusting the type string). For the INSERT branch (`$id` not yet known), add `dependency_join_type` to the column list/VALUES/params the same way — it must be set at insert time so a newly-created stage's join type is correct before any dependency rows reference it.

After the existing `foreach ($departments as $dept) { ... }` loop, before `wf_json_response(...)`, add:

```php
// Kiem tra vong lap TRUOC khi ghi bat ky thay doi dependency nao. Lay toan
// bo canh hien co trong workflow (tru canh xuat phat tu chinh $id, vi se
// duoc thay the hoan toan boi lan luu nay) lam nen, kiem tra tung ung vien
// mot va cong don dan de bat duoc ca vong lap tao ra boi nhieu ung vien voi
// nhau trong cung 1 lan luu.
$existingEdges = wf_query(
    "SELECT depends_on_stage_id AS upstream, stage_id AS downstream FROM wf_stage_dependency
     WHERE stage_id IN (SELECT id FROM wf_stage WHERE workflow_id=?) AND stage_id <> ?",
    'ii', [$workflowId, $id]
);
$edgePairs = array_map(fn($e) => [(int)$e['upstream'], (int)$e['downstream']], $existingEdges);
foreach ($dependsOnStageIds as $dep) {
    if (wf_would_create_cycle($edgePairs, $id, $dep)) {
        wf_error('Không thể lưu: giai đoạn này sẽ tạo vòng lặp phụ thuộc (trực tiếp hoặc gián tiếp quay lại chính nó)');
    }
    $edgePairs[] = [$dep, $id];
}
wf_execute("DELETE FROM wf_stage_dependency WHERE stage_id=?", 'i', [$id]);
foreach ($dependsOnStageIds as $dep) {
    wf_execute("INSERT INTO wf_stage_dependency (stage_id, depends_on_stage_id) VALUES (?, ?)", 'ii', [$id, $dep]);
}
```

- [ ] **Step 5: Extend `wf_h_task_template_save` the same way, scoped to the whole workflow (cross-stage dependencies allowed)**

Same shape as Step 4, adapted to task templates. At the top:

```php
$dependencyJoinType = strtoupper(trim((string)($input['dependency_join_type'] ?? 'ALL')));
if (!in_array($dependencyJoinType, ['ALL', 'ANY'], true)) $dependencyJoinType = 'ALL';
$dependsOnTaskTemplateIds = is_array($input['depends_on_task_template_ids'] ?? null)
    ? array_values(array_unique(array_map('intval', $input['depends_on_task_template_ids'])))
    : [];
```

Add `dependency_join_type` to both the UPDATE and INSERT statements (same pattern as Step 4). After the existing `foreach ($confirmDepartments as $cd) { ... }` loop, before the `$stageRow = ...` lookup, add:

```php
$existingEdges = wf_query(
    "SELECT depends_on_task_template_id AS upstream, task_template_id AS downstream FROM wf_task_template_dependency
     WHERE task_template_id IN (SELECT tt.id FROM wf_task_template tt JOIN wf_stage s ON s.id=tt.stage_id WHERE s.workflow_id=(SELECT workflow_id FROM wf_stage WHERE id=?)) AND task_template_id <> ?",
    'ii', [$stageId, $id]
);
$edgePairs = array_map(fn($e) => [(int)$e['upstream'], (int)$e['downstream']], $existingEdges);
foreach ($dependsOnTaskTemplateIds as $dep) {
    if (wf_would_create_cycle($edgePairs, $id, $dep)) {
        wf_error('Không thể lưu: công việc mẫu này sẽ tạo vòng lặp phụ thuộc (trực tiếp hoặc gián tiếp quay lại chính nó)');
    }
    $edgePairs[] = [$dep, $id];
}
wf_execute("DELETE FROM wf_task_template_dependency WHERE task_template_id=?", 'i', [$id]);
foreach ($dependsOnTaskTemplateIds as $dep) {
    wf_execute("INSERT INTO wf_task_template_dependency (task_template_id, depends_on_task_template_id) VALUES (?, ?)", 'ii', [$id, $dep]);
}
```

Note the subquery scoping edges to the same workflow via `wf_stage.workflow_id` — a task template's `stage_id` is always known (`$stageId` is already validated non-zero earlier in this function).

- [ ] **Step 6: Extend `wf_h_workflow_clone` to clone both dependency tables**

`wf_h_workflow_clone` already builds `$newStageId` and `$newTaskTemplateId` per iteration but doesn't retain them across iterations. Add two maps declared before the `foreach ($source['stages'] as $stage)` loop:

```php
$stageIdMap = [];
$taskTemplateIdMap = [];
```

Inside the loop, right after `[, $newStageId] = wf_execute(...)` (the stage INSERT), add:

```php
$stageIdMap[$stage['id']] = $newStageId;
```

Inside the inner `foreach ($stage['tasks'] as $task)` loop, right after `[, $newTaskTemplateId] = wf_execute(...)` (the task template INSERT), add:

```php
$taskTemplateIdMap[$task['id']] = $newTaskTemplateId;
```

After both loops complete (all stages and tasks cloned, maps fully populated), add a second pass before the final `wf_log_history(...)` call:

```php
// Nhan ban ca dependency, remap id cu -> id moi qua 2 map vua xay o tren.
foreach ($source['stages'] as $stage) {
    foreach ($stage['depends_on_stage_ids'] as $oldDepId) {
        if (!isset($stageIdMap[$oldDepId])) continue; // phong ve: id la cua workflow khac (khong nen xay ra)
        wf_execute(
            "INSERT INTO wf_stage_dependency (stage_id, depends_on_stage_id) VALUES (?, ?)",
            'ii', [$stageIdMap[$stage['id']], $stageIdMap[$oldDepId]]
        );
    }
    wf_execute("UPDATE wf_stage SET dependency_join_type=? WHERE id=?", 'si', [$stage['dependency_join_type'], $stageIdMap[$stage['id']]]);
    foreach ($stage['tasks'] as $task) {
        foreach ($task['depends_on_task_template_ids'] as $oldDepId) {
            if (!isset($taskTemplateIdMap[$oldDepId])) continue;
            wf_execute(
                "INSERT INTO wf_task_template_dependency (task_template_id, depends_on_task_template_id) VALUES (?, ?)",
                'ii', [$taskTemplateIdMap[$task['id']], $taskTemplateIdMap[$oldDepId]]
            );
        }
        wf_execute("UPDATE wf_task_template SET dependency_join_type=? WHERE id=?", 'si', [$task['dependency_join_type'], $taskTemplateIdMap[$task['id']]]);
    }
}
```

(Cloning an already-valid DAG can never introduce a new cycle — the edge structure is copied verbatim onto a fresh, disjoint set of IDs — so no cycle check is needed here, unlike Steps 4-5.)

- [ ] **Step 7: `php -l` syntax check both files**

```bash
"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" -l "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/db.php"
"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" -l "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php"
```
Both must report "No syntax errors detected".

- [ ] **Step 8: Manual verification against the live DB**

With Laragon running, use a browser session logged in as admin (or a scratch PHP script using the direct-mysqli pattern) to: create 2 stages A, B in a test workflow; save B with `depends_on_stage_ids: [A.id]`; confirm `wf_stage_dependency` has 1 row; attempt to also save A with `depends_on_stage_ids: [B.id]` (the reverse) and confirm it's rejected with the cycle error; confirm `wf_h_workflow_get` for this workflow now returns `depends_on_stage_ids: [A.id]` on stage B.

---

### Task 3: Recompute engine + choke-point integration

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php`

**Interfaces:**
- Consumes: `execution_state`/`dependency_join_type` columns and the 2 instance dependency tables (Task 1); `wf_project_kanban_columns_by_id()` (existing, kanban.php).
- Produces: `wf_recompute_task_execution_state($projectId)`, `wf_recompute_stage_execution_state($projectId)` — both are idempotent and safe to call repeatedly. **Task 4 (project creation) calls both of these directly — land this task first.**

- [ ] **Step 1: Add `wf_recompute_task_execution_state`**

Add this function above `wf_apply_task_status`:

```php
// Tinh lai execution_state (READY/BLOCKED) cho TAT CA task trong 1 du an,
// dua tren wf_project_task_dependency + dependency_join_type. Goi sau MOI
// lan doi status cua bat ky task nao (ca tien va lui), vi 1 thay doi co the
// anh huong nhieu task phu thuoc cung luc. Ham nay idempotent - goi lai
// nhieu lan voi cung du lieu se khong doi ket qua.
function wf_recompute_task_execution_state($projectId)
{
    $columns = wf_project_kanban_columns_by_id($projectId);
    $doneColumns = array_map(fn($c) => $c['code'], array_filter($columns, fn($c) => (int)$c['is_done_status'] === 1));
    $firstColumn = $columns[0]['code'] ?? null;

    $tasks = wf_query("SELECT id, status, execution_state, dependency_join_type FROM wf_project_task WHERE project_id=?", 'i', [$projectId]);
    $tasksById = array_column($tasks, null, 'id');
    $deps = wf_query("SELECT task_id, depends_on_task_id FROM wf_project_task_dependency WHERE project_id=?", 'i', [$projectId]);
    $depsByTask = [];
    foreach ($deps as $d) $depsByTask[$d['task_id']][] = $d['depends_on_task_id'];

    foreach ($tasks as $task) {
        $taskDeps = $depsByTask[$task['id']] ?? [];
        if (count($taskDeps) === 0) continue; // khong co dependency -> giu nguyen, khong dong cham

        $doneFlags = array_map(fn($depId) => in_array($tasksById[$depId]['status'] ?? '', $doneColumns, true), $taskDeps);
        $satisfied = $task['dependency_join_type'] === 'ANY' ? in_array(true, $doneFlags, true) : !in_array(false, $doneFlags, true);
        $newState = $satisfied ? 'READY' : 'BLOCKED';

        if ($newState !== $task['execution_state']) {
            // Chi cho phep tu dong quay lai BLOCKED neu task van con o cot dau
            // tien (chua ai bat dau lam) - tranh giat lui cong viec dang do
            // dang chi vi 1 dependency phia truoc bi mo lai (xem spec 4.2).
            if ($newState === 'BLOCKED' && $task['status'] !== $firstColumn) continue;
            wf_execute("UPDATE wf_project_task SET execution_state=? WHERE id=?", 'si', [$newState, $task['id']]);
            wf_log_history($projectId, 'TASK', $task['id'], 'EXECUTION_STATE_' . $newState);
        }
    }
}
```

- [ ] **Step 2: Add `wf_recompute_stage_execution_state`**

Same shape, at stage granularity, added right after Step 1's function:

```php
function wf_recompute_stage_execution_state($projectId)
{
    $stages = wf_query("SELECT id, status, execution_state, dependency_join_type FROM wf_project_stage WHERE project_id=?", 'i', [$projectId]);
    $stagesById = array_column($stages, null, 'id');
    $deps = wf_query("SELECT stage_id, depends_on_stage_id FROM wf_project_stage_dependency WHERE project_id=?", 'i', [$projectId]);
    $depsByStage = [];
    foreach ($deps as $d) $depsByStage[$d['stage_id']][] = $d['depends_on_stage_id'];

    foreach ($stages as $stage) {
        $stageDeps = $depsByStage[$stage['id']] ?? [];
        if (count($stageDeps) === 0) continue;

        $doneFlags = array_map(fn($depId) => ($stagesById[$depId]['status'] ?? '') === 'DONE', $stageDeps);
        $satisfied = $stage['dependency_join_type'] === 'ANY' ? in_array(true, $doneFlags, true) : !in_array(false, $doneFlags, true);
        $newState = $satisfied ? 'READY' : 'BLOCKED';

        if ($newState !== $stage['execution_state']) {
            if ($newState === 'BLOCKED' && $stage['status'] !== 'PENDING') continue; // stage da OPEN/DONE thi khong giat lui
            wf_execute("UPDATE wf_project_stage SET execution_state=? WHERE id=?", 'si', [$newState, $stage['id']]);
            wf_log_history($projectId, 'STAGE', $stage['id'], 'EXECUTION_STATE_' . $newState);
        }
    }
}
```

- [ ] **Step 3: Gate `wf_apply_task_status` on BLOCKED and trigger recompute**

In `wf_apply_task_status`, after the existing `wf_require_department_or_admin($task['department_code']);` line and before the existing `if ($status === 'DONE') { ... pending confirm check ... }` block, add:

```php
if ($task['execution_state'] === 'BLOCKED' && $status !== $task['status']) {
    wf_error('Công việc đang bị chặn bởi công việc phụ thuộc chưa hoàn thành, không thể chuyển trạng thái');
}
```

At the end of the function, after the existing `if ($status === 'DONE') { wf_maybe_advance_stage($task['project_stage_id']); }` block, add (unconditionally, not just on DONE — any status change can free ANY-join dependents that only needed one branch done, or a task moving OFF done can re-block per the ruling in Step 1):

```php
wf_recompute_task_execution_state($task['project_id']);
wf_recompute_stage_execution_state($task['project_id']);
```

- [ ] **Step 4: Rewrite `wf_maybe_advance_stage` for parallel activation**

Replace the entire function body from the existing `$next = wf_query(...)` line through the end of the `if (count($next) > 0) { ... } else { ... }` block with:

```php
wf_recompute_stage_execution_state($stage['project_id']);

$readyStages = wf_query(
    "SELECT * FROM wf_project_stage WHERE project_id=? AND status='PENDING' AND execution_state='READY' ORDER BY order_no ASC",
    'i', [$stage['project_id']]
);
foreach ($readyStages as $readyStage) {
    wf_execute("UPDATE wf_project_stage SET status='OPEN', started_at=NOW() WHERE id=?", 'i', [$readyStage['id']]);
    wf_log_history($stage['project_id'], 'STAGE', $readyStage['id'], 'STAGE_OPEN', $readyStage['name']);
}
if (count($readyStages) > 0) {
    // current_stage_id la display-only (mot stage "gan nhat/chinh"), khong
    // con la gate duy nhat - lay stage co order_no nho nhat trong so vua mo.
    usort($readyStages, fn($a, $b) => (int)$a['order_no'] <=> (int)$b['order_no']);
    wf_execute("UPDATE wf_project SET current_stage_id=? WHERE id=?", 'ii', [$readyStages[0]['id'], $stage['project_id']]);
}

$remaining = wf_query(
    "SELECT COUNT(*) AS c FROM wf_project_stage WHERE project_id=? AND status IN ('PENDING','OPEN')",
    'i', [$stage['project_id']]
);
if ((int)$remaining[0]['c'] === 0) {
    wf_execute("UPDATE wf_project SET status='DONE' WHERE id=?", 'i', [$stage['project_id']]);
    wf_log_history($stage['project_id'], 'PROJECT', $stage['project_id'], 'PROJECT_DONE');
}
```

(Leave the function's existing first 5 lines — the `$stage['status'] === 'DONE'` early-return, the `completion_condition` check, the task-count check, and the `UPDATE wf_project_stage SET status='DONE'...` — untouched; only the "what opens next" tail changes.)

- [ ] **Step 5: Add recompute calls to `wf_h_task_confirm`'s auto-DONE branch**

In `wf_h_task_confirm`, inside the `if ((int)$pending[0]['c'] === 0 && $task['status'] !== 'DONE') { ... }` block, after the existing `wf_maybe_advance_stage($task['project_stage_id']);` line, add:

```php
wf_recompute_task_execution_state($task['project_id']);
wf_recompute_stage_execution_state($task['project_id']);
```

(`wf_maybe_advance_stage` already calls `wf_recompute_stage_execution_state` internally per Step 4, so this line is slightly redundant for the stage call specifically, but keep it for clarity/symmetry with Step 3's pattern and because task-level recompute here is NOT otherwise covered by this code path.)

- [ ] **Step 6: `php -l` syntax check**

```bash
"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" -l "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php"
```

- [ ] **Step 7: Standalone test harness**

Write a standalone PHP script stubbing `wf_query`/`wf_execute`/`wf_error`/`wf_log_history`/`wf_project_kanban_columns_by_id` with an in-memory fixture (same technique as the prior sync feature's `test_wf_plan_sync.php`), `require` the real edited `kanban.php`, and assert:
- `wf_recompute_task_execution_state`: a BLOCKED task with `dependency_join_type='ALL'` and 2 deps, only 1 done → stays BLOCKED; both done → flips to READY. `dependency_join_type='ANY'`, only 1 of 2 done → flips to READY.
- A READY task whose dependency's status regresses, while the task itself is still in its first column → flips back to BLOCKED; the same scenario but the task has already moved to a later column → stays READY (the no-yank-back rule).
- `wf_apply_task_status` on a BLOCKED task attempting a real transition → rejected via `wf_error`, no DB write attempted.
- `wf_maybe_advance_stage`: two PENDING stages both become READY when the completed stage satisfies both → both open in one call (parallel activation), not just one.

Run it, confirm all assertions pass, before marking this task done.

---

### Task 4: Project creation — two-pass clone with dependency instantiation

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/project.php`

**Interfaces:**
- Consumes: `wf_load_workflow_full()`'s `depends_on_stage_ids`/`depends_on_task_template_ids`/`dependency_join_type` fields from Task 2; the 2 instance dependency tables from Task 1; `wf_recompute_task_execution_state()`/`wf_recompute_stage_execution_state()` from Task 3.
- Produces: every `wf_project_stage`/`wf_project_task` row now has a correct `execution_state` and `dependency_join_type` at creation time; `wf_project_stage_dependency`/`wf_project_task_dependency` rows exist mirroring the template's DAG.

- [ ] **Step 1: Track template→instance ID maps and compute initial state during the existing insert loop**

In `wf_h_project_create`, before the `foreach ($workflow['stages'] as $stage)` loop, add:

```php
$stageIdMap = [];   // template stage id -> new wf_project_stage id
$taskIdMap = [];    // template task_template id -> new wf_project_task id
```

Replace the stage-status line:
```php
$status = ((int)$stage['order_no'] === 1) ? 'OPEN' : 'PENDING';
```
with:
```php
$hasIncomingStageDeps = count($stage['depends_on_stage_ids']) > 0;
$status = $hasIncomingStageDeps ? 'PENDING' : 'OPEN';
$stageExecState = $hasIncomingStageDeps ? 'BLOCKED' : 'READY';
```

Add `dependency_join_type` and `execution_state` to the `wf_project_stage` INSERT's column list/VALUES/params (using `$stage['dependency_join_type']` and `$stageExecState`), and right after the INSERT (where `$firstStageId` is set), add:

```php
$stageIdMap[$stage['id']] = $projectStageId;
```

Inside the `foreach ($stage['tasks'] as $taskTemplate)` loop, replace the task INSERT's fixed `'TODO'` status handling by computing readiness first:

```php
$hasIncomingTaskDeps = count($taskTemplate['depends_on_task_template_ids']) > 0;
$taskExecState = $hasIncomingTaskDeps ? 'BLOCKED' : 'READY';
```

Add `dependency_join_type` and `execution_state` to the `wf_project_task` INSERT's column list/VALUES/params (`$taskTemplate['dependency_join_type']`, `$taskExecState`), and right after the INSERT, add:

```php
$taskIdMap[$taskTemplate['id']] = $taskId;
```

- [ ] **Step 2: Second pass — clone dependency edges after all stages/tasks exist**

After the closing `}` of the outer `foreach ($workflow['stages'] as $stage)` loop, before `wf_execute("UPDATE wf_project SET current_stage_id=...")`, add:

```php
// Pass 2: nhan ban dependency edge, remap id template -> id instance vua
// tao o pass 1. Phai chay sau khi TOAN BO stage/task da insert xong, vi 1
// canh co the tro toi 1 node duoc insert sau no trong vong lap pass 1.
foreach ($workflow['stages'] as $stage) {
    foreach ($stage['depends_on_stage_ids'] as $oldDepId) {
        if (!isset($stageIdMap[$oldDepId])) continue;
        wf_execute(
            "INSERT INTO wf_project_stage_dependency (project_id, stage_id, depends_on_stage_id) VALUES (?, ?, ?)",
            'iii', [$projectId, $stageIdMap[$stage['id']], $stageIdMap[$oldDepId]]
        );
    }
    foreach ($stage['tasks'] as $taskTemplate) {
        foreach ($taskTemplate['depends_on_task_template_ids'] as $oldDepId) {
            if (!isset($taskIdMap[$oldDepId])) continue;
            wf_execute(
                "INSERT INTO wf_project_task_dependency (project_id, task_id, depends_on_task_id) VALUES (?, ?, ?)",
                'iii', [$projectId, $taskIdMap[$taskTemplate['id']], $taskIdMap[$oldDepId]]
            );
        }
    }
}
```

- [ ] **Step 3: Final recompute safety net**

Right after Step 2's loop, add:

```php
wf_recompute_task_execution_state($projectId);
wf_recompute_stage_execution_state($projectId);
```

This is a defense-in-depth correctness net (pass 1's "zero incoming edges" shortcut is an optimization; running the real recompute once catches anything the shortcut missed) — both functions (from Task 3, already landed) are idempotent, so calling them on a freshly-created project is always safe.

- [ ] **Step 4: `php -l` syntax check**

```bash
"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" -l "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/project.php"
```

- [ ] **Step 5: Manual verification**

Using the test workflow from Task 2 (stage B depends on stage A), create a project from it via `project.create`. Confirm: stage A is `OPEN`/`READY`, stage B is `PENDING`/`BLOCKED`; `wf_project_stage_dependency` has exactly 1 row referencing the new instance IDs (not the template IDs); `wf_project_task_dependency` mirrors any task-level deps in that workflow if present.

---

### Task 5: WorkflowManager.jsx — dependency configuration UI

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/WorkflowManager.jsx`

**Interfaces:**
- Consumes: `stage.depends_on_stage_ids`/`dependency_join_type` and `task.depends_on_task_template_ids`/`dependency_join_type` from `workflowApi.getWorkflow()` (Task 2's `wf_load_workflow_full` changes). No `workflowApi.js` changes needed — `saveStage`/`saveTaskTemplate` already spread the whole form payload through generically (verified: `export const saveStage = (data) => callWorkflowApi("stage.save", data);`).

- [ ] **Step 1: Stage modal — add dependency fields**

In `openCreateStage`, add to the `stageForm.setFieldsValue({...})` defaults object:
```js
depends_on_stage_ids: [],
dependency_join_type: "ALL",
```

In `openEditStage`, add to the `stageForm.setFieldsValue({...})` object:
```js
depends_on_stage_ids: stage.depends_on_stage_ids || [],
dependency_join_type: stage.dependency_join_type || "ALL",
```

In the stage Modal's `<Form>`, after the existing `completion_condition` `Form.Item`, add:

```jsx
<Form.Item name="depends_on_stage_ids" label="Phụ thuộc vào giai đoạn nào (để trống nếu không phụ thuộc)">
  <Select
    mode="multiple"
    options={(selected?.stages || [])
      .filter((s) => s.id !== editingStage?.id)
      .map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
  />
</Form.Item>
<Form.Item name="dependency_join_type" label="Điều kiện phụ thuộc (nếu chọn từ 2 giai đoạn trở lên)">
  <Select
    options={[
      { value: "ALL", label: "Cần TẤT CẢ giai đoạn phụ thuộc hoàn thành (ALL)" },
      { value: "ANY", label: "Chỉ cần MỘT giai đoạn phụ thuộc hoàn thành (ANY)" },
    ]}
  />
</Form.Item>
```

- [ ] **Step 2: Task template modal — add dependency fields**

In `openCreateTask`, add to the `taskForm.setFieldsValue({...})` defaults object:
```js
depends_on_task_template_ids: [],
dependency_join_type: "ALL",
```

In `openEditTask`, add to the `taskForm.setFieldsValue({...})` object:
```js
depends_on_task_template_ids: task.depends_on_task_template_ids || [],
dependency_join_type: task.dependency_join_type || "ALL",
```

In the task Modal's `<Form>`, after the existing `confirm_departments` `Form.Item`, add:

```jsx
<Form.Item name="depends_on_task_template_ids" label="Phụ thuộc vào công việc nào (trong cùng workflow, để trống nếu không phụ thuộc)">
  <Select
    mode="multiple"
    options={(selected?.stages || [])
      .flatMap((s) => s.tasks.map((t) => ({ ...t, stageLabel: s.code })))
      .filter((t) => t.id !== editingTask?.id)
      .map((t) => ({ value: t.id, label: `[${t.stageLabel}] ${t.name}` }))}
  />
</Form.Item>
<Form.Item name="dependency_join_type" label="Điều kiện phụ thuộc (nếu chọn từ 2 công việc trở lên)">
  <Select
    options={[
      { value: "ALL", label: "Cần TẤT CẢ công việc phụ thuộc hoàn thành (ALL)" },
      { value: "ANY", label: "Chỉ cần MỘT công việc phụ thuộc hoàn thành (ANY)" },
    ]}
  />
</Form.Item>
```

- [ ] **Step 3: Show dependency count as a Tag in both tables (read-only glance, no new modal)**

In the stage `Collapse` header (label), after the existing `{stage.departments.map(...)}` line, add:
```jsx
{stage.depends_on_stage_ids?.length > 0 && (
  <Tag color="purple">Phụ thuộc {stage.depends_on_stage_ids.length} giai đoạn ({stage.dependency_join_type})</Tag>
)}
```

In the task template `Table`'s `columns` array, after the existing `"Cần xác nhận"` column definition, add:
```jsx
{
  title: "Phụ thuộc",
  dataIndex: "depends_on_task_template_ids",
  width: 130,
  render: (arr, task) => (arr?.length > 0 ? <Tag color="purple">{arr.length} công việc ({task.dependency_join_type})</Tag> : "—"),
},
```

- [ ] **Step 4: Manual verification via `npm start`**

Start the dev server if not already running (`npm start` in `e:/SOF/PLAN/SOF_PLAN`, check port 3000 first via a curl/fetch to avoid a duplicate instance). Log in, open "Quản lý quy trình dự án" → Workflow mẫu, open the test workflow from Task 2. Confirm: stage B's edit modal shows "Phụ thuộc vào giai đoạn nào" pre-filled with stage A; the Collapse header shows the purple "Phụ thuộc 1 giai đoạn (ALL)" tag; editing a task template and setting a dependency saves and re-opens with it pre-filled.

---

### Task 6: ProjectDetail.jsx — blocked indicator on Kanban cards

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/ProjectDetail.jsx`

**Interfaces:**
- Consumes: `task.execution_state` (`'READY'`|`'BLOCKED'`), already present on every row returned by `wf_h_kanban_board`/`wf_h_kanban_project_board` (both `SELECT * FROM wf_project_task`, so the new column flows through with zero backend change in this task).

- [ ] **Step 1: Add a lock badge to `TaskCard`**

In the `TaskCard` function, after the existing `const isDone = task.status === "DONE";` line, add:
```js
const isBlocked = task.execution_state === "BLOCKED";
```

In the header `<Space size={6}>` block (the one currently containing `task.code` and the optional stage `Tag`), add, right after the stage `Tag`'s closing `)}`:
```jsx
{isBlocked && (
  <Tag color="red" style={{ fontSize: 10, margin: 0, padding: "0 4px", lineHeight: "16px" }} title="Đang chờ công việc phụ thuộc hoàn thành">
    🔒 Chờ
  </Tag>
)}
```

(`Lock` from `lucide-react` is already imported in this file for the stage-pipeline icon — either reuse it as `<Lock size={10} />` in place of the 🔒 emoji, or keep the emoji for a zero-import-change diff; either is acceptable, prefer `<Lock size={10} />` for visual consistency with the rest of the file's icon usage.)

- [ ] **Step 2: Manual verification**

Using a seeded project from Task 8 with a blocked task, open its Kanban board and confirm the red "Chờ" badge shows on the blocked card, and dragging it to another column produces the existing error-toast (backend rejection from Task 3 Step 3) rather than silently succeeding.

---

### Task 7: MyTasksTab.jsx — "Bị block" filter

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/MyTasksTab.jsx`

**Interfaces:**
- Consumes: `r.execution_state`, already present on every row from `wf_h_my_tasks` (`SELECT t.*, ...` — the new column on `wf_project_task` flows through with zero backend change).

- [ ] **Step 1: Add filter state and predicate**

After the existing `const [priorityFilter, setPriorityFilter] = useState("ALL");` line, add:
```js
const [blockedFilter, setBlockedFilter] = useState("ALL");
```

In the `filteredTasks` predicate, after the existing `matchesPriority` line, add:
```js
const matchesBlocked =
  blockedFilter === "ALL" ||
  (blockedFilter === "BLOCKED_ONLY" && t.execution_state === "BLOCKED") ||
  (blockedFilter === "HIDE_BLOCKED" && t.execution_state !== "BLOCKED");
return matchesSearch && matchesPriority && matchesBlocked;
```
(replacing the existing `return matchesSearch && matchesPriority;` line).

- [ ] **Step 2: Add the filter Select next to the existing priority filter**

After the existing priority `<Select>` in the toolbar `<Space wrap>`, add:
```jsx
<Select
  value={blockedFilter}
  onChange={setBlockedFilter}
  style={{ width: 170 }}
  options={[
    { value: "ALL", label: "Tất cả (kể cả bị block)" },
    { value: "BLOCKED_ONLY", label: "Chỉ công việc bị block" },
    { value: "HIDE_BLOCKED", label: "Ẩn công việc bị block" },
  ]}
/>
```

- [ ] **Step 3: Show a "Bị chặn" tag in the Trạng thái column**

In the `"Trạng thái"` column's `render`, wrap the existing `<Select>` so a blocked row shows an additional tag beside it:
```jsx
render: (v, r) => (
  <Space direction="vertical" size={2}>
    <Select
      size="small"
      value={v}
      style={{ width: 130 }}
      options={(r.columns || []).map((c) => ({ value: c.code, label: c.label }))}
      onClick={(e) => e.stopPropagation()}
      onChange={(val) => changeStatus(r.id, val)}
    />
    {r.execution_state === "BLOCKED" && <Tag color="red" style={{ margin: 0 }}>Bị chặn</Tag>}
  </Space>
),
```
(replacing the existing `render` for that column — the `Select` itself is unchanged, only wrapped and given a sibling tag.)

- [ ] **Step 4: Manual verification**

With a seeded blocked task assigned to the logged-in test user, confirm the "Bị chặn" tag shows in My Work, the new filter's "Chỉ công việc bị block" option isolates it, and attempting to change its status via the Select still produces the backend's rejection toast.

---

### Task 8: Seed data script

**Files:**
- Create: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/scripts/seed_dev_data.php`

**Interfaces:**
- Consumes: every table/column from Tasks 1-4 (must be run after those land, so the dependency engine seeding actually exercises real dependency rows, not just plain tasks).
- Produces: no code interface — this is a data-only deliverable, verified by row counts and by Task 6/7/9's manual checks having real fixtures to look at.

- [ ] **Step 1: Write the seeding script**

Create `workflow-api/scripts/seed_dev_data.php` using the direct-mysqli pattern (`mysqli_connect('localhost','root','')` + `mysqli_select_db($link,'hao_erp_sofv5_0')`) so it runs standalone via CLI without a logged-in session. Structure as idempotent, additive-only PHP (check-then-insert per row, e.g. a `SELECT` guard before each insert, keyed on a natural unique column like `hr_lv0020.lv001` or `wf_project.code` — never `TRUNCATE`/`DELETE` any existing table). Seed, in this order (later steps reference earlier ones' generated IDs):

1. **8-10 more `hr_lv0020` employees** (columns: `lv001` code like `NV006`, `lv002` full Vietnamese name, `lv029` department code), distributed so PB001-PB005 each end up with at least 2 (currently PB004/PB005 have 0 — check first via `SELECT lv029, COUNT(*) FROM hr_lv0020 GROUP BY lv029` and top up only the short departments).
2. **One new `wf_workflow`** (`code` e.g. `WF-SW-PARALLEL`, `name` e.g. "Phát triển phần mềm (song song)") modeling the audit's own worked example (spec §6): stages Tiếp nhận → Báo giá → Hợp đồng → **Backend / Frontend / Database / UI-UX (4 stages, all `depends_on_stage_id = Hợp đồng`, i.e. parallel)** → Integration (`dependency_join_type='ALL'`, depends on all 4 parallel stages) → Test → Bàn giao. Use `workflow-api`'s existing handler functions directly (`require` the handler files and call `wf_h_workflow_save`, `wf_h_stage_save`, `wf_h_task_template_save` in-process with constructed `$input` arrays) rather than re-deriving the insert SQL by hand — this exercises the real Task 2 code path (including its cycle-detection and dependency persistence) as a side effect of seeding, which is a stronger correctness signal than raw INSERTs would be. Each stage gets 1-3 task templates with realistic Vietnamese names and department codes matching the 5 existing departments.
3. **4-6 new `wf_project` instances**, again via `wf_h_project_create` (in-process call, not raw SQL) — 2-3 from the new parallel workflow, 1-2 from the existing workflow — so Task 4's clone-with-dependencies path is exercised for real. After creation, drive a few through realistic status transitions via `wf_h_task_update_status` (in-process) so the seeded data ends up in varied states: at least one project with a currently-BLOCKED task/stage visible, at least one mid-parallel-execution (2 of the 4 parallel stages OPEN, 2 still PENDING/BLOCKED), one fully DONE end-to-end.
4. **5-8 new legacy `cr_lv0004`/`cr_lv0005`** Kế hoạch rows (direct INSERT is fine here — no in-process handler exists for the legacy monolith in this backend), several with `wf_project_id`/`wf_task_id` populated pointing at rows created in step 3, to exercise the already-shipped bidirectional sync feature end-to-end with real linked data (currently only 3/8 rows total exist, none linked).

- [ ] **Step 2: Run it and verify counts**

```bash
"/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe" "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/scripts/seed_dev_data.php"
```
Confirm via direct queries: `hr_lv0020` now has ≥14 rows with no department at 0; `wf_workflow` has ≥2 rows; `wf_project` has ≥6 rows; `wf_project_task_dependency`/`wf_project_stage_dependency` are non-empty; `SELECT execution_state, COUNT(*) FROM wf_project_task GROUP BY execution_state` shows at least one `BLOCKED` row; `cr_lv0004`/`cr_lv0005` row counts increased and at least a few `cr_lv0005.wf_task_id` values are non-null.

- [ ] **Step 3: Re-run to confirm idempotency**

Run the same command a second time. Row counts must NOT change (every guard correctly detected existing rows and skipped). If any table grew, fix the guard before considering this task done — a non-idempotent seed script run twice by a future session would silently corrupt the "realistic" dataset with duplicates.

---

### Task 9: End-to-end manual verification (audit acceptance tests)

**Files:** none (verification only).

**Interfaces:** none — this task consumes the fully integrated system from Tasks 1-8.

This task requires an authenticated browser session and cannot be performed by a subagent (no subagent in this project has browser/login access, confirmed across every prior manual-verification task in this codebase's history). Present the following exact steps to the human partner instead of attempting them:

- [ ] **TC01 (Sequential gate):** In a workflow with strictly sequential stages (no parallel branch), confirm stage 2 shows PENDING/BLOCKED until stage 1's tasks are all DONE, then confirm it auto-opens.
- [ ] **TC02 (Parallel branch):** Using the seeded parallel workflow (Task 8), confirm Backend/Frontend/Database/UI-UX stages are all OPEN simultaneously once Hợp đồng completes (not one at a time).
- [ ] **TC03 (ALL-join):** Confirm the Integration stage stays BLOCKED until all 4 parallel stages are DONE, and opens the moment the last one finishes.
- [ ] **TC07 (Blocked task):** Confirm a task with an unmet dependency shows the red "Chờ" badge (Task 6) and rejects a drag-to-another-column attempt with a clear error toast.
- [ ] **TC08 (Unblock):** Complete that task's dependency, confirm the badge disappears and the task becomes draggable, without a page refresh being required (re-fetch happens naturally via the existing `updateTaskStatus` → reload pattern already in `ProjectDetail.jsx`/`MyTasksTab.jsx`).
- [ ] Confirm My Work's new "Chỉ công việc bị block" filter (Task 7) correctly isolates the blocked seeded task.
- [ ] Confirm the Workflow Designer's cycle-detection error (Task 2) actually appears in the browser UI (as an antd `message.error`, via the existing generic error-surfacing plumbing) when attempting to create a circular dependency through the new UI controls (Task 5), not just via direct API calls.

Report results back; any failing TC is a real regression against this plan's stated goal, not a nice-to-have.
