# Workflow ↔ Kế hoạch Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link "Kế hoạch" plan tasks to "Quy trình dự án" (workflow) tasks so status stays in sync both ways, with auto-fill on creation, and add a visible horizontal scrollbar to the Kanban board.

**Architecture:** All sync logic lives in the new `workflow-api` PHP backend (already clean, uses `mysqli` via `wf_query`/`wf_execute` helpers). The legacy monolith (`services.sof.vn/index.php` + `clsall/*.php` classes) gets the smallest possible touch: two new nullable columns plus wiring so those columns round-trip through existing generic/explicit CRUD code paths. Frontend calls the new workflow-api action directly for linked-task status changes instead of the legacy status actions.

**Tech Stack:** React 18 + antd (frontend, `e:/SOF/PLAN/SOF_PLAN`), PHP 8.3 + mysqli, MySQL (both backends share one DB per session, confirmed via `DB_DATABASE` resolved in `checksc.php`).

**Spec:** `docs/superpowers/specs/2026-08-28-workflow-kehoach-sync-design.md`

## Global Constraints

- No git repo exists for either PHP backend folder (`c:/laragon/www/v2.des.plan.banhangonline.top` has no `.git`) — edits there are **not** revertible via git. Read each file fully before editing, make the smallest possible diff, and never do a bulk find/replace across these files.
- No automated test suite exists anywhere in this stack (confirmed: no PHP tests, no `*.test.jsx`/`*.test.js` in the React app despite `react-scripts test` being available in `package.json`). Every task verifies manually via `npm start` (dev server normally already running on port 3000) and/or `curl` against `workflow-api`, per the spec's "Kiểm thử" section. Do not add a new test framework as a side effect of this feature.
- Real physical table names differ from the frontend "vclass" routing strings used in `execCRUD(vclass, ...)` calls — this was discovered during planning and corrects the spec's wording:
  - `execCRUD('cr_lv0094', ...)` (Kế hoạch/plan header) → physical table **`cr_lv0004`**, PHP class `cr_lv0094` in `clsall/cr_lv0094.php`.
  - `execCRUD('cr_lv0025_xemtongcv', ...)` (task within a plan) → physical table **`cr_lv0005`**, PHP class `cr_lv0025` in `clsall/cr_lv0025-1.php`.
  All DDL and SQL in this plan targets `cr_lv0004`/`cr_lv0005` directly — never the vclass strings.
- `workflow-api` DB helpers (from `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/db.php`): `wf_query($sql, '', $params)` returns rows array; `wf_execute($sql, '', $params)` returns `[$affected, $insertId]`; `wf_error($msg, $code=400)` sends a JSON error and exits; `wf_json_response($data, $code=200)` sends JSON and exits; `wf_log_history($projectId, $entityType, $entityId, $action, $detail='')`.
- **Scope deviation from the spec, flagged for the user:** the spec said the admin should be able to edit `wf_kanban_status_map` in the Workflow management screen. This plan implements the backend (table, auto-seeding, and the mapping is fully queryable via direct SQL) but does **not** add a manual override UI — Task 2 only auto-derives the mapping from `order_no`/`is_done_status` on every Kanban-column save. If the auto-derived mapping (first column→0, first `is_done_status=1` column→2, everything else→1) isn't good enough for a given workflow, that is a follow-up task, not covered here.

---

### Task 1: Database schema — new columns and mapping table

**Files:**
- Create: `e:/SOF/PLAN/SOF_PLAN/docs/superpowers/plans/sql/2026-08-28-workflow-kehoach-sync.sql` (keep the migration script for the record — this project has no migration tool, so this file is documentation-only; you still run the statements by hand against the live MySQL DB)

**Interfaces:**
- Produces: columns `cr_lv0004.wf_project_id` (INT NULL), `cr_lv0005.wf_task_id` (INT NULL), table `wf_kanban_status_map(id, workflow_id, column_code, plan_status_value, is_reverse_target)` — all later tasks depend on these existing.

- [ ] **Step 1: Write the SQL file**

```sql
-- 2026-08-28-workflow-kehoach-sync.sql
-- Run against the per-tenant MySQL database used by both workflow-api and
-- the legacy services.sof.vn backend (same DB_DATABASE).

ALTER TABLE cr_lv0004 ADD COLUMN wf_project_id INT NULL;
ALTER TABLE cr_lv0005 ADD COLUMN wf_task_id INT NULL;

CREATE TABLE wf_kanban_status_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_id INT NOT NULL,
  column_code VARCHAR(50) NOT NULL,
  plan_status_value TINYINT NOT NULL,
  is_reverse_target TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_workflow_column (workflow_id, column_code)
);
```

- [ ] **Step 2: Apply it to the local dev database**

Run via Laragon's MySQL client (phpMyAdmin, HeidiSQL, or the `mysql` CLI pointed at `DB_SERVER=localhost`, `DB_USER=root`, empty password — see `c:/laragon/www/v2.des.plan.banhangonline.top/config.php:4-7`). Apply to whichever `DB_DATABASE` your logged-in test account resolves to (for the `admin` account used earlier this session it was `hao_erp_sofv5_0`).

```bash
mysql -h localhost -u root hao_erp_sofv5_0 < "e:/SOF/PLAN/SOF_PLAN/docs/superpowers/plans/sql/2026-08-28-workflow-kehoach-sync.sql"
```

- [ ] **Step 3: Verify the columns and table exist**

```bash
mysql -h localhost -u root hao_erp_sofv5_0 -e "DESCRIBE cr_lv0004;" | grep wf_project_id
mysql -h localhost -u root hao_erp_sofv5_0 -e "DESCRIBE cr_lv0005;" | grep wf_task_id
mysql -h localhost -u root hao_erp_sofv5_0 -e "DESCRIBE wf_kanban_status_map;"
```

Expected: each command prints the new column/table definition, no errors.

- [ ] **Step 4: Commit the SQL file to git** (the frontend repo tracks `docs/`, even though the DB itself isn't versioned)

```bash
git add docs/superpowers/plans/sql/2026-08-28-workflow-kehoach-sync.sql
git commit -m "Add SQL migration for workflow<->kehoach sync columns"
```

---

### Task 2: workflow-api — default status-map seeding on Kanban column save

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php:67-99` (`wf_h_kanban_columns_save`)

**Interfaces:**
- Consumes: `wf_load_kanban_columns_for_workflow($workflowId)` (existing, returns `[{code, label, color, order_no, is_done_status}]` ordered by `order_no`), `wf_execute`, `wf_query` (from `db.php`).
- Produces: `wf_seed_default_status_map($workflowId)` — called by Task 3's new action too (read-only there, just queries the table this seeds).

- [ ] **Step 1: Read the current file to confirm line numbers are still accurate**

```bash
sed -n '60,100p' "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/workflow.php"
```

Confirm you see `function wf_h_kanban_columns_save($input)` ending with `wf_json_response(['success' => true, 'data' => wf_load_kanban_columns_for_workflow($workflowId)]);` followed by `}`.

- [ ] **Step 2: Add the seeding function right before `wf_h_kanban_columns_save`**

Insert this new function immediately above `function wf_h_kanban_columns_save($input)`:

```php
// Tu dong sinh mapping mac dinh Cot Kanban -> trang thai Ke hoach (lv011:
// 0=Chua thuc hien,1=Dang thuc hien,2=Da duyet) moi lan luu lai cot Kanban
// cua 1 workflow. Cot dau tien (order_no nho nhat) -> 0, cot is_done_status=1
// dau tien -> 2, cac cot con lai -> 1 (cot dau tien trong nhom nay lam
// reverse target). Ghi de toan bo mapping cu cua workflow nay.
function wf_seed_default_status_map($workflowId)
{
    wf_execute("DELETE FROM wf_kanban_status_map WHERE workflow_id=?", '', [$workflowId]);
    $columns = wf_load_kanban_columns_for_workflow($workflowId);
    if (count($columns) === 0) return;

    usort($columns, fn($a, $b) => $a['order_no'] <=> $b['order_no']);
    $firstCode = $columns[0]['code'];
    $doneCodes = array_values(array_filter($columns, fn($c) => (int)$c['is_done_status'] === 1));
    $doneCode = count($doneCodes) > 0 ? $doneCodes[0]['code'] : null;

    foreach ($columns as $c) {
        if ((int)$c['is_done_status'] === 1) {
            $planStatus = 2;
        } elseif ($c['code'] === $firstCode) {
            $planStatus = 0;
        } else {
            $planStatus = 1;
        }
        $isReverseTarget = 0;
        if ($planStatus === 0 && $c['code'] === $firstCode) $isReverseTarget = 1;
        if ($planStatus === 2 && $c['code'] === $doneCode) $isReverseTarget = 1;
        wf_execute(
            "INSERT INTO wf_kanban_status_map (workflow_id, column_code, plan_status_value, is_reverse_target) VALUES (?,?,?,?)",
            '',
            [$workflowId, $c['code'], $planStatus, $isReverseTarget]
        );
    }

    $inProgress = array_values(array_filter(
        $columns,
        fn($c) => (int)$c['is_done_status'] !== 1 && $c['code'] !== $firstCode
    ));
    if (count($inProgress) > 0) {
        wf_execute(
            "UPDATE wf_kanban_status_map SET is_reverse_target=1 WHERE workflow_id=? AND column_code=?",
            '',
            [$workflowId, $inProgress[0]['code']]
        );
    }
}

```

- [ ] **Step 3: Call it from `wf_h_kanban_columns_save`**

Find this line near the end of `wf_h_kanban_columns_save`:

```php
    wf_log_history(null, 'WORKFLOW', $workflowId, 'KANBAN_COLUMNS_SAVE');
    wf_json_response(['success' => true, 'data' => wf_load_kanban_columns_for_workflow($workflowId)]);
```

Replace with:

```php
    wf_log_history(null, 'WORKFLOW', $workflowId, 'KANBAN_COLUMNS_SAVE');
    wf_seed_default_status_map($workflowId);
    wf_json_response(['success' => true, 'data' => wf_load_kanban_columns_for_workflow($workflowId)]);
```

- [ ] **Step 4: Verify with curl** (use a real admin token the way the earlier debugging session did — `x-user-code: admin`, `x-user-token: <current valid token>`, `X-Sof-User-Token: 8c4f2b9a71d6e3fadsafas23432423b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8`)

```bash
curl -s -X POST "http://localhost/v2.des.plan.banhangonline.top/workflow-api/index.php?action=kanban_column.save" \
  -H "Content-Type: application/json" \
  -H "X-Sof-User-Token: 8c4f2b9a71d6e3fadsafas23432423b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8" \
  -H "x-user-code: admin" -H "x-user-token: <TOKEN>" \
  -d '{"workflow_id": 1, "columns": [{"code":"TODO","label":"Cần làm"},{"code":"IN_PROGRESS","label":"Đang làm"},{"code":"DONE","label":"Hoàn thành"}]}'
mysql -h localhost -u root hao_erp_sofv5_0 -e "SELECT * FROM wf_kanban_status_map WHERE workflow_id=1;"
```

Expected: 3 rows — `TODO`→0 (reverse target 1), `IN_PROGRESS`→1 (reverse target 1), `DONE`→2 (reverse target 1).

- [ ] **Step 5: No git commit** (this file has no version control — the edit is already live on disk; re-read the file after editing to confirm it saved correctly)

---

### Task 3: workflow-api — reusable status-apply helper + new `task.updateStatusFromPlan` action

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php:188-220` (refactor `wf_h_task_update_status`, add `wf_apply_task_status`, `wf_sync_plan_task_status`, `wf_h_task_update_status_from_plan`)
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/index.php:49-64` (register the new action)

**Interfaces:**
- Consumes: `wf_query`, `wf_execute`, `wf_error`, `wf_json_response`, `wf_log_history`, `wf_require_department_or_admin`, `wf_maybe_advance_stage`, `wf_project_kanban_columns_by_id`, `wf_load_task_full` (all existing, unchanged signatures).
- Produces: `wf_apply_task_status($id, $status)` — returns nothing, calls `wf_error` (exits) on invalid/blocked transition. `wf_sync_plan_task_status($workflowTaskId, $columnCode, $workflowId)` — void, no-op if no link or no mapping row. New route `task.updateStatusFromPlan` → `wf_h_task_update_status_from_plan($input)`, input `{task_id, plan_status}` (plan_status is 0/1/2 int).

- [ ] **Step 1: Read the current function to confirm it matches**

```bash
sed -n '188,220p' "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php"
```

Confirm it matches the `wf_h_task_update_status` body shown in the spec discussion (validates status against project's kanban columns, requires department, blocks DONE without full confirms, updates `wf_project_task`, logs history, advances stage).

- [ ] **Step 2: Replace the whole `wf_h_task_update_status` function (lines 188-220) with this**

```php
// Logic loi cua 1 lan doi trang thai cong viec Workflow - tach rieng khoi
// wf_h_task_update_status de tai su dung tu ca 2 chieu (Workflow tu doi va
// Ke hoach doi ho). Goi wf_error() (exit ngay) neu bi chan.
function wf_apply_task_status($id, $status)
{
    $tasks = wf_query("SELECT * FROM wf_project_task WHERE id=?", '', [$id]);
    if (count($tasks) === 0) wf_error('Không tìm thấy công việc', 404);
    $task = $tasks[0];

    $columns = wf_project_kanban_columns_by_id($task['project_id']);
    $codes = array_map(fn($c) => $c['code'], $columns);
    if (!in_array($status, $codes, true)) wf_error('Trạng thái không hợp lệ');

    wf_require_department_or_admin($task['department_code']);

    if ($status === 'DONE') {
        $pending = wf_query("SELECT COUNT(*) AS c FROM wf_task_confirm WHERE task_id=? AND status<>'CONFIRMED'", '', [$id]);
        if ((int)$pending[0]['c'] > 0) {
            wf_error('Công việc cần đủ xác nhận của các phòng ban liên quan trước khi hoàn thành (DONE)');
        }
    }

    $completedAt = $status === 'DONE' ? date('Y-m-d H:i:s') : null;
    wf_execute("UPDATE wf_project_task SET status=?, completed_at=? WHERE id=?", '', [$status, $completedAt, $id]);
    wf_log_history($task['project_id'], 'TASK', $id, 'STATUS_' . $status, $task['code']);

    if ($status === 'DONE') {
        wf_maybe_advance_stage($task['project_stage_id']);
    }
}

// Neu cong viec Workflow nay dang duoc 1 dong Ke hoach (cr_lv0005.wf_task_id)
// tham chieu toi, dong bo lv011 theo mapping cua workflow. Khong lam gi neu
// khong co lien ket hoac chua cau hinh mapping cho cot nay.
function wf_sync_plan_task_status($workflowTaskId, $columnCode, $workflowId)
{
    $maps = wf_query(
        "SELECT plan_status_value FROM wf_kanban_status_map WHERE workflow_id=? AND column_code=?",
        '',
        [$workflowId, $columnCode]
    );
    if (count($maps) === 0) return;
    $planStatus = (int)$maps[0]['plan_status_value'];
    wf_execute("UPDATE cr_lv0005 SET lv011=? WHERE wf_task_id=?", '', [$planStatus, $workflowTaskId]);
}

function wf_h_task_update_status($input)
{
    $id = (int)($input['id'] ?? 0);
    $status = strtoupper(trim((string)($input['status'] ?? '')));
    if ($id <= 0) wf_error('Thiếu id công việc');

    $tasks = wf_query("SELECT project_id FROM wf_project_task WHERE id=?", '', [$id]);
    if (count($tasks) === 0) wf_error('Không tìm thấy công việc', 404);
    $projectId = $tasks[0]['project_id'];

    wf_apply_task_status($id, $status);

    $projects = wf_query("SELECT workflow_id FROM wf_project WHERE id=?", '', [$projectId]);
    if (count($projects) > 0) {
        wf_sync_plan_task_status($id, $status, $projects[0]['workflow_id']);
    }

    wf_json_response(['success' => true, 'data' => wf_load_task_full($id)]);
}

// Duoc goi khi nguoi dung doi trang thai tu phia man hinh Ke hoach (Giao
// Viec Tab) cho 1 cong viec da lien ket sang Workflow. Tra ve dung mapping
// nguoc (is_reverse_target=1) roi tai su dung wf_apply_task_status() de giu
// nguyen quy tac xac nhan phong ban - neu bi chan se wf_error() va KHONG ghi
// gi ca ben Ke hoach.
function wf_h_task_update_status_from_plan($input)
{
    $taskId = (int)($input['task_id'] ?? 0);
    $planStatus = (int)($input['plan_status'] ?? -1);
    if ($taskId <= 0) wf_error('Thiếu id công việc');
    if (!in_array($planStatus, [0, 1, 2], true)) wf_error('Trạng thái kế hoạch không hợp lệ');

    $tasks = wf_query("SELECT project_id FROM wf_project_task WHERE id=?", '', [$taskId]);
    if (count($tasks) === 0) wf_error('Không tìm thấy công việc', 404);
    $projectId = $tasks[0]['project_id'];

    $projects = wf_query("SELECT workflow_id FROM wf_project WHERE id=?", '', [$projectId]);
    if (count($projects) === 0) wf_error('Không tìm thấy dự án', 404);
    $workflowId = $projects[0]['workflow_id'];

    $targets = wf_query(
        "SELECT column_code FROM wf_kanban_status_map WHERE workflow_id=? AND plan_status_value=? AND is_reverse_target=1",
        '',
        [$workflowId, $planStatus]
    );
    if (count($targets) === 0) wf_error('Chưa cấu hình ánh xạ trạng thái cho workflow này');
    $targetColumn = $targets[0]['column_code'];

    wf_apply_task_status($taskId, $targetColumn);

    wf_execute("UPDATE cr_lv0005 SET lv011=? WHERE wf_task_id=?", '', [$planStatus, $taskId]);

    wf_json_response(['success' => true, 'data' => wf_load_task_full($taskId)]);
}
```

- [ ] **Step 3: Register the new action in the route table**

In `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/index.php`, find:

```php
    'task.updateStatus' => 'handlers/kanban.php:wf_h_task_update_status',
```

Add immediately after it:

```php
    'task.updateStatusFromPlan' => 'handlers/kanban.php:wf_h_task_update_status_from_plan',
```

- [ ] **Step 4: Verify the existing (unlinked) status-update path still works**

```bash
curl -s -X POST "http://localhost/v2.des.plan.banhangonline.top/workflow-api/index.php?action=task.updateStatus" \
  -H "Content-Type: application/json" \
  -H "X-Sof-User-Token: 8c4f2b9a71d6e3fadsafas23432423b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8" \
  -H "x-user-code: admin" -H "x-user-token: <TOKEN>" \
  -d '{"id": 1, "status": "IN_PROGRESS"}'
```

Expected: `{"success":true,"data":{...}}` same shape as before this task (regression check — Task 3 refactored this function, must not change its behavior for unlinked tasks).

- [ ] **Step 5: Verify the new action rejects an unlinked/unmapped combo cleanly**

```bash
curl -s -X POST "http://localhost/v2.des.plan.banhangonline.top/workflow-api/index.php?action=task.updateStatusFromPlan" \
  -H "Content-Type: application/json" \
  -H "X-Sof-User-Token: 8c4f2b9a71d6e3fadsafas23432423b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8" \
  -H "x-user-code: admin" -H "x-user-token: <TOKEN>" \
  -d '{"task_id": 1, "plan_status": 2}'
```

Expected: since `cr_lv0005.wf_task_id` has no rows yet (Task 6/7 not done), the `wf_apply_task_status` call still runs (this task's job is the workflow-side transition) and either succeeds or returns the existing "cần đủ xác nhận" error depending on task 1's confirm state — either way it must NOT PHP-error/500. A 500 means a typo in the SQL/column names above; re-check before moving on.

- [ ] **Step 6: No git commit** (no version control in this folder)

---

### Task 4: workflow-api — expose the link on "Công việc phải làm"

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php` (`wf_h_my_tasks`, currently around line 74-98 — line numbers shifted after Task 3's edit, search by function name)

**Interfaces:**
- Consumes: same `wf_query` pattern as the rest of the file.
- Produces: each row returned by `task.myTasks` gains `linked_plan_task_id` (string/int `cr_lv0005.lv001` or `null`).

- [ ] **Step 1: Find and read the current function**

```bash
grep -n "function wf_h_my_tasks" -A 25 "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php"
```

- [ ] **Step 2: Replace the SQL query line**

Find:

```php
    $rows = wf_query(
        "SELECT t.*, ps.name AS stage_name, ps.code AS stage_code, p.code AS project_code, p.name AS project_name, p.kanban_columns_json
         FROM wf_project_task t
         JOIN wf_project_stage ps ON ps.id = t.project_stage_id
         JOIN wf_project p ON p.id = t.project_id
         WHERE t.assignee_code = ? OR (COALESCE(NULLIF(t.assignee_code, ''), '') = '' AND t.department_code = ?)
         ORDER BY (t.status = 'DONE'), t.deadline IS NULL, t.deadline ASC",
        '',
        [$code, $dept]
    );
```

Replace with:

```php
    $rows = wf_query(
        "SELECT t.*, ps.name AS stage_name, ps.code AS stage_code, p.code AS project_code, p.name AS project_name, p.kanban_columns_json,
                pl.lv001 AS linked_plan_task_id
         FROM wf_project_task t
         JOIN wf_project_stage ps ON ps.id = t.project_stage_id
         JOIN wf_project p ON p.id = t.project_id
         LEFT JOIN cr_lv0005 pl ON pl.wf_task_id = t.id
         WHERE t.assignee_code = ? OR (COALESCE(NULLIF(t.assignee_code, ''), '') = '' AND t.department_code = ?)
         ORDER BY (t.status = 'DONE'), t.deadline IS NULL, t.deadline ASC",
        '',
        [$code, $dept]
    );
```

- [ ] **Step 3: Verify with curl**

```bash
curl -s -X POST "http://localhost/v2.des.plan.banhangonline.top/workflow-api/index.php?action=task.myTasks" \
  -H "Content-Type: application/json" \
  -H "X-Sof-User-Token: 8c4f2b9a71d6e3fadsafas23432423b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8" \
  -H "x-user-code: admin" -H "x-user-token: <TOKEN>" -d '{}'
```

Expected: `success:true`, each row now has a `linked_plan_task_id` key (null until Task 7 creates real links).

- [ ] **Step 4: No git commit**

---

### Task 5: Legacy — accept `wf_project_id` on the plan header (cr_lv0004 / class `cr_lv0094`)

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/clsall/cr_lv0094.php` (property list near line 5-27, `LV_Insert()` near 1592-1647, `LV_Update()` near 1676+, `LV_LoadID()` near 1227-1250-ish)

No change needed in `services.sof.vn/index.php` — its generic `case 'insert'`/`case 'update'` blocks for `cr_lv0094` (around line 4666-4760) already do `foreach ($input as $key => $value) { if (property_exists($class, $key)) $class->$key = $value; }`, so any input key matching a public property on the class is picked up automatically.

**Interfaces:**
- Produces: `cr_lv0094::$wf_project_id` (public, nullable int-as-string) — round-trips through insert, update, and `LV_LoadID()`.

- [ ] **Step 1: Read the property block**

```bash
sed -n '1,30p' "c:/laragon/www/v2.des.plan.banhangonline.top/clsall/cr_lv0094.php"
```

- [ ] **Step 2: Add the new public property**

Find:

```php
	public $lv501 = null;
	public $context_lv501 = null;
```

Add immediately after:

```php
	public $lv501 = null;
	public $context_lv501 = null;
	public $wf_project_id = null;
```

- [ ] **Step 3: Add the column to `LV_Insert()`**

Find the `INSERT INTO cr_lv0004 (` statement (around line 1603-1638). Add `wf_project_id` to the column list and a matching bound value. The column list currently ends `..., lv101, lv102` and the VALUES list ends `..., '$v_lv101', '" . (float) $this->lv102 . "'`. Change both:

```php
		$lvsql = "INSERT INTO cr_lv0004 (
					lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv009, lv501, 
					lv069, lv072, lv073, lv074, lv075, lv076, lv077, lv078, lv079, lv080, 
					lv081, lv082, lv083, lv084, lv085, lv097, lv098, lv100, lv101, lv102,
					wf_project_id
				) VALUES (
					'$this->lv001', 
					'" . sof_escape_string($this->lv002) . "', 
					'$this->lv003', 
					'$this->LV_UserID', 
					'$this->lv005', 
					'$this->lv006', 
					'$this->lv007', 
					'1', 
					'" . sof_escape_string($this->lv009) . "', 
					'" . (int) $this->lv501 . "',
					'" . sof_escape_string($this->lv069) . "', 
					'" . (float) $this->lv072 . "', 
					'" . (float) $this->lv073 . "', 
					'$v_lv074', 
					'" . (float) $this->lv075 . "', 
					'" . sof_escape_string($this->lv076) . "', 
					'$v_lv077', 
					'$v_lv078', 
					'" . sof_escape_string($this->lv079) . "', 
					'" . sof_escape_string($this->lv080) . "', 
					'" . sof_escape_string($this->lv081) . "', 
					'" . sof_escape_string($this->lv082) . "', 
					'" . sof_escape_string($this->lv083) . "', 
					'" . sof_escape_string($this->lv084) . "', 
					'" . sof_escape_string($this->lv085) . "', 
					'" . sof_escape_string($this->lv097) . "', 
					'" . (int) $this->lv098 . "', 
					'" . (int) $this->lv100 . "', 
					'$v_lv101', 
					'" . (float) $this->lv102 . "',
					" . ($this->wf_project_id !== null && $this->wf_project_id !== '' ? (int) $this->wf_project_id : 'NULL') . "
				)";
```

(Only the column list and the VALUES list changed — every other line in `LV_Insert()` stays as-is, including the `if ($vReturn) { ... }` block below it.)

- [ ] **Step 4: Add the column to `LV_Update()`**

Read the function first:

```bash
sed -n '1676,1710p' "c:/laragon/www/v2.des.plan.banhangonline.top/clsall/cr_lv0094.php"
```

Find the `$vsql = "Update cr_lv0004 set ...` statement's first few lines:

```php
		$vsql = "Update cr_lv0004 set 
					lv002='" . sof_escape_string($this->lv002) . "',
					lv007='" . sof_escape_string($this->lv007) . "',
					lv501='" . (int) $this->lv501 . "',
					lv009='" . sof_escape_string($this->lv009) . "',
```

Add a new line right after the `lv501=...` line:

```php
		$vsql = "Update cr_lv0004 set 
					lv002='" . sof_escape_string($this->lv002) . "',
					lv007='" . sof_escape_string($this->lv007) . "',
					lv501='" . (int) $this->lv501 . "',
					wf_project_id=" . ($this->wf_project_id !== null && $this->wf_project_id !== '' ? (int) $this->wf_project_id : 'NULL') . ",
					lv009='" . sof_escape_string($this->lv009) . "',
```

Leave the rest of the SET clause and the `WHERE lv001=...` untouched.

- [ ] **Step 5: Add it to `LV_LoadID()`** (needed so `detailData.plan.wf_project_id` is populated when GiaoViecTab reads the plan)

```bash
sed -n '1227,1250p' "c:/laragon/www/v2.des.plan.banhangonline.top/clsall/cr_lv0094.php"
```

Find the block of `$this->lvXXX = $vrow['lvXXX'];` assignments inside `LV_LoadID($vlv001)`. Add one more line anywhere in that block:

```php
			$this->wf_project_id = $vrow['wf_project_id'] ?? null;
```

- [ ] **Step 6: Verify via the running app**

With `npm start` already serving the app on port 3000: open "Quản lý kế hoạch", create or edit a plan, open browser DevTools → Network, submit the form, and inspect the `services.sof.vn/index.php?action=cr_lv0094&func=insert` (or `update`) request/response — confirm no PHP error/500 and `success:true`. Then:

```bash
mysql -h localhost -u root hao_erp_sofv5_0 -e "SELECT lv001, lv002, wf_project_id FROM cr_lv0004 ORDER BY lv003 DESC LIMIT 3;"
```

(`wf_project_id` will be NULL until Task 8 adds the frontend field that actually sends a value — this step is just confirming insert/update don't break.)

- [ ] **Step 7: No git commit**

---

### Task 6: Legacy — accept `wf_task_id` on plan tasks (cr_lv0005 / class `cr_lv0025`) + live JOIN on read

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/clsall/cr_lv0025-1.php` (property list near line 5-27, `LV_Insert()` near 180-191, `LV_Update()` near 221-231, `LoadCongViecXemTongCVJSON()` near 1861-1901)
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/services.sof.vn/index.php:4274-4360` (case `cr_lv0025_xemtongcv`, sub-cases `insert` and `update` — this one does NOT use the generic property loop, so it needs 2 explicit lines)

**Interfaces:**
- Produces: `cr_lv0025::$wf_task_id` (public, nullable int-as-string). `LoadCongViecXemTongCVJSON()` rows gain `wf_task_code`, `wf_task_name`, `wf_task_status` (all null when unlinked).

- [ ] **Step 1: Add the property**

In `clsall/cr_lv0025-1.php`, find:

```php
	public $lv501 = null;
	public $context_lv501 = null;
```

Add:

```php
	public $lv501 = null;
	public $context_lv501 = null;
	public $wf_task_id = null;
```

- [ ] **Step 2: Add the column to `LV_Insert()`**

Current function (read first with `sed -n '180,192p' ".../clsall/cr_lv0025-1.php"`):

```php
	function LV_Insert()
	{
		if ($this->isAdd == 0) return false;
		if (!$this->LV_CheckLocked($this->lv002)) return false;
		$this->lv005 = ($this->lv005 != "") ? recoverdate(($this->lv005), $this->lang) . ' ' . substr($this->lv005, 11, 8) : $this->DateDefault;
		$this->lv012 = ($this->lv012 != "") ? recoverdate(($this->lv012), $this->lang) . ' ' . substr($this->lv012, 11, 8) : $this->DateDefault;
		if ($this->lv049 == ''  || $this->lv049 < '2') $this->lv049 = $this->GetType($this->lv003);
		$lvsql = "insert into cr_lv0005 (lv002,lv003,lv501,lv004,lv005,lv006,lv007,lv008,lv009,lv010,lv011,lv012,lv013,lv014,lv015,lv016,lv049) values('$this->lv002','$this->lv003','" . sof_escape_string($this->lv501) . "','" . sof_escape_string($this->lv004) . "','$this->lv005','$this->lv006','$this->lv007','$this->lv008','$this->lv009',now(),'$this->lv011','$this->lv012','$this->lv013','$this->lv014','$this->lv015','$this->lv016','$this->lv049')";
		$vReturn = db_query($lvsql);
```

Change the `$lvsql` line to add the column and a bound value:

```php
		$lvsql = "insert into cr_lv0005 (lv002,lv003,lv501,lv004,lv005,lv006,lv007,lv008,lv009,lv010,lv011,lv012,lv013,lv014,lv015,lv016,lv049,wf_task_id) values('$this->lv002','$this->lv003','" . sof_escape_string($this->lv501) . "','" . sof_escape_string($this->lv004) . "','$this->lv005','$this->lv006','$this->lv007','$this->lv008','$this->lv009',now(),'$this->lv011','$this->lv012','$this->lv013','$this->lv014','$this->lv015','$this->lv016','$this->lv049'," . ($this->wf_task_id !== null && $this->wf_task_id !== '' ? (int) $this->wf_task_id : 'NULL') . ")";
```

- [ ] **Step 3: Add the column to `LV_Update()`**

Current (`sed -n '221,231p' ".../clsall/cr_lv0025-1.php"`):

```php
	function LV_Update()
	{
		if ($this->isEdit == 0) return false;
		if (!$this->LV_CheckLocked($this->lv002)) return false;
		$this->lv010 = ($this->lv010 != "") ? recoverdate(($this->lv010), $this->lang) . ' ' . substr($this->lv010, 11, 8) : $this->DateDefault;
		$this->lv005 = ($this->lv005 != "") ? recoverdate(($this->lv005), $this->lang) . ' ' . substr($this->lv005, 11, 8) : $this->DateDefault;
		$lvsql = "Update cr_lv0005 set lv002='$this->lv002',lv003='$this->lv003',lv501='" . sof_escape_string($this->lv501) . "',lv004='" . sof_escape_string($this->lv004) . "',lv005='$this->lv005',lv006='$this->lv006',lv007='$this->lv007',lv008='$this->lv008',lv013='$this->lv013',lv014='$this->lv014',lv015='$this->lv015',lv049='$this->lv049' where lv001='$this->lv001' and lv011=0 and lv027=0";
		$vReturn = db_query($lvsql);
```

Change the `$lvsql` line:

```php
		$lvsql = "Update cr_lv0005 set lv002='$this->lv002',lv003='$this->lv003',lv501='" . sof_escape_string($this->lv501) . "',lv004='" . sof_escape_string($this->lv004) . "',lv005='$this->lv005',lv006='$this->lv006',lv007='$this->lv007',lv008='$this->lv008',lv013='$this->lv013',lv014='$this->lv014',lv015='$this->lv015',lv049='$this->lv049',wf_task_id=" . ($this->wf_task_id !== null && $this->wf_task_id !== '' ? (int) $this->wf_task_id : 'NULL') . " where lv001='$this->lv001' and lv011=0 and lv027=0";
```

- [ ] **Step 4: Add the LEFT JOIN in `LoadCongViecXemTongCVJSON()`**

Read first: `sed -n '1861,1885p' ".../clsall/cr_lv0025-1.php"`. Find:

```php
	public function LoadCongViecXemTongCVJSON($planID)
	{
		$this->lv002 = $planID;
		$sqlS = "SELECT A.*, 
				   E.lv002 as ten_nguoi_thuc_hien, 
				   CO.lv002 as ten_nguoi_phoi_hop, 
				   CR.lv002 as ten_nguoi_tao, 
				   AP.lv002 as ten_nguoi_duyet,
				   T.lv002 as ten_loai_cong_viec,
				   G.lv002 as ten_loai_cv,
				   J.lv005 as ten_tac_vu
			FROM cr_lv0005 A 
			INNER JOIN cr_lv0004 C ON A.lv002=C.lv001
			LEFT JOIN hr_lv0020 E ON A.lv006 = E.lv001
			LEFT JOIN hr_lv0020 CO ON A.lv007 = CO.lv001
			LEFT JOIN hr_lv0020 CR ON A.lv009 = CR.lv001
			LEFT JOIN hr_lv0020 AP ON A.lv008 = AP.lv001
			LEFT JOIN cr_lv0003 T ON A.lv003 = T.lv001
			LEFT JOIN cr_lv0092 G ON A.lv049 = G.lv001
			LEFT JOIN da_lh0003 J ON A.lv501 = J.lv004 AND J.lv018 = C.lv501
			WHERE 1=1 " . $this->GetCondition() . " 
			ORDER BY A.lv005 DESC, A.lv001 DESC";
```

Replace with (adds one LEFT JOIN and 3 selected columns, everything else identical):

```php
	public function LoadCongViecXemTongCVJSON($planID)
	{
		$this->lv002 = $planID;
		$sqlS = "SELECT A.*, 
				   E.lv002 as ten_nguoi_thuc_hien, 
				   CO.lv002 as ten_nguoi_phoi_hop, 
				   CR.lv002 as ten_nguoi_tao, 
				   AP.lv002 as ten_nguoi_duyet,
				   T.lv002 as ten_loai_cong_viec,
				   G.lv002 as ten_loai_cv,
				   J.lv005 as ten_tac_vu,
				   WT.code as wf_task_code,
				   WT.name as wf_task_name,
				   WT.status as wf_task_status
			FROM cr_lv0005 A 
			INNER JOIN cr_lv0004 C ON A.lv002=C.lv001
			LEFT JOIN hr_lv0020 E ON A.lv006 = E.lv001
			LEFT JOIN hr_lv0020 CO ON A.lv007 = CO.lv001
			LEFT JOIN hr_lv0020 CR ON A.lv009 = CR.lv001
			LEFT JOIN hr_lv0020 AP ON A.lv008 = AP.lv001
			LEFT JOIN cr_lv0003 T ON A.lv003 = T.lv001
			LEFT JOIN cr_lv0092 G ON A.lv049 = G.lv001
			LEFT JOIN da_lh0003 J ON A.lv501 = J.lv004 AND J.lv018 = C.lv501
			LEFT JOIN wf_project_task WT ON A.wf_task_id = WT.id
			WHERE 1=1 " . $this->GetCondition() . " 
			ORDER BY A.lv005 DESC, A.lv001 DESC";
```

- [ ] **Step 5: Wire `wf_task_id` through the `insert`/`update` case blocks in `services.sof.vn/index.php`**

Read first: `sed -n '4274,4360p' "c:/laragon/www/v2.des.plan.banhangonline.top/services.sof.vn/index.php"`.

In the `case 'insert':` block, find:

```php
                $mocr_lv0025->lv013 = $data['lv013'] ?? 'CUS';
                $mocr_lv0025->lv014 = $data['lv014'] ?? '';

                //$mocr_lv0025->isAdd = 1;
```

Add one line before `//$mocr_lv0025->isAdd = 1;`:

```php
                $mocr_lv0025->lv013 = $data['lv013'] ?? 'CUS';
                $mocr_lv0025->lv014 = $data['lv014'] ?? '';
                $mocr_lv0025->wf_task_id = !empty($data['wf_task_id']) ? (int) $data['wf_task_id'] : null;

                //$mocr_lv0025->isAdd = 1;
```

In the `case 'update':` block, find:

```php
                if (isset($data['lv014']))
                    $mocr_lv0025->lv014 = $data['lv014'];

                if (isset($data['lv005'])) {
```

Add a check for `wf_task_id` right after the `lv014` block:

```php
                if (isset($data['lv014']))
                    $mocr_lv0025->lv014 = $data['lv014'];
                if (isset($data['wf_task_id']))
                    $mocr_lv0025->wf_task_id = !empty($data['wf_task_id']) ? (int) $data['wf_task_id'] : null;

                if (isset($data['lv005'])) {
```

- [ ] **Step 6: Verify with the running app + direct SQL**

`npm start` should already be serving. In "Quản lý kế hoạch" → open a plan → "Giao việc" tab → use browser DevTools to manually POST a test payload (or wait for Task 10 to add the real UI) — for now, confirm no PHP error by re-running the existing quick-add flow (type a task name, submit) and checking:

```bash
mysql -h localhost -u root hao_erp_sofv5_0 -e "SELECT lv001, lv002, lv004, wf_task_id FROM cr_lv0005 ORDER BY lv001 DESC LIMIT 3;"
```

Expected: insert still succeeds, `wf_task_id` is NULL (no UI sends it yet — that's Task 10).

- [ ] **Step 7: No git commit**

---

### Task 7: Frontend — `workflowApi.js` new export

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/services/workflowApi.js:56` (after `updateTaskStatus`)

**Interfaces:**
- Produces: `updateTaskStatusFromPlan(taskId, planStatus)` → `Promise` resolving to the task data, throws on error (same pattern as every other export in this file via `callWorkflowApi`).

- [ ] **Step 1: Add the new export**

Find:

```js
export const updateTaskStatus = (id, status) => callWorkflowApi("task.updateStatus", { id, status });
```

Add immediately after:

```js
export const updateTaskStatus = (id, status) => callWorkflowApi("task.updateStatus", { id, status });
export const updateTaskStatusFromPlan = (taskId, planStatus) =>
  callWorkflowApi("task.updateStatusFromPlan", { task_id: taskId, plan_status: planStatus });
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "e:/SOF/PLAN/SOF_PLAN" && node -e "require('@babel/core')" 2>/dev/null; npx eslint src/services/workflowApi.js
```

Expected: no new lint errors introduced (pre-existing warnings in the file, if any, are fine — only check nothing new appears on this line).

- [ ] **Step 3: Commit**

```bash
git add src/services/workflowApi.js
git commit -m "Add updateTaskStatusFromPlan to workflowApi"
```

---

### Task 8: Frontend — link a Kế hoạch to a Workflow project

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyKeHoach/QuanLyKeHoach.jsx` (imports near top, Form.Item block near line 1209-1215)

**Interfaces:**
- Consumes: `workflowApi.listProjects()` (existing, returns `[{id, code, name, customer_name, ...}]`, confirmed working via curl in the earlier debugging session).
- Produces: form field `wf_project_id` — flows through `handleSubmit`'s `payload = {...values, ...}` (already generic, no change needed there) straight to the backend from Task 5.

- [ ] **Step 1: Add the import**

Near the top of `QuanLyKeHoach.jsx`, alongside other imports (find the line importing `execCRUD`):

```js
import { execCRUD } from '../../services/apiServices';
```

Add:

```js
import { execCRUD } from '../../services/apiServices';
import * as workflowApi from '../../services/workflowApi';
```

- [ ] **Step 2: Add state + loader for the project list**

Find the component's other `useState` declarations near the top of the component function and add:

```js
const [wfProjects, setWfProjects] = useState([]);
```

Find the component's main data-loading `useEffect` (the one that calls `fetchData()` on mount) and add a sibling effect right after it:

```js
useEffect(() => {
    workflowApi.listProjects().then(setWfProjects).catch(() => setWfProjects([]));
}, []);
```

- [ ] **Step 3: Add the Form.Item**

Find:

```jsx
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv501" label="Dự án" rules={[{ required: true, message: 'Vui lòng chọn dự án!' }]}>
                                    <SelectDuAn style={{ width: '100%' }} placeholder="Chọn dự án..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
```

Add a new `Col` right after it (before the `lv069` "Mã cha" one):

```jsx
                        <Col span={8}>
                            <Suspense fallback={<Spin size="small" />}>
                                <Form.Item name="lv501" label="Dự án" rules={[{ required: true, message: 'Vui lòng chọn dự án!' }]}>
                                    <SelectDuAn style={{ width: '100%' }} placeholder="Chọn dự án..." size="small" popupMatchSelectWidth={false} dropdownMatchSelectWidth={false} />
                                </Form.Item>
                            </Suspense>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="wf_project_id" label="Dự án Workflow (tùy chọn)">
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder="Liên kết dự án Workflow..."
                                    size="small"
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    options={wfProjects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                                />
                            </Form.Item>
                        </Col>
```

(`Select` is already imported from `antd` at the top of this file — confirm with `grep -n "from 'antd'" QuanLyKeHoach.jsx` before this step; if `Select` isn't in that import list, add it.)

- [ ] **Step 4: Manual verification**

`npm start`, open "Quản lý kế hoạch" → "Thêm kế hoạch" → confirm the new "Dự án Workflow (tùy chọn)" dropdown appears, lists real workflow projects (from the same list `ProjectList.jsx` shows), can be left empty, and after saving + reopening the same plan for edit, the previously-selected project is still shown (proves `LV_LoadID` from Task 5 Step 5 round-trips it).

- [ ] **Step 5: Commit**

```bash
git add src/pages/QuanLyKeHoach/QuanLyKeHoach.jsx
git commit -m "Add optional Workflow project link field to plan form"
```

---

### Task 9: Frontend — link + auto-fill + status sync in Giao Việc Tab

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyKeHoach/tabs/GiaoViecTab.jsx`

**Interfaces:**
- Consumes: `workflowApi.getKanbanProjectBoard(wfProjectId)` (existing, returns `{tasks: [{id, code, name, department_code, deadline, status, ...}]}`, confirmed via curl earlier), `workflowApi.updateTaskStatusFromPlan(taskId, planStatus)` (Task 7), `detailData.plan.wf_project_id` (Task 5/8).
- Produces: `quickRowData.wf_task_id`, sent as `payload.data.wf_task_id` in the existing `insert` call (Task 6 backend already accepts it).

- [ ] **Step 1: Add state for the Workflow task list + loader**

Find:

```js
    // Quick Add state (Inline row editor values)
    const [quickRowData, setQuickRowData] = useState({
        lv003: '',
        lv049: '',
        lv501: '',
        lv004: '',
        lv005: dayjs(),
        lv005_time: '17:00:00',
        lv006: '',
        lv007: '',
        lv008: '',
        lv013: 'CUS',
        lv014: '',
        lv111: ''
    });
```

Add `wf_task_id: null` to the initial state:

```js
    // Quick Add state (Inline row editor values)
    const [quickRowData, setQuickRowData] = useState({
        lv003: '',
        lv049: '',
        lv501: '',
        lv004: '',
        lv005: dayjs(),
        lv005_time: '17:00:00',
        lv006: '',
        lv007: '',
        lv008: '',
        lv013: 'CUS',
        lv014: '',
        lv111: '',
        wf_task_id: null
    });
```

Add the import (top of file, alongside `execCRUD`):

```js
import { execCRUD } from '../../../services/apiServices';
```
becomes:
```js
import { execCRUD } from '../../../services/apiServices';
import * as workflowApi from '../../../services/workflowApi';
```

Add new state and a loader effect, near the other `lookups` state:

```js
    const [wfTasks, setWfTasks] = useState([]);

    useEffect(() => {
        const wfProjectId = detailData?.plan?.wf_project_id;
        if (!wfProjectId) {
            setWfTasks([]);
            return;
        }
        workflowApi.getKanbanProjectBoard(wfProjectId)
            .then((data) => setWfTasks(data?.tasks || []))
            .catch(() => setWfTasks([]));
    }, [detailData?.plan?.wf_project_id]);
```

- [ ] **Step 2: Add the reset for `wf_task_id` after successful quick-add** (so the field doesn't stick to the previous task on the next row)

Find (inside `handleQuickSubmit`, the `setQuickRowData` reset after a successful insert):

```js
                setQuickRowData({
                    lv003: lookups.types[0]?.value || '',
                    lv049: lookups.categories[0]?.value || '',
                    lv501: lookups.subTasks[0]?.value || '',
                    lv004: '',
                    lv005: dayjs(),
                    lv005_time: '17:00:00',
                    lv006: currentUserId || 'admin',
                    lv007: '',
                    lv008: currentUserId || 'admin',
                    lv013: 'CUS',
                    lv014: '',
                    lv111: ''
                });
```

Add `wf_task_id: null`:

```js
                setQuickRowData({
                    lv003: lookups.types[0]?.value || '',
                    lv049: lookups.categories[0]?.value || '',
                    lv501: lookups.subTasks[0]?.value || '',
                    lv004: '',
                    lv005: dayjs(),
                    lv005_time: '17:00:00',
                    lv006: currentUserId || 'admin',
                    lv007: '',
                    lv008: currentUserId || 'admin',
                    lv013: 'CUS',
                    lv014: '',
                    lv111: '',
                    wf_task_id: null
                });
```

- [ ] **Step 3: Send `wf_task_id` in the insert payload**

Find (inside `handleQuickSubmit`):

```js
            const payload = {
                planId,
                data: {
                    lv003: quickRowData.lv003 || lookups.types[0]?.value,
                    lv049: quickRowData.lv049 || lookups.categories[0]?.value,
                    lv501: quickRowData.lv501 || lookups.subTasks[0]?.value,
                    lv004: quickRowData.lv004,
                    lv005: dateStr,
                    lv005_time: timeStr,
                    lv006: quickRowData.lv006 || currentUserId || 'admin',
                    lv007: quickRowData.lv007 || '',
                    lv008: quickRowData.lv008 || currentUserId || 'admin',
                    lv013: quickRowData.lv013 || 'CUS',
                    lv014: quickRowData.lv014 || '',
                    lv111: quickRowData.lv111 || ''
                }
            };
```

Add `wf_task_id`:

```js
            const payload = {
                planId,
                data: {
                    lv003: quickRowData.lv003 || lookups.types[0]?.value,
                    lv049: quickRowData.lv049 || lookups.categories[0]?.value,
                    lv501: quickRowData.lv501 || lookups.subTasks[0]?.value,
                    lv004: quickRowData.lv004,
                    lv005: dateStr,
                    lv005_time: timeStr,
                    lv006: quickRowData.lv006 || currentUserId || 'admin',
                    lv007: quickRowData.lv007 || '',
                    lv008: quickRowData.lv008 || currentUserId || 'admin',
                    lv013: quickRowData.lv013 || 'CUS',
                    lv014: quickRowData.lv014 || '',
                    lv111: quickRowData.lv111 || '',
                    wf_task_id: quickRowData.wf_task_id || null
                }
            };
```

- [ ] **Step 4: Add the link dropdown column with autofill**

Find the `Nội dung công việc` (`lv004`) column definition:

```jsx
        {
            title: 'Nội dung công việc',
            dataIndex: 'lv004',
            key: 'lv004',
            ellipsis: true,
            width: 200,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size='small'
                            placeholder='Nhập nội dung...'
                            value={quickRowData.lv004}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv004: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ borderRadius: '4px' }}
                        />
                    );
                }
                return (
                    <Tooltip title={val}>
                        <span style={{ fontWeight: 500 }}>{val}</span>
                    </Tooltip>
                );
            }
        },
```

Insert a new column right before it (a new "Liên kết Workflow" column, only meaningful on the quick-add row):

```jsx
        {
            title: 'Liên kết Workflow',
            key: 'wf_task_link',
            width: 200,
            render: (_, record) => {
                if (record.isQuickRow) {
                    if (wfTasks.length === 0) {
                        return <Text type="secondary" style={{ fontSize: 12 }}>Kế hoạch chưa liên kết dự án Workflow</Text>;
                    }
                    return (
                        <Select
                            size='small'
                            placeholder='Chọn công việc Workflow...'
                            allowClear
                            showSearch
                            optionFilterProp='label'
                            style={{ width: '100%' }}
                            value={quickRowData.wf_task_id}
                            options={wfTasks.map((t) => ({ value: t.id, label: `${t.code} — ${t.name}` }))}
                            onChange={(val) => {
                                const task = wfTasks.find((t) => t.id === val);
                                setQuickRowData((prev) => ({
                                    ...prev,
                                    wf_task_id: val || null,
                                    lv004: !prev.lv004 && task ? task.name : prev.lv004,
                                    lv005: !prev.lv005 && task?.deadline ? dayjs(task.deadline) : prev.lv005,
                                }));
                            }}
                        />
                    );
                }
                return record.wf_task_code
                    ? <Tag color="purple">{record.wf_task_code}</Tag>
                    : <Text type="secondary">—</Text>;
            }
        },
        {
            title: 'Nội dung công việc',
            dataIndex: 'lv004',
            key: 'lv004',
            ellipsis: true,
            width: 200,
            render: (val, record) => {
                if (record.isQuickRow) {
                    return (
                        <Input
                            size='small'
                            placeholder='Nhập nội dung...'
                            value={quickRowData.lv004}
                            onChange={(e) => setQuickRowData({ ...quickRowData, lv004: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickSubmit();
                            }}
                            style={{ borderRadius: '4px' }}
                        />
                    );
                }
                return (
                    <Tooltip title={val}>
                        <span style={{ fontWeight: 500 }}>{val}</span>
                    </Tooltip>
                );
            }
        },
```

(`record.wf_task_code` on non-quick rows comes from Task 6 Step 4's new `LEFT JOIN wf_project_task` columns in `LoadCongViecXemTongCVJSON`.)

- [ ] **Step 5: Route status changes through workflow-api for linked rows**

There is one shared function, `handleTransition`, used by every status-changing button (single-row and batch alike — both ultimately call this with one or more ids). Read it first:

```bash
grep -n "const handleTransition" -A 24 "e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyKeHoach/tabs/GiaoViecTab.jsx"
```

Confirm it matches:

```js
    // State Transitions
    const handleTransition = async (action, ids, label) => {
        try {
            const listIds = Array.isArray(ids) ? ids : [ids];
            let successCount = 0;

            for (const id of listIds) {
                const res = await execCRUD('cr_lv0025_xemtongcv', action, { childId: id });
                if (res && res.success) {
                    successCount++;
                } else {
                    message.error(`Lỗi thực hiện với CV ${id}: ${res?.message || 'Thao tác thất bại'}`);
                }
            }

            if (successCount > 0) {
                message.success(`Đã thực hiện: "${label}" cho ${successCount} công việc`);
                await loadData();
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi thực hiện phê duyệt');
        }
    };
```

Add a constant right above it, and replace its body to check `wf_task_id` before falling back to the legacy call:

```js
    const ACTION_TO_PLAN_STATUS = { startTask: 1, completeTask: 2, unapproveTask: 0 };

    // State Transitions
    const handleTransition = async (action, ids, label) => {
        try {
            const listIds = Array.isArray(ids) ? ids : [ids];
            let successCount = 0;

            for (const id of listIds) {
                const task = tasks.find((t) => t.lv001 === id);
                if (task?.wf_task_id && ACTION_TO_PLAN_STATUS[action] !== undefined) {
                    try {
                        await workflowApi.updateTaskStatusFromPlan(task.wf_task_id, ACTION_TO_PLAN_STATUS[action]);
                        successCount++;
                    } catch (e) {
                        message.error(`CV ${id}: ${e.message}`);
                    }
                    continue;
                }

                const res = await execCRUD('cr_lv0025_xemtongcv', action, { childId: id });
                if (res && res.success) {
                    successCount++;
                } else {
                    message.error(`Lỗi thực hiện với CV ${id}: ${res?.message || 'Thao tác thất bại'}`);
                }
            }

            if (successCount > 0) {
                message.success(`Đã thực hiện: "${label}" cho ${successCount} công việc`);
                await loadData();
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi thực hiện phê duyệt');
        }
    };
```

`proposeApprove` (manager pre-approval) has no workflow-side equivalent and is intentionally left out of `ACTION_TO_PLAN_STATUS` — it always falls through to the legacy call, linked or not (per spec, only start/complete/unapprove need bidirectional sync; manager pre-approval is a Kế hoạch-only concept with no Workflow column to map to).

- [ ] **Step 6: Manual verification (this is the core end-to-end scenario)**

1. `npm start`, open the Workflow project created earlier (or a new one), note a task code (e.g. `KD001`).
2. In "Quản lý kế hoạch", edit the plan and set "Dự án Workflow" to that project (Task 8).
3. Open "Giao việc" tab, use the quick-add row, pick `KD001` in the new "Liên kết Workflow" dropdown — confirm "Nội dung công việc" auto-fills with the task's name.
4. Submit — confirm the new row shows the `KD001` tag.
5. Click "Thực hiện CV" (start) on that row — confirm no error, then check the Workflow project's Kanban board (`/quan-ly-quy-trinh-du-an`) shows `KD001` moved to its "in progress"-mapped column.
6. In the Workflow Kanban, drag `KD001` to the DONE column (if it has pending department confirms, first confirm them via the task drawer) — confirm the Kế hoạch's Giao Việc tab now shows this task as "Đã duyệt" (lv011=2) after a refresh.
7. Create a second linked task, and while its Workflow-side confirms are still pending, try "Hoàn thành CV" from the Kế hoạch side — confirm it's blocked with a clear error message and neither side's status changes.

- [ ] **Step 7: Commit**

```bash
git add src/pages/QuanLyKeHoach/tabs/GiaoViecTab.jsx
git commit -m "Add Workflow task link, autofill, and bidirectional status sync to Giao Viec tab"
```

---

### Task 10: Frontend — linked-plan tag on "Công việc phải làm"

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/MyTasksTab.jsx`

**Interfaces:**
- Consumes: `linked_plan_task_id` field on each row (Task 4).

- [ ] **Step 1: Add the tag to the "Tên công việc" column**

Find:

```jsx
    { title: "Tên công việc", dataIndex: "name", render: (v) => <b>{v}</b> },
```

Replace with:

```jsx
    {
      title: "Tên công việc",
      dataIndex: "name",
      render: (v, r) => (
        <span>
          <b>{v}</b>
          {r.linked_plan_task_id ? <Tag color="purple" style={{ marginLeft: 6 }}>Đã liên kết kế hoạch</Tag> : null}
        </span>
      ),
    },
```

(`Tag` is already imported from `antd` at the top of this file.)

- [ ] **Step 2: Manual verification**

`npm start`, log in, open "Công việc phải làm" for the user assigned/departmentally responsible for the `KD001` task linked in Task 9 — confirm the "Đã liên kết kế hoạch" tag shows next to its name.

- [ ] **Step 3: Commit**

```bash
git add src/pages/QuanLyQuyTrinhDuAn/MyTasksTab.jsx
git commit -m "Show linked-plan tag on My Tasks"
```

---

### Task 11: Frontend — Kanban horizontal scrollbar polish

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyKeHoach/QuanLyKeHoach.module.css:503-508`

**Interfaces:** none (pure CSS).

- [ ] **Step 1: Add explicit scrollbar styling**

Find:

```css
.kanbanBoardContainer {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 24px;
    margin-top: 15px;
}
```

Replace with:

```css
.kanbanBoardContainer {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 24px;
    margin-top: 15px;
    scrollbar-width: thin;
    scrollbar-color: rgba(99, 102, 241, 0.5) transparent;
}

.kanbanBoardContainer::-webkit-scrollbar {
    height: 10px;
}

.kanbanBoardContainer::-webkit-scrollbar-track {
    background: rgba(148, 163, 184, 0.12);
    border-radius: 999px;
}

.kanbanBoardContainer::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.5);
    border-radius: 999px;
}

.kanbanBoardContainer::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.75);
}
```

- [ ] **Step 2: Manual verification**

`npm start`, open a Workflow project's detail page with enough Kanban columns to overflow the viewport width (or narrow the browser window) — confirm a clearly visible thin purple scrollbar appears at the bottom of the board and scrolling works with mouse wheel (shift+scroll) or trackpad horizontal swipe.

- [ ] **Step 3: Commit**

```bash
git add src/pages/QuanLyKeHoach/QuanLyKeHoach.module.css
git commit -m "Add visible custom scrollbar styling to Kanban board container"
```

---

### Task 12: Full end-to-end walkthrough (final verification)

**Files:** none — this task only runs the app and confirms behavior.

- [ ] **Step 1: Run the complete scenario from the spec's "Kiểm thử" section, fresh**

With `npm start` running:
1. Create a new Workflow project (or reuse one) — note a task code.
2. Create a Kế hoạch, link it to that Workflow project (Task 8).
3. In Giao Việc, create a task linked to that Workflow task code (Task 9) — confirm autofill.
4. Change status from the Workflow Kanban side — confirm Kế hoạch reflects it (Task 3+9).
5. Change status from the Kế hoạch side — confirm Workflow reflects it (Task 3+9).
6. Attempt to complete from Kế hoạch while Workflow confirms are pending — confirm it's blocked with a clear message (Task 3).
7. Confirm "Đã liên kết kế hoạch" tag shows in "Công việc phải làm" (Task 10).
8. Confirm the Kanban board's horizontal scrollbar is visibly styled (Task 11).

- [ ] **Step 2: Report results**

If every step in Step 1 passes, the feature is complete. If any step fails, return to the relevant task above, fix, and re-verify that task's own manual verification before re-running this full walkthrough — do not patch forward without re-checking the earlier task's contract still holds.
