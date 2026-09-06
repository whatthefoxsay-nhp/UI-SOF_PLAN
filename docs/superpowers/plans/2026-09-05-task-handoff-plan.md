# Implementation Plan — Task Handoff tuần tự đa phòng ban

## Mục tiêu

Triển khai handoff tuần tự trên task template/task instance, giữ nguyên multi-confirm song song, và đưa bước handoff cuối qua Completion Engine Phase 5.

## Nguyên tắc thực hiện

- Đọc/ghi đúng ba codebase; chỉ frontend repository được commit Git.
- Backend sửa trực tiếp trong `workflow-api`, không khởi tạo hoặc dùng Git ở backend.
- Mỗi thay đổi frontend/docs có commit nhỏ, dễ review.
- Chạy PHP lint sau mỗi nhóm handler; chạy frontend lint/build phù hợp sau các thay đổi React.
- Acceptance chính phải qua browser nếu runtime có browser; nếu môi trường không cung cấp browser thì ghi rõ phần chưa xác minh, không đánh dấu Pass giả.

## Task 1 — Design, plan và migration

Files:

- `docs/superpowers/specs/2026-09-05-task-handoff-design.md`
- `docs/superpowers/plans/2026-09-05-task-handoff-plan.md`
- `docs/superpowers/plans/sql/2026-09-05-task-handoff.sql`

Nội dung:

- Chốt phân biệt handoff tuần tự và `confirm_departments` song song.
- Chốt fallback cho task không có handoff.
- Chốt schema template/instance, trạng thái, timestamp, transaction và Completion Engine boundary.
- Viết migration theo convention `wf_*` hiện có.

Kiểm tra: review nội bộ spec/plan không có gate Subtask hoặc scope escalation.

## Task 2 — Database migration

Thực hiện:

- Áp dụng migration trên database dev hiện có nếu kết nối khả dụng.
- Kiểm tra hai bảng, FK cascade, unique sequence và index.
- Không sửa cột `wf_task_confirm.status`; đây là VARCHAR và application chỉ cần chấp nhận `REJECTED` đã có trong Phase 5.

Kiểm tra: query `SHOW CREATE TABLE`, insert/read mẫu ở môi trường dev và rollback test logic bằng dữ liệu test riêng nếu cần.

## Task 3 — Template model và project snapshot

Files backend:

- `workflow-api/handlers/workflow.php`
- `workflow-api/handlers/project.php`
- `workflow-api/index.php` nếu route cần cập nhật.

Thực hiện:

- Load/save/clone `handoff_departments` cho task template.
- Validate department code, preserve duplicate department ở các sequence khác nhau.
- Khi tạo project, copy chain vào `wf_task_handoff`; dòng đầu ACTIVE, các dòng sau PENDING.
- Trả chain trong workflow/task payload.

Kiểm tra: PHP lint; tạo project fixture và đối chiếu template-instance snapshot.

## Task 4 — Backend holder authorization và transition

Files backend:

- `workflow-api/handlers/kanban.php`
- `workflow-api/index.php`.

Thực hiện:

- Thêm helper đọc active holder và helper quyền task.
- Dùng helper ở đổi Kanban, sửa task/item, confirm/reject.
- Thêm `wf_h_task_handoff_complete`: transaction, lock, DONE bước hiện tại, ACTIVE bước kế, timestamps và `TASK_HANDOFF` history.
- Tách helper auto-DONE dùng chung với `wf_h_task_confirm`; bước cuối gọi helper đó.
- Giữ sync/recompute/history/notification hiện có; không thêm notification ngoài phạm vi.

Kiểm tra: PHP lint; test API trái quyền, đúng quyền, final step có pending confirm và final step không có confirm.

## Task 5 — Frontend API và cấu hình template

Files:

- `src/services/workflowApi.js`
- `src/pages/QuanLyQuyTrinhDuAn/WorkflowManager.jsx`.

Thực hiện:

- Thêm `completeTaskHandoff` API.
- Gửi/nhận `handoff_departments` khi save/load template.
- Thêm danh sách handoff có thêm, xóa, lên, xuống; không thêm thư viện mới.
- Hiển thị chain trong bảng task.

Kiểm tra: lint/build và mở modal template để kiểm tra reorder/duplicate.

## Task 6 — Frontend runtime TaskDrawer

File:

- `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx`.

Thực hiện:

- Hiển thị stepper/list handoff và trạng thái DONE/ACTIVE/PENDING.
- Chỉ active department hoặc admin thấy nút “Hoàn tất tại đây, chuyển tiếp”.
- Disable edit/item/status control khi user không phải holder.
- Fallback đúng về `department_code` tĩnh và confirm-per-department khi task không có ACTIVE handoff.
- Giữ confirm song song và Reject → Rework UI tách biệt.

Kiểm tra: lint/build; kiểm tra loading/error sau transition và reload dữ liệu.

## Task 7 — Acceptance browser và hồi quy

Chuẩn bị một task template/project fixture có chain `Kinh doanh → Kỹ thuật → Kinh doanh`.

TC11:

1. Kỹ thuật bị chặn trước bước 1.
2. Kinh doanh hoàn tất bước 1, Kỹ thuật trở thành holder.
3. Kỹ thuật hoàn tất bước 2, Kinh doanh trở thành holder.
4. Kinh doanh hoàn tất bước 3, task đi vào Completion Engine và confirm/DONE đúng semantics.
5. Kiểm tra history, trạng thái instance, actor và quyền.

TC05 hồi quy:

- Dùng task không có handoff, confirm đủ các phòng ban và xác nhận task vẫn auto-DONE.

Nếu browser runtime không khả dụng, chạy backend/CLI và static checks, ghi blocker trong status doc thay vì tuyên bố browser Pass.

## Task 8 — Status và bàn giao

File:

- `docs/TRANG_THAI_DU_AN.md`.

Thực hiện:

- Thêm Phase 6 vào phần đã hoàn thành.
- Ghi kết quả TC11 và TC05, phân biệt browser/backend nếu có giới hạn môi trường.
- Kiểm tra `git diff --check`, `git status`, các commit frontend/docs.

## Checklist hoàn thành

- [ ] Spec/plan/SQL được viết và review.
- [ ] Migration dev được áp dụng và schema được kiểm tra.
- [ ] Template load/save/clone và project snapshot hoạt động.
- [ ] Holder authorization backend hoạt động.
- [ ] Transition handler và final Completion Engine hoạt động.
- [ ] WorkflowManager và TaskDrawer hoạt động.
- [ ] TC11 được kiểm thử.
- [ ] TC05 không bị phá.
- [ ] Status doc cập nhật trung thực.
