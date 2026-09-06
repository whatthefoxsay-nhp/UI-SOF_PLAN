# Overdue Escalation Design

## 1. Mục tiêu và kết luận thiết kế

Phase 8 bổ sung trigger notification thứ tư cho các task quá hạn đủ lâu:

- `TASK_ASSIGNED`;
- `CONFIRM_REQUESTED`;
- `STAGE_OPENED`;
- `OVERDUE_ESCALATION` (Phase 8).

Hệ thống hiện không có worker, queue hoặc cron runner trong ứng dụng. Vì vậy
escalation được triển khai dưới dạng PHP CLI script độc lập, chạy một lần/ngày
bằng Windows Task Scheduler. Script chỉ tạo notification bền vững; UI chuông
đã có sẵn cơ chế đọc `wf_notification` nên không cần viết lại notification
engine hoặc thêm endpoint HTTP.

Quyết định recipient đã được chốt với người dùng: **“Tất cả admin + assignee
gốc”**. Mỗi task đủ điều kiện tạo một notification riêng cho mỗi recipient
duy nhất. Nếu assignee cũng là admin thì chỉ tạo một dòng.

## 2. Vấn đề hiện tại

Notification hiện chỉ được tạo tại các sự kiện request/response tức thời. Task
có deadline quá hạn không tự tạo notification vì không có tiến trình nền. Nếu
script chỉ kiểm tra `status <> 'DONE'` thì sẽ không tương thích với Kanban động:
mỗi project giữ snapshot `kanban_columns_json`, và cột hoàn thành được xác định
bởi `is_done_status=1`.

Ngoài ra, `wf_is_admin()` hiện kiểm tra `x-user-right` của request hiện tại.
CLI scheduler không có user session/header và `wf_department`/`hr_lv0020`
không có field trưởng phòng hay role admin để enumerate qua SQL. Trong DB hiện
tại, tài khoản admin canonical là `hr_lv0020.lv001='admin'`; resolver recipient
giữ danh sách admin ở một hàm riêng, dùng account này, để không nhầm một field
nhân sự khác là quyền admin. Khi identity source có thêm admin account, chỉ
resolver này cần cập nhật.

## 3. Phạm vi

### 3.1 In scope

- File CLI độc lập:
  `workflow-api/scripts/check_overdue_escalation.php`.
- Hằng số đầu file `ESCALATION_OVERDUE_DAYS = 2`.
- Chọn task có `deadline` từ hai ngày trước trở về trước và chưa nằm trong
  cột Kanban có `is_done_status=1` của snapshot project.
- Bỏ qua task đã có notification `OVERDUE_ESCALATION` cho đúng task/project
  trong 24 giờ gần nhất.
- Ghi notification qua cùng cấu trúc `wf_notification`/helper `wf_notify()`:
  `recipient_code`, `type`, project/task entity và message.
- Gửi tới **“Tất cả admin + assignee gốc”**; dedupe cùng một recipient.
- In summary CLI có số task quét, đủ điều kiện, bỏ qua vì done/cooldown và số
  notification đã tạo.
- Comment đầu script có hướng dẫn Task Scheduler, dùng đúng executable:
  `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe check_overdue_escalation.php`.

### 3.2 Out of scope

- Tự cài hoặc tự đăng ký Windows Task Scheduler.
- Worker, queue, websocket, retry service hoặc HTTP route mới.
- Thêm bảng/cột/schema notification.
- Notification preference, mute, severity, SLA/capacity hay auto-reassign.
- Tính lại deadline hoặc thay đổi task status.
- Gửi theo trưởng phòng ban; field này không tồn tại và quyết định đã chọn
  admin + assignee.
- Thay đổi UI notification bell; bell hiện tại đã đọc được mọi `type` từ
  `wf_notification`.

## 4. Semantics

### 4.1 Task quá hạn

`deadline` hiện là kiểu `DATE`, không có giờ. Với `N=2`, task đủ điều kiện
khi:

```sql
deadline IS NOT NULL
AND deadline <= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
```

Điều này biểu diễn ít nhất hai ngày lịch đã trôi qua, ổn định khi script chạy
một lần/ngày. Task không có deadline không được escalation.

### 4.2 Done theo snapshot

Script lấy `p.kanban_columns_json` cùng task và gọi helper
`wf_project_kanban_columns()`. Task chỉ được coi là done khi `task.status`
khớp một column có `is_done_status=1`. Status không khớp column nào được coi
là chưa done để không bỏ sót dữ liệu legacy.

Không hard-code `status='DONE'`; project có thể cấu hình code cột khác nhau.
Script không sửa status, execution state, deadline hoặc history.

### 4.3 Cooldown chống spam

Trước khi gửi, query:

```sql
type = 'OVERDUE_ESCALATION'
AND project_id = <project_id>
AND entity_type = 'TASK'
AND entity_id = <task_id>
AND created_at >= NOW() - INTERVAL 24 HOUR
```

Chỉ cần một dòng match là bỏ qua toàn bộ task trong lượt chạy đó. Vì một task
có thể có nhiều recipient, lần chạy đầu tạo các dòng admin/assignee; lần chạy
thứ hai không tạo thêm dòng nào. Cooldown là task-level đúng theo yêu cầu,
không phải mỗi recipient-level.

### 4.4 Recipient và message

Resolver tạo tập recipient theo thứ tự:

1. các admin account được resolver CLI xác định (hiện có `admin`);
2. `assignee_code` hiện tại của task nếu không rỗng.

`array_unique` theo code trước khi insert. Mỗi dòng dùng
`recipient_code=<code>`, `recipient_department=NULL`, `type='OVERDUE_ESCALATION'`,
`entity_type='TASK'`, `entity_id=<task id>`, `project_id=<project id>`.

Message giữ trong giới hạn 255 ký tự, gồm mã task, tên task, deadline và số
ngày quá hạn để admin/assignee hiểu ngay lý do nhận thông báo.

“Assignee gốc” trong schema hiện tại được biểu diễn bởi `wf_project_task.assignee_code`
tại thời điểm script chạy; codebase chưa có assignment history để khôi phục
một assignee trong quá khứ.

## 5. CLI design

Script phải chạy bằng CLI, từ thư mục `workflow-api/scripts`:

```powershell
& 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe' check_overdue_escalation.php
```

Đầu file kiểm tra `PHP_SAPI === 'cli'`, bật lỗi ra STDERR và bootstrap DB như
`_wf_invoke.php` nhưng không gọi handler HTTP/`wf_json_response()`. Script
require `db.php` và `handlers/workflow.php` để dùng `wf_query`, `wf_execute`,
`wf_notify` và helper Kanban snapshot. Không cần sửa `_wf_invoke.php` vì đây là
entrypoint độc lập, không phải handler.

Hướng dẫn Task Scheduler trong comment đầu file:

1. Tạo Basic Task chạy Daily tại thời điểm phù hợp.
2. Action `Start a program` dùng:
   `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe`.
3. Working directory/argument trỏ tới thư mục
   `workflow-api\scripts`, argument là `check_overdue_escalation.php`.

Phase này chỉ ghi hướng dẫn, không tự tạo task trên máy.

## 6. Data model và không migration

Không có thay đổi DB. `wf_notification` đã có các cột cần thiết:

```text
recipient_code, recipient_department, type, project_id,
entity_type, entity_id, message, is_read, created_at
```

`OVERDUE_ESCALATION` là giá trị mới được chấp nhận ở cột `type` kiểu
`VARCHAR(30)`, không cần ALTER TABLE. Dùng `wf_notify()` để giữ đúng convention
của ba trigger hiện có.

## 7. Frontend impact

Không cần code frontend mới trong Phase 8. `notification.list` đang trả
`n.*`, nên row `OVERDUE_ESCALATION` tự xuất hiện trong bell cùng message,
project tag và unread count. Click/read behavior vẫn dùng `id`/project hiện có.

Kiểm thử UI cần xác nhận một row escalation xuất hiện trong chuông sau khi
script chạy. Nếu browser runtime không khả dụng, chỉ được ghi nhận DB/CLI
verification và phải đánh dấu browser acceptance blocked.

## 8. Error handling và rủi ro

- Không kết nối DB hoặc query lỗi: PHP báo lỗi ra STDERR và exit khác 0; không
  in summary thành công giả.
- Một notification insert lỗi sẽ làm script lỗi ngay, tránh báo đã xử lý đủ
  trong khi dữ liệu thiếu. Transaction toàn bộ batch không bắt buộc vì các
  task độc lập và script được thiết kế chạy lại an toàn nhờ cooldown.
- Hai scheduler run đồng thời vẫn có race giữa check và insert; Task Scheduler
  chỉ cấu hình một lịch chạy/ngày trong scope phase. Nếu sau này cần đảm bảo
  tuyệt đối, thêm lock/unique key ở phase riêng.
- Admin quyền thực tế đến từ CouchDB/header, không có bảng role trong workflow
  DB. Resolver `admin` là giới hạn hiện tại được ghi rõ; không suy đoán theo
  department hoặc chức danh.
- Timezone dùng timezone PHP/MySQL của máy chạy script; `DATE` + `CURDATE()`
  tránh lệch giờ trong cùng ngày.
- Nhiều task quá hạn sẽ tạo nhiều notification ở lần đầu; cooldown làm các
  lần sau nhẹ và không spam.

## 9. Acceptance và test plan

### TC08 — Overdue escalation

1. Kiểm tra task quá hạn thật, ưu tiên `ACC001`; xác nhận chưa done theo
   snapshot và `deadline <= CURDATE()-2`.
2. Đếm số notification `OVERDUE_ESCALATION` của task trước khi chạy.
3. Chạy script bằng PHP CLI.
4. Xác nhận có notification mới cho `admin` và assignee nếu task có assignee;
   nếu hai vai trò cùng một code thì chỉ một dòng.
5. Đăng nhập UI, mở chuông và xác nhận notification/message/project xuất hiện.
6. Chạy script lần hai ngay lập tức; xác nhận số dòng không tăng, chứng minh
   cooldown 24 giờ.

### Regression

- Notification list/unread/read hiện có không lỗi khi có type mới.
- `TASK_ASSIGNED`, `CONFIRM_REQUESTED`, `STAGE_OPENED` vẫn giữ nguyên.
- Kanban/Completion Engine không bị sửa.
- PHP lint và CLI exit thành công.

## 10. Self-review

- Bám đúng Phase 8: script CLI, N=2, cooldown 24 giờ, trigger thứ tư, không
  worker/Task Scheduler auto-install.
- Ghi nguyên văn quyết định recipient: **“Tất cả admin + assignee gốc”**.
- Done semantics dùng `is_done_status=1` từ snapshot, không dùng status cứng.
- Tái sử dụng `wf_notify()`/`wf_notification`, không viết notification engine
  thứ hai.
- Không thêm migration hay frontend behavior ngoài khả năng bell đã có.
- Giới hạn không enumerate được quyền admin từ CLI đã được nêu rõ, resolver
  tách riêng để dễ thay khi hệ thống có nguồn role chính thức.
