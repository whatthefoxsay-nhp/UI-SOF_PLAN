# Dependency & Execution Engine — Design Spec

**Status:** Approved (Phase 1 of the audit roadmap; user picked this phase explicitly and granted autonomy to continue through subsequent phases without further check-ins).

**Source documents:**
- `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` — sections 3-13 (DAG model), 9 (status vs execution state), 25 (acceptance tests TC01-TC03, TC07-TC08).
- Prior spec `docs/superpowers/specs/2026-08-28-workflow-kehoach-sync-design.md` (unrelated feature, already shipped — referenced only for established patterns: `kanban_columns_json` snapshot-at-creation, single-choke-point status writes).

## 1. Problem

The current Workflow module (`workflow-api/`) can only express a strictly sequential chain of stages. Verified directly in code:

- `wf_project_stage.is_parallel` is written and displayed but **never read** by any conditional logic anywhere in `workflow-api/`.
- `wf_h_project_create` (project.php:77-91) opens **only** the stage with `order_no === 1`; every other stage starts `PENDING`.
- `wf_maybe_advance_stage` (kanban.php:113-143) opens the **next stage by `order_no ASC`**, one at a time, when the current stage's tasks are all DONE. There is no way for two stages to be open simultaneously, and no way to say "stage E needs both B and C done" (join) or "task D needs task A OR task B" (branch).
- There is no dependency table anywhere in the schema. No task or stage has any notion of being "blocked" vs "ready" — a task in a `PENDING` stage simply isn't shown as actionable because its stage hasn't opened, not because of any computed state.

This blocks the audit's TC01-TC03, TC07, TC08 acceptance tests (sequential gating, parallel branches, ALL-join, blocked state, unblock-on-dependency-done) and is called out in the audit as the single lowest-scored area (Dependency engine 3/10, Parallel workflow 5/10).

## 2. Scope of this phase

**In scope:**
- Stage-level and task-level dependency graphs, defined once on the **Workflow Template** (`wf_stage`, `wf_task_template`) and copied to each **Project Instance** (`wf_project_stage`, `wf_project_task`) at creation time — matching the existing template/instance split already used for Kanban columns (`kanban_columns_json` snapshot).
- ALL/ANY join semantics per audit section 6, evaluated per dependent node (a task or stage declares whether it needs ALL or ANY of its declared dependencies done).
- A computed `execution_state` (`READY`/`BLOCKED`) column, separate from the user-facing Kanban `status` column, per audit section 9.
- Parallel stage activation: `wf_h_project_create` and `wf_maybe_advance_stage` are rewritten so that **any number of stages** can be `OPEN` at once, gated by dependency satisfaction instead of `order_no` adjacency.
- Cycle detection at save-time in the Workflow Designer (a DAG must not contain cycles — this is an implementation necessity, not something the audit text spells out, since a cycle would permanently deadlock every task/stage in it).
- My Work ("Công việc phải làm") gets a "Bị block" filter (audit section 19 explicitly lists this).
- Kanban cards show a blocked indicator; dragging a blocked task is rejected server-side (same error-surfacing plumbing already used for the confirm-department gate — no new frontend error UX needed, just a new message).
- Realistic seed data across both this module and the already-shipped Kế hoạch-sync feature, so the new engine can actually be exercised with parallel branches, joins, and multiple departments/employees instead of the current 2 projects / 25 tasks / 6 employees.

**Explicitly out of scope for this phase** (deferred to later phases the assistant will pick per the audit's own order, or cut as YAGNI):
- Dependency types other than Finish-to-Start (FS). The audit itself hedges SS/FF/SF as "if actually needed" (section 6) — no evidenced business need exists yet, and adding all four now would roughly double the validation/UI surface for unused cases. `dependency_type` is stored as a column (default `'FS'`) so this can be extended later without a schema change, but only FS is evaluated.
- Master data normalization (Department/Customer/Project Type as real FK'd tables) — audit's own second-priority item, deferred to the next phase per the user's explicit choice this session.
- True event-sourcing / async projections (audit section 16's idealized architecture). This PHP codebase has no queue or worker process anywhere; introducing one is a large, separate infrastructure decision. This phase achieves the same practical effect (Kanban/My Work/Dashboard all read one Task source of truth) via synchronous recomputation at the existing single choke point, which is consistent with how every other feature in this codebase is built (request/response, no async).
- Full Workflow Template versioning/snapshotting beyond what already exists (`kanban_columns_json` snapshot pattern already protects running projects from template column edits; the same snapshot principle is extended to dependency edges below).

## 3. Data model

Four new tables, plus columns on four existing tables. Naming and FK/cascade conventions match the existing `wf_*` schema exactly (`ON DELETE CASCADE` from child to parent, `datetime DEFAULT CURRENT_TIMESTAMP` for audit columns).

### 3.1 Template-level (defined once in Workflow Designer)

```sql
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

ALTER TABLE wf_stage ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER completion_condition;
ALTER TABLE wf_task_template ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER default_priority;
```

`dependency_join_type` is a property of the **dependent** node ("what do I, the node with incoming edges, require of my dependencies"), not of each edge — this matches the audit's own ALL/ANY notation in section 6, where `D.ready = A.done AND B.done AND C.done` is a single formula for D, not per-edge. `'ALL'`/`'ANY'` are the only two allowed values (validated in code, not a SQL ENUM, matching this schema's existing convention of plain VARCHAR + application-level validation seen throughout `wf_*`).

### 3.2 Instance-level (copied from template at project creation; may also be edited ad-hoc afterward for one-off project needs)

```sql
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

ALTER TABLE wf_project_stage ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER completion_condition;
ALTER TABLE wf_project_stage ADD COLUMN execution_state VARCHAR(10) NOT NULL DEFAULT 'READY' AFTER status;
ALTER TABLE wf_project_task ADD COLUMN dependency_join_type VARCHAR(5) NOT NULL DEFAULT 'ALL' AFTER priority;
ALTER TABLE wf_project_task ADD COLUMN execution_state VARCHAR(10) NOT NULL DEFAULT 'READY' AFTER status;
```

`project_id` is denormalized onto both instance dependency tables (derivable via `stage_id`/`task_id` but kept directly for cheap "recompute everything in this project" queries without a join — consistent with `wf_project_task.project_id` itself already being denormalized alongside `project_stage_id` in the existing schema).

### 3.3 `wf_project.current_stage_id` after this change

This column is **kept**, but its meaning narrows from "the one stage that is open" (no longer true once stages run in parallel) to "the most recently opened stage, for display purposes only" (e.g. a page title breadcrumb). No new code should treat it as a gate. `wf_load_project_full` already returns the full `stages` array with per-stage `status`/`execution_state`; any UI that needs "which stages are active" must filter that array (`status === 'OPEN'`), not read `current_stage_id`. Verified via the codebase survey that `ProjectDetail.jsx`'s Kanban view already keys off `project.stages` and a selected-stage-tab state, not off `current_stage_id`, so no frontend rewrite is forced by this change — confirm this in Task 1 by re-reading the component before assuming it, since a stale assumption here would silently break the "which stage is selected by default" UX.

## 4. Execution semantics

### 4.1 "Done" for dependency purposes

A task's dependency is satisfied when that task's **current Kanban column** has `is_done_status = 1` in the project's column snapshot (`wf_project_kanban_columns_by_id`, already used elsewhere in `kanban.php`) — reusing the existing "done" marker rather than inventing a second one. A stage's dependency is satisfied when `wf_project_stage.status = 'DONE'` (already the existing stage-done signal set by `wf_maybe_advance_stage`).

### 4.2 Recompute function (new, kanban.php)

```php
// Tinh lai execution_state (READY/BLOCKED) cho TAT CA task dang BLOCKED trong
// 1 du an, dua tren wf_project_task_dependency + dependency_join_type. Goi
// sau MOI lan doi status cua bat ky task nao (ca tien va lui), vi 1 thay doi
// co the anh huong nhieu task phu thuoc cung luc.
function wf_recompute_task_execution_state($projectId)
{
    $columns = wf_project_kanban_columns_by_id($projectId);
    $doneColumns = array_map(fn($c) => $c['code'], array_filter($columns, fn($c) => (int)$c['is_done_status'] === 1));
    $firstColumn = $columns[0]['code'] ?? null; // cot dau tien theo order_no, xem 4.3

    $tasks = wf_query("SELECT id, status, execution_state, dependency_join_type FROM wf_project_task WHERE project_id=?", '', [$projectId]);
    $tasksById = array_column($tasks, null, 'id');
    $deps = wf_query("SELECT task_id, depends_on_task_id FROM wf_project_task_dependency WHERE project_id=?", '', [$projectId]);
    $depsByTask = [];
    foreach ($deps as $d) $depsByTask[$d['task_id']][] = $d['depends_on_task_id'];

    foreach ($tasks as $task) {
        $taskDeps = $depsByTask[$task['id']] ?? [];
        if (count($taskDeps) === 0) continue; // khong co dependency -> luon READY, khong dong cham

        $doneFlags = array_map(fn($depId) => in_array($tasksById[$depId]['status'] ?? '', $doneColumns, true), $taskDeps);
        $satisfied = $task['dependency_join_type'] === 'ANY' ? in_array(true, $doneFlags, true) : !in_array(false, $doneFlags, true);
        $newState = $satisfied ? 'READY' : 'BLOCKED';

        if ($newState !== $task['execution_state']) {
            // Ket luan thiet ke: chi cho phep BLOCKED tu dong quay lai neu task
            // van con o cot dau tien (chua ai bat dau lam) - tranh giat lui
            // cong viec dang do dang chi vi 1 dependency phia truoc bi mo lai.
            if ($newState === 'BLOCKED' && $task['status'] !== $firstColumn) continue;
            wf_execute("UPDATE wf_project_task SET execution_state=? WHERE id=?", '', [$newState, $task['id']]);
            wf_log_history($projectId, 'TASK', $task['id'], 'EXECUTION_STATE_' . $newState);
        }
    }
}
```

An equivalent `wf_recompute_stage_execution_state($projectId)` follows the same shape against `wf_project_stage_dependency` / `wf_project_stage.status`.

**Ruling recorded here (not left to the implementer to improvise):** when an upstream dependency's status regresses (e.g. someone reopens a "done" task), a dependent that has already progressed past its first column is **not** yanked back to BLOCKED — only a dependent still sitting untouched in its first column re-blocks. This avoids punishing in-progress work for an upstream correction. If this proves wrong in practice, it's a one-line condition to change, not a schema change.

### 4.3 Integration points (both are the existing single choke points — no new call sites needed elsewhere)

- **`wf_apply_task_status`** (kanban.php): add a gate before the existing confirm-department check — if `$task['execution_state'] === 'BLOCKED'` and `$status !== $task['status']` (i.e., an actual attempted transition, not a no-op), reject with `wf_error('Công việc đang bị chặn bởi công việc phụ thuộc chưa hoàn thành, không thể chuyển trạng thái')`. After the existing `UPDATE ... SET status=?` succeeds, call `wf_recompute_task_execution_state($task['project_id'])` and `wf_recompute_stage_execution_state($task['project_id'])` unconditionally (a status change on any task can free any number of downstream tasks/stages). This function is already the single path both the Kanban drag-drop and the reverse Kế-hoạch sync go through (confirmed in the existing code comment at kanban.php:190-192), so both directions get the gate and the recompute for free.
- **`wf_maybe_advance_stage`** (kanban.php): replace the `order_no > ? LIMIT 1` query with: after marking the current stage DONE, call `wf_recompute_stage_execution_state($projectId)`, then `SELECT * FROM wf_project_stage WHERE project_id=? AND status='PENDING' AND execution_state='READY'` (no `LIMIT 1` — **all** newly-ready stages open at once), and open every row returned (`status='OPEN', started_at=NOW()`), logging each. `wf_project.current_stage_id` is updated to whichever of those has the lowest `order_no` (display-only tiebreak, see 3.3). Project-DONE detection changes from "no next stage exists" to "no stage remains with `status IN ('PENDING','OPEN')`".
- **`wf_h_task_confirm`** (kanban.php): its auto-DONE branch (line 348-352) must call the same two recompute functions after setting status DONE, for the same reason.

### 4.4 Project creation (`wf_h_project_create`, project.php)

Two-pass insert, because a dependency edge can point to a task/stage inserted earlier OR later in template order (a DAG has no guaranteed insertion order that satisfies all edges):

1. **Pass 1 (existing loop, minimally changed):** insert every `wf_project_stage` and `wf_project_task` row exactly as today, but track two maps: `$stageTemplateIdToInstanceId` and `$taskTemplateIdToInstanceId`. Every stage/task starts `status='PENDING'` / `'TODO'` and `execution_state='BLOCKED'` **except** ones with zero incoming dependency edges in the template, which start `execution_state='READY'` (and, for stages only, `status='OPEN'` if they have zero incoming stage edges — replacing today's "only order_no===1 opens" rule). `dependency_join_type` is copied from the template row.
2. **Pass 2 (new):** read `wf_stage_dependency`/`wf_task_template_dependency` for this workflow's templates, remap both sides through the two maps built in pass 1, and bulk-insert into `wf_project_stage_dependency`/`wf_project_task_dependency`.
3. Call `wf_recompute_task_execution_state($projectId)` and `wf_recompute_stage_execution_state($projectId)` once at the end as a correctness safety net (pass 1's "zero incoming edges" shortcut is an optimization, not the source of truth — running the real recompute once catches any edge case, e.g. a task whose only dependency is itself-in-a-cycle, which cycle detection at design time should have already prevented, but defense in depth is cheap here and this function is idempotent).

### 4.5 Cycle detection (Workflow Designer save path, workflow.php)

Before persisting a new `wf_stage_dependency` or `wf_task_template_dependency` row, run a DFS from `depends_on_*_id` looking for a path back to `*_id` within the same workflow's existing edges (plus the candidate edge). If found, reject with `wf_error('Không thể thêm phụ thuộc: sẽ tạo vòng lặp (A phụ thuộc B, B lại phụ thuộc A trực tiếp hoặc gián tiếp)')`. This runs at low volume (a handful of stages/tasks per workflow, edited interactively one at a time in the Designer) so a plain in-memory DFS is sufficient — no need for an incremental/indexed cycle-detection structure.

## 5. Frontend changes

- **`WorkflowManager.jsx`**: new "Phụ thuộc" (Dependencies) control per stage and per task template — a multi-select of other stages/tasks in the same workflow (self excluded), plus a `join_type` ALL/ANY radio shown only when 2+ dependencies are selected. Mirrors the existing `confirm_departments` multi-select pattern already in this file for department-approval config, so no new interaction pattern is introduced.
- **`ProjectDetail.jsx`**: Kanban card shows a small lock badge + tooltip listing the names of unmet dependencies when `execution_state === 'BLOCKED'`. Attempting to drag a blocked card still goes through the existing `updateTaskStatus` → error-toast path (no new plumbing) — the badge is purely a proactive hint so users don't have to attempt a drag to discover why a card won't move.
- **`MyTasksTab.jsx`**: extend the existing filter control with a "Bị block" option that filters `execution_state === 'BLOCKED'` client-side (the audit's My Work filter list in section 19: quá hạn/hôm nay/sắp đến hạn/đang làm/chờ người khác/hoàn thành/**bị block**).

## 6. Test data (seeding)

Current dev DB is too thin to exercise any of this: 2 `wf_project` rows, 25 `wf_project_task` rows, 1 `wf_workflow`, 6 `hr_lv0020` employees across 5 departments (2 departments have zero employees), 3 legacy Kế hoạch (`cr_lv0004`) rows with 8 task rows total. A seeding task is part of this plan (not a separate ask) so the parallel/join/block behavior above has real data to exercise and so the already-shipped Kế hoạch-sync feature also gets adequately tested:

- 8-10 more `hr_lv0020` employees, distributed so every one of the 5 existing departments (PB001-PB005: TEC/KD/NS/ACC/TST) has at least 2.
- A second `wf_workflow` template modeling the audit's own worked example (section 4/20): Tiếp nhận → Báo giá → Hợp đồng → **(Backend ∥ Frontend ∥ Database ∥ UI/UX, parallel)** → Integration (ALL-join on the four) → Test → Bàn giao — this is the exact shape the audit uses to argue for the DAG model, so it doubles as a live acceptance-test fixture for TC01-TC03.
- 4-6 new `wf_project` instances from both workflow templates, in varied states (some with a blocked stage, some mid-parallel-execution, one fully DONE) so My Work's new "Bị block" filter and the Kanban board's lock badges have real rows to show.
- 5-8 new legacy `cr_lv0004` Kế hoạch rows with `cr_lv0005` task rows, several with `wf_project_id`/`wf_task_id` populated to link into the new seeded projects, exercising the existing bidirectional sync end to end.

Seeding runs as a standalone idempotent PHP script (direct mysqli, same pattern as this session's schema-inspection scripts) checked into `workflow-api/scripts/seed_dev_data.php` — additive only (never truncates or deletes existing rows), safe to re-run.

## 7. Risks / notes carried into the plan

- **No version control on either PHP backend folder** — every change in Tasks 2+ is a live, unrecoverable-via-git edit (same standing risk as the previous sync feature; mitigated the same way: read-before-write, standalone PHP test harnesses stubbing the DB layer before touching real files, `php -l` syntax checks).
- **`ProjectDetail.jsx`'s exact reliance (or not) on `current_stage_id`** must be re-verified by the Task 1 implementer by reading the file in full before assuming the narrowing in 3.3 is UI-safe — flagged rather than asserted as fact, since the codebase-survey subagent did not exhaustively trace every read site.
- **Reused audit acceptance tests TC01, TC02, TC03, TC07, TC08** should be the literal manual-verification script at the end of the plan (sequential gate, parallel branch, ALL-join, blocked-task, unblock-on-dependency-done) — the audit already wrote these as a checklist, no need to invent new ones.

## 8. Self-review

- **Placeholder scan:** none — every table has full column definitions, every function has real code, no "TBD"/"add validation" phrasing.
- **Internal consistency:** `dependency_join_type` defined identically in both template and instance layers; `execution_state` semantics (4.1-4.2) apply uniformly to both task and stage recompute functions; the single-choke-point claim (4.3) was verified against the actual current file content above, not assumed.
- **Scope check:** scoped to one subsystem (dependency + execution state), explicitly deferring master-data normalization and event-sourcing — both flagged in section 2 rather than silently expanded into.
- **Ambiguity check:** the one genuine judgment call (regression handling in 4.2) is written as an explicit ruling with its rationale, not left for an implementer to guess differently task-to-task.
