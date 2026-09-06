# Timeline Workload Implementation Plan

## Task 1: Baseline và data contract

- Đọc Phase 0 rules, roadmap Phase 7, audit sections 15/19/26, dependency spec
  và toàn bộ `ProjectDetail.jsx`.
- Ghi nhận `project.get` hiện chưa trả task/dependency instance.
- Ghi nhận `WorkflowManager.jsx` không có selector `assignee_code`; không thêm
  template assignee/schema mới.
- Kiểm tra schema và helper Kanban snapshot để dùng đúng done semantics.
- Commit: `docs: define timeline and workload contract`.

## Task 2: Design documentation

- Viết design spec với semantics Timeline read-only, bar date fallback,
  dependency display, workload map, error behavior, risks và self-review.
- Viết plan này theo task nhỏ, mỗi task có verification rõ ràng.
- Verification: đọc lại spec đối chiếu từng bullet Phase 7 và không có SQL migration
  ngoài phạm vi.
- Commit: `docs: add timeline workload design and plan`.

## Task 3: Enrich project detail response

- Sửa `wf_load_project_full()` trong `handlers/project.php` sau khi đọc toàn file.
- Lấy toàn bộ task và dependency của project, nhóm vào stage/task:
  `depends_on_stage_ids`, `tasks`, `depends_on_task_ids`.
- Giữ nguyên field cũ, order và lifecycle; không thêm endpoint mới.
- Chạy `php -l handlers/project.php`.
- Gọi `wf_h_project_get` bằng `_wf_invoke.php` để kiểm tra response thực tế có
  tasks/dependency và không làm hỏng stage counts.
- Backend không có Git nên chỉ sửa trực tiếp, không commit Git.

## Task 4: Employee workload handler và route

- Thêm `wf_h_employee_workload` vào `handlers/workflow.php`.
- Đếm task có assignee và status không thuộc done columns của project snapshot.
- Hỗ trợ filter `department_code` qua employee master data.
- Thêm route `employee.workload` vào `workflow-api/index.php`.
- Không sửa `_wf_invoke.php` vì `workflow.php` đã được require.
- Chạy PHP lint cho `workflow.php` và `index.php`.
- Gọi handler với toàn bộ nhân viên và một department filter; đối chiếu map với
  SQL/manual resolver.

## Task 5: API service và Timeline view

- Thêm `getEmployeeWorkload` vào `workflowApi.js`.
- Mở rộng `ProjectDetail.jsx` với view mode `timeline` và option Segmented.
- Tạo component nội bộ render stage/task rows, read-only bars, status và
  dependency Tooltip.
- Dùng CSS thuần/inline layout, không thêm thư viện Gantt/Recharts.
- Đảm bảo `loadBoard()` chỉ chạy ở view Kanban stage và Timeline dùng project
  detail response hiện tại.
- Chạy `npm run build`.

## Task 6: Workload labels in assignment UI

- Trong `TaskDrawer.jsx`, tải workload khi mở task và append số mở vào từng
  employee option.
- Giữ fallback nếu API lỗi; không đổi lựa chọn hoặc tự động sort.
- Kiểm tra lại `WorkflowManager.jsx`: không có `assignee_code` selector để sửa;
  không thêm field template không persist. Nếu codebase thay đổi và selector
  xuất hiện, dùng cùng label helper.
- Chạy build và kiểm tra không có compile error.

## Task 7: Browser/CLI acceptance

- Khởi động app bằng `npm start` nếu chưa chạy; chỉ dùng browser được cấp, không
  dùng Electron.
- Mở project có nhánh song song Phase 1, vào Timeline, kiểm tra nhóm stage/task,
  nhánh và tooltip dependency.
- Mở TaskDrawer, đối chiếu workload options với SQL đếm theo snapshot.
- Nếu browser runtime không có browser, ghi rõ blocked và không đánh dấu browser
  acceptance Pass; vẫn chạy PHP lint/build/CLI.

## Task 8: Regression và handoff

- Kiểm tra lại Kanban stage/overview, mở task drawer và selector assignee.
- Cập nhật `docs/TRANG_THAI_DU_AN.md` thêm Phase 7, ghi TC Timeline/workload
  Pass hoặc trạng thái blocked đúng bằng chứng.
- Chạy `git diff --check`, `git status`, xem diff cuối.
- Commit status doc riêng: `docs: record phase7 timeline workload status`.
