# Notification + Dashboard Design

**Status:** approved (condensed brainstorm — user selected this scope directly via AskUserQuestion over the alternative of guessing Business Modules' business rules; full technical authority already granted for the whole audit roadmap).

## 1. Context

Audit build order (§23) places Notification and Dashboard (M09) before Business
Modules (M10, and the only one of the twelve with zero real spec in the audit
— excluded from this phase). A codebase survey (read-only Explore agent,
2026-08-30) confirmed:

- No notification system exists anywhere — the only artifact is a dead,
  unwired `<Bell>` icon button in `src/components/Layout/HeaderBar/HeaderBar.jsx:186`
  (no onClick, no badge, no dropdown).
- No dashboard/aggregate view exists anywhere — zero "dashboard" string hits
  in `src/`.
- `wf_history` (`workflow-api/handlers/history.php`) is a real, live,
  per-project audit log (~29 write call sites already covering
  WORKFLOW/STAGE/TASK/TASK_ITEM/TASK_TEMPLATE/LOCK/PROJECT), but it is
  pull-based (a modal the user opens on demand) and project-scoped — usable as
  a data source for Dashboard's activity feed, not directly as a notification
  mechanism (no per-user targeting, no read/unread state).
- No queue/worker/cron infrastructure exists anywhere in this stack (confirmed
  repeatedly across Phase 1/2) — the whole backend is synchronous
  request/response. Time-based conditions (overdue, deadline-soon) cannot be
  "pushed"; they must be computed at read time, same as Phase 1's recompute
  pattern.
- react-router-dom IS in use at the page level (`QuanLyQuyTrinhDuAn.jsx` reads
  `?tab=`/`?projectId=` via `useLocation`/`useParams`), so a notification can
  navigate to `/quan-ly-quy-trinh-du-an?tab=projects&projectId=<id>` and land
  on the right screen. `recharts` is already a dependency — no new package
  needed for Dashboard charts.

## 2. Scope cuts (explicit, to keep this bounded)

- No push/websocket delivery. Bell dropdown polls `notification.list` on a
  timer (60s) plus on-demand refresh on open — same synchronous-polling
  pattern as everything else in this app.
- No notification preferences/settings UI (mute, per-type toggles). One
  global feed per user.
- Persisted notifications only for discrete, single-owner-clear events:
  task assignment, confirm-request creation, stage opened. Time-based alerts
  (overdue / deadline-soon) are NOT written as rows — they are computed at
  read time into a separate `alert_count`, because a background scheduler
  doesn't exist and "backfilling" days of retroactive overdue rows on first
  read would be wrong. This mirrors the audit's own principle (§8): don't
  invent a second parallel state that can drift from the real Task data —
  compute it live from Task instead.
- Dashboard is organization-wide (not per-department scoped) — matches the
  audit's own M09 one-liner ("Dashboard, workload, progress, overdue,
  activity"), no access-control cut for this iteration since the existing
  workflow-api has no fine-grained view permission model to hang it on
  (confirmed in Phase 2: only `wf_require_admin()` gates exist).
- No new charting beyond one simple `recharts` bar chart (workload by
  department) — everything else is antd `Statistic`/`Table`, avoiding scope
  creep into a general BI tool.

## 3. Data model

### 3.1 New table: `wf_notification`

```sql
CREATE TABLE wf_notification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_code VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NULL,
  recipient_department VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NULL,
  type VARCHAR(30) NOT NULL,
  project_id INT NULL,
  entity_type VARCHAR(30) NULL,
  entity_id INT NULL,
  message VARCHAR(255) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient (recipient_code, is_read),
  INDEX idx_dept (recipient_department, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

Exactly one of `recipient_code` / `recipient_department` is set per row — a
row targets either one specific person (assignment) or an entire department
(confirm-request, stage-opened), mirroring the exact fallback pattern
`wf_h_my_tasks` already uses (`assignee_code = ? OR (assignee empty AND
department_code = ?)`). Collation matches `wf_project_task.assignee_code`/
`department_code` (`utf8mb4_0900_ai_ci`, confirmed live) to keep comparisons
consistent with the columns these codes originate from.

`type` values for v1: `TASK_ASSIGNED`, `CONFIRM_REQUESTED`, `STAGE_OPENED`.

No FK constraints to `wf_project`/`wf_project_task` (consistent with the rest
of `wf_*` — this schema uses application-level integrity throughout, e.g.
Phase 2's department validation was app-level for exactly this reason).

### 3.2 No other schema changes

Dashboard reads existing tables only (`wf_project`, `wf_project_task`,
`wf_project_stage`, `wf_kanban_column`, `wf_history`). No new columns.

## 4. Backend

### 4.1 Notification write triggers (3 choke points, all in already-existing functions)

1. **`wf_h_task_save`** (`kanban.php:156`) — both the UPDATE branch (id>0)
   and INSERT branch. Before the UPDATE, fetch the task's current
   `assignee_code`; after either branch, if the new `$assigneeCode !== ''`
   AND (`$id` was newly inserted OR the old assignee differed from the new
   one), insert one `TASK_ASSIGNED` row: `recipient_code=$assigneeCode`,
   message `"Bạn được giao công việc {code} - {name}"`. Comparing
   old-vs-new avoids re-notifying on every unrelated edit to an
   already-assigned task (a real noise risk since this handler is the single
   save path for every field on the task).

2. **`wf_h_task_save`**'s `confirm_departments` block (`kanban.php:191-196`)
   — before the `DELETE FROM wf_task_confirm`, read the task's *current*
   `department_code` set from `wf_task_confirm`. After the delete+reinsert,
   diff old-vs-new department codes and write one `CONFIRM_REQUESTED` row
   per **newly added** department only (`recipient_department=$cd`, message
   `"Yêu cầu xác nhận công việc {code} - {name}"`). Same anti-noise reasoning
   as #1 — this field is resent on every save from the task template/ad-hoc
   modal, not only when actually changed.

3. **`wf_maybe_advance_stage`** (`kanban.php:113`), inside the
   `foreach ($readyStages as $readyStage)` loop, right after the existing
   `wf_log_history(..., 'STAGE_OPEN', ...)` call — decode
   `$readyStage['department_json']` (already present, the query is
   `SELECT *`) and write one `STAGE_OPENED` row per department code, message
   `"Giai đoạn {name} đã mở, có thể bắt đầu công việc"`.

All three reuse data the enclosing function already has in scope — no new
queries beyond the diff-lookups in #1/#2, consistent with Phase 1's rule of
extending existing choke points rather than adding new call graph.

### 4.2 Read/write handlers (new file `handlers/notification.php`, registered in `index.php`)

- `notification.list` → `wf_h_notification_list($input)`. No input needed
  (always "for me"). Returns:
  ```php
  ['items' => [...], 'unread_count' => N, 'alert_count' => M]
  ```
  `items`: `SELECT n.*, p.code AS project_code, p.name AS project_name FROM
  wf_notification n LEFT JOIN wf_project p ON p.id = n.project_id WHERE
  n.recipient_code = ? OR (n.recipient_code IS NULL AND
  n.recipient_department = ?) ORDER BY n.id DESC LIMIT 50`, params
  `[wf_current_user(), wf_current_user_department()]`.
  `unread_count`: count of the same WHERE with `is_read=0`.
  `alert_count`: computed live — count of tasks where (assignee_code = me OR
  (assignee empty AND department_code = my dept)) AND deadline < today AND
  NOT done (done determined via the task's own workflow's
  `is_done_status`, same join pattern as `wf_h_my_tasks`). This is the
  "quá hạn" bucket already exposed in My Work (Phase 3) — Dashboard/bell
  reuses the identical definition rather than inventing a second one.

- `notification.markRead` → `wf_h_notification_mark_read($input)`, input
  `{id}`. `UPDATE wf_notification SET is_read=1 WHERE id=? AND (recipient_code
  = ? OR (recipient_code IS NULL AND recipient_department = ?))` — the WHERE
  clause is the authorization check (can't mark someone else's notification
  read), not just a lookup.

- `notification.markAllRead` → `wf_h_notification_mark_all_read($input)`, no
  input. Same WHERE clause as list, `UPDATE ... SET is_read=1`.

### 4.3 Dashboard handler (new file `handlers/dashboard.php`, registered in `index.php`)

`dashboard.summary` → `wf_h_dashboard_summary($input)`, no input. Single
handler, computed server-side in one pass (data scale confirmed live: 7
projects, 109 tasks total — full-scan aggregation in PHP is trivial at this
size, consistent with every other handler in this codebase doing the same):

```php
function wf_h_dashboard_summary($input)
{
    $projects = wf_query("SELECT id, status FROM wf_project");
    $projectStats = ['total' => count($projects), 'active' => 0, 'done' => 0];
    foreach ($projects as $p) {
        if ($p['status'] === 'DONE') $projectStats['done']++; else $projectStats['active']++;
    }

    $tasks = wf_query(
        "SELECT t.id, t.status, t.execution_state, t.deadline, t.department_code, wc.is_done_status
         FROM wf_project_task t
         JOIN wf_project p ON p.id = t.project_id
         JOIN wf_kanban_column wc ON wc.workflow_id = p.workflow_id AND wc.code = t.status"
    );
    $today = date('Y-m-d');
    $taskStats = ['total' => count($tasks), 'done' => 0, 'in_progress' => 0, 'overdue' => 0, 'blocked' => 0];
    $byDept = []; // dept => ['count' => n, 'overdue' => n]
    foreach ($tasks as $t) {
        $done = (int)$t['is_done_status'] === 1;
        if ($done) { $taskStats['done']++; continue; }
        $taskStats['in_progress']++;
        if ($t['execution_state'] === 'BLOCKED') $taskStats['blocked']++;
        $overdue = $t['deadline'] && $t['deadline'] < $today;
        if ($overdue) $taskStats['overdue']++;
        $dept = $t['department_code'] ?: '(Chưa gán)';
        if (!isset($byDept[$dept])) $byDept[$dept] = ['department_code' => $dept, 'count' => 0, 'overdue' => 0];
        $byDept[$dept]['count']++;
        if ($overdue) $byDept[$dept]['overdue']++;
    }

    $activity = wf_query(
        "SELECT h.*, p.code AS project_code, p.name AS project_name
         FROM wf_history h LEFT JOIN wf_project p ON p.id = h.project_id
         ORDER BY h.id DESC LIMIT 20"
    );

    wf_json_response(['success' => true, 'data' => [
        'projects' => $projectStats,
        'tasks' => $taskStats,
        'by_department' => array_values($byDept),
        'activity' => $activity,
    ]]);
}
```

`done` is determined per-task via that task's *own workflow's* kanban
columns (join on `workflow_id` + `status` code), not a hardcoded `status=
'DONE'` string — required because column codes are per-workflow
configurable (confirmed in Phase 3's `isTaskDone` frontend helper; this is
the backend equivalent of the same rule).

## 5. Frontend

### 5.1 Notification bell (`HeaderBar.jsx`)

Replace the dead `<Bell>` button (line 186) with a live one: `Badge` (antd)
wrapping the bell, count = `unread_count`, opens an antd `Dropdown`/`Popover`
listing `items` (message, relative time, project tag), with:
- A small red dot / secondary badge for `alert_count` (overdue) shown
  alongside, since those aren't part of `unread_count` (they're not
  persisted rows) — labelled distinctly ("N công việc quá hạn") so the two
  counts are never confused.
- Click a notification row → `workflowApi.markNotificationRead(id)` +
  `navigate(`/quan-ly-quy-trinh-du-an?tab=projects&projectId=${n.project_id}`)`
  (via `useNavigate` from react-router-dom — `HeaderBar` is rendered inside
  the router per `App.jsx`, confirmed by its existing use of navigation
  elsewhere in the header).
- "Đánh dấu đã đọc tất cả" button → `markAllNotificationsRead()` then refetch.
- Poll `notification.list` every 60s while mounted (`setInterval` +
  cleanup in `useEffect`), plus an immediate fetch on mount and on dropdown
  open — no new dependency, matches the "no websocket" scope cut.

### 5.2 Dashboard tab (`QuanLyQuyTrinhDuAn.jsx` + new `Dashboard.jsx`)

Add a 4th `Tabs` item (`key: "dashboard"`, label "Tổng quan") alongside the
existing `my-tasks`/`workflow`/`projects`, following the exact same
`tabParam`-driven pattern already in the file (extend the `tabParam ===
"workflow" ? ... : tabParam === "my-tasks" ? ... : "projects"` ternary chain
to include `"dashboard"`). New component
`src/pages/QuanLyQuyTrinhDuAn/Dashboard.jsx`:

- 4 `Statistic` cards: Dự án đang chạy (`projects.active`), Công việc đang
  thực hiện (`tasks.in_progress`), Quá hạn (`tasks.overdue`, red), Bị chặn
  (`tasks.blocked`, orange).
- `recharts` `BarChart` — workload by department (`by_department`, x=dept,
  y=count, a second bar/color for `overdue`).
- `Table` — recent activity (`activity`, columns: thời gian, dự án, loại,
  hành động, nội dung), reusing the same field names `wf_history` already
  returns (no new backend shape to learn — this is the same data
  `ProjectDetail.jsx`'s history Drawer already renders, just cross-project
  and always-visible instead of on-demand).

Add one `SidebarMenu.jsx` entry: `{ key:
"/quan-ly-quy-trinh-du-an?tab=dashboard", label: "Tổng quan" }`, placed first
in the existing `Quan-ly-du-an` children list (overview belongs before the
task-list/workflow-editor entries a user reaches it from).

### 5.3 `workflowApi.js` additions

```js
export const getNotifications = () => callWorkflowApi("notification.list");
export const markNotificationRead = (id) => callWorkflowApi("notification.markRead", { id });
export const markAllNotificationsRead = () => callWorkflowApi("notification.markAllRead");
export const getDashboardSummary = () => callWorkflowApi("dashboard.summary");
```

## 6. Testing (manual, per this stack's established no-automated-tests convention)

1. Assign a task to a user via TaskDrawer → confirm exactly one
   `TASK_ASSIGNED` notification appears for that user, and re-saving the same
   task without changing the assignee does NOT create a duplicate.
2. Add a `confirm_departments` entry to a task → confirm exactly one
   `CONFIRM_REQUESTED` row for the newly added department only; re-saving
   with the same set creates none.
3. Complete all tasks in a stage so the next stage auto-opens → confirm one
   `STAGE_OPENED` notification per department on that next stage.
4. Click a notification → confirm navigation lands on the right project and
   the notification's `is_read` flips.
5. "Đánh dấu đã đọc tất cả" clears the badge.
6. Dashboard tab: verify the 4 stat cards, department bar chart, and
   activity table render with real data and match manually-checked DB
   counts for at least one metric (e.g. overdue count cross-checked against
   My Work's own overdue filter from Phase 3).
7. Confirm the existing per-project history Drawer (`ProjectDetail.jsx`)
   still works unmodified (this phase reads `wf_history`, never writes to
   it or changes its shape).
