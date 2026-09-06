# Timeline Workload Design

## 1. Mục tiêu và kết luận thiết kế

Phase 7 bổ sung hai khả năng quan sát và hỗ trợ phân công cho module Workflow:

1. Một tab `Timeline` trong chi tiết dự án để nhìn stage/task trên cùng một trục
   thời gian, có nhóm theo stage và chỉ báo dependency.
2. Số lượng task đang mở theo từng `assignee_code`, hiển thị ngay tại các option
   chọn người phụ trách.

Timeline là view chỉ đọc. Không kéo-thả để đổi deadline hoặc ngày bắt đầu trong
phase này. Các trường ngày hiện có chưa có semantics lập lịch đủ chặt để bảo đảm
việc kéo một thanh sẽ cập nhật đúng dependency, stage và đồng bộ Kế hoạch. Thêm
drag-to-reschedule lúc này là scope creep; YAGNI cho tới khi có yêu cầu nghiệp vụ
và quy tắc lập lịch rõ ràng.

Không thêm thư viện Gantt mới. Ant Design đã có `Segmented`, `Table`, `Tag`,
`Tooltip` và layout primitives; Recharts đã có trong ứng dụng nhưng không phù hợp
với thanh lịch biểu nhiều hàng, nhãn stage/task và hit area dependency. Một
`div` track với CSS thuần đủ cho view read-only này, ít dependency và dễ kiểm soát
responsive hơn một Gantt package.

## 2. Vấn đề hiện tại

`ProjectDetail.jsx` hiện có Kanban theo stage và Kanban tổng thể. API
`project.get` chỉ trả danh sách stage, trạng thái và count task; task/dependency
instance chưa được trả trong response. Trong khi đó dữ liệu runtime cần thiết đã
có trong `wf_project_stage`, `wf_project_task`,
`wf_project_stage_dependency` và `wf_project_task_dependency`.

Việc chọn người phụ trách trong `TaskDrawer.jsx` hiện chỉ hiển thị tên và mã,
không cho biết người đó đang có bao nhiêu task mở. `WorkflowManager.jsx` hiện
chỉ cấu hình task template (`department_code`), không có trường
`assignee_code` và bảng template cũng không có assignee mặc định. Vì vậy phase
này không bịa thêm field template hoặc schema mới. Workload được tích hợp vào
selector `assignee_code` thực tế trong `TaskDrawer`; nếu sau này WorkflowManager
có selector assignee thật, nó sẽ dùng cùng API/helper và không cần đổi semantics.

## 3. Phạm vi

### 3.1 In scope

- Thêm handler `wf_h_employee_workload` trong `handlers/workflow.php`.
- Handler nhận `department_code` tùy chọn và trả object map
  `assignee_code -> số task đang mở`.
- Đếm task theo Kanban column snapshot của từng project: mọi status không nằm
  trong column có `is_done_status=1` được coi là đang mở.
- Mở rộng response `project.get` hiện có, không tạo endpoint Timeline mới, để
  trả:
  - `stage.depends_on_stage_ids`;
  - `stage.tasks` với các trường ngày/trạng thái cần cho Timeline;
  - `task.depends_on_task_ids`.
- Thêm tab `Timeline` vào `ProjectDetail.jsx`.
- Mỗi stage và task là một hàng; task nằm dưới stage tương ứng.
- Vẽ thanh từ `started_at` hoặc ngày tạo tới `deadline`; task/stage đã xong dùng
  `completed_at` làm đầu mút cuối.
- Hiển thị dependency bằng icon + tooltip liệt kê tên node phụ thuộc.
- Hiển thị workload trong option `assignee_code` tại `TaskDrawer.jsx`.
- Chỉ hiển thị thông tin workload; không tự sắp xếp, auto-assign hoặc ép người
  dùng chọn người ít việc nhất.

### 3.2 Out of scope

- Kéo-thả thanh Timeline để thay đổi lịch.
- Tự tính lại deadline từ duration, dependency hoặc capacity.
- Capacity theo giờ/ngày công, lịch nghỉ, role matching hoặc dự báo quá tải.
- Auto-assignment, recommendation ranking hoặc cân bằng tải tự động.
- Bảng DB mới, cột DB mới hoặc materialized workload snapshot.
- Gọi API riêng cho từng dependency/node.
- Thay thế Kanban, My Work hoặc semantics `execution_state` của Dependency
  Engine.
- Thêm `assignee_code` mặc định vào task template khi schema hiện tại chưa có
  trường này.

## 4. Data contract

### 4.1 Employee workload

Request:

```json
{
  "department_code": "PB001"
}
```

`department_code` có thể bỏ qua hoặc để rỗng để đếm toàn bộ task. Khi có giá trị,
chỉ các assignee thuộc phòng ban đó (theo `hr_lv0020.lv029`) được tính.

Response thành công:

```json
{
  "success": true,
  "data": {
    "NV001": 5,
    "NV002": 0
  }
}
```

Map có thể chỉ chứa assignee có task mở; frontend dùng `workload[code] || 0`
cho nhân viên chưa xuất hiện. Không đếm task không có assignee vì không thể
gắn số đó cho option người dùng.

Để tính một task có mở hay không, handler đọc `p.kanban_columns_json` và dùng
cùng helper `wf_project_kanban_columns()` đã được dùng trong Workflow/Kanban.
Nếu status của task không khớp bất kỳ column nào, coi là chưa done và vẫn đếm;
đây là nguyên tắc an toàn khi dữ liệu cũ có status lạ.

### 4.2 Project detail extension

Response `project.get` giữ nguyên các field cũ và bổ sung dữ liệu instance:

```json
{
  "stages": [
    {
      "id": 101,
      "code": "DEV",
      "name": "Phát triển",
      "started_at": "2026-09-06 09:00:00",
      "completed_at": null,
      "depends_on_stage_ids": [100],
      "tasks": [
        {
          "id": 201,
          "code": "TEC001",
          "name": "Backend",
          "created_at": "2026-09-06 09:00:00",
          "deadline": "2026-09-10",
          "completed_at": null,
          "status": "IN_PROGRESS",
          "assignee_code": "NV001",
          "depends_on_task_ids": [200]
        }
      ]
    }
  ]
}
```

Các task vẫn được lấy từ `wf_project_task` làm single source of truth. Backend
đọc dependency một lần theo project rồi nhóm vào stage/task để tránh frontend
phải gọi thêm API. `order_no` của stage/task vẫn là thứ tự hiển thị chính; edge
dependency được hiển thị như quan hệ giải thích, không tự ý sắp lại node bằng
thuật toán mới.

## 5. Timeline semantics

### 5.1 Node và thứ tự

- Một stage có một hàng group/header và một thanh tổng hợp.
- Mỗi task có một hàng con bên dưới stage.
- Stage sắp theo `order_no, id`; task sắp theo `order_no, id`.
- Nhánh song song giữ cùng stage/dependency order đã cấu hình. Các edge incoming
  được biểu diễn bằng chỉ báo, không biến parallel branch thành chuỗi tuần tự.

### 5.2 Ngày bắt đầu và kết thúc

Start date chọn theo thứ tự:

1. `started_at` nếu có;
2. `created_at` nếu có;
3. `project.created_at`;
4. ngày hiện tại ở frontend như fallback cuối cùng.

End date chọn theo thứ tự:

1. `completed_at` nếu node đã ở column `is_done_status=1`;
2. `deadline` nếu node chưa done và có deadline;
3. ngày hiện tại nếu node chưa done và không có deadline.

Nếu end nhỏ hơn start do dữ liệu quá hạn hoặc chỉnh tay, render một thanh tối
thiểu một ngày bắt đầu tại start, không sửa dữ liệu DB. Date-only deadline được
coi là đầu ngày theo timezone trình duyệt; định dạng hiển thị giữ nguyên dữ liệu
gốc để tránh làm người dùng hiểu nhầm giờ chính xác.

Trục thời gian lấy min/max từ toàn bộ stage/task bars, có padding tối thiểu một
ngày ở hai phía. Khi project không có node, hiển thị `Empty`. Thanh done dùng màu
thành công; node đang mở dùng màu xanh; node quá hạn dùng màu cảnh báo. Đây chỉ
là presentation, không thay đổi `status` hay `execution_state`.

### 5.3 Dependency indicator

Stage có dependency nếu `depends_on_stage_ids` không rỗng. Task có dependency nếu
`depends_on_task_ids` không rỗng. Tooltip chuyển ID sang tên bằng map node trong
cùng response; nếu thiếu ID, hiển thị mã `#id` để không mất thông tin.

Nội dung tooltip tối thiểu gồm `Phụ thuộc vào: [code] name`. Icon là affordance
chỉ đọc, không tạo thao tác sửa dependency. Dữ liệu `execution_state=BLOCKED`
được giữ lại trong row tag/tooltip hiện có nếu cần, nhưng Timeline không tự
đưa ra thông báo mới ngoài quan hệ dependency.

## 6. Backend design

### 6.1 Workload query

Handler đặt trong `workflow.php` cùng nhóm meta/query dùng chung. Nó:

1. Xác thực `department_code` dạng chuỗi tùy chọn.
2. Lấy task có `assignee_code` khác rỗng, join project để lấy snapshot Kanban;
   nếu có filter phòng ban thì join `hr_lv0020` và lọc `lv029`.
3. Duyệt snapshot của từng project qua `wf_project_kanban_columns()` để lấy tập
   column done.
4. Tăng counter nếu `status` không nằm trong tập done.
5. Trả map associative JSON.

Không dùng `status <> 'DONE'` vì mỗi project có thể có column done động và
Phase 1 đã quy định snapshot là nguồn xác định done.

### 6.2 Project detail enrichment

`wf_load_project_full()` đọc toàn bộ task và hai bảng dependency theo
`project_id`, tạo map:

- `stage_id -> depends_on_stage_id[]`;
- `task_id -> depends_on_task_id[]`;
- `project_stage_id -> task[]`.

Sau đó gắn các map vào response. Không thay đổi lifecycle, quyền hoặc
`execution_state`; đây là read model mở rộng cho một endpoint đã có.

## 7. Frontend changes

### 7.1 API service

Thêm:

```js
export const getEmployeeWorkload = (departmentCode = "") =>
  callWorkflowApi("employee.workload", departmentCode ? { department_code: departmentCode } : {});
```

Đăng ký route `employee.workload` trỏ tới
`wf_h_employee_workload`. `_wf_invoke.php` không cần đổi vì handler nằm trong
`workflow.php`, file đã được require sẵn.

### 7.2 ProjectDetail Timeline

`viewMode` mở rộng từ `stage | overview` thành `stage | overview | timeline`.
`Segmented` thêm option `Timeline`. Khi view là Timeline, không gọi
`kanban.board`; dữ liệu sử dụng từ `project` đã load bởi `project.get`.

Component nội bộ `ProjectTimeline` nhận `project`, xây node map, tính date range
và render các row. Track dùng CSS thuần (flex/grid, phần trăm vị trí thanh),
không có `draggable`, `onDragStart`, `onDrop` hoặc callback đổi ngày. Nhấn vào
task vẫn có thể mở `TaskDrawer` nếu UI cần, nhưng Timeline không biến thành màn
hình chỉnh lịch.

### 7.3 TaskDrawer workload

Khi drawer có task, gọi `getEmployeeWorkload()` và giữ map trong state. Mỗi option
assignee giữ value cũ và đổi label thành:

`Nguyễn Văn A (NV001) — 5 việc đang làm`

Nếu request lỗi, selector vẫn hoạt động với label cũ hoặc số 0; workload là
thông tin bổ trợ không được làm hỏng luồng assign. Không filter employee theo
phòng ban tĩnh của task vì selector hiện tại cho phép admin phân công theo dữ
liệu employee đang có.

### 7.4 WorkflowManager

Kiểm tra hiện trạng trước khi sửa: task template chỉ có `department_code`, không
có `assignee_code` và DB không có assignee mặc định ở template. Vì vậy không
thêm selector giả, không lưu giá trị không có nơi persist và không thêm schema
ngoài phase. Khi WorkflowManager có selector assignee trong tương lai, tiêu chí
UI là dùng cùng hậu tố workload; ở phiên bản hiện tại selector phân công thật
được cập nhật tại TaskDrawer, còn WorkflowManager không có điểm phù hợp để gắn
API này.

## 8. API, route và lỗi

- Route mới: `employee.workload`.
- Không tạo route Timeline.
- `department_code` sai hoặc không tồn tại không làm handler lỗi nếu chỉ là
  filter tùy chọn; kết quả là map rỗng.
- Lỗi DB/HTTP của workload không chặn load project hoặc assign task.
- Project detail vẫn trả 404 như trước khi không tìm thấy project.

## 9. Acceptance và kiểm thử

### TC07/Timeline

1. Chọn project có dependency branch song song đã tạo từ Phase 1.
2. Mở tab Timeline.
3. Kiểm tra stage/task được nhóm đúng stage, thứ tự theo `order_no`, branch không
   bị nối thành chuỗi giả.
4. Mở tooltip dependency ở node downstream, đối chiếu đúng tên upstream.
5. Kiểm tra bar dùng ngày tạo/start và deadline/completed_at; không có thao tác
   kéo-thả đổi lịch.

### Workload

1. Mở TaskDrawer, mở selector `Người phụ trách`.
2. Ghi số workload của NV001/NV002.
3. Đếm qua SQL theo đúng snapshot Kanban:

```sql
SELECT t.assignee_code, COUNT(*)
FROM wf_project_task t
JOIN wf_project p ON p.id = t.project_id
WHERE t.assignee_code IS NOT NULL AND t.assignee_code <> ''
  AND t.status NOT IN (/* các code có is_done_status=1 của snapshot project */)
GROUP BY t.assignee_code;
```

Với column động, phép đối chiếu phải resolve `is_done_status` theo
`p.kanban_columns_json`, không hard-code chỉ `DONE`. Số trong option phải khớp.

### Regression

- Kanban, project overview và TaskDrawer hiện có vẫn hoạt động.
- Không có handoff/dependency/Completion Engine logic nào bị thay đổi.
- `npm run build` và PHP lint phải pass.

## 10. Rủi ro và giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Project detail payload lớn hơn | Chỉ trả các field task/dependency cần cho view; một request thay cho N request |
| Snapshot Kanban khác nhau giữa project | Tính done theo snapshot riêng từng project |
| Deadline date-only lệch timezone | Parse date-only ở local date, hiển thị chuỗi gốc |
| Node không có deadline | Dùng hôm nay làm end hiển thị, không ghi ngược DB |
| Workload stale ngay sau khi assign | Tải lại khi mở drawer; đây là chỉ báo tham khảo, không phải lock/capacity gate |
| Người dùng mong kéo-thả Gantt | Ghi rõ read-only trong UI/spec; defer tới phase có scheduling semantics |
| WorkflowManager không có assignee selector | Không thêm field template giả; ghi rõ trong code/spec và áp dụng tại selector thực tế |
| Browser runtime không khả dụng | Chạy lint/build/CLI; không tuyên bố browser acceptance Pass nếu thiếu browser |

## 11. Self-review

- Phạm vi bám Phase 7: Timeline read-only, workload informational, không auto
  assign và không có DB mới.
- Dependency lấy từ dữ liệu Phase 1 và được trả trong `project.get`; không tạo
  API phụ không cần thiết.
- Done semantics dùng `is_done_status` trong snapshot, không hard-code status.
- Không nhầm Timeline với Kanban hoặc Execution Engine; không sửa lifecycle.
- Handoff Phase 6, multi-confirm Phase 5 và Dependency Engine chỉ được render,
  không bị gộp hoặc viết lại.
- Đã ghi nhận thực tế WorkflowManager không có `assignee_code`; quyết định không
  mở rộng schema là chủ ý YAGNI, không phải bỏ sót điểm tích hợp.
