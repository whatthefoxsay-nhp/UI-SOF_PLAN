# Notification + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-user notification feed (bell dropdown, backed by a new `wf_notification` table written at 3 existing choke points) and an organization-wide Dashboard tab (project/task/department aggregate stats + activity feed), closing the audit's M09 gap.

**Architecture:** Backend: one new table + one shared `wf_notify()` helper in `db.php` (always loaded, so no cross-handler `require_once` needed) + two new handler files (`notification.php`, `dashboard.php`) + 3 one-line insertions into existing functions that already sit at the right choke points (`wf_h_task_save`, `wf_maybe_advance_stage`). Frontend: 4 new `workflowApi.js` exports, the dead `<Bell>` in `HeaderBar.jsx` becomes a live polling dropdown, and a new `Dashboard.jsx` component becomes a 4th tab in `QuanLyQuyTrinhDuAn.jsx` plus a `SidebarMenu.jsx` entry.

**Tech Stack:** React 18 + antd 5 + `recharts` (already a dependency, no install needed) on the frontend; PHP 8.3 + mysqli on the backend; MySQL `hao_erp_sofv5_0`, InnoDB, `utf8mb4_0900_ai_ci`.

**Spec:** `docs/superpowers/specs/2026-08-30-notification-dashboard-design.md`

## Global Constraints

- No FK constraints on `wf_notification` — app-level integrity only, matching every other `wf_*` table.
- Collation `utf8mb4_0900_ai_ci` on `wf_notification.recipient_code`/`recipient_department`, matching `wf_project_task.assignee_code`/`department_code` (confirmed live).
- No new npm dependencies — `recharts` is already in `package.json`.
- No cron/queue/background job anywhere. Every write happens synchronously at one of exactly 3 named choke points (Tasks 3, 4, 5). Time-based conditions (overdue) are computed at read time only (Task 2's `alert_count`), never written as rows.
- `handlers/workflow.php` and `db.php` are unconditionally `require_once`'d by `index.php` for every request, regardless of matched route (confirmed by reading `index.php`'s dispatcher) — new handler files never need their own `require_once` of another handler file; put shared helpers in `db.php`.
- The workflow-api backend (`c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/`) has **no version control**. Read the current file content immediately before editing every time (never assume a prior task's diff is still exactly as written — re-read), and never run a destructive rewrite of a whole file when a targeted edit will do.
- No automated test suite exists anywhere in this stack. Verify backend changes by invoking handlers directly: `php scripts/_wf_invoke.php <handler_function_name> <base64(json_encode($input))>` from the `workflow-api` directory, using PHP at `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe` (`/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe` in bash). Verify frontend changes with `npm start` (usually already running on port 3000) plus `npx eslint <file>`.
- `_wf_invoke.php` stubs the current user as `x-user-code: admin`, `x-user-right: PLAN@admin` — when a task needs to test as a *different* user (e.g. confirming `TASK_ASSIGNED` lands for the assignee, not for `admin`), pass that user's code as the `assignee_code`/relevant field in the handler's `$input`, and separately query `wf_notification`/`wf_project_task` directly via a one-off PHP CLI `mysqli_query` to verify the row landed with the right `recipient_code`, rather than trying to invoke the handler *as* that other user.

---

### Task 1: Create the `wf_notification` table

**Files:**
- No file created or modified — this is a one-time DDL statement run directly against the live database (this backend has no migration-file convention; prior phases' new tables were created the same way).

**Interfaces:**
- Produces: table `wf_notification` with columns `id, recipient_code, recipient_department, type, project_id, entity_type, entity_id, message, is_read, created_at`, consumed by every later task in this plan.

- [ ] **Step 1: Run the DDL**

From `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api`, run:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$sql = "CREATE TABLE wf_notification (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci";
if (mysqli_query($link, $sql)) echo "OK\n"; else echo "ERROR: " . mysqli_error($link) . "\n";
'
```

Expected output: `OK`. If it prints `ERROR: Table already exists`, stop and check whether a previous partial run already created it — do not drop and recreate without confirming its row count is 0 first (`SELECT COUNT(*) FROM wf_notification`).

- [ ] **Step 2: Verify the schema**

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SHOW FULL COLUMNS FROM wf_notification");
while ($row = mysqli_fetch_assoc($r)) echo $row["Field"]." ".$row["Type"]." ".$row["Collation"]." null=".$row["Null"]."\n";
'
```

Expected: 10 rows listed, `recipient_code`/`recipient_department` show `utf8mb4_0900_ai_ci` and `null=YES`; `is_read` shows `null=NO` with a default.

---

### Task 2: Notification read/write API — `wf_notify()` helper + `handlers/notification.php` + routes

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/db.php` (add `wf_notify()` near `wf_log_history()`, which starts at line 146 as of this writing — re-read the file first, it may have shifted).
- Create: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/notification.php`
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/index.php` (add 3 routes after the `history.list` line).

**Interfaces:**
- Produces: `wf_notify(?string $recipientCode, ?string $recipientDepartment, string $type, ?int $projectId, ?string $entityType, ?int $entityId, string $message): void` in `db.php` — Tasks 3, 4, 5 call this exact signature, always passing exactly one of `$recipientCode`/`$recipientDepartment` as non-null and the other as PHP `null`.
- Produces: routes `notification.list`, `notification.markRead`, `notification.markAllRead`, consumed by Task 7's `workflowApi.js` exports.
- Consumes: `wf_query`, `wf_execute`, `wf_current_user()`, `wf_current_user_department()` (all pre-existing in `db.php`).

- [ ] **Step 1: Add `wf_notify()` to `db.php`**

Read `db.php` first to find the current exact location of `wf_log_history()` (it ends with a closing `}` followed by a comment about `wf_generate_task_code`). Insert this new function immediately after `wf_log_history()`'s closing brace:

```php
// Ghi 1 thong bao cho 1 nguoi dung cu the (recipientCode) hoac ca phong ban
// (recipientDepartment) - dung dung 1 trong 2, khong dung ca hai. Goi tai
// dung 3 diem trong code da xu ly xong nghiep vu (xem wf_h_task_save va
// wf_maybe_advance_stage) - khong co noi thu 4 nao duoc ghi thong bao.
function wf_notify($recipientCode, $recipientDepartment, $type, $projectId, $entityType, $entityId, $message)
{
    wf_execute(
        "INSERT INTO wf_notification (recipient_code, recipient_department, type, project_id, entity_type, entity_id, message) VALUES (?, ?, ?, ?, ?, ?, ?)",
        '',
        [$recipientCode, $recipientDepartment, $type, $projectId, $entityType, $entityId, $message]
    );
}
```

- [ ] **Step 2: Create `handlers/notification.php`**

```php
<?php
// Doc/ghi trang thai da-doc cho thong bao cua nguoi dung hien tai. Viec ghi
// thong bao (INSERT) khong nam trong file nay - xem wf_notify() trong db.php,
// goi tu wf_h_task_save va wf_maybe_advance_stage (handlers/kanban.php).

function wf_h_notification_list($input)
{
    $code = wf_current_user();
    $dept = wf_current_user_department();

    $items = wf_query(
        "SELECT n.*, p.code AS project_code, p.name AS project_name
         FROM wf_notification n
         LEFT JOIN wf_project p ON p.id = n.project_id
         WHERE n.recipient_code = ? OR (n.recipient_code IS NULL AND n.recipient_department = ?)
         ORDER BY n.id DESC LIMIT 50",
        '',
        [$code, $dept]
    );

    $unreadRows = wf_query(
        "SELECT COUNT(*) AS c FROM wf_notification
         WHERE is_read = 0 AND (recipient_code = ? OR (recipient_code IS NULL AND recipient_department = ?))",
        '',
        [$code, $dept]
    );
    $unreadCount = (int)$unreadRows[0]['c'];

    $today = date('Y-m-d');
    $alertRows = wf_query(
        "SELECT COUNT(*) AS c
         FROM wf_project_task t
         JOIN wf_project p ON p.id = t.project_id
         JOIN wf_kanban_column wc ON wc.workflow_id = p.workflow_id AND wc.code = t.status
         WHERE wc.is_done_status = 0 AND t.deadline IS NOT NULL AND t.deadline < ?
           AND (t.assignee_code = ? OR (COALESCE(NULLIF(t.assignee_code, ''), '') = '' AND t.department_code = ?))",
        '',
        [$today, $code, $dept]
    );
    $alertCount = (int)$alertRows[0]['c'];

    wf_json_response(['success' => true, 'data' => [
        'items' => $items,
        'unread_count' => $unreadCount,
        'alert_count' => $alertCount,
    ]]);
}

function wf_h_notification_mark_read($input)
{
    $id = (int)($input['id'] ?? 0);
    if ($id <= 0) wf_error('Thiếu id thông báo');
    $code = wf_current_user();
    $dept = wf_current_user_department();

    wf_execute(
        "UPDATE wf_notification SET is_read = 1
         WHERE id = ? AND (recipient_code = ? OR (recipient_code IS NULL AND recipient_department = ?))",
        '',
        [$id, $code, $dept]
    );

    wf_json_response(['success' => true, 'data' => ['id' => $id]]);
}

function wf_h_notification_mark_all_read($input)
{
    $code = wf_current_user();
    $dept = wf_current_user_department();

    wf_execute(
        "UPDATE wf_notification SET is_read = 1
         WHERE is_read = 0 AND (recipient_code = ? OR (recipient_code IS NULL AND recipient_department = ?))",
        '',
        [$code, $dept]
    );

    wf_json_response(['success' => true, 'data' => true]);
}
```

- [ ] **Step 3: Register routes in `index.php`**

Read `index.php` first to find the current exact line with `'history.list' => 'handlers/history.php:wf_h_history_list',` (it is followed by a `];` closing the `$routes` array). Insert these 3 lines immediately after it, before the `];`:

```php
    'notification.list' => 'handlers/notification.php:wf_h_notification_list',
    'notification.markRead' => 'handlers/notification.php:wf_h_notification_mark_read',
    'notification.markAllRead' => 'handlers/notification.php:wf_h_notification_mark_all_read',
```

- [ ] **Step 4: Verify with `php -l` and a direct invocation**

```bash
cd "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api"
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l db.php
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l handlers/notification.php
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l index.php
```

Expected: `No syntax errors detected` for all 3.

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_notification_list "$(printf '{}' | base64 -w0)"
```

Expected: `{"success":true,"data":{"items":[],"unread_count":0,"alert_count":0}}` (empty because no rows exist yet and `admin`, the CLI shim's stubbed user, has no assigned tasks — `alert_count` may be non-zero if `admin` happens to own overdue tasks from earlier testing; either way this must not error).

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
mysqli_query($link, "INSERT INTO wf_notification (recipient_code, type, message) VALUES (\"admin\", \"TASK_ASSIGNED\", \"test message\")");
echo mysqli_insert_id($link)."\n";
'
```

Note the printed id (call it `<TEST_ID>`), then:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_notification_list "$(printf '{}' | base64 -w0)"
```

Expected: `items` now contains one row with `"message":"test message"` and `unread_count` is at least 1.

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_notification_mark_read "$(printf '{"id":<TEST_ID>}' | base64 -w0)"
```

(substitute the real id for `<TEST_ID>`). Expected: `{"success":true,"data":{"id":<TEST_ID>}}`. Re-run `wf_h_notification_list` and confirm that row's `is_read` effect is reflected in a lower `unread_count`.

Clean up the test row:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
mysqli_query($link, "DELETE FROM wf_notification WHERE message = \"test message\"");
'
```

---

### Task 3: `TASK_ASSIGNED` notification trigger in `wf_h_task_save`

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php` (function `wf_h_task_save`, currently starting at line 156 — re-read the file first, Task 2 did not touch this file so line numbers should be unchanged, but confirm).

**Interfaces:**
- Consumes: `wf_notify()` from Task 2.
- Produces: after this task, `wf_h_task_save`'s local variables include `$oldAssigneeCode` and `$projectId` (fetched before the UPDATE branch's write) and `$taskCode` (available after the if/else in both branches) — Task 4 (same function, later task) relies on `$projectId` and `$taskCode` already being in scope.

Read the *current* file first — do not assume the exact byte offsets below are still correct, only the function name and existing logic. Replace the entire body of `wf_h_task_save` (from `function wf_h_task_save($input)` through the closing `}` right before `// Tinh lai execution_state`) with:

```php
function wf_h_task_save($input)
{
    $id = (int)($input['id'] ?? 0);
    $projectStageId = (int)($input['project_stage_id'] ?? 0);
    $name = trim((string)($input['name'] ?? ''));
    $departmentCode = trim((string)($input['department_code'] ?? ''));
    $assigneeCode = trim((string)($input['assignee_code'] ?? ''));
    $deadline = trim((string)($input['deadline'] ?? ''));
    $deadline = $deadline === '' ? null : $deadline;
    $priority = trim((string)($input['priority'] ?? 'NORMAL'));
    $confirmDepartments = is_array($input['confirm_departments'] ?? null) ? $input['confirm_departments'] : null;

    $oldAssigneeCode = null;
    $projectId = null;
    $taskCode = null;

    if ($id > 0) {
        $existing = wf_query("SELECT project_id, code, assignee_code FROM wf_project_task WHERE id=?", '', [$id]);
        if (count($existing) === 0) wf_error('Không tìm thấy công việc', 404);
        $oldAssigneeCode = $existing[0]['assignee_code'];
        $projectId = $existing[0]['project_id'];
        $taskCode = $existing[0]['code'];

        wf_execute(
            "UPDATE wf_project_task SET name=?, department_code=?, assignee_code=?, deadline=?, priority=? WHERE id=?",
            '',
            [$name, $departmentCode, $assigneeCode, $deadline, $priority, $id]
        );
        wf_log_history(null, 'TASK', $id, 'UPDATE', $name);
    } else {
        if ($projectStageId <= 0 || $name === '') wf_error('Thiếu dữ liệu công việc');
        $stageRow = wf_query("SELECT project_id FROM wf_project_stage WHERE id=?", '', [$projectStageId]);
        if (count($stageRow) === 0) wf_error('Không tìm thấy giai đoạn', 404);
        $projectId = $stageRow[0]['project_id'];
        $taskCode = wf_generate_task_code($departmentCode ?: 'GEN');
        $actor = wf_current_user();
        [, $id] = wf_execute(
            "INSERT INTO wf_project_task (project_id, project_stage_id, code, name, department_code, assignee_code, deadline, priority, status, created_by)
             VALUES (?,?,?,?,?,?,?,?, 'TODO', ?)",
            '',
            [$projectId, $projectStageId, $taskCode, $name, $departmentCode, $assigneeCode, $deadline, $priority, $actor]
        );
        wf_log_history($projectId, 'TASK', $id, 'CREATE', "$taskCode - $name (công việc phát sinh)");
    }

    if ($assigneeCode !== '' && $assigneeCode !== $oldAssigneeCode) {
        wf_notify($assigneeCode, null, 'TASK_ASSIGNED', $projectId, 'TASK', $id, "Bạn được giao công việc {$taskCode} - {$name}");
    }

    if ($confirmDepartments !== null) {
        wf_execute("DELETE FROM wf_task_confirm WHERE task_id=?", '', [$id]);
        foreach ($confirmDepartments as $cd) {
            wf_execute("INSERT INTO wf_task_confirm (task_id, department_code) VALUES (?, ?)", '', [$id, $cd]);
        }
    }

    wf_json_response(['success' => true, 'data' => wf_load_task_full($id)]);
}
```

(Task 4 will replace the `confirm_departments` block above with the diffing version — leave it as the plain delete+reinsert for this task, since this task's job is only the assignment trigger.)

- [ ] **Step 1: `php -l` check**

```bash
cd "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api"
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l handlers/kanban.php
```

Expected: `No syntax errors detected`.

- [ ] **Step 2: Verify against a real stage**

Find a real `project_stage_id` to attach a test task to:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT id, project_id FROM wf_project_stage LIMIT 1");
print_r(mysqli_fetch_assoc($r));
'
```

Note the `id` (call it `<STAGE_ID>`). Create a new task with an assignee:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_task_save "$(printf '{"project_stage_id":<STAGE_ID>,"name":"Verify Task 3","department_code":"PB001","assignee_code":"testuser1"}' | base64 -w0)"
```

(substitute the real stage id). Note the returned task `id` (call it `<NEW_TASK_ID>`). Verify a notification was written:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT * FROM wf_notification WHERE recipient_code=\"testuser1\" ORDER BY id DESC LIMIT 1");
print_r(mysqli_fetch_assoc($r));
'
```

Expected: one row with `type=TASK_ASSIGNED`, `entity_id=<NEW_TASK_ID>`, message containing "Verify Task 3".

Now re-save the same task with the same assignee (should NOT create a second notification):

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_task_save "$(printf '{"id":<NEW_TASK_ID>,"project_stage_id":<STAGE_ID>,"name":"Verify Task 3 renamed","department_code":"PB001","assignee_code":"testuser1"}' | base64 -w0)"
```

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT COUNT(*) c FROM wf_notification WHERE recipient_code=\"testuser1\"");
print_r(mysqli_fetch_assoc($r));
'
```

Expected: `c` is still `1` (no duplicate). Now change the assignee to a different user and confirm exactly one new notification appears for the new assignee:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_task_save "$(printf '{"id":<NEW_TASK_ID>,"project_stage_id":<STAGE_ID>,"name":"Verify Task 3 reassigned","department_code":"PB001","assignee_code":"testuser2"}' | base64 -w0)"
```

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT recipient_code, type FROM wf_notification WHERE entity_type=\"TASK\" AND entity_id=<NEW_TASK_ID>");
while ($row = mysqli_fetch_assoc($r)) print_r($row);
'
```

Expected: two rows total, one for `testuser1` and one for `testuser2`.

- [ ] **Step 3: Clean up test data**

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
mysqli_query($link, "DELETE FROM wf_notification WHERE entity_type=\"TASK\" AND entity_id=<NEW_TASK_ID>");
mysqli_query($link, "DELETE FROM wf_project_task WHERE id=<NEW_TASK_ID>");
'
```

(substitute `<NEW_TASK_ID>` — this deletes only the throwaway test task and its notifications, nothing else).

---

### Task 4: `CONFIRM_REQUESTED` notification trigger in `wf_h_task_save`

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php` (the `confirm_departments` block inside `wf_h_task_save`, right after Task 3's edit).

**Interfaces:**
- Consumes: `wf_notify()` from Task 2; `$projectId` and `$taskCode`/`$name`/`$id` already in scope from Task 3's version of `wf_h_task_save`.

Read the current file first (Task 3 must already be applied). Replace this block:

```php
    if ($confirmDepartments !== null) {
        wf_execute("DELETE FROM wf_task_confirm WHERE task_id=?", '', [$id]);
        foreach ($confirmDepartments as $cd) {
            wf_execute("INSERT INTO wf_task_confirm (task_id, department_code) VALUES (?, ?)", '', [$id, $cd]);
        }
    }
```

with:

```php
    if ($confirmDepartments !== null) {
        $existingConfirms = wf_query("SELECT department_code FROM wf_task_confirm WHERE task_id=?", '', [$id]);
        $oldDepts = array_map(fn($r) => $r['department_code'], $existingConfirms);
        $newDepts = array_values(array_filter(array_map('trim', $confirmDepartments), fn($cd) => $cd !== ''));

        wf_execute("DELETE FROM wf_task_confirm WHERE task_id=?", '', [$id]);
        foreach ($newDepts as $cd) {
            wf_execute("INSERT INTO wf_task_confirm (task_id, department_code) VALUES (?, ?)", '', [$id, $cd]);
            if (!in_array($cd, $oldDepts, true)) {
                wf_notify(null, $cd, 'CONFIRM_REQUESTED', $projectId, 'TASK', $id, "Yêu cầu xác nhận công việc {$taskCode} - {$name}");
            }
        }
    }
```

- [ ] **Step 1: `php -l` check**

```bash
cd "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api"
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l handlers/kanban.php
```

- [ ] **Step 2: Verify the diff-only-notifies-new-departments behavior**

Create a task with one confirm department:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_task_save "$(printf '{"project_stage_id":<STAGE_ID>,"name":"Verify Task 4","department_code":"PB001","confirm_departments":["PB002"]}' | base64 -w0)"
```

(substitute a real `<STAGE_ID>` as in Task 3). Note the returned `id` (call it `<NEW_TASK_ID2>`). Verify:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT * FROM wf_notification WHERE entity_type=\"TASK\" AND entity_id=<NEW_TASK_ID2>");
while ($row = mysqli_fetch_assoc($r)) print_r($row);
'
```

Expected: exactly one row, `type=CONFIRM_REQUESTED`, `recipient_department=PB002`.

Re-save with the SAME department set (should not duplicate) plus one NEW department:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_task_save "$(printf '{"id":<NEW_TASK_ID2>,"project_stage_id":<STAGE_ID>,"name":"Verify Task 4","department_code":"PB001","confirm_departments":["PB002","PB003"]}' | base64 -w0)"
```

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT recipient_department FROM wf_notification WHERE entity_type=\"TASK\" AND entity_id=<NEW_TASK_ID2>");
while ($row = mysqli_fetch_assoc($r)) print_r($row);
'
```

Expected: exactly two rows total (`PB002` from the first save, `PB003` from the second) — no second `PB002` row.

- [ ] **Step 3: Clean up test data**

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
mysqli_query($link, "DELETE FROM wf_notification WHERE entity_type=\"TASK\" AND entity_id=<NEW_TASK_ID2>");
mysqli_query($link, "DELETE FROM wf_task_confirm WHERE task_id=<NEW_TASK_ID2>");
mysqli_query($link, "DELETE FROM wf_project_task WHERE id=<NEW_TASK_ID2>");
'
```

---

### Task 5: `STAGE_OPENED` notification trigger in `wf_maybe_advance_stage`

**Files:**
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/kanban.php` (function `wf_maybe_advance_stage`, currently starting at line 113 — re-read the file first; Tasks 3-4 only touched `wf_h_task_save`, further down in the same file, so this function's line numbers should be unaffected, but confirm).

**Interfaces:**
- Consumes: `wf_notify()` from Task 2.

Read the current file first. Find this exact block inside `wf_maybe_advance_stage`:

```php
    foreach ($readyStages as $readyStage) {
        wf_execute("UPDATE wf_project_stage SET status='OPEN', started_at=NOW() WHERE id=?", 'i', [$readyStage['id']]);
        wf_log_history($stage['project_id'], 'STAGE', $readyStage['id'], 'STAGE_OPEN', $readyStage['name']);
    }
```

Replace it with:

```php
    foreach ($readyStages as $readyStage) {
        wf_execute("UPDATE wf_project_stage SET status='OPEN', started_at=NOW() WHERE id=?", 'i', [$readyStage['id']]);
        wf_log_history($stage['project_id'], 'STAGE', $readyStage['id'], 'STAGE_OPEN', $readyStage['name']);

        $stageDepartments = json_decode($readyStage['department_json'] ?? '[]', true) ?: [];
        foreach ($stageDepartments as $deptCode) {
            wf_notify(null, $deptCode, 'STAGE_OPENED', $stage['project_id'], 'STAGE', $readyStage['id'], "Giai đoạn {$readyStage['name']} đã mở, có thể bắt đầu công việc");
        }
    }
```

- [ ] **Step 1: `php -l` check**

```bash
cd "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api"
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l handlers/kanban.php
```

- [ ] **Step 2: Verify end-to-end with a throwaway workflow**

This requires driving an actual stage transition. Use the seed/test pattern already established in this codebase (`scripts/seed_dev_data.php` shows the idiom): create a throwaway project via `wf_h_project_create` from any existing active workflow, complete every task in its first stage, and confirm the second stage's departments received a `STAGE_OPENED` notification.

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT id FROM wf_workflow WHERE is_active=1 LIMIT 1");
print_r(mysqli_fetch_assoc($r));
'
```

Note the workflow `id` (call it `<WORKFLOW_ID>`).

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_project_create "$(printf '{"workflow_id":<WORKFLOW_ID>,"name":"Verify Task 5","customer_name":"Test Co"}' | base64 -w0)"
```

Note the returned project `id` (call it `<TEST_PROJECT_ID>`). Find its first stage's tasks and the second stage's department list:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT id, order_no, department_json, completion_condition FROM wf_project_stage WHERE project_id=<TEST_PROJECT_ID> ORDER BY order_no LIMIT 2");
while ($row = mysqli_fetch_assoc($r)) print_r($row);
$r2 = mysqli_query($link, "SELECT id FROM wf_project_task WHERE project_stage_id = (SELECT id FROM wf_project_stage WHERE project_id=<TEST_PROJECT_ID> ORDER BY order_no LIMIT 1)");
while ($row = mysqli_fetch_assoc($r2)) print_r($row);
'
```

This prints the first stage's id/`completion_condition` and its task ids, plus the second stage's `department_json`. If the first stage's `completion_condition` is not `ALL_TASKS_DONE`, `wf_maybe_advance_stage` will not fire on task completion — pick a different active workflow whose first stage uses `ALL_TASKS_DONE` (check via the same query against other `<WORKFLOW_ID>` candidates), since this plan cannot mandate which workflows exist in your data.

For each first-stage task id printed above, mark it done (adjust the status code to whatever that workflow's done-column code is — usually `DONE`):

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_task_update_status "$(printf '{"id":<FIRST_STAGE_TASK_ID>,"status":"DONE"}' | base64 -w0)"
```

(repeat for every task id in the first stage). After the last one, verify the second stage opened and its departments got notified:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT * FROM wf_notification WHERE type=\"STAGE_OPENED\" AND project_id=<TEST_PROJECT_ID>");
while ($row = mysqli_fetch_assoc($r)) print_r($row);
'
```

Expected: one `STAGE_OPENED` row per department code that was in the second stage's `department_json`.

- [ ] **Step 3: Clean up the throwaway project**

There is no `project.delete` route in this backend (confirmed: no such route or handler exists) — delete directly and cascade manually:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
mysqli_query($link, "DELETE FROM wf_notification WHERE project_id=<TEST_PROJECT_ID>");
mysqli_query($link, "DELETE FROM wf_history WHERE project_id=<TEST_PROJECT_ID>");
mysqli_query($link, "DELETE FROM wf_task_confirm WHERE task_id IN (SELECT id FROM wf_project_task WHERE project_id=<TEST_PROJECT_ID>)");
mysqli_query($link, "DELETE FROM wf_project_task_dependency WHERE project_id=<TEST_PROJECT_ID>");
mysqli_query($link, "DELETE FROM wf_project_task WHERE project_id=<TEST_PROJECT_ID>");
mysqli_query($link, "DELETE FROM wf_project_stage_dependency WHERE project_id=<TEST_PROJECT_ID>");
mysqli_query($link, "DELETE FROM wf_project_stage WHERE project_id=<TEST_PROJECT_ID>");
mysqli_query($link, "DELETE FROM wf_project WHERE id=<TEST_PROJECT_ID>");
'
```

---

### Task 6: Dashboard summary handler

**Files:**
- Create: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/handlers/dashboard.php`
- Modify: `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api/index.php` (add `dashboard.summary` route, right after the 3 notification routes added in Task 2).

**Interfaces:**
- Produces: route `dashboard.summary` → JSON shape `{projects: {total, active, done}, tasks: {total, done, in_progress, overdue, blocked}, by_department: [{department_code, count, overdue}], activity: [...wf_history rows with project_code/project_name]}`, consumed by Task 9's `Dashboard.jsx`.

- [ ] **Step 1: Create `handlers/dashboard.php`**

```php
<?php
// Tong quan toan he thong: du an, cong viec, workload theo phong ban, hoat
// dong gan day. Chi doc du lieu co san (wf_project/wf_project_task/wf_history),
// khong ghi gi, khong co bang rieng - dung nguyen tac "Dashboard doc tu cung
// nguon voi Kanban/Todo" (muc 8 tai lieu audit).

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
    $byDept = [];
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

- [ ] **Step 2: Register the route**

Read `index.php` first (Task 2 already added 3 `notification.*` lines before the closing `];`). Insert this line right after them, still before `];`:

```php
    'dashboard.summary' => 'handlers/dashboard.php:wf_h_dashboard_summary',
```

- [ ] **Step 3: Verify**

```bash
cd "c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api"
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l handlers/dashboard.php
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -l index.php
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe scripts/_wf_invoke.php wf_h_dashboard_summary "$(printf '{}' | base64 -w0)"
```

Expected: a JSON object with `projects.total` matching `SELECT COUNT(*) FROM wf_project` (7 as of this writing, but re-check live), `tasks.total` matching `SELECT COUNT(*) FROM wf_project_task` (109 as of this writing), and `by_department`/`activity` non-empty arrays. Cross-check `tasks.overdue` against the My Work "Quá hạn" filter's definition from Phase 3 (deadline in the past AND not done) by spot-checking one department's count manually:

```bash
/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe -r '
$link = mysqli_connect("localhost","root","");
mysqli_select_db($link,"hao_erp_sofv5_0");
$r = mysqli_query($link, "SELECT t.department_code, COUNT(*) c FROM wf_project_task t JOIN wf_project p ON p.id=t.project_id JOIN wf_kanban_column wc ON wc.workflow_id=p.workflow_id AND wc.code=t.status WHERE wc.is_done_status=0 AND t.deadline IS NOT NULL AND t.deadline < CURDATE() GROUP BY t.department_code");
while ($row = mysqli_fetch_assoc($r)) print_r($row);
'
```

Compare these per-department overdue counts against `by_department` in the handler's JSON output — they must match exactly.

---

### Task 7: `workflowApi.js` exports

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/services/workflowApi.js`

**Interfaces:**
- Consumes: routes `notification.list`, `notification.markRead`, `notification.markAllRead`, `dashboard.summary` from Tasks 2 and 6.
- Produces: `getNotifications()`, `markNotificationRead(id)`, `markAllNotificationsRead()`, `getDashboardSummary()`, consumed by Tasks 8 and 9.

- [ ] **Step 1: Add the exports**

In `src/services/workflowApi.js`, find this line:

```js
export const getDepartments = () => callWorkflowApi("meta.departments");
```

Add these 4 exports immediately after the `// ---- History ----` block at the end of the file (after `listHistory`, before the `TASK_PRIORITY_LABELS` constant):

```js
// ---- Notification ----
export const getNotifications = () => callWorkflowApi("notification.list");
export const markNotificationRead = (id) => callWorkflowApi("notification.markRead", { id });
export const markAllNotificationsRead = () => callWorkflowApi("notification.markAllRead");

// ---- Dashboard ----
export const getDashboardSummary = () => callWorkflowApi("dashboard.summary");
```

- [ ] **Step 2: Lint**

```bash
cd "e:/SOF/PLAN/SOF_PLAN"
npx eslint src/services/workflowApi.js
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
cd "e:/SOF/PLAN/SOF_PLAN"
git add src/services/workflowApi.js
git commit -m "Add notification and dashboard API exports to workflowApi.js"
```

---

### Task 8: Wire the notification bell in `HeaderBar.jsx`

**Files:**
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/components/Layout/HeaderBar/HeaderBar.jsx`

**Interfaces:**
- Consumes: `workflowApi.getNotifications()`, `workflowApi.markNotificationRead(id)`, `workflowApi.markAllNotificationsRead()` from Task 7.

This file already imports `useNavigate` from `react-router-dom` (assigned to `navigate` at the top of the component) and already imports `Dropdown` from `antd` — reuse both, do not re-import.

- [ ] **Step 1: Add imports**

Find this import block near the top of the file:

```js
import { Layout, Dropdown, Avatar, Space, Typography, Button, Modal } from "antd";
```

Replace it with:

```js
import { Layout, Dropdown, Avatar, Space, Typography, Button, Modal, Badge, List, Empty } from "antd";
```

Find this import:

```js
import { getElectronAPI } from "../../../utils/environment";
```

Add this line right after it:

```js
import * as workflowApi from "../../../services/workflowApi";
```

- [ ] **Step 2: Add notification state and polling**

Find this block near the top of the component body:

```js
  const [hasOverlay, setHasOverlay] = React.useState(false);
  const [employeeInfo, setEmployeeInfo] = React.useState(null);
  const [avatarUrl, setAvatarUrl] = React.useState(null);
  const [now, setNow] = React.useState(() => new Date());
```

Add these lines right after it:

```js
  const [notifications, setNotifications] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [alertCount, setAlertCount] = React.useState(0);

  const loadNotifications = React.useCallback(() => {
    workflowApi
      .getNotifications()
      .then((data) => {
        setNotifications(data.items || []);
        setUnreadCount(data.unread_count || 0);
        setAlertCount(data.alert_count || 0);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 60000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const openNotification = (n) => {
    workflowApi.markNotificationRead(n.id).catch(() => {});
    if (n.project_id) {
      navigate(`/quan-ly-quy-trinh-du-an?tab=projects&projectId=${n.project_id}`);
    }
    loadNotifications();
  };

  const markAllRead = () => {
    workflowApi.markAllNotificationsRead().then(loadNotifications).catch(() => {});
  };

  const notificationDropdownContent = (
    <div style={{ width: 340, maxHeight: 420, overflowY: "auto", background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #f0f0f0" }}>
        <Text strong>Thông báo</Text>
        <Button type="link" size="small" onClick={markAllRead}>
          Đánh dấu đã đọc tất cả
        </Button>
      </div>
      {alertCount > 0 && (
        <div style={{ padding: "8px 14px", background: "#fff2f0", color: "#cf1322", fontSize: 12.5 }}>
          {alertCount} công việc quá hạn của bạn
        </div>
      )}
      {notifications.length === 0 ? (
        <Empty description="Không có thông báo" style={{ padding: 20 }} />
      ) : (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(n) => (
            <List.Item
              onClick={() => openNotification(n)}
              style={{ cursor: "pointer", padding: "8px 14px", background: n.is_read ? "#fff" : "#f0f7ff" }}
            >
              <div>
                <div style={{ fontSize: 13 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {n.project_name ? `${n.project_code} — ${n.project_name} · ` : ""}
                  {n.created_at}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
```

- [ ] **Step 3: Replace the dead Bell button**

Find:

```jsx
          <Button
            type="text"
            icon={<Bell size={16} />}
            className="notification-btn"
          />
```

Replace with:

```jsx
          <Dropdown
            popupRender={() => notificationDropdownContent}
            placement="bottomRight"
            trigger={["click"]}
            onOpenChange={(open) => { if (open) loadNotifications(); }}
          >
            <Badge count={unreadCount} size="small" offset={[-2, 2]}>
              <Button type="text" icon={<Bell size={16} />} className="notification-btn" />
            </Badge>
          </Dropdown>
```

(Confirmed: the installed antd version is 5.29.3, which has `popupRender` as the current, non-deprecated prop name — `dropdownRender` still exists but is deprecated in this version, so use `popupRender` as written above.)

- [ ] **Step 4: Lint and manual verification**

```bash
cd "e:/SOF/PLAN/SOF_PLAN"
npx eslint src/components/Layout/HeaderBar/HeaderBar.jsx
```

Expected: no output.

With `npm start` running, open the app in a browser, log in, and confirm: the bell shows a badge count if `wf_notification` has unread rows for the logged-in user's code/department (create one via direct SQL insert as in Task 2's verification if none exist naturally); clicking a notification navigates to the right project and its badge count decrements; "Đánh dấu đã đọc tất cả" clears the badge.

- [ ] **Step 5: Commit**

```bash
cd "e:/SOF/PLAN/SOF_PLAN"
git add src/components/Layout/HeaderBar/HeaderBar.jsx
git commit -m "Wire notification bell in HeaderBar to live backend feed"
```

---

### Task 9: Dashboard tab

**Files:**
- Create: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/Dashboard.jsx`
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/pages/QuanLyQuyTrinhDuAn/QuanLyQuyTrinhDuAn.jsx`
- Modify: `e:/SOF/PLAN/SOF_PLAN/src/components/Layout/SidebarMenu/SidebarMenu.jsx`

**Interfaces:**
- Consumes: `workflowApi.getDashboardSummary()` from Task 7.

- [ ] **Step 1: Create `Dashboard.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Table, Empty, message } from "antd";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as workflowApi from "../../services/workflowApi";

const HISTORY_ACTION_LABELS = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  STAGE_DONE: "Hoàn thành giai đoạn",
  STAGE_OPEN: "Mở giai đoạn",
  PROJECT_DONE: "Hoàn thành dự án",
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    workflowApi
      .getDashboardSummary()
      .then(setSummary)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (!summary) return null;

  const activityColumns = [
    { title: "Thời gian", dataIndex: "created_at", width: 150 },
    {
      title: "Dự án",
      width: 200,
      render: (_, r) => (r.project_code ? `${r.project_code} — ${r.project_name}` : "—"),
    },
    { title: "Loại", dataIndex: "entity_type", width: 100 },
    {
      title: "Hành động",
      dataIndex: "action",
      width: 150,
      render: (v) => HISTORY_ACTION_LABELS[v] || v,
    },
    { title: "Nội dung", dataIndex: "detail" },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Dự án đang chạy" value={summary.projects.active} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Công việc đang thực hiện" value={summary.tasks.in_progress} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Quá hạn" value={summary.tasks.overdue} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Bị chặn" value={summary.tasks.blocked} valueStyle={{ color: "#fa8c16" }} />
          </Card>
        </Col>
      </Row>

      <Card title="Khối lượng công việc theo phòng ban" style={{ marginBottom: 16 }} loading={loading}>
        {summary.by_department.length === 0 ? (
          <Empty description="Không có dữ liệu" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.by_department}>
              <XAxis dataKey="department_code" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Tổng công việc" fill="#4f46e5" />
              <Bar dataKey="overdue" name="Quá hạn" fill="#ff4d4f" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Hoạt động gần đây" loading={loading}>
        <Table
          rowKey="id"
          size="small"
          dataSource={summary.activity}
          columns={activityColumns}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có hoạt động" /> }}
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Wire the 4th tab in `QuanLyQuyTrinhDuAn.jsx`**

Read the full current file first (it is short, ~65 lines). Replace its entire content with:

```jsx
import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Tabs } from "antd";
import WorkflowManager from "./WorkflowManager";
import ProjectList from "./ProjectList";
import ProjectDetail from "./ProjectDetail";
import MyTasksTab from "./MyTasksTab";
import Dashboard from "./Dashboard";
import "./styles.css";

function resolveTab(tabParam) {
  if (tabParam === "workflow") return "workflow";
  if (tabParam === "my-tasks") return "my-tasks";
  if (tabParam === "dashboard") return "dashboard";
  return "projects";
}

export default function QuanLyQuyTrinhDuAn() {
  const location = useLocation();
  const params = useParams();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const projectIdParam = searchParams.get("projectId") || params.projectId;

  const [activeTab, setActiveTab] = useState(resolveTab(tabParam));
  const [openProjectId, setOpenProjectId] = useState(projectIdParam ? Number(projectIdParam) : null);

  useEffect(() => {
    if (projectIdParam) {
      setOpenProjectId(Number(projectIdParam));
      setActiveTab("projects");
    } else if (tabParam) {
      const target = resolveTab(tabParam);
      setActiveTab(target);
      if (target !== "projects") setOpenProjectId(null);
    }
  }, [tabParam, projectIdParam]);

  return (
    <div style={{ padding: 16 }}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          if (key !== "projects") setOpenProjectId(null);
        }}
        items={[
          {
            key: "dashboard",
            label: "Tổng quan",
            children: <Dashboard />,
          },
          {
            key: "my-tasks",
            label: "Công việc của tôi",
            children: <MyTasksTab />,
          },
          {
            key: "projects",
            label: "Dự án",
            children: openProjectId ? (
              <ProjectDetail projectId={openProjectId} onBack={() => setOpenProjectId(null)} />
            ) : (
              <ProjectList onOpenProject={setOpenProjectId} />
            ),
          },
          {
            key: "workflow",
            label: "Workflow mẫu",
            children: <WorkflowManager />,
          },
        ]}
      />
    </div>
  );
}
```

(Note: `initialTab` was inlined into a `resolveTab()` helper shared between the initial `useState` and the `useEffect` — the original file duplicated that ternary chain in both places, and this task adds a 4th branch, so deduplicating avoids a 3rd copy of the same logic drifting out of sync.)

- [ ] **Step 3: Add the sidebar entry**

In `src/components/Layout/SidebarMenu/SidebarMenu.jsx`, find:

```jsx
          children: [
            {
              key: "/quan-ly-quy-trinh-du-an?tab=my-tasks",
              label: "Công việc của tôi",
            },
```

Replace with:

```jsx
          children: [
            {
              key: "/quan-ly-quy-trinh-du-an?tab=dashboard",
              label: "Tổng quan",
            },
            {
              key: "/quan-ly-quy-trinh-du-an?tab=my-tasks",
              label: "Công việc của tôi",
            },
```

- [ ] **Step 4: Lint**

```bash
cd "e:/SOF/PLAN/SOF_PLAN"
npx eslint src/pages/QuanLyQuyTrinhDuAn/Dashboard.jsx src/pages/QuanLyQuyTrinhDuAn/QuanLyQuyTrinhDuAn.jsx src/components/Layout/SidebarMenu/SidebarMenu.jsx
```

Expected: no output.

- [ ] **Step 5: Manual verification**

With `npm start` running, navigate to `/quan-ly-quy-trinh-du-an?tab=dashboard` (or click the new "Tổng quan" sidebar entry). Confirm the 4 stat cards, the department bar chart, and the activity table all render with real numbers, and that the numbers are plausible against what Task 6's direct-SQL spot-check already confirmed.

- [ ] **Step 6: Commit**

```bash
cd "e:/SOF/PLAN/SOF_PLAN"
git add src/pages/QuanLyQuyTrinhDuAn/Dashboard.jsx src/pages/QuanLyQuyTrinhDuAn/QuanLyQuyTrinhDuAn.jsx src/components/Layout/SidebarMenu/SidebarMenu.jsx
git commit -m "Add project Dashboard tab (stats, department workload, activity feed)"
```

---

### Task 10: End-to-end manual verification

**Files:** none (verification only).

- [ ] **Step 1:** Re-run every scenario in spec §6 in the real browser app (not just via `_wf_invoke.php`), using the running `npm start` dev server and a real login session: assign a task and confirm the assignee sees the notification; add a confirm-department and confirm exactly the new department is notified; complete a stage's tasks and confirm the next stage's departments are notified; click a notification and confirm navigation + read-state; "mark all read"; Dashboard tab renders correctly; the existing per-project history Drawer in `ProjectDetail.jsx` still works unmodified (this plan only ever reads `wf_history`, never writes to it or changes its shape).
- [ ] **Step 2:** Confirm no leftover test rows remain in `wf_notification`/`wf_project`/`wf_project_task` from Tasks 2–6's verification steps (each task's cleanup step should have already handled this — re-check with `SELECT * FROM wf_notification WHERE message LIKE '%Verify%' OR message = 'test message'` and delete any stragglers).
- [ ] **Step 3:** Confirm `git log --oneline -5` in `e:/SOF/PLAN/SOF_PLAN` shows the 3 frontend commits from Tasks 7-9, and confirm `git status` shows no unexpected unrelated files staged.
