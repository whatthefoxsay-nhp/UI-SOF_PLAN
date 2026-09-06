# PROMPT — PHASE 6: Task Handoff tuần tự đa phòng ban

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 (`docs/codex-supervision/prompts/phase-0-cleanup.md`).

**Đọc trước khi bắt đầu (bắt buộc):**
1. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` mục "Phase 6".
2. `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` mục 11 (mô hình đa phòng ban, TASK_HANDOFF, ví dụ "Chốt báo giá: Kinh doanh → Kỹ thuật → Kinh doanh → DONE").
3. Spec Phase 5 vừa hoàn thành (`docs/superpowers/specs/2026-09-05-completion-engine-reject-rework-design.md`) — bước cuối của handoff phải đi qua Completion Engine đó.
4. `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx` và `WorkflowManager.jsx` toàn bộ — đặc biệt cơ chế `confirm_departments` hiện có (xác nhận **song song**) để phân biệt rõ với Handoff (**tuần tự**) sắp xây — đây là 2 khái niệm khác nhau, không được nhầm lẫn hay gộp chung.

**Việc cần làm:**

1. Viết spec vào `docs/superpowers/specs/2026-09-05-task-handoff-design.md` (độ sâu như Dependency Engine spec). Làm rõ trong spec: Handoff khác Multi-confirm (song song, đã có) như thế nào; task không cấu hình handoff thì hành vi giữ nguyên như cũ (tính năng cộng thêm, không bắt buộc).
2. Viết plan vào `docs/superpowers/plans/2026-09-05-task-handoff-plan.md`.
3. SQL migration `docs/superpowers/plans/sql/2026-09-05-task-handoff.sql`: bảng `wf_task_template_handoff` (id, task_template_id FK CASCADE, sequence INT, department_code VARCHAR(32)) và `wf_task_handoff` (id, task_id FK CASCADE, project_id, sequence INT, department_code VARCHAR(32), status VARCHAR(20) DEFAULT 'PENDING', started_at, completed_at) — theo đúng convention đặt tên/FK/charset của các bảng `wf_*` đã có (xem `docs/workflow_schema.sql` làm mẫu).
4. Implement backend (`workflow-api/handlers/`):
   - Khi tạo project (`wf_h_project_create`, giống cách Dependency instance được copy ở Phase 1), nếu task template có handoff chain thì copy sang `wf_task_handoff` cho task instance tương ứng, dòng đầu tiên (`sequence` nhỏ nhất) set `status='ACTIVE'`, các dòng sau `PENDING`.
   - Hàm xác định "phòng ban đang giữ việc" của 1 task: dòng `wf_task_handoff` có `status='ACTIVE'` (hoặc nếu không có bản ghi nào cho task đó thì coi như không dùng handoff, giữ hành vi cũ dựa vào `department_code` tĩnh).
   - Handler mới để "hoàn tất bước hiện tại, chuyển tiếp": set dòng hiện tại `DONE` + `completed_at`, set dòng kế tiếp (theo `sequence`) thành `ACTIVE` + `started_at`; nếu không còn dòng kế tiếp (đây là bước cuối), gọi qua đúng luồng DONE hiện có (đi qua Completion Engine của Phase 5, không tự ý viết lại logic DONE riêng cho handoff).
   - Sửa `canActOn`-tương-đương ở backend (điểm kiểm tra quyền sửa task trong `kanban.php`) để khi task có handoff, chỉ phòng ban đang `ACTIVE` (hoặc admin) mới được thao tác — không phải `department_code` tĩnh của task nữa.
5. Implement frontend:
   - `WorkflowManager.jsx`: thêm control cấu hình chuỗi handoff cho 1 task template (danh sách phòng ban có thứ tự, thêm/bớt/sắp xếp lại) — có thể dùng multi-select rồi hiển thị lại dưới dạng danh sách có nút lên/xuống nếu antd `Transfer`/`drag-sort` không có sẵn trong stack, tránh thêm thư viện mới không cần thiết.
   - `TaskDrawer.jsx`: nếu task có handoff, hiển thị dạng stepper/list các bước (Kinh doanh ✓ → Kỹ thuật (đang xử lý) → Kinh doanh), nút "Hoàn tất tại đây, chuyển tiếp" chỉ hiện cho phòng ban đang `ACTIVE`, cập nhật `canActOn` phía frontend tương ứng.
6. Test qua trình duyệt: tạo 1 task template có handoff Kinh doanh→Kỹ thuật→Kinh doanh, tạo project từ workflow đó, xác nhận: (a) tài khoản phòng Kỹ thuật không thao tác được task khi Kinh doanh chưa hoàn tất bước 1, (b) sau khi Kinh doanh hoàn tất, Kỹ thuật thao tác được, (c) sau bước 3 (Kinh doanh), task đi vào Completion Engine (xác nhận/DONE) đúng như Phase 5.

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (thêm "Phase 6", ghi TC11 mới — Handoff tuần tự — đã Pass). Commit theo từng task nhỏ.
