# Prompt cho Codex — Hoàn thiện module Quản lý Quy trình Dự án (Phase 0, 5-10)

Mỗi khối bên dưới là **1 prompt độc lập**, dán nguyên văn cho Codex trong 1 phiên riêng, theo đúng thứ tự Phase 0 → 5 → 6 → 7 → 8 → 9 → 10. Không dán 2 phase cùng lúc. Sau mỗi phase, tự test qua trình duyệt + đọc lại diff trước khi dán prompt phase kế tiếp.

Mỗi prompt tự chứa đủ ngữ cảnh cần thiết (Codex không nhớ hội thoại đã tạo ra tài liệu này).

---

## PROMPT — PHASE 0: Dọn tồn đọng trước khi làm module mới

Bạn đang làm việc trên hệ thống Quản lý Quy trình Dự án (module "Workflow") trong ứng dụng SOF_PLAN, gồm 3 phần:

- Frontend React tại `e:/SOF/PLAN/SOF_PLAN` (viết theo dạng đường dẫn Windows đầy đủ; **có git**, branch `master`).
- Backend API mới tại `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api` — PHP 8.3 thuần (mysqli, không framework). **KHÔNG có git — mọi sửa là sửa trực tiếp, không rollback được.** Luôn đọc toàn bộ file trước khi sửa, chạy `php -l <file>` sau khi sửa để kiểm tra cú pháp.
- Legacy monolith `c:/laragon/www/v2.des.plan.banhangonline.top/services.sof.vn/index.php` — không đụng tới trong phase này.

Database MySQL `hao_erp_sofv5_0`. PHP CLI: `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe`. Muốn test 1 handler PHP độc lập (vì mọi handler kết thúc bằng `exit()`), dùng: `php workflow-api/scripts/_wf_invoke.php <ten_ham_handler> <base64(json_encode($input))>`. Nếu tạo handler file mới, phải thêm `require_once` vào `_wf_invoke.php`.

Chạy web app để test bằng `npm start` trong thư mục `SOF_PLAN`. **Không dùng Electron để test UI** — chỉ test qua trình duyệt.

**Đọc trước khi bắt đầu (bắt buộc):**
1. `docs/TRANG_THAI_DU_AN.md` — nhật ký toàn bộ dự án tính đến nay.
2. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md`, đặc biệt mục "Phase 0" — đây là phạm vi chi tiết của phase này.
3. `git diff` hiện tại của `SOF_PLAN` để thấy các file đang sửa dở.

**Việc cần làm (theo đúng thứ tự):**

1. Hỏi người dùng: kết quả cuối cùng của 20 test case QA (artifact `https://claude.ai/code/artifact/1aa896c7-d903-4e69-8944-beda4c040983`) — TC nào Pass/Fail, đặc biệt xác nhận lại TC4.5 (đã fix trong `TaskDrawer.jsx`, chưa được xác nhận lại) và TC4.8 (đã điều tra, nghi ngờ do cache trình duyệt cũ chứ không phải bug tính toán). Ghi kết quả cuối vào `docs/TRANG_THAI_DU_AN.md`.
2. Commit riêng 2 file đã sửa đúng: `src/pages/QuanLyQuyTrinhDuAn/Dashboard.jsx` (thêm nút "Làm mới") và `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx` (thêm multi-select "Phòng ban cần xác nhận"). `git diff` 2 file này trước để hiểu rõ nội dung, rồi commit với message mô tả đúng 2 fix TC4.5/TC4.8.
3. Hoàn tất việc di trú route đang dở trong `src/App.jsx` và `src/utils/menuUtils.js` (đọc `git diff` 2 file này để thấy state dở dang): route `/quan-ly-du-an/workflow-templates` và `/quan-ly-du-an/danh-sach` đang được đổi thành redirect sang `/quan-ly-quy-trinh-du-an?tab=workflow` và `?tab=projects`; route `/quan-ly-du-an/chi-tiet/:projectId` đang được trỏ sang component `QuanLyQuyTrinhDuAn` (thay vì `ChiTietDuAnWorkflow` cũ). Việc còn thiếu: đảm bảo `src/pages/QuanLyQuyTrinhDuAn/QuanLyQuyTrinhDuAn.jsx` đọc đúng query param `?tab=` để mở đúng tab tương ứng khi được điều hướng tới theo cách này. Test cả 3 route cũ trong trình duyệt xem có redirect/mở đúng tab không. File `src/pages/QuanLyDuAn/ChiTietDuAnWorkflow/ChiTietDuAnWorkflow.jsx` chỉ có 2 thay đổi cosmetic (thụt lề, escape ký tự `->`) — giữ nguyên, không cần xử lý gì thêm, **chưa xoá file này** (sẽ xoá ở Phase 10 sau khi Phase 9 port hết logic nghiệp vụ còn dùng được).
4. Fix bug đã biết: bấm vào 1 thông báo (chuông ở `HeaderBar.jsx`) mở tràn lan tab mới + sidebar mất highlight đúng mục đang chọn. Điều tra `src/contexts/TabContext.jsx` và `src/utils/menuUtils.js` (đã đụng ở bước 3, đây là lúc thuận tiện để sửa cùng lúc). Test lại bằng cách bấm nhiều thông báo liên tiếp trong trình duyệt, xác nhận không mở tab trùng và sidebar highlight đúng.
5. Verify (đọc code, chỉ sửa nếu thật sự thiếu): mở `src/pages/QuanLyQuyTrinhDuAn/WorkflowManager.jsx`, xác nhận UI cấu hình Dependency đã có ở **cả cấp Stage lẫn cấp Task Template** (không chỉ Stage) — DB đã có sẵn cả `wf_stage_dependency` và `wf_task_template_dependency` từ Phase 1, cần khớp UI. Nếu thiếu UI cho Task Template dependency, bổ sung theo đúng pattern UI dependency của Stage đã có trong cùng file.

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (mục "Đã hoàn thành" thêm "Phase 0", xoá các mục trong "Việc còn treo" đã giải quyết). Commit từng phần việc thành các commit riêng có message rõ ràng (không gộp 1 commit khổng lồ). Không commit nếu 1 phần việc chưa test xong qua trình duyệt.

---

## PROMPT — PHASE 5: Completion Engine — Reject → Rework

Ngữ cảnh 3 codebase, quy tắc test-qua-trình-duyệt, quy tắc backend-không-có-git, cách gọi `_wf_invoke.php`: giống hệt như mô tả ở đầu prompt Phase 0 ở trên — đọc lại đoạn đó trước khi bắt đầu nếu đây là phiên làm việc mới, không có ngữ cảnh trước đó.

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

---

## PROMPT — PHASE 6: Task Handoff tuần tự đa phòng ban

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 ở tài liệu này.

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

---

## PROMPT — PHASE 7: Timeline/Gantt + Workload-aware Assignment

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 ở tài liệu này.

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
5. Test qua trình duyệt: mở Timeline của 1 project có nhánh song song thật (dùng data seed đã có từ Phase 1 — theo `TRANG_THAI_DU_AN.md` mục seed, hoặc tạo mới nếu cần), xác nhận thứ tự/nhánh hiển thị đúng logic dependency. Mở dropdown chọn người phụ trách, đối chiếu số "việc đang làm" hiển thị khớp với đếm tay qua SQL (`SELECT assignee_code, COUNT(*) FROM wf_project_task WHERE status NOT IN (...) GROUP BY assignee_code`).

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (thêm "Phase 7"). Commit theo từng task nhỏ.

---

## PROMPT — PHASE 8: Escalation quá hạn

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 ở tài liệu này.

**Đọc trước khi bắt đầu (bắt buộc):**
1. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` mục "Phase 8".
2. `docs/superpowers/specs/2026-08-30-notification-dashboard-design.md` — cơ chế Notification hiện có (3 trigger: TASK_ASSIGNED, CONFIRM_REQUESTED, STAGE_OPENED), phase này thêm trigger thứ 4 theo đúng pattern đó, không viết lại engine notification.
3. `workflow-api/handlers/notification.php` toàn bộ file.

**Quyết định cần hỏi lại người dùng trước khi code (không tự bịa):** hiện không có field "trưởng phòng ban" trong `wf_department` hay `hr_lv0020`. Hỏi người dùng: escalation nên gửi cho ai? Đề xuất mặc định nếu người dùng không có ý kiến khác: gửi cho tất cả user có quyền admin (`wf_is_admin`) + vẫn gửi nhắc cho assignee gốc.

**Việc cần làm (sau khi đã có câu trả lời ở trên):**

1. Viết spec vào `docs/superpowers/specs/2026-09-05-overdue-escalation-design.md`, ghi rõ quyết định "escalate cho ai" đã chốt với người dùng (trích lại nguyên văn câu trả lời).
2. Viết plan vào `docs/superpowers/plans/2026-09-05-overdue-escalation-plan.md`.
3. Backend: script CLI mới `workflow-api/scripts/check_overdue_escalation.php` (độc lập, không phải handler HTTP) — chạy trực tiếp bằng PHP CLI, tìm task quá hạn từ N ngày trở lên (hằng số `ESCALATION_OVERDUE_DAYS = 2`, đặt đầu file) chưa DONE và **chưa có** notification loại `OVERDUE_ESCALATION` cho task đó được tạo trong 24 giờ gần nhất (tránh spam khi script chạy nhiều lần/ngày), tạo notification mới theo đúng cấu trúc bảng notification hiện có (xem `notification.php`) cho đối tượng đã chốt ở bước hỏi người dùng. Ghi trong file comment đầu script: hướng dẫn cấu hình chạy 1 lần/ngày qua Windows Task Scheduler, gọi bằng `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe check_overdue_escalation.php` — **không tự cài Task Scheduler**, chỉ ghi hướng dẫn.
4. Test: chạy script bằng tay qua PHP CLI với ít nhất 1 task đã quá hạn thật trong DB (theo `docs/TRANG_THAI_DU_AN.md` mục 5, `ACC001` đang quá hạn tính tới thời điểm viết tài liệu — kiểm tra lại còn đúng không, nếu không thì tạo 1 task quá hạn mới để test), xác nhận có notification mới xuất hiện trong UI (chuông thông báo). Chạy script lần 2 ngay sau đó, xác nhận không tạo notification trùng lặp.

**Sau khi xong:** cập nhật `docs/TRANG_THAI_DU_AN.md` (thêm "Phase 8", ghi rõ quyết định escalation target đã chốt). Commit.

---

## PROMPT — PHASE 9: Business Modules M10 (Contract, Profit, Development, Testing, Handover, Payment, Maintenance)

Đây là phase **lớn và rủi ro nhất** trong toàn bộ roadmap vì đụng nhiều vào backend PHP không có git. Đọc kỹ, làm từng bước nhỏ, test từng bước qua trình duyệt trước khi làm bước kế tiếp — không viết toàn bộ 6 module cùng lúc rồi mới test.

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git / cách gọi `_wf_invoke.php`: xem mô tả đầu prompt Phase 0 ở tài liệu này.

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

---

## PROMPT — PHASE 10: Regression toàn diện + dọn code cũ + chốt tài liệu

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git: xem mô tả đầu prompt Phase 0 ở tài liệu này.

**Đọc trước khi bắt đầu (bắt buộc):**
1. `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md` mục "Phase 10".
2. `docs/TRANG_THAI_DU_AN.md` — đọc lại toàn bộ nhật ký Phase 0, 5-9 đã ghi để biết chính xác TC nào cần đưa vào bộ regression hợp nhất.

**Việc cần làm:**

1. Tổng hợp 1 bộ checklist regression hợp nhất gồm: 20 TC gốc (Phase 0) + TC06 (Phase 5) + TC11 Handoff (Phase 6) + kịch bản Acceptance của Phase 7 (Timeline + workload hiển thị đúng) + Phase 8 (escalation không trùng lặp) + Phase 9 (end-to-end 6 module business). Chạy lại toàn bộ qua trình duyệt, ghi Pass/Fail vào `docs/TRANG_THAI_DU_AN.md`. Fix ngay tại chỗ nếu phát hiện hồi quy (bug cũ tái hiện do thay đổi ở phase sau) — không để lại tồn đọng mới.
2. Trước khi xoá bất kỳ file nào, chạy `grep -r` (hoặc tương đương) tìm mọi import/route còn trỏ tới các trang cũ. Chỉ xoá khi chắc chắn không còn nơi nào tham chiếu:
   - `src/pages/QuanLyDuAn/ChiTietDuAnWorkflow/` (đã được Phase 0 redirect, Phase 9 đã port hết logic nghiệp vụ còn giá trị).
   - `QuanLyWorkflow.jsx`, `QuanLyDuAnWorkflow.jsx` (tên file chính xác: tự tìm bằng `Glob`/`grep` theo tên component đã thấy trong `src/App.jsx` trước Phase 0).
   - `DuAnMau.jsx`, `DanhMucGiaiDoanDuAn.jsx`, `KabanPhongBan.jsx`: kiểm tra riêng từng file xem còn được module nào khác ngoài Workflow cũ sử dụng không (vd module Kế hoạch cũ `cr_lv0094` có thể còn tham chiếu) — nếu không chắc, **không xoá**, chỉ ghi chú lại trong `docs/TRANG_THAI_DU_AN.md` rằng file này nghi ngờ không còn dùng, để người dùng tự quyết định sau.
3. Tạo file `docs/AUDIT_STATUS_UPDATE.md` ghi lại bảng đánh giá hiện trạng (tương ứng mục 27 của audit gốc) với điểm số/đánh giá mới sau khi toàn bộ roadmap hoàn thành — không sửa trực tiếp file `.docx` gốc.
4. Viết bản tổng kết cuối cùng vào `docs/TRANG_THAI_DU_AN.md` — trạng thái tổng thể module Workflow, các quyết định đã chốt xuyên suốt roadmap (escalation target, công thức Profit, các điểm YAGNI đã loại trừ) để phiên làm việc sau (nếu có việc phát sinh) nắm được ngay.
5. Sanity-check hiệu năng: mở Dashboard và Kanban tổng với toàn bộ dữ liệu đã seed qua các phase, xác nhận thời gian tải hợp lý (không có dấu hiệu N+1 query rõ rệt — nếu nghi ngờ, kiểm tra nhanh bằng cách đếm số query log trong 1 request, không cần công cụ benchmark chuyên sâu).

**Sau khi xong:** commit các thay đổi dọn dẹp + tài liệu. Đây là điểm kết thúc của toàn bộ roadmap Phase 0/5-10 — báo cáo lại người dùng danh sách file đã xoá, danh sách file nghi ngờ chưa dám xoá, và bộ checklist regression cuối cùng.
