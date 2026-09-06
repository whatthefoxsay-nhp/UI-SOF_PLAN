# Task Handoff tuần tự đa phòng ban

## Trạng thái

Proposed — Phase 6 của Workflow Completion Roadmap.

## Nguồn và bối cảnh

- `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md`, mục Phase 6.
- `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx`, mục 11 và acceptance TC11.
- `docs/superpowers/specs/2026-08-29-dependency-execution-engine-design.md` — chuẩn cho snapshot template/instance, tạo instance hai lượt và recompute execution state.
- `docs/superpowers/specs/2026-09-05-completion-engine-reject-rework-design.md` — Completion Engine và Reject → Rework của Phase 5.

## 1. Vấn đề

Workflow hiện có `confirm_departments`, nhưng đây là cơ chế xác nhận song song: mọi phòng ban trong danh sách đều có thể xác nhận độc lập, và task tự chuyển DONE khi tất cả dòng xác nhận đã `CONFIRMED`. Cơ chế này không biểu diễn được một task được chuyển giao tuần tự giữa các phòng ban.

Ví dụ nghiệp vụ cần hỗ trợ:

```text
Chốt báo giá: Kinh doanh → Kỹ thuật → Kinh doanh → Completion Engine → DONE
```

Handoff phải xác định đúng phòng ban đang giữ việc, tạo snapshot trên từng project, chặn thao tác của phòng ban chưa đến lượt, và chuyển quyền cho bước kế tiếp. Bước cuối không được tự tạo một nhánh DONE mới; nó phải đi vào Completion Engine hiện có để giữ nguyên các quy tắc xác nhận, blocked/dependency và auto-DONE.

## 2. Mục tiêu và không mục tiêu

### 2.1. Trong phạm vi

- Cho phép cấu hình một chuỗi phòng ban có thứ tự trên task template.
- Snapshot chuỗi đó vào task instance khi tạo project.
- Theo dõi `PENDING → ACTIVE → DONE` cho từng bước handoff.
- Xác định phòng ban đang giữ task từ dòng `ACTIVE`.
- Chỉ phòng ban đang `ACTIVE` hoặc admin được thao tác task trong thời gian handoff còn mở.
- Có API hoàn tất bước hiện tại và chuyển sang bước kế tiếp.
- Ở bước cuối, gọi cùng Completion Engine được dùng bởi confirm hiện tại.
- Hiển thị cấu hình trên `WorkflowManager` và tiến độ/quyền thao tác trên `TaskDrawer`.
- Giữ nguyên hành vi task không cấu hình handoff.

### 2.2. Ngoài phạm vi

- Không gộp handoff với `confirm_departments`. Hai cơ chế vẫn là hai tập dữ liệu và hai luồng nghiệp vụ khác nhau.
- Không thêm gate `Subtask` trong sơ đồ Completion Engine của audit; lý do loại trừ đã được ghi trong roadmap.
- Không thiết kế SLA, timeout, tự động chuyển bước, escalation, ủy quyền, parallel branch hoặc rollback một bước handoff.
- Không thay đổi mô hình phòng ban hoặc master data.
- Không thay đổi thuật toán dependency/execution state ngoài việc dùng Completion Engine hiện có ở bước cuối.
- Không tự động khởi động lại handoff chain khi Reject ở Completion Engine. Reject của Phase 5 reset các dòng confirm theo semantics hiện tại; handoff đã hoàn tất vẫn là snapshot lịch sử của chuỗi chuyển giao.

## 3. Thuật ngữ và phân biệt semantics

| Khái niệm | Mục đích | Tính chất | Điều kiện kết thúc |
|---|---|---|---|
| Multi-confirm (`confirm_departments`) | Nhiều phòng ban xác nhận cùng một kết quả | Song song; mỗi phòng ban có một dòng confirm độc lập | Tất cả dòng là `CONFIRMED`, Completion Engine tự DONE |
| Task handoff | Chuyển quyền xử lý giữa các phòng ban | Tuần tự; chỉ một dòng `ACTIVE` tại một thời điểm | Bước cuối là `DONE`, sau đó Completion Engine xử lý confirm/DONE |

Một task có thể có cả hai cấu hình. Handoff quyết định ai đang giữ quyền xử lý trong từng bước; multi-confirm quyết định những ai còn phải xác nhận kết quả sau khi chuỗi handoff kết thúc. Chúng không được suy ra lẫn nhau và một phòng ban xuất hiện nhiều lần trong handoff vẫn là nhiều bước khác nhau.

Task không có bản ghi handoff giữ nguyên quyền và luồng cũ: `department_code` tĩnh dùng cho các thao tác task, còn từng dòng `confirm_departments` vẫn có thể được xử lý theo quyền phòng ban của chính dòng đó.

## 4. Data model

### 4.1. Template chain

```text
wf_task_template_handoff
-------------------------
id                  INT PK AUTO_INCREMENT
task_template_id    INT NOT NULL FK wf_task_template(id) ON DELETE CASCADE
sequence            INT NOT NULL
department_code     VARCHAR(32) NOT NULL
```

Ràng buộc và quy ước:

- `(task_template_id, sequence)` là duy nhất.
- `sequence` là số dương, bắt đầu từ 1 và được ghi lại liên tục theo thứ tự UI.
- `department_code` phải tồn tại trong master data phòng ban, giống validation hiện có của task template.
- Một department có thể xuất hiện nhiều lần trong cùng chain; đây là chủ ý để biểu diễn `Kinh doanh → Kỹ thuật → Kinh doanh`.
- Xóa task template cascade xóa cấu hình handoff.

### 4.2. Instance chain

```text
wf_task_handoff
----------------
id                  INT PK AUTO_INCREMENT
task_id             INT NOT NULL FK wf_project_task(id) ON DELETE CASCADE
project_id          INT NOT NULL FK wf_project(id) ON DELETE CASCADE
sequence            INT NOT NULL
department_code     VARCHAR(32) NOT NULL
status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
started_at          DATETIME NULL
completed_at        DATETIME NULL
```

Ràng buộc và index:

- `(task_id, sequence)` là duy nhất.
- Có index cho `task_id`, `project_id` và `(task_id, status)` để đọc holder và chuyển bước.
- `status` chỉ nhận `PENDING`, `ACTIVE`, `DONE` ở application layer. Cột là `VARCHAR`, không dùng ENUM để tương thích convention schema hiện tại.
- Xóa project hoặc task cascade xóa instance chain.
- `project_id` được lưu denormalized theo convention của dependency instance, giúp truy vấn board/report không phải suy ngược qua task.

### 4.3. Snapshot khi tạo project

`wf_h_project_create` dùng danh sách handoff của template tại thời điểm tạo project. Với mỗi task template có chain, tạo các dòng instance cùng `sequence` và `department_code`:

- sequence nhỏ nhất: `ACTIVE`, `started_at = thời điểm tạo instance`;
- các sequence còn lại: `PENDING`, `started_at = NULL`, `completed_at = NULL`.

Sau khi snapshot, thay đổi cấu hình template không làm thay đổi các project đã tạo.

## 5. Runtime semantics

### 5.1. Xác định holder

Backend đọc các dòng `wf_task_handoff` theo `sequence` và tìm dòng `status = 'ACTIVE'`.

- Có đúng một dòng ACTIVE: holder là `department_code` của dòng đó.
- Không có dòng handoff: task không dùng handoff, fallback về `wf_project_task.department_code` cho quyền thao tác task.
- Chain đã hoàn tất, không còn ACTIVE và các dòng đều DONE: handoff đã kết thúc; task đi vào Completion Engine và các thao tác confirm quay lại semantics multi-confirm hiện có.
- Trạng thái bất thường (còn PENDING nhưng không có ACTIVE) không được tự ý chọn một phòng ban khác; API chuyển bước trả lỗi để tránh giao quyền sai. Admin vẫn có thể xử lý theo cơ chế quản trị hiện có.

### 5.2. Quyền thao tác

Trong lúc có holder ACTIVE:

- user thường chỉ được sửa thông tin task, item, chuyển Kanban hoặc hoàn tất handoff nếu `profile.department_code` bằng holder;
- admin được bypass kiểm tra phòng ban;
- confirm/reject cũng chỉ được thực hiện cho dòng thuộc holder, nhằm không cho phòng ban ngoài lượt can thiệp vào task.

Khi không có handoff instance, các kiểm tra mới không làm thay đổi hành vi cũ. Khi chain đã DONE, nút confirm/reject dùng lại quyền theo từng phòng ban confirm của Phase 5; task static `department_code` vẫn là fallback cho các thao tác task chung.

Frontend chỉ ẩn/disable control để phản hồi tốt; backend là nguồn kiểm soát cuối cùng và phải trả lỗi quyền nếu request bị gọi trực tiếp.

### 5.3. Hoàn tất bước và chuyển tiếp

API `task.handoffComplete` nhận `task_id`.

Trong một transaction:

1. Lock các dòng handoff của task và xác định dòng ACTIVE hiện tại.
2. Kiểm tra actor là admin hoặc thuộc `department_code` của dòng ACTIVE.
3. Set dòng hiện tại `status = 'DONE'`, `completed_at = NOW()`.
4. Nếu còn dòng kế tiếp theo `sequence`, set dòng đó `status = 'ACTIVE'`, `started_at = NOW()` và giữ `completed_at = NULL`.
5. Ghi `wf_history` action `TASK_HANDOFF`, kèm phòng ban nguồn, phòng ban đích và actor.
6. Nếu không còn dòng kế tiếp, gọi helper Completion Engine dùng chung với auto-DONE của `wf_h_task_confirm`.
7. Commit; trả task đầy đủ gồm `handoff`, confirms và execution state mới.

Request lặp sau khi bước đã chuyển không được hoàn tất lại bước cũ. Việc lock và điều kiện `status = 'ACTIVE'` bảo đảm hai request đồng thời không tạo hai holder ACTIVE.

### 5.4. Tích hợp Completion Engine ở bước cuối

Logic auto-DONE hiện có khi mọi confirm đã `CONFIRMED` được tách thành helper dùng chung, không tạo một điều kiện DONE riêng cho handoff.

Sau khi bước cuối thành `DONE`, helper kiểm tra theo đúng Phase 5:

- nếu còn confirm `PENDING` hoặc `REJECTED`, task chưa DONE và người dùng tiếp tục xử lý Completion Engine;
- nếu không có confirm cần chờ, task chuyển DONE theo cùng kiểm tra dependency/stage blocking, history và stage recompute hiện có;
- nếu đủ confirm, task auto-DONE như trước và TC05 không thay đổi.

Nếu chain có cả handoff và confirm, bước cuối chỉ “mở cửa” cho Completion Engine; nó không tự đánh dấu các confirm là đã xác nhận.

## 6. Backend design

### 6.1. Template load/save/clone

- `wf_load_workflow_full` trả thêm `handoff_departments` (mảng code theo sequence) cho từng task template.
- `wf_h_task_task_template_save` nhận/validate `handoff_departments`, xóa snapshot cũ khi update rồi insert lại với sequence liên tục.
- `wf_h_workflow_clone` copy chain theo map task-template cũ → mới.
- Không thay đổi API contract cũ khi field không có hoặc là mảng rỗng.

### 6.2. Project creation

Sau khi insert task instance và có `$taskIdMap`, `wf_h_project_create` copy chain tương ứng từ template vào `wf_task_handoff`. Việc này nằm cùng luồng transaction/tạo project hiện có; nếu insert instance lỗi, project creation phải rollback như các snapshot dependency khác.

### 6.3. Task load và authorization

`wf_load_task_full` trả `handoff` đã sort theo sequence, cast sequence về integer và giữ timestamp/status để TaskDrawer hiển thị.

Các điểm kiểm tra quyền task dùng helper holder chung:

- `wf_apply_task_status` cho đổi Kanban;
- `wf_h_task_save` và thao tác item cho sửa task khi cần;
- `wf_h_task_confirm` và `wf_h_task_confirm_reject` cho confirm/reject;
- handler `wf_h_task_handoff_complete`.

Các handler không liên quan đến task handoff, như quản lý workflow/stage, giữ nguyên quyền hiện có.

### 6.4. History, notification và đồng bộ

- Handoff transition ghi `TASK_HANDOFF` với actor hiện tại và chi tiết from/to.
- Không phát sinh notification mới cho mỗi lần chuyển bước trong Phase 6; notification Reject → assignee của Phase 5 vẫn giữ nguyên.
- Nếu bước cuối làm task DONE, dùng history/status/stage recompute của Completion Engine và đồng bộ plan task theo helper hiện có.

## 7. Frontend design

### 7.1. WorkflowManager

Trong modal task template, thêm control “Handoff tuần tự (tùy chọn)”:

- Select một phòng ban từ danh sách master data và nút “Thêm”.
- Hiển thị các phần tử theo thứ tự, mỗi phần tử có số bước, tên phòng ban, nút lên, xuống và xóa.
- Cho phép cùng một phòng ban xuất hiện nhiều lần.
- Khi save gửi `handoff_departments` là mảng code theo thứ tự; không có phần tử thì gửi `[]`.
- Bảng task hiển thị chain để người quản trị nhận biết template nào có handoff.

Không thêm thư viện drag-sort; control lên/xuống đủ cho phạm vi Phase 6.

### 7.2. TaskDrawer

Nếu task có `handoff`:

- render stepper/list theo sequence, ví dụ `Kinh doanh ✓ → Kỹ thuật (đang xử lý) → Kinh doanh`;
- chỉ holder ACTIVE thấy nút “Hoàn tất tại đây, chuyển tiếp”;
- user ngoài holder thấy trạng thái chờ, các nút sửa task/item/đổi trạng thái bị disable;
- admin vẫn thấy và dùng được control.

`canActOn` phía frontend ưu tiên active handoff khi có ACTIVE; nếu không có ACTIVE thì giữ fallback static/confirm như phần runtime semantics. Phần confirm song song vẫn render riêng, không biến thành các bước handoff.

## 8. API contract

### 8.1. Template save

`workflow.taskTemplateSave` giữ các field cũ và nhận thêm:

```json
{
  "handoff_departments": ["PB002", "PB001", "PB002"]
}
```

Response workflow trả lại field này cho task template.

### 8.2. Task load

`workflow.taskGet` trả:

```json
{
  "handoff": [
    {"sequence": 1, "department_code": "PB002", "status": "DONE", "started_at": "...", "completed_at": "..."},
    {"sequence": 2, "department_code": "PB001", "status": "ACTIVE", "started_at": "...", "completed_at": null}
  ]
}
```

Task không có handoff trả `handoff: []`.

### 8.3. Hoàn tất handoff

Route `task.handoffComplete` → `wf_h_task_handoff_complete`:

```json
{"task_id": 123}
```

Handler trả task đầy đủ sau transition. Lỗi thường gặp: task không tồn tại, không có ACTIVE step, actor không có quyền, hoặc transition cạnh tranh; đều trả HTTP lỗi và không commit nửa chừng.

## 9. Acceptance và kiểm thử

### TC11 — Handoff tuần tự

1. Cấu hình task template `Kinh doanh → Kỹ thuật → Kinh doanh` và tạo project mới.
2. Kiểm tra instance có ba dòng đúng sequence, dòng 1 ACTIVE.
3. Đăng nhập tài khoản Kỹ thuật: không sửa/đổi Kanban/hoàn tất được task khi dòng 1 còn ACTIVE.
4. Đăng nhập Kinh doanh: hoàn tất bước 1; dòng 1 DONE, dòng 2 ACTIVE.
5. Đăng nhập Kỹ thuật: thao tác được và hoàn tất bước 2; dòng 3 ACTIVE.
6. Đăng nhập Kinh doanh: hoàn tất bước 3; không còn ACTIVE, task đi vào Completion Engine.
7. Nếu có confirm: xử lý confirm theo Phase 5 và kiểm tra auto-DONE; nếu không có confirm: helper Completion Engine auto-DONE theo điều kiện hiện có.
8. Kiểm tra `wf_history`, execution state và task status sau mỗi transition.

### Hồi quy

- Task không có handoff vẫn sửa/chuyển Kanban/confirm theo hành vi cũ.
- Kịch bản xác nhận đủ tất cả phòng ban, không có Reject/handoff, vẫn auto-DONE (TC05).
- Chain có phòng ban lặp lại giữ đúng ba bước, không gộp thành hai phòng ban.
- Request hoàn tất lặp hoặc đồng thời không tạo thêm bước DONE/ACTIVE.

## 10. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Biện pháp |
|---|---|
| Template thay đổi làm project cũ bị đổi chain | Snapshot instance khi tạo project, không đọc template runtime |
| Handoff bị nhầm với confirm | Bảng riêng, API riêng, UI khu vực riêng và test song song/tuần tự riêng |
| Hai request cùng hoàn tất một bước | Transaction, row lock và kiểm tra ACTIVE |
| Bước cuối bỏ qua Completion Engine | Tách helper auto-DONE dùng chung với `wf_h_task_confirm` |
| Frontend disable nhưng API vẫn bị gọi trực tiếp | Kiểm tra holder ở backend tại mọi điểm thao tác task |
| Chain không có ACTIVE do dữ liệu lỗi | Không tự chọn holder; trả lỗi transition và giữ dữ liệu để admin xử lý |
| Task có handoff nhưng không có confirm | Bước cuối gọi helper hiện có, không thêm gate subtask hay rule mới |

## 11. Self-review

- [x] Handoff là tuần tự; `confirm_departments` vẫn song song và độc lập.
- [x] Task không cấu hình handoff giữ nguyên hành vi cũ.
- [x] Có template schema và instance snapshot schema, kèm FK/index/sequence/status semantics.
- [x] Bước cuối gọi Completion Engine Phase 5, không sao chép logic DONE riêng.
- [x] Reject Phase 5 không bị mở rộng thành rollback handoff.
- [x] Không thêm gate Subtask.
- [x] Có quyền backend và frontend, nhưng backend là nguồn enforcement.
- [x] Có concurrency/idempotency, history, acceptance TC11 và hồi quy TC05.
