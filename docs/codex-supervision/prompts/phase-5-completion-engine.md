# PROMPT — PHASE 5: Completion Engine — Reject → Rework

Ngữ cảnh 3 codebase, quy tắc test-qua-trình-duyệt, quy tắc backend-không-có-git, cách gọi `_wf_invoke.php`: giống hệt như mô tả ở đầu prompt Phase 0 (`docs/codex-supervision/prompts/phase-0-cleanup.md`) — đọc lại đoạn đó trước khi bắt đầu nếu đây là phiên làm việc mới, không có ngữ cảnh trước đó.

**Đọc trước khi bắt đầu (bắt buộc):**
1. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` mục "Phase 5" — phạm vi chi tiết.
2. `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` (dùng `pandoc -t markdown` để đọc) — mục 10 (Completion Engine) và mục 25 (Acceptance Test, đặc biệt TC06).
3. `docs/superpowers/specs/2026-08-29-dependency-execution-engine-design.md` — dùng làm **chuẩn định dạng và độ chi tiết** cho spec bạn sắp viết ở bước đầu tiên bên dưới; đồng thời đọc để hiểu `execution_state`/`wf_recompute_task_execution_state` hiện có, vì Reject phải tương thích với engine đó.
4. `workflow-api/handlers/kanban.php` toàn bộ file — đặc biệt hàm xử lý confirm hiện tại (tìm `wf_h_task_confirm`) và điểm auto-DONE khi đủ confirm.
5. `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx` toàn bộ file — UI xác nhận hiện tại.

**Việc cần làm:**

1. Viết design spec vào `docs/superpowers/specs/2026-09-05-completion-engine-reject-rework-design.md` theo đúng độ sâu của spec Dependency Engine đã đọc ở trên (vấn đề, phạm vi in/out, data model, semantics, frontend changes, rủi ro, self-review). Bám sát mô tả trong roadmap mục Phase 5, không tự mở rộng thêm phạm vi ngoài đó (đặc biệt: **không** làm gate "Subtask" trong sơ đồ Completion Engine của audit — roadmap đã ghi rõ lý do loại trừ).
2. Viết implementation plan vào `docs/superpowers/plans/2026-09-05-completion-engine-reject-rework-plan.md` (chia task nhỏ theo pattern các plan trước đó trong cùng thư mục).
3. Viết SQL migration vào `docs/superpowers/plans/sql/2026-09-05-completion-engine-reject-rework.sql`: thêm giá trị `REJECTED` cho `wf_task_confirm.status` (cột đang là VARCHAR, không phải ENUM, nên chỉ cần đảm bảo code chấp nhận giá trị mới — không cần ALTER kiểu cột) và thêm cột `reject_reason VARCHAR(500) DEFAULT NULL`.
4. Implement:
   - Backend: handler mới `wf_h_task_confirm_reject` trong `kanban.php` — khi 1 phòng ban từ chối kèm lý do bắt buộc: set dòng confirm đó `REJECTED` + `reject_reason`, reset mọi dòng confirm khác của cùng task về `PENDING`, chuyển `wf_project_task.status` về cột Kanban đầu tiên chưa-done của board dự án đó (dùng lại helper lấy cột Kanban đã có trong `kanban.php`), ghi `wf_history` action `TASK_REJECTED` kèm actor + lý do, gọi hàm tạo notification cho `assignee_code` của task.
   - Đăng ký route case mới trong `workflow-api/index.php` (xem cách các case khác được đăng ký) và trong `workflow-api/scripts/_wf_invoke.php` nếu cần test độc lập.
   - Frontend: thêm export `rejectTaskConfirm` trong `src/services/workflowApi.js`. Trong `TaskDrawer.jsx`, thêm nút "Từ chối" cạnh nút "Xác nhận" hiện có cho mỗi dòng phòng ban đang chờ xác nhận (chỉ hiện cho phòng ban có quyền, dùng lại hàm `canActOn` đã có) — bấm vào mở `Modal` nhập lý do bắt buộc rồi gọi API.
5. Test qua trình duyệt: tạo/chọn 1 task đang có ít nhất 2 phòng ban cần xác nhận, xác nhận 1 phòng ban, sau đó phòng ban kia bấm Từ chối kèm lý do — xác nhận: task quay về cột chưa-done, dòng xác nhận đã CONFIRMED trước đó cũng bị reset về chờ xác nhận, có notification tới người phụ trách, có ghi lịch sử.
6. Test hồi quy: kịch bản xác nhận đủ tất cả phòng ban (không có ai từ chối) vẫn tự động DONE như cũ (TC05 không bị phá).

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (thêm "Phase 5" vào phần đã hoàn thành, liệt kê TC06 đã Pass). Commit theo từng task nhỏ.
