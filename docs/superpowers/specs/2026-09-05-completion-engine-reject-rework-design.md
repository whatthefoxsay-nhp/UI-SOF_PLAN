# Completion Engine Reject Rework Design Spec

**Status:** Proposed (Phase 5 of the workflow completion roadmap).

**Source documents:**
- `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` — Phase 5 scope and acceptance criteria.
- `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` — sections 10 and 25, especially TC05 and TC06.
- `docs/superpowers/specs/2026-08-29-dependency-execution-engine-design.md` — `execution_state`, Kanban snapshot semantics, and status-change recomputation.
- Current `workflow-api/handlers/kanban.php` and `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx` — existing confirmation and auto-DONE behavior.

## 1. Problem

The Workflow module currently supports multi-department confirmation only in the positive direction. Each required department has a row in `wf_task_confirm`; a department can move its row from `PENDING` to `CONFIRMED`, and the task becomes `DONE` when all rows are confirmed.

There is no completion-engine path for a reviewer to reject the work. Consequently, a department cannot record why the task failed review, confirmed rows cannot be invalidated as one rework cycle, and the assignee has no notification that the task must be corrected. Audit section 10 describes this missing branch as `ALL PASSED? -> NO -> REJECT`, and TC06 requires `REJECT -> REWORK`.

The change must remain compatible with the existing `wf_apply_task_status()` and `wf_recompute_task_execution_state()` rules. A rejection is a normal backward task-status transition to a non-done Kanban column, so dependent tasks and stages must be recomputed using the existing synchronous engine.

## 2. Scope

### 2.1 In scope

- Add nullable `reject_reason VARCHAR(500)` to `wf_task_confirm`.
- Treat `REJECTED` as a valid application status for `wf_task_confirm.status`; the column is already `VARCHAR`, so no type change is required.
- Add backend handler `wf_h_task_confirm_reject` in `handlers/kanban.php`.
- Register `task.confirmReject` in the Workflow API dispatcher.
- Expose `rejectTaskConfirm()` from `workflowApi.js`.
- Add a `Từ chối` action next to `Xác nhận` for a currently pending confirmation row when `canActOn()` allows the current user to act for that department.
- Require a non-blank reason in an Ant Design modal and send it to the backend.
- Record `TASK_REJECTED` history with the existing actor resolution and the rejection reason.
- Notify the task's `assignee_code` through the existing `wf_notify()` helper.
- Keep TC05 intact: without a rejection, the current all-confirmations auto-DONE path remains unchanged.

### 2.2 Out of scope

- No subtask completion gate. The audit diagram includes a Subtask branch, but this codebase has no separate required-subtask concept; `wf_task_item` is free-form generated data. The roadmap explicitly defers that gate to a later phase.
- No new approval roles, handoff sequencing, escalation, event bus, queue, or notification read model.
- No new task, stage, or project status enum/table. Kanban status continues to come from the project's `kanban_columns_json` snapshot.
- No change to the legacy monolith.
- No new handler file, so `_wf_invoke.php` needs no additional `require_once`; it already loads `project.php`, which loads `kanban.php`.

## 3. Data model

### 3.1 Confirmation row

The migration changes only the confirmation table:

```sql
ALTER TABLE wf_task_confirm
  ADD COLUMN reject_reason VARCHAR(500) DEFAULT NULL AFTER note;
```

The application-level status values are now:

| Status | Meaning |
|---|---|
| `PENDING` | This department has not completed the current review cycle. |
| `CONFIRMED` | This department accepted the current work. |
| `REJECTED` | This department rejected the current work in the current cycle; `reject_reason` is required. |

`confirmed_by` and `confirmed_at` are cleared when a row is rejected. The reason is stored separately from the existing optional confirmation `note` so the rejection remains explicit in the task payload and history.

### 3.2 Migration compatibility

Existing installations use `VARCHAR(20)` for `status`, which already fits `REJECTED`. The SQL file documents that no `ALTER ... ENUM` operation is needed. Applying the migration is required before invoking the new handler because the handler writes `reject_reason`.

## 4. Completion and rework semantics

### 4.1 Reject command validation

`wf_h_task_confirm_reject` accepts:

```json
{
  "task_id": 123,
  "department_code": "PB002",
  "reason": "Báo giá chưa có điều khoản ..."
}
```

The handler:

1. Validates a positive task id, a non-blank department code, and a trimmed reason of at most 500 characters.
2. Calls `wf_require_department_or_admin($departmentCode)`, matching `wf_h_task_confirm` authorization.
3. Loads the task and the confirmation row for the requested department. The row must exist and be `PENDING`; a confirmed or already rejected row cannot be rejected again in the same review cycle.
4. Resolves the first project-board Kanban column whose `is_done_status` is not `1`, ordered by `order_no`. This uses `wf_project_kanban_columns_by_id()` and therefore respects the project's immutable Kanban snapshot. If no such column exists, the operation fails before changing data.

### 4.2 Atomic state transition

The writes occur as one database transaction:

1. Set the selected row to `REJECTED`, set `reject_reason`, and clear confirmation metadata and the old confirmation note.
2. Reset every other confirmation row for the task to `PENDING`, clear `reject_reason`, `confirmed_by`, `confirmed_at`, and `note`. This deliberately invalidates confirmations from the failed review cycle; the task must be reviewed again from the beginning.
3. Set `wf_project_task.status` to the resolved first non-done column and clear `completed_at`.
4. Write `wf_history` with entity `TASK`, the task id, action `TASK_REJECTED`, and detail containing the rejecting department and reason. `wf_log_history()` supplies the current actor in `actor_code`.
5. Call `wf_recompute_task_execution_state(project_id)` and `wf_recompute_stage_execution_state(project_id)` after the backward status change, using the same execution engine required by the dependency design.
6. If the task has an assignee, call `wf_notify(assignee_code, null, 'TASK_REJECTED', ...)` with a message containing the task and reason.

The handler may use the existing plan-status mapping helper after changing the Workflow status so a linked legacy plan task does not silently diverge. This is the same one-way projection already used by `wf_h_task_update_status`; it does not change the legacy codebase.

### 4.3 Auto-DONE compatibility

The existing confirm handler counts rows whose status is not `CONFIRMED`. `REJECTED` therefore blocks auto-DONE just like `PENDING`. After a rejection, the selected row remains rejected and the other rows are pending, so confirming a different row cannot finish the task. A new review cycle is started by the existing task-save confirmation-department flow, which recreates its rows as `PENDING`; the existing confirm handler also clears `reject_reason` when a rejected row is explicitly confirmed by a later valid request.

When no department rejects, the existing `wf_h_task_confirm` path still changes the task to `DONE`, advances a completed stage, and recomputes execution state. No subtask rule or new DONE gate is introduced.

## 5. Backend changes

### 5.1 Handler and route

Add `wf_h_task_confirm_reject()` beside `wf_h_task_confirm()` in `handlers/kanban.php`, and register:

```php
'task.confirmReject' => 'handlers/kanban.php:wf_h_task_confirm_reject',
```

The route is POST-only through the existing dispatcher. `_wf_invoke.php` already loads `handlers/project.php`, whose existing `require_once` chain loads `handlers/kanban.php`; no shim change is needed.

### 5.2 Error and idempotency rules

- Blank or overlong reasons return the normal `wf_error()` response and perform no writes.
- Unknown task or confirmation row returns a 404/400-style `wf_error()` consistent with neighboring handlers.
- Unauthorized department returns the existing 403 error.
- A non-pending row cannot be rejected twice through this endpoint.
- A second request after the first transaction has committed therefore has no duplicate history/notification and returns an error instead.

## 6. Frontend changes

### 6.1 Service API

Add:

```js
export const rejectTaskConfirm = (taskId, departmentCode, reason) =>
  callWorkflowApi("task.confirmReject", {
    task_id: taskId,
    department_code: departmentCode,
    reason,
  });
```

### 6.2 Task drawer interaction

For each `task.confirms` row:

- `CONFIRMED`: retain the existing green confirmation tag.
- `PENDING` and `canActOn(department_code)`: show `Xác nhận` and `Từ chối` side by side.
- `PENDING` without permission: retain the read-only waiting tag.
- `REJECTED`: show a red rejected tag and the stored reason; do not offer an action for that completed rejection event.

Clicking `Từ chối` opens a modal with a textarea. The modal trims the value, requires at least one non-whitespace character, limits it to 500 characters, shows a loading state while the request is active, and closes only after a successful API response. On success it reloads the task and calls `onChanged()` so the Kanban and parent projections refresh. On error it shows the existing `message.error()` surface.

No subtask control, `is_required` field, or generic item completion behavior is added.

## 7. Acceptance and regression tests

### 7.1 TC06 — Reject to rework

1. Use a task with at least two confirmation departments and an assignee.
2. Open the task drawer as a user authorized for department A and confirm A.
3. As a user authorized for department B, open the same task, click `Từ chối`, enter a non-empty reason, and submit.
4. Verify the task status is the first non-done project-board column, not `DONE`.
5. Verify department B is `REJECTED` with the reason, while department A is `PENDING` and its old confirmation metadata is cleared.
6. Verify the assignee receives one `TASK_REJECTED` notification containing the reason.
7. Verify `wf_history` contains `TASK_REJECTED`, the current rejecting actor, and the reason.
8. Verify the UI reload shows the rejected tag/reason and a pending confirmation action for the reset department.

### 7.2 TC05 — All approvals still auto-DONE

1. Use a separate task with at least two confirmation departments and no rejection.
2. Confirm each department once.
3. Verify the final confirmation changes the task to the project's done column, the parent stage can advance as before, and no `TASK_REJECTED` row/notification is created.

Also run `php -l` on every changed PHP file, direct handler invocations through `_wf_invoke.php`, frontend lint/build, and the two browser scenarios above. The browser test must use the running web app; Electron is not an accepted test surface.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Backend has no Git and direct edits are not rollbackable through Git. | Read the whole target file before editing, use a targeted patch, run `php -l`, and capture direct handler responses before browser testing. |
| A rejection could leave mixed confirmation metadata. | Clear confirmation and rejection fields for every reset row in the same transaction. |
| A backward status change could leave dependent tasks/stages stale. | Call both existing recompute functions after the status write. |
| A custom board could put non-done columns after/before DONE unexpectedly. | Sort the snapshot columns by `order_no` and choose the first `is_done_status != 1`, rather than hard-coding `TODO`. |
| A stale frontend bundle hides the new action. | Use the dev server and hard refresh/reload the browser page before recording the result. |

## 9. Self-review

- **Placeholder scan:** no TBD behavior remains; validation, row states, reset semantics, notification, history, route, UI, and test outcomes are specified.
- **Internal consistency:** `REJECTED` is stored only on `wf_task_confirm`; task status remains a project-board column; `wf_task_confirm`'s existing `status <> 'CONFIRMED'` completion check naturally blocks DONE; execution recomputation follows the Dependency Engine contract.
- **Scope check:** only Phase 5 is covered. The audit Subtask branch is explicitly excluded, and no new `is_required` field or business module is introduced.
- **Compatibility check:** the no-rejection path is unchanged; the status transition uses the existing Kanban snapshot helper and the existing notification/history helpers; `_wf_invoke.php` requires no new file registration.
- **Security check:** the handler reuses department/admin authorization instead of trusting the frontend's `canActOn()` check.
