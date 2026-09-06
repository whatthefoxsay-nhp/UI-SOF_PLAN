# PROMPT — PHASE 8: Escalation quá hạn

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 (`docs/codex-supervision/prompts/phase-0-cleanup.md`).

**Đọc trước khi bắt đầu (bắt buộc):**
1. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` mục "Phase 8".
2. `docs/superpowers/specs/2026-08-30-notification-dashboard-design.md` — cơ chế Notification hiện có (3 trigger: TASK_ASSIGNED, CONFIRM_REQUESTED, STAGE_OPENED), phase này thêm trigger thứ 4 theo đúng pattern đó, không viết lại engine notification.
3. `workflow-api/handlers/notification.php` toàn bộ file.

**Quyết định "escalate cho ai" đã chốt với người dùng (2026-09-06) — không cần hỏi lại:** hiện không có field "trưởng phòng ban" trong `wf_department` hay `hr_lv0020`. Người dùng đã chọn phương án đề xuất: gửi escalation cho **tất cả user có quyền admin** (`wf_is_admin`) **+ vẫn gửi nhắc cho assignee gốc** của task.

**Việc cần làm:**

1. Viết spec vào `docs/superpowers/specs/2026-09-05-overdue-escalation-design.md`, ghi rõ quyết định "escalate cho ai" đã chốt ở trên (trích nguyên văn: "Tất cả admin + assignee gốc").
2. Viết plan vào `docs/superpowers/plans/2026-09-05-overdue-escalation-plan.md`.
3. Backend: script CLI mới `workflow-api/scripts/check_overdue_escalation.php` (độc lập, không phải handler HTTP) — chạy trực tiếp bằng PHP CLI, tìm task quá hạn từ N ngày trở lên (hằng số `ESCALATION_OVERDUE_DAYS = 2`, đặt đầu file) chưa DONE và **chưa có** notification loại `OVERDUE_ESCALATION` cho task đó được tạo trong 24 giờ gần nhất (tránh spam khi script chạy nhiều lần/ngày), tạo notification mới theo đúng cấu trúc bảng notification hiện có (xem `notification.php`) cho đối tượng đã chốt ở bước hỏi người dùng. Ghi trong file comment đầu script: hướng dẫn cấu hình chạy 1 lần/ngày qua Windows Task Scheduler, gọi bằng `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe check_overdue_escalation.php` — **không tự cài Task Scheduler**, chỉ ghi hướng dẫn.
4. Test: chạy script bằng tay qua PHP CLI với ít nhất 1 task đã quá hạn thật trong DB (theo `docs/TRANG_THAI_DU_AN.md` mục 5 — kiểm tra lại còn task nào đang quá hạn thật không, nếu không thì tạo 1 task quá hạn mới để test), xác nhận có notification mới xuất hiện trong UI (chuông thông báo). Chạy script lần 2 ngay sau đó, xác nhận không tạo notification trùng lặp.

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (thêm "Phase 8", ghi rõ quyết định escalation target đã chốt). Commit.
