# Thiết kế: Đồng bộ dữ liệu Quy trình dự án ↔ Kế hoạch

## Bối cảnh

SOF_PLAN hiện có 2 hệ thống quản lý công việc độc lập, không liên kết:

- **Quy trình dự án** (mới, `workflow-api`, MySQL bảng `wf_*`): Project → Stage → Task, có Kanban, có quy trình xác nhận (confirm) theo phòng ban trước khi đánh dấu hoàn thành.
- **Kế hoạch** (cũ, backend `services.sof.vn/index.php`, bảng `cr_lv0094` + `cr_lv0025_xemtongcv`): quản lý kế hoạch dự án và công việc giao cho từng nhân sự.

Cả hai dùng **chung một database MySQL** theo từng tài khoản (`DB_DATABASE` được xác định lúc đăng nhập qua CouchDB) — cho phép join/update chéo trực tiếp bằng SQL trong cùng một request PHP, không cần gọi API chéo qua HTTP.

Yêu cầu nghiệp vụ: khi tạo công việc trong Kế hoạch, cho phép tham chiếu tới một công việc đã có trong Quy trình dự án, tự động điền dữ liệu, và đồng bộ trạng thái hai chiều để hạn chế nhập tay và tránh lệch dữ liệu giữa 2 module. Ngoài ra bổ sung thanh cuộn ngang rõ ràng cho Kanban.

## Phạm vi

Trong phạm vi:
1. Liên kết Kế hoạch (`cr_lv0094`) với một Dự án Workflow (`wf_project`).
2. Liên kết từng công việc trong Kế hoạch (`cr_lv0025_xemtongcv`) với một công việc Workflow (`wf_project_task`), chọn qua dropdown tìm kiếm, tự điền tên/hạn chót.
3. Đồng bộ trạng thái hai chiều giữa `wf_project_task.status` và `cr_lv0025_xemtongcv.lv011`, theo bảng mapping cấu hình được per-workflow.
4. Chặn thao tác hoàn thành từ phía Kế hoạch nếu Workflow yêu cầu xác nhận phòng ban chưa đủ.
5. Hiển thị tag "đã liên kết kế hoạch" trong "Công việc phải làm" (MyTasksTab).
6. Thanh cuộn ngang rõ ràng cho Kanban board.

Ngoài phạm vi: đồng bộ cho module `QuanLyCongViec` (hệ thống công việc cũ khác, không liên quan), 2 hệ thống Kanban còn lại (`kanban_board` bảng cũ trong tab Kế hoạch, `ChiTietDuAnWorkflow.jsx` — component chết không có route), viết test tự động mới (dự án hiện không có hạ tầng test).

## Data model

### Cột mới trên bảng hiện có

- `cr_lv0094.wf_project_id` (INT, nullable) — tham chiếu `wf_project.id`. NULL nếu kế hoạch không gắn dự án Workflow nào.
- `cr_lv0025_xemtongcv.wf_task_id` (INT, nullable) — tham chiếu `wf_project_task.id`. NULL nếu công việc kế hoạch không liên kết.

`lv004` (tên công việc) vẫn được ghi 1 lần lúc tạo (từ bước tự điền) như hành vi bình thường của form — không snapshot thêm cột nào khác. Với các dòng có `wf_task_id`, màn hình danh sách ưu tiên hiển thị tên/trạng thái lấy từ LEFT JOIN `wf_project_task` (mới nhất) thay vì `lv004` đã lưu, để phản ánh đúng tinh thần tự động đồng bộ. Giới hạn đã biết: chức năng tìm kiếm theo tên hiện có của Giao việc Tab lọc trên `lv004` (giá trị lúc tạo) — nếu tên bên Workflow đổi sau đó, tìm theo tên cũ vẫn ra kết quả nhưng tên đổi mới không được tìm thấy cho tới khi `lv004` được cập nhật lại thủ công; chấp nhận giới hạn này trong phạm vi spec, không mở rộng cơ chế tìm kiếm.

### Bảng mới: `wf_kanban_status_map`

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | INT PK | |
| `workflow_id` | INT | tham chiếu `wf_workflow.id` |
| `column_code` | VARCHAR | mã cột Kanban (khớp `wf_kanban_column.code`) |
| `plan_status_value` | TINYINT | giá trị tương ứng bên Kế hoạch: 0=Chưa thực hiện, 1=Đang thực hiện, 2=Đã duyệt |
| `is_reverse_target` | TINYINT(1) | =1 nếu cột này là đích được chọn khi đồng bộ NGƯỢC (Kế hoạch → Workflow) cho `plan_status_value` tương ứng |

Ràng buộc nghiệp vụ: với mỗi `(workflow_id, plan_status_value)`, tối đa 1 dòng có `is_reverse_target=1` (vì nhiều cột Kanban có thể cùng map về 1 trạng thái Kế hoạch khi đọc, nhưng khi ghi ngược lại phải chọn đúng 1 cột đích).

Mapping mặc định được tự sinh khi lưu cột Kanban của 1 workflow: cột đầu tiên theo `order_no` → 0 (và là reverse target), cột có `is_done_status=1` → 2 (và là reverse target), các cột còn lại → 1 (cột `order_no` nhỏ nhất trong nhóm này là reverse target). Admin chỉnh lại được trong màn hình Quản lý Workflow.

## Backend API (`workflow-api`)

### Action mới: `task.updateStatusFromPlan`

Input: `{ task_id, plan_status }` (task_id = `wf_project_task.id`, plan_status = 0/1/2).

Xử lý (`handlers/kanban.php`):
1. Tra `wf_kanban_status_map` theo `workflow_id` của task và `plan_status`, lấy cột có `is_reverse_target=1` → suy ra `target_column_code`.
2. Gọi lại đúng logic validate hiện có của `wf_h_task_update_status` (kiểm tra confirm phòng ban bắt buộc trước khi vào cột `is_done_status=1`). Nếu không hợp lệ, trả lỗi rõ ràng, KHÔNG ghi gì cả.
3. Nếu hợp lệ: UPDATE `wf_project_task.status = target_column_code` VÀ UPDATE `cr_lv0025_xemtongcv.lv011 = plan_status` (tìm theo `wf_task_id = task_id`) trong cùng 1 transaction.
4. Ghi `wf_history` như hành vi hiện tại của `wf_h_task_update_status`.

### Sửa nhỏ: `wf_h_task_update_status` (đã có)

Sau khi cập nhật `wf_project_task.status` thành công (đường đi từ phía Workflow, ví dụ kéo-thả Kanban), thêm bước: tra `wf_kanban_status_map` theo cột đích mới → `plan_status_value`, rồi UPDATE `cr_lv0025_xemtongcv.lv011` cho dòng có `wf_task_id` trỏ tới task này (nếu có). Không lỗi nếu không tìm thấy dòng liên kết (task chưa được kế hoạch nào tham chiếu).

### Sửa nhỏ: `wf_h_my_tasks`

Thêm LEFT JOIN `cr_lv0025_xemtongcv` theo `wf_task_id`, trả thêm field `linked_plan_task_id` (nullable) để frontend hiển thị tag.

### Tái sử dụng (không đổi): `kanban.projectBoard`

Dùng để nạp danh sách `wf_project_task` cho dropdown tìm kiếm ở màn hình Kế hoạch — không cần endpoint mới.

## Backend legacy (`services.sof.vn/index.php`, case `cr_lv0094` và `cr_lv0025_xemtongcv`)

Sửa tối thiểu, không đụng logic nghiệp vụ hiện có:
- Case `cr_lv0094` (`insert`/`update`): chấp nhận và lưu thêm field `wf_project_id` nếu FE gửi lên.
- Case `cr_lv0025_xemtongcv` (`insert`/`update`/list-load): chấp nhận và lưu thêm field `wf_task_id`; câu SQL load danh sách thêm LEFT JOIN `wf_project_task` (cùng DB) để trả kèm tên/trạng thái mới nhất khi có liên kết.
- Các action đổi trạng thái hiện có (`startTask`, duyệt...) giữ nguyên cho công việc KHÔNG liên kết; khi công việc có `wf_task_id`, các action này không tự xử lý sync mà để FE gọi `task.updateStatusFromPlan` bên workflow-api thay thế (xem phần Frontend).

## Frontend

- **`QuanLyKeHoach.jsx`**: thêm Select "Dự án Workflow" (optional), nạp qua `workflowApi.listProjects()`, lưu vào `wf_project_id`.
- **`tabs/GiaoViecTab.jsx`**:
  - Thêm Select tìm kiếm "Liên kết công việc dự án", chỉ bật khi kế hoạch có `wf_project_id`; nạp dữ liệu qua `workflowApi.getKanbanProjectBoard(wfProjectId)`, lọc theo mã/tên khi gõ.
  - Khi chọn: tự điền tên công việc (`lv004`) và hạn chót (`lv005`) vào các ô đang **trống** (không ghi đè nếu người dùng đã nhập tay). Nếu công việc Workflow có `assignee_code`, tự điền người thực hiện (`lv006`); nếu chỉ có phòng ban thì để trống cho người dùng tự chọn.
  - Các nút đổi trạng thái (`startTask`, duyệt...): nếu công việc có `wf_task_id`, gọi `workflowApi` action mới `updateStatusFromPlan({task_id: wf_task_id, plan_status})` thay vì action cũ. Lỗi trả về (bị chặn do thiếu confirm) hiển thị qua `message.error`.
- **`MyTasksTab.jsx`**: nếu `linked_plan_task_id` có giá trị, hiện thêm 1 `Tag` nhỏ "Đã liên kết kế hoạch".
- **Kanban (`QuanLyKeHoach.module.css`)**: `.kanbanBoardContainer` đã có `overflow-x: auto` (đã hoạt động), thêm CSS `::-webkit-scrollbar` tùy chỉnh (mỏng, có màu, luôn hiển thị rõ) để người dùng thấy được thanh cuộn thay vì thanh mặc định mờ của trình duyệt.

## Xử lý lỗi & trường hợp biên

- Backend chặn hoàn thành do thiếu confirm phòng ban → trả `{success:false, message:"..."}` cụ thể, FE hiện toast đỏ, không đổi trạng thái ở cả 2 bên.
- Công việc liên kết đã bị xoá bên Workflow (`wf_task_id` trỏ tới bản ghi không còn tồn tại) → LEFT JOIN trả NULL, coi như hết liên kết, không lỗi, hiện cảnh báo nhẹ ở UI Kế hoạch gợi ý chọn lại liên kết.
- Ghi đồng thời từ 2 phía cùng lúc (hiếm) → chấp nhận last-write-wins, nhất quán với phần còn lại của hệ thống hiện tại (không có cơ chế khoá phức tạp hơn).

## Kiểm thử

Dự án hiện không có hạ tầng test tự động (cả frontend lẫn PHP). Không đưa thêm framework test mới vào riêng tính năng này. Kiểm thử thủ công qua `npm start`, kịch bản:
1. Tạo Dự án Workflow mới (có sẵn từ trước).
2. Tạo Kế hoạch, liên kết Dự án Workflow đó.
3. Tạo công việc trong Kế hoạch, liên kết 1 công việc Workflow — xác nhận tự điền tên/hạn chót đúng.
4. Đổi trạng thái từ phía Workflow (kéo-thả Kanban) → xác nhận Kế hoạch cập nhật theo.
5. Đổi trạng thái từ phía Kế hoạch → xác nhận Workflow cập nhật theo.
6. Thử đánh dấu hoàn thành từ Kế hoạch khi Workflow còn thiếu confirm phòng ban → xác nhận bị chặn với thông báo rõ ràng.
7. Kiểm tra tag liên kết hiện đúng ở "Công việc phải làm".
8. Kiểm tra thanh cuộn ngang Kanban hiển thị rõ khi có nhiều cột.

## Ngoài phạm vi / để sau

- Đồng bộ 2 chiều tên/hạn chót sau khi đã tạo liên kết (spec này chỉ tự điền 1 lần lúc tạo; nếu công việc Workflow đổi tên sau đó, Kế hoạch sẽ thấy tên mới qua LEFT JOIN khi xem danh sách, nhưng đây là hiển thị theo yêu cầu đọc chứ không phải một cơ chế "sync tên" chủ động — không cần thêm logic ghi nào cho việc này).
- Dọn dẹp component chết `ChiTietDuAnWorkflow.jsx` và hệ thống Kanban `kanban_board` cũ — không thuộc phạm vi tính năng này, đề xuất xử lý ở lần dọn dẹp kỹ thuật riêng.
