# Completion Engine Reject Rework Implementation Plan

**Goal:** Implement Phase 5 `Approval reject -> REWORK` for Workflow tasks while preserving the existing multi-approval auto-DONE behavior.

**Architecture:** Add one nullable confirmation-reason column; implement the reject transition beside the existing confirmation handler; reuse the project Kanban snapshot, history, notification, plan-sync, and execution-state helpers; expose one API service function and a permission-aware TaskDrawer modal.

**Spec:** `docs/superpowers/specs/2026-09-05-completion-engine-reject-rework-design.md`

## Global constraints

- Frontend Git repository: `E:\SOF\PLAN\SOF_PLAN`, branch `master`.
- Workflow PHP backend: `C:\laragon\www\v2.des.plan.banhangonline.top\workflow-api`; no Git. Read each PHP file immediately before editing and run the PHP 8.3 binary at `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe` with `-l` after changes.
- Do not edit the legacy monolith.
- Use `php workflow-api/scripts/_wf_invoke.php <handler> <base64(json)>` for isolated handler checks. The new handler lives in the already-loaded `kanban.php`; no `_wf_invoke.php` require change is necessary.
- Run UI tests with `npm start` and a browser only; do not use Electron.
- Do not apply the SQL migration to a live database from this plan unless explicitly requested. The migration file is the deliverable.

---

### Task 1: Record the design, plan, and SQL migration

**Files:**
- Create `docs/superpowers/specs/2026-09-05-completion-engine-reject-rework-design.md`.
- Create `docs/superpowers/plans/2026-09-05-completion-engine-reject-rework-plan.md`.
- Create `docs/superpowers/plans/sql/2026-09-05-completion-engine-reject-rework.sql`.

**Steps:**

- [ ] Re-check roadmap Phase 5, audit sections 10/25, Dependency Engine execution semantics, and the current confirmation code.
- [ ] Write the design with explicit scope exclusions, state transitions, transaction behavior, UI behavior, tests, risks, and self-review.
- [ ] Write the task-by-task plan in this file.
- [ ] Write the migration with `reject_reason VARCHAR(500) DEFAULT NULL`; document that `status` is already `VARCHAR` and needs no type alteration.
- [ ] Run a placeholder/scope scan (`rg -n "TBD|Subtask|is_required"` on the new docs) and inspect the diff.
- [ ] Commit this documentation task in the frontend repo with a focused message.

**Expected result:** The Phase 5 implementation contract exists before code changes, and the SQL is ready for a later database application.

### Task 2: Implement and syntax-check the backend reject handler

**Files:**
- Modify `C:\laragon\www\v2.des.plan.banhangonline.top\workflow-api\handlers\kanban.php`.

**Steps:**

- [ ] Read the complete current `kanban.php` immediately before editing.
- [ ] Add `wf_h_task_confirm_reject($input)` beside `wf_h_task_confirm`.
- [ ] Validate `task_id`, department authorization, non-blank reason, and max length 500.
- [ ] Require the selected confirmation row to be `PENDING`.
- [ ] Resolve the first non-done Kanban snapshot column with `wf_project_kanban_columns_by_id()` and `order_no` sorting.
- [ ] In one transaction, set the requested row to `REJECTED` with `reject_reason`, reset all other rows to clean `PENDING`, move the task to the first non-done column, clear `completed_at`, log `TASK_REJECTED`, recompute task/stage execution state, and notify a non-empty assignee.
- [ ] Preserve linked legacy plan status through the existing status-map helper if the task is linked.
- [ ] Update the existing confirm write to clear `reject_reason` when a row becomes `CONFIRMED`.
- [ ] Run `php -l handlers/kanban.php`.

**Expected result:** A valid reject request performs the complete REJECT -> REWORK transition and invalid requests do not partially mutate the task.

### Task 3: Register the backend route and verify direct invocation

**Files:**
- Modify `C:\laragon\www\v2.des.plan.banhangonline.top\workflow-api\index.php`.
- Do not modify `_wf_invoke.php` unless the existing require chain is proven insufficient.

**Steps:**

- [ ] Read the complete current `index.php` before editing.
- [ ] Add `'task.confirmReject' => 'handlers/kanban.php:wf_h_task_confirm_reject'` beside `task.confirm`.
- [ ] Re-read `_wf_invoke.php` and verify its `project.php -> kanban.php` require chain exposes the new function.
- [ ] Run `php -l index.php` and `php -l scripts/_wf_invoke.php`.
- [ ] Invoke the handler with an empty payload and confirm it returns a structured validation error rather than an unknown-handler error.
- [ ] If the development database has the migration applied, run one controlled reject fixture and query task/confirm/history/notification rows; otherwise record the schema prerequisite and continue to browser testing after the database is available.

**Expected result:** HTTP and direct CLI dispatch both resolve the new action.

### Task 4: Add the frontend service and TaskDrawer reject modal

**Files:**
- Modify `src/services/workflowApi.js`.
- Modify `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx`.

**Steps:**

- [ ] Add `rejectTaskConfirm(taskId, departmentCode, reason)` using action `task.confirmReject`.
- [ ] Read the complete current TaskDrawer before editing and retain its existing save/confirm/item behavior.
- [ ] Add modal state for the selected department, reason, and submit loading.
- [ ] Add `Từ chối` next to `Xác nhận` only for `PENDING` rows where `canActOn()` returns true.
- [ ] Render `REJECTED` rows as a red status with their stored reason; keep confirmed rows unchanged.
- [ ] Validate trimmed non-empty reason and the 500-character limit in the modal before calling the API.
- [ ] On success, close/reset the modal, reload the task, call `onChanged()`, and show success feedback; on failure, use the existing error message pattern.
- [ ] Run `npx eslint src/services/workflowApi.js src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx`.

**Expected result:** Authorized reviewers can launch and submit a required-reason rejection from the task drawer, while unauthorized users see no reject action.

### Task 5: Browser acceptance test TC06

**Preconditions:** SQL migration applied to the dev database; web app running with `npm start`; authenticated browser session; a task with at least two confirmation departments and a non-empty assignee.

**Steps:**

- [ ] Open the task drawer and confirm department A.
- [ ] Switch to an account authorized for department B, reload the drawer, and verify A is confirmed and B is pending.
- [ ] Click `Từ chối` for B; verify the modal blocks an empty reason.
- [ ] Enter a reason and submit.
- [ ] Verify the task card/drawer is in the first non-done Kanban column, not DONE.
- [ ] Verify B is `REJECTED` with the reason and A has returned to `PENDING`.
- [ ] Verify the assignee's notification feed contains `TASK_REJECTED` and the reason.
- [ ] Verify the history/activity feed contains `TASK_REJECTED`, the rejecting actor, and the reason.
- [ ] Record TC06 as Pass only when all checks are visible and persisted after a page reload.

**Expected result:** REJECT -> REWORK is observable end to end through the browser and persisted backend data.

### Task 6: Browser regression test TC05

**Preconditions:** A separate task with at least two confirmation departments and no rejection.

**Steps:**

- [ ] Confirm each required department in turn.
- [ ] Verify the final confirmation still auto-moves the task to the done column.
- [ ] Verify the parent stage/project progression behavior remains the existing behavior.
- [ ] Verify no rejection status, `TASK_REJECTED` history, or rejection notification is created.
- [ ] Record TC05 as Pass only after a reload confirms the final persisted state.

**Expected result:** Multi-approval remains a working completion path.

### Task 7: Final verification, status update, and focused commits

**Files:**
- Modify `docs/TRANG_THAI_DU_AN.md`.

**Steps:**

- [ ] Run `php -l` on every changed PHP file.
- [ ] Run frontend ESLint and `npm run build`.
- [ ] Run `git diff --check` and inspect the complete frontend diff.
- [ ] Confirm backend remains outside Git and has no accidental legacy-monolith changes.
- [ ] Update the project status with Phase 5 under completed work and list TC06 as Pass; note TC05 regression as Pass too when verified.
- [ ] Commit the frontend implementation as a focused commit after browser tests pass.
- [ ] Commit the status update separately if it is not part of the implementation commit.

**Expected result:** The frontend repo has focused, tested commits; backend live edits and the unapplied SQL are clearly documented; the project log reflects the actual browser results.

## Completion checklist

- [ ] Design spec written and reviewed.
- [ ] Implementation plan written.
- [ ] SQL migration written.
- [ ] Backend handler and route implemented; PHP syntax checks pass.
- [ ] Frontend API and TaskDrawer implemented; lint/build pass.
- [ ] TC06 Pass through browser.
- [ ] TC05 Pass through browser.
- [ ] `TRANG_THAI_DU_AN.md` updated.
- [ ] Focused frontend commits created; no Git operation attempted in the backend.
