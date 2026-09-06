# PROMPT — PHASE 7: Timeline/Gantt + Workload-aware Assignment

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 (`docs/codex-supervision/prompts/phase-0-cleanup.md`).

**Đọc trước khi bắt đầu (bắt buộc):**
1. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` mục "Phase 7".
2. `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` mục 15 (assignment theo workload), mục 19 (các view của 1 project), mục 26 (so sánh Asana/ClickUp — Timeline, Workload).
3. `src/pages/QuanLyQuyTrinhDuAn/ProjectDetail.jsx` toàn bộ — nơi các tab Kanban tổng/chi tiết/My Work đang được tổ chức, thêm tab mới vào đúng chỗ này.
4. `docs/superpowers/specs/2026-08-29-dependency-execution-engine-design.md` — dữ liệu dependency đã có (`wf_project_stage_dependency`, `wf_project_task_dependency`) dùng để vẽ Timeline.

**Việc cần làm:**

1. Viết spec vào `docs/superpowers/specs/2026-09-05-timeline-workload-design.md`. Quyết định kỹ thuật cần nêu rõ trong spec: Timeline là **view chỉ đọc** (không kéo-thả đổi lịch — đây là giới hạn phạm vi có chủ đích, ghi lý do YAGNI), dựng bằng thành phần UI có sẵn (antd + CSS thuần), **không thêm thư viện Gantt mới** trừ khi thật sự cần và phải giải thích tại sao antd/recharts hiện có không đáp ứng được.
2. Viết plan vào `docs/superpowers/plans/2026-09-05-timeline-workload-plan.md`.
3. Backend: thêm handler `wf_h_employee_workload` (đặt trong `workflow.php` hoặc `dashboard.php`, chọn theo nhóm chức năng đã có), nhận `department_code` (optional), trả về map `assignee_code -> số task đang mở` (status không thuộc cột Kanban `is_done_status=1`, dùng lại cách xác định "done" đã có trong `kanban.php` từ Phase 1). Không cần bảng DB mới cho phase này.
4. Frontend:
   - Thêm export `getEmployeeWorkload` trong `src/services/workflowApi.js`.
   - Tab mới "Timeline" trong `ProjectDetail.jsx`: mỗi stage/task là 1 hàng, vẽ 1 thanh ngang từ `started_at`/ngày tạo tới `deadline` (hoặc `completed_at` nếu đã xong), nhóm theo stage, hiển thị chỉ báo phụ thuộc (vd icon/tooltip liệt kê tên các stage/task nó phụ thuộc) lấy từ dữ liệu dependency đã có sẵn trong response hiện tại của trang project (không cần gọi API mới ngoài API project detail đã có, trừ khi dependency chưa được trả kèm — kiểm tra lại response thực tế trước khi quyết định có cần sửa backend không).
   - Ở `TaskDrawer.jsx` và chỗ chọn `assignee_code` trong `WorkflowManager.jsx`: gọi `getEmployeeWorkload`, hiển thị thêm hậu tố trong mỗi option, ví dụ "Nguyễn Văn A (NV001) — 5 việc đang làm". Chỉ hiển thị thông tin, không tự động sắp xếp lại hay ép chọn người ít việc nhất.
5. Test qua trình duyệt: mở Timeline của 1 project có nhánh song song thật (dùng data seed đã có từ Phase 1 — theo `docs/TRANG_THAI_DU_AN.md` mục seed, hoặc tạo mới nếu cần), xác nhận thứ tự/nhánh hiển thị đúng logic dependency. Mở dropdown chọn người phụ trách, đối chiếu số "việc đang làm" hiển thị khớp với đếm tay qua SQL (`SELECT assignee_code, COUNT(*) FROM wf_project_task WHERE status NOT IN (...) GROUP BY assignee_code`).

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (thêm "Phase 7"). Commit theo từng task nhỏ.
