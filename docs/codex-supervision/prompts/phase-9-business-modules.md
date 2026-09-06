# PROMPT — PHASE 9: Business Modules M10 (Contract, Profit, Development, Testing, Handover, Payment, Maintenance)

Đây là phase **lớn và rủi ro nhất** trong toàn bộ roadmap vì đụng nhiều vào backend PHP không có git. Đọc kỹ, làm từng bước nhỏ, test từng bước qua trình duyệt trước khi làm bước kế tiếp — không viết toàn bộ 6 module cùng lúc rồi mới test.

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 (`docs/codex-supervision/prompts/phase-0-cleanup.md`).

**Đọc trước khi bắt đầu (bắt buộc, không được bỏ qua bước này):**
1. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` mục "Phase 9" — đọc kỹ, đây là bảng ánh xạ `stage_type` → module.
2. **Toàn bộ** `src/pages/QuanLyDuAn/ChiTietDuAnWorkflow/ChiTietDuAnWorkflow.jsx` — đây là trang cũ chứa logic nghiệp vụ THẬT đã được người dùng dùng qua trước đây (`programmingData.usedDays/totalPlannedDays` cho Development, `handleUpdateBugStatus` với các state IN_FIX/RETEST cho Testing, và có thể còn Contract/Payment/Handover/Maintenance khác chưa được liệt kê hết ở đây). **Bạn phải tự đọc toàn văn file này để lấy đúng field/luồng trạng thái thật, không được tự bịa schema Contract/Profit/Payment/Maintenance từ đầu.**
3. `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` mục 22 (bảng M01-M10) và mục 15 (Payment Plan lấy Contract Value từ Contract — nguyên tắc Single Source of Truth).
4. `docs/workflow_schema.sql` — xác nhận 8 stage seed gốc (GD01-GD08) đã có sẵn `stage_type` tương ứng: CONTRACT, EXECUTION, TESTER, HANDOVER, PAYMENT, MAINTENANCE — đây là điểm neo (anchor) để UI mới biết hiển thị panel nào cho stage nào.
5. `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx` — phần UI generic `ITEM_TYPES` (CHECKLIST/BUG/ALLOCATION/TICKET) hiện tại sẽ được thay thế dần bằng panel chuyên biệt trong phase này.

**Quyết định cần hỏi lại người dùng trước khi code (không tự bịa công thức tài chính):** nếu sau khi đọc `ChiTietDuAnWorkflow.jsx` mà không thấy công thức tính Profit rõ ràng (Contract Value trừ chi phí nào, chi phí tính từ đâu — ngày công × đơn giá? nhập tay?), dừng lại và hỏi người dùng công thức cụ thể trước khi code phần Profit. Đừng tự quyết định một công thức tài chính.

**Việc cần làm — chia theo từng module nhỏ, làm và test lần lượt, KHÔNG làm hết rồi mới test:**

1. Viết spec tổng vào `docs/superpowers/specs/2026-09-05-business-modules-design.md` (độ sâu như Dependency Engine spec) — liệt kê rõ từng bảng mới, field lấy từ đâu trong file cũ (trích dẫn tên biến/hàm cụ thể đã đọc được ở bước đọc trước), quyết định Profit đã chốt với người dùng.
2. Viết plan vào `docs/superpowers/plans/2026-09-05-business-modules-plan.md`, chia thành các task theo từng module con (Contract, Development, Testing/Bug, Handover, Payment, Maintenance) — mỗi module 1 nhóm task riêng, có thể implement + test độc lập từng nhóm.
3. SQL migration `docs/superpowers/plans/sql/2026-09-05-business-modules.sql` — tất cả bảng mới theo đúng convention `wf_*` (FK CASCADE về `wf_project`/`wf_project_task`, `created_at`/`updated_at` DATETIME, charset utf8mb4):
   - `wf_contract` (project_id FK, value DECIMAL, terms TEXT, signed_at, signed_by).
   - `wf_bug` (task_id FK, title, description, severity, status VARCHAR default 'TODO', reporter, assignee_code, created_at, closed_at) — status đi qua TODO→IN_FIX→RETEST→CLOSED đúng như file cũ.
   - `wf_payment_installment` (project_id FK, amount DECIMAL, due_date, status VARCHAR default 'PENDING', paid_at).
   - `wf_maintenance_ticket` (project_id FK, title, description, status, priority, sla_due_at).
   - `ALTER TABLE wf_task_item ADD COLUMN is_required TINYINT(1) NOT NULL DEFAULT 0` (dùng cho Handover checklist bắt buộc).
   - Development: quyết định lưu `planned_days`/`used_days` ở đâu (thêm cột vào `wf_project_task` hay bảng mới) dựa trên cấu trúc thật của `programmingData` đọc được từ file cũ ở bước đọc trước — ghi rõ lựa chọn và lý do trong spec trước khi viết migration.
4. Implement từng module, mỗi module xong thì test qua trình duyệt trước khi sang module kế:
   - **Contract**: form nhập trong stage có `stage_type='CONTRACT'`, hiển thị giá trị hợp đồng đã lưu.
   - **Profit**: hiển thị (không phải input) theo công thức đã chốt với người dùng ở bước trên.
   - **Development**: input `planned_days`/`used_days` dạng số trong stage `stage_type='EXECUTION'`, thay cho item-type `ALLOCATION` tự do.
   - **Testing/Bug**: CRUD bug trong stage `stage_type='TESTER'` với đúng luồng nút chuyển trạng thái TODO→IN_FIX→RETEST→CLOSED (port nguyên hành vi nút bấm từ `handleUpdateBugStatus` cũ), thay cho item-type `BUG` tự do.
   - **Handover**: checklist với cờ `is_required`; nếu còn `is_required=1` chưa Done thì chặn không cho stage `HANDOVER` chuyển DONE (validate ở backend, không chỉ ẩn nút ở frontend).
   - **Payment**: tạo đợt thanh toán, validate tổng `amount` không vượt `wf_contract.value` của project đó (đọc giá trị từ `wf_contract`, không cho nhập tay lại).
   - **Maintenance**: tạo ticket trong stage `stage_type='MAINTENANCE'`.
5. Sau khi cả 6 module hoạt động và được xác nhận qua test tay, gỡ bỏ phần UI generic `ITEM_TYPES` (CHECKLIST/BUG/ALLOCATION/TICKET) cũ trong `TaskDrawer.jsx` — không để tồn tại song song 2 cách nhập cùng loại dữ liệu. Giữ nguyên bảng `wf_task_item` trong DB (không xoá bảng, tránh mất dữ liệu cũ đã nhập qua bản stub — chỉ không còn UI generic trỏ vào 4 loại đã có panel chuyên biệt thay thế).
6. Test tổng end-to-end với 1 project seed đủ 8 stage: Contract → Profit hiển thị đúng → Development nhập ngày công → Bug đi hết TODO→IN_FIX→RETEST→CLOSED → Handover checklist bắt buộc chặn đúng → Payment installment không vượt giá trị hợp đồng → Maintenance ticket tạo được sau bàn giao.

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (thêm "Phase 9", liệt kê rõ quyết định công thức Profit đã chốt). Commit theo từng module riêng biệt (6+ commit nhỏ, không gộp).
