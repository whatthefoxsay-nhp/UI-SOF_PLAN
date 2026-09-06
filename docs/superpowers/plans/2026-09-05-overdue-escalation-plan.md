# Overdue Escalation Implementation Plan

## Task 1: Baseline và contract

- Đọc Phase 0 rules, roadmap Phase 8, notification design và toàn bộ
  `handlers/notification.php`.
- Kiểm tra `wf_notification`, `wf_notify()`, helper Kanban snapshot và cách CLI
  bootstrap kết nối DB.
- Xác nhận recipient decision: **“Tất cả admin + assignee gốc”**; ghi nhận CLI
  không có header role và resolver admin hiện tại.
- Kiểm tra task quá hạn thật bằng SQL, không tạo seed nếu đã có dữ liệu phù hợp.

## Task 2: Design documentation

- Viết spec với overdue semantics `deadline <= CURDATE()-2`, done snapshot,
  cooldown task-level 24 giờ, recipient dedupe, Task Scheduler comment,
  error/risk/self-review.
- Viết plan này theo các task nhỏ và verification tương ứng.
- Verification: đối chiếu từng bullet roadmap Phase 8; xác nhận không có schema
  migration hoặc HTTP handler ngoài scope.
- Commit frontend repo: `docs: add overdue escalation design and plan`.

## Task 3: CLI bootstrap

- Tạo `workflow-api/scripts/check_overdue_escalation.php`, kiểm tra CLI-only,
  cấu hình `ESCALATION_OVERDUE_DAYS = 2` ở đầu file.
- Bootstrap DB tương thích `_wf_invoke.php`, require `db.php` và
  `handlers/workflow.php` để dùng helper sẵn có.
- Thêm comment hướng dẫn Windows Task Scheduler với executable PHP chính xác;
  không tự đăng ký scheduler.
- Verification: `php -l scripts/check_overdue_escalation.php`.

## Task 4: Eligibility and done semantics

- Query task/project có deadline đến hạn `DATE_SUB(CURDATE(), INTERVAL 2 DAY)`.
- Resolve `is_done_status=1` qua `wf_project_kanban_columns($task)`;
  bỏ task đã done, giữ task status không khớp column là open.
- Verification: dùng `ACC001` và kiểm tra các task DONE quá hạn không được chọn.

## Task 5: Cooldown and notification recipients

- Kiểm tra notification type/entity/project trong 24 giờ gần nhất trước khi xử
  lý từng task.
- Resolve admin recipient hiện tại (`admin`) và thêm assignee_code; dedupe code.
- Gọi `wf_notify($recipient, null, 'OVERDUE_ESCALATION', ...)` cho từng code;
  in summary counters, không dùng `wf_json_response()`.
- Verification: lint, chạy lần đầu và SQL kiểm tra recipient/type/entity/message.

## Task 6: Acceptance and regression

- Chạy script CLI lần đầu với task overdue thật.
- Đối chiếu notification mới trong DB và thử mở chuông UI.
- Chạy script lần hai ngay sau đó; xác nhận không tăng số notification.
- Nếu browser runtime unavailable, ghi rõ browser acceptance blocked, không tự
  đánh dấu Pass; vẫn lưu bằng chứng CLI/SQL.

## Task 7: Status and handoff

- Cập nhật `docs/TRANG_THAI_DU_AN.md` thêm Phase 8, quyết định recipient,
  task test, lần chạy thứ hai và trạng thái browser.
- Chạy `git diff --check`, `git status`, xem lại diff và commit status doc riêng:
  `docs: record phase8 overdue escalation status`.
- Backend không có Git nên chỉ ghi nhận file đã sửa trực tiếp và kết quả lint.
