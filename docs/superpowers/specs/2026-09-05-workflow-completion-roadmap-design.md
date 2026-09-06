# Lộ trình hoàn thiện module Quản lý Quy trình Dự án — Roadmap Phase 0, 5-10

**Status:** Approved bởi người dùng ngày 2026-09-05 (phạm vi: chỉ module Workflow/Quản lý Quy trình Dự án, không đụng ERP cũ; bao gồm đầy đủ M01-M10 theo audit; Phase 0 dọn dẹp tồn đọng trước; chạy tuần tự từng phase, mỗi phase 1 prompt Codex riêng).

**Nguồn:**
- `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` — toàn bộ 30 mục, đặc biệt §22 (bảng M01-M10), §23 (thứ tự kỹ thuật), §25 (Acceptance Test TC01-TC10), §27 (đánh giá hiện trạng), §28 (nguyên tắc kiến trúc).
- `docs/TRANG_THAI_DU_AN.md` — nhật ký các phase đã làm (Phase 1-4) và tồn đọng hiện tại.
- 4 spec/plan đã có: `2026-08-28-workflow-kehoach-sync`, `2026-08-29-dependency-execution-engine`, `2026-08-29-master-data-normalization`, `2026-08-30-notification-dashboard`.
- Khảo sát trực tiếp mã nguồn ngày 2026-09-05: `docs/workflow_schema.sql`, 2 file migration đã áp dụng, `workflow-api/handlers/*.php`, `src/pages/QuanLyQuyTrinhDuAn/*.jsx`, diff của các file đang sửa dở.

## 1. Vì sao cần tài liệu này

Audit gốc liệt kê 10 module (M01-M10) và một thứ tự kỹ thuật (§23) nhưng được viết **trước khi** Phase 1-4 triển khai. Sau 4 phase đó, phần lớn nền tảng M01-M07 đã có thật trong code (không chỉ trên giấy). Tài liệu này đối chiếu lại hiện trạng thật với audit, xác định đúng phần còn thiếu, và chia phần còn thiếu thành các phase kế tiếp (đánh số tiếp Phase 5-10, giữ Phase 1-4 nguyên vẹn trong lịch sử). Đây là tài liệu "khung" — mỗi phase khi thực thi vẫn phải tự viết spec + plan chi tiết riêng theo đúng độ sâu của 4 spec đã có (đặc biệt xem `2026-08-29-dependency-execution-engine-design.md` làm chuẩn định dạng/độ chi tiết), không được coi tài liệu khung này là đủ để code thẳng.

## 2. Đối chiếu hiện trạng thật vs audit M01-M10

| # | Module (audit) | Hiện trạng thật (2026-09-05) | Việc còn thiếu |
|---|---|---|---|
| M01 | Master Data | `wf_customer`, `wf_project_type` đã tách bảng (Phase 2); Department/User/Role/Permission dùng chung hệ thống nhân sự cũ (`hr_lv0020`, `wf_department`) | Không còn thiếu gì bắt buộc |
| M02 | Workflow Designer | `WorkflowManager.jsx` đủ Workflow/Stage/Task Template/Rule (completion_condition)/Approval (confirm_departments)/Dependency (Phase 1, cả stage lẫn task template) | Cần **verify** UI cấu hình dependency đã có ở cả 2 cấp (stage và task template), không chỉ stage — xem Phase 0 |
| M03 | Project | `wf_h_project_create` sinh đủ Stage/Task/Dependency instance từ template (Phase 1 đã sửa 2-pass insert) | Không còn thiếu gì bắt buộc |
| M04 | Workflow Engine | Dependency (Phase 1), Completion đơn giản (auto-DONE khi đủ confirm), Lock (`wf_lock_request` có sẵn từ đầu), Notification trigger (Phase 4) | **Thiếu REJECT→REWORK** (TC06) — xem Phase 5 |
| M05 | Task Management | Assign/status/deadline/dependency/approval/comment(qua history)/attachment(chưa có file upload) đã có; **handoff tuần tự đa phòng ban chưa có** (chỉ có multi-confirm song song) | Handoff tuần tự — xem Phase 6. Attachment file upload: không có yêu cầu nghiệp vụ cụ thể, để ngoài phạm vi (YAGNI) |
| M06 | Kanban | Kanban tổng (Phase 3) + Kanban chi tiết + drag/drop đã có | Không còn thiếu gì bắt buộc |
| M07 | My Work | Filter quá hạn/hôm nay/sắp tới/đang làm/chờ xác nhận/hoàn thành/bị block (Phase 1+3) đã có | Không còn thiếu gì bắt buộc |
| M08 | Collaboration | Multi-assignment/multi-approval song song đã có | **Handoff tuần tự + escalation chưa có** — Phase 6, Phase 8 |
| M09 | Monitoring | Dashboard (dự án/công việc/quá hạn/bị chặn theo phòng ban + hoạt động gần đây) đã có (Phase 4) | **Timeline/Gantt + workload-aware assignment chưa có** — Phase 7 |
| M10 | Business Modules | `wf_task_item` (bảng generic, 4 loại CHECKLIST/BUG/ALLOCATION/TICKET, `status` là text tự do) — **chỉ là stub**, KHÔNG có logic Contract/Profit/Payment thật, KHÔNG có luồng Bug TODO→IN_FIX→RETEST→CLOSED thật. Logic thật hiện nằm ở trang cũ `ChiTietDuAnWorkflow.jsx` (đang bị thay thế, có `programmingData.usedDays/totalPlannedDays`, `handleUpdateBugStatus` với state IN_FIX/RETEST) | Toàn bộ M10 thật — Phase 9 |

**Kết luận:** không cần làm lại M01-M07/M09-nền-tảng — engine cốt lõi audit đòi hỏi (Dependency, Single-Source-of-Truth Task, Kanban=projection, Template/Instance tách biệt) đã tồn tại thật trong code. Công việc còn lại tập trung vào: Completion Engine hoàn chỉnh (Phase 5), Handoff tuần tự (Phase 6), Timeline + workload (Phase 7), Escalation (Phase 8), Business Modules thật (Phase 9), và một vòng regression + dọn code cũ (Phase 10). Trước đó, Phase 0 xử lý tồn đọng để không mang nợ kỹ thuật vào các phase mới.

## 3. Nguyên tắc bắt buộc cho mọi phase (kế thừa từ audit §28, đã được Phase 1-4 tuân thủ)

- Workflow/Task/Stage vẫn là **data-driven**, không hard-code theo tên stage/task cụ thể (trừ các "khoá" đã có sẵn: cột Kanban `code='DONE'`, `stage_type` dùng để bật UI chuyên biệt — đây là hard-code có chủ đích, đã tồn tại, không phải anti-pattern mới).
- **Task là Single Source of Truth** — Kanban, My Work, Dashboard, Timeline (Phase 7) đều đọc từ `wf_project_task`/`wf_project_stage`, không tạo bảng trạng thái song song.
- Template (`wf_workflow`, `wf_stage`, `wf_task_template`) tách biệt khỏi Instance (`wf_project`, `wf_project_stage`, `wf_project_task`) — mọi bảng mới cho Handoff/Contract/Payment/... phải theo đúng cặp template/instance này nếu khái niệm đó tồn tại ở cả 2 tầng (vd Handoff: có ở template lẫn instance), hoặc chỉ ở tầng instance nếu khái niệm chỉ có ý nghĩa với 1 dự án cụ thể (vd Contract, Payment — mỗi dự án có hợp đồng riêng, không có "mẫu hợp đồng").
- Không tự ý xây event bus/message queue — codebase này không có worker/queue process nào (đã là quyết định ghi nhận từ Phase 1). Đồng bộ giữa các view tiếp tục theo mô hình "recompute đồng bộ tại các điểm chốt" (như `wf_recompute_task_execution_state` của Phase 1).
- **Backend `workflow-api/` và legacy `services.sof.vn/index.php` KHÔNG có git** — mọi sửa là sửa trực tiếp không rollback được. Bắt buộc đọc toàn bộ file trước khi sửa, dùng `php -l` kiểm tra cú pháp, và nếu cần thử 1 handler độc lập thì dùng `workflow-api/scripts/_wf_invoke.php` (nhớ thêm `require_once` cho handler file mới vào đây nếu tạo file mới).
- Test UI qua trình duyệt (`npm start`), **không dùng Electron** để test — quy tắc đã chốt với người dùng.
- Mỗi phase phải: (1) viết spec design vào `docs/superpowers/specs/`, (2) viết implementation plan vào `docs/superpowers/plans/`, (3) nếu có thay đổi DB thì viết file `.sql` vào `docs/superpowers/plans/sql/` (không tự ý chạy migration nếu không có kết nối DB — để migration ở dạng file, người dùng hoặc phiên sau sẽ áp dụng nếu môi trường không có MySQL đang chạy), (4) implement, (5) tự test qua trình duyệt theo đúng Acceptance Criteria của phase, (6) cập nhật `docs/TRANG_THAI_DU_AN.md` (mục "Đã hoàn thành" + xoá/cập nhật mục "Việc còn treo" liên quan), (7) commit vào git theo từng task nhỏ có ý nghĩa (không gộp 1 commit khổng lồ) — chỉ áp dụng cho repo `SOF_PLAN` (frontend), 2 backend PHP không có git nên không "commit" được, chỉ sửa trực tiếp.
- Đặt tên file theo đúng convention đã có: `YYYY-MM-DD-<slug>-design.md`, `YYYY-MM-DD-<slug>-plan.md`, `YYYY-MM-DD-<slug>.sql`.

## 4. Danh sách phase

### Phase 0 — Dọn tồn đọng (làm trước tiên, không phải audit module nào)

**Mục tiêu:** không mang nợ kỹ thuật/QA dở dang vào các phase mới.

Phạm vi:
1. Hoàn tất bộ checklist QA 20 test case (artifact `https://claude.ai/code/artifact/1aa896c7-d903-4e69-8944-beda4c040983`) — hỏi lại người dùng TC nào còn FAIL (Claude/Codex không đọc được localStorage của người dùng). Verify lại TC4.5 (đã fix, chưa được xác nhận) và làm rõ dứt điểm TC4.8 (đã điều tra, nghi ngờ do cache/bundle cũ).
2. Commit 2 file sửa đúng trong phiên trước: `src/pages/QuanLyQuyTrinhDuAn/Dashboard.jsx` (nút Làm mới), `src/pages/QuanLyQuyTrinhDuAn/TaskDrawer.jsx` (multi-select phòng ban xác nhận).
3. Xử lý 3 file đang sửa dở **từ trước phiên trước** (không phải do AI tạo ra, không được tự ý revert): `src/App.jsx`, `src/pages/QuanLyDuAn/ChiTietDuAnWorkflow/ChiTietDuAnWorkflow.jsx`, `src/utils/menuUtils.js`. Đã xác định nội dung diff: đây là một cuộc **di trú route** đang dở — chuyển các route cũ `/quan-ly-du-an/workflow-templates`, `/quan-ly-du-an/danh-sach` sang redirect tới module mới `/quan-ly-quy-trinh-du-an?tab=...`, và `/quan-ly-du-an/chi-tiet/:projectId` trỏ thẳng sang `QuanLyQuyTrinhDuAn` thay vì `ChiTietDuAnWorkflow` cũ. Việc cần làm: hoàn tất di trú này (đảm bảo `QuanLyQuyTrinhDuAn.jsx` nhận query param `?tab=` để mở đúng tab), test đủ 3 route cũ redirect đúng, rồi commit. **Chưa xoá** các file trang cũ (`ChiTietDuAnWorkflow.jsx`, `QuanLyWorkflow.jsx`, `QuanLyDuAnWorkflow.jsx`) ở phase này — chỉ xoá ở Phase 10 sau khi Phase 9 đã port hết logic nghiệp vụ còn giá trị từ `ChiTietDuAnWorkflow.jsx`.
4. Fix bug đã biết, cố tình hoãn: bấm vào 1 thông báo (bell) mở tràn lan tab mới + sidebar mất highlight đúng mục đang chọn. Nguyên nhân nghi ngờ nằm ở `TabContext.jsx`/`menuUtils.js`. Vì Phase 0 đã đụng `menuUtils.js` cho việc di trú route ở trên, đây là thời điểm hợp lý để sửa luôn cùng lúc.
5. Verify (đọc code, không cần sửa nếu đã đúng): `WorkflowManager.jsx` đã có UI cấu hình dependency ở **cả 2 cấp** stage và task template chưa (bảng `wf_task_template_dependency` đã tồn tại từ Phase 1, cần xác nhận có UI tương ứng, không chỉ có ở DB).

**Definition of Done:** 20 TC chốt Pass/Fail rõ ràng (ghi lại kết quả cuối vào `TRANG_THAI_DU_AN.md`), không còn file uncommitted nào là "dở dang không rõ nguồn gốc", bug bell-notification không còn tái hiện qua test tay, 3 route cũ redirect đúng.

### Phase 5 — Completion Engine: Reject → Rework

**Đối chiếu audit:** §10 (Completion Engine), §25 TC06 ("Approval reject → REJECT → REWORK", hiện tại **FAIL** vì `wf_task_confirm.status` chỉ có PENDING/CONFIRMED).

Phạm vi:
- Thêm giá trị `REJECTED` cho `wf_task_confirm.status`, thêm cột `reject_reason VARCHAR(500)`.
- Handler mới `wf_h_task_confirm_reject` (kanban.php): phòng ban có quyền xác nhận có thể từ chối kèm lý do bắt buộc. Khi 1 dòng confirm bị REJECTED: (a) mọi dòng confirm khác của task đó reset về PENDING (công việc đã bị coi là chưa đạt, cần làm lại và xin xác nhận lại từ đầu), (b) task tự động chuyển Kanban status về cột **đầu tiên chưa-done** của board (không phải cột DONE), (c) ghi `wf_history` action `TASK_REJECTED`, (d) bắn notification cho `assignee_code` của task kèm lý do.
- UI `TaskDrawer.jsx`: nút "Từ chối" cạnh nút "Xác nhận" hiện có, mở modal nhập lý do (bắt buộc).
- Explicitly OUT OF SCOPE: gate "Subtask" trong sơ đồ Completion Engine của audit §10 — hiện không tồn tại khái niệm subtask bắt buộc-phải-xong-trước-khi-DONE nào tách biệt khỏi `wf_task_item` (vốn là dữ liệu phát sinh tự do, không phải điều kiện chặn). Không tự bịa ra field `is_required` nếu không có yêu cầu nghiệp vụ cụ thể — nếu người dùng cần, đây sẽ là 1 phase riêng sau này.

**Acceptance:** TC06 pass (REJECT đưa task về REWORK, không tự động DONE); TC05 vẫn pass (không phá multi-approval hiện có).

### Phase 6 — Task Handoff tuần tự (M08 Collaboration)

**Đối chiếu audit:** §11 (TASK_HANDOFF: From/To Department, Sequence, Condition — ví dụ "Chốt báo giá: Kinh doanh → Kỹ thuật → Kinh doanh → DONE").

Đây là khái niệm **khác** với `confirm_departments` hiện có (đó là xác nhận **song song**, ai xong trước không quan trọng thứ tự). Handoff là **tuần tự**: chỉ phòng ban đang giữ lượt mới thao tác được, xong thì chuyển tiếp phòng ban kế.

Phạm vi:
- Bảng mới `wf_task_template_handoff` (task_template_id, sequence, department_code) — cấu hình ở Workflow Designer, theo cặp template/instance như Dependency.
- Bảng mới `wf_task_handoff` (task_id, project_id, sequence, department_code, status ENUM-text PENDING/ACTIVE/DONE, started_at, completed_at) — sinh ra khi tạo project (giống cách Dependency instance được copy ở Phase 1 §4.4).
- Task có handoff chain thì "phòng ban đang giữ việc" = department tại `MIN(sequence) WHERE status != DONE`. Chỉ thành viên phòng ban đó (hoặc admin) mới sửa được task/kéo Kanban lúc này — tái dùng logic phân quyền `canActOn` đã có trong `TaskDrawer.jsx`, mở rộng nó đọc theo handoff hiện tại thay vì chỉ `department_code` tĩnh của task.
- Nút "Hoàn tất tại đây, chuyển tiếp" trong `TaskDrawer.jsx`: đánh dấu bước hiện tại DONE, kích hoạt bước kế tiếp; nếu là bước cuối cùng, hành xử như DONE thường (đi qua Completion Engine của Phase 5).
- UI Workflow Designer (`WorkflowManager.jsx`): control kéo-thả hoặc multi-select có thứ tự để cấu hình chuỗi handoff cho 1 task template.
- Task nào **không** cấu hình handoff thì giữ nguyên hành vi cũ (1 `department_code` cố định) — đây là tính năng cộng thêm, không bắt buộc mọi task phải có handoff.

**Acceptance (TC mới, đặt tiếp số TC11 theo mạch audit):** TC11 — Handoff Kinh doanh→Kỹ thuật→Kinh doanh: phòng Kỹ thuật không thao tác được khi chưa tới lượt; sau khi Kinh doanh hoàn tất bước 1, Kỹ thuật mới thao tác được; sau bước 3 (Kinh doanh) task mới đi vào Completion Engine.

### Phase 7 — Timeline/Gantt + Workload-aware Assignment

**Đối chiếu audit:** bảng so sánh Asana/ClickUp/monday.com (§26: Timeline/Gantt, Workload đều ghi "Nên có"); §15 ("Assignment có thể đề xuất theo Department + Role + workload").

Phạm vi:
- Tab mới "Timeline" trong `ProjectDetail.jsx` (ngang hàng Kanban tổng/chi tiết/My Work hiện có) — **chỉ xem, không kéo-thả đổi lịch** (drag-to-reschedule là scope creep so với yêu cầu, YAGNI). Vẽ từ dữ liệu đã có sẵn: `wf_project_stage`/`wf_project_task` (`deadline`, `started_at`/`completed_at`) + cạnh phụ thuộc từ Phase 1 (`wf_project_stage_dependency`/`wf_project_task_dependency`) vẽ thành mũi tên hoặc chỉ báo thứ tự. Không cần thư viện Gantt mới — dựng bằng thanh ngang tự vẽ (antd `Table` hoặc `div` + CSS), tránh thêm dependency không cần thiết cho 1 view read-only.
- Handler mới `wf_h_employee_workload(department_code)` (workflow.php hoặc dashboard.php) — trả về số task đang mở (status không phải cột DONE) theo từng `assignee_code`.
- UI: `TaskDrawer.jsx` và `WorkflowManager.jsx` (chỗ chọn `assignee_code`) hiển thị thêm số việc đang làm ngay trong option, ví dụ "Nguyễn Văn A (NV001) — 5 việc đang làm" — chỉ hiển thị thông tin, không tự động ép chọn người ít việc nhất (đề xuất, không áp đặt, đúng tinh thần audit §15 "có thể đề xuất").

**Acceptance:** Timeline hiển thị đúng thứ tự stage/task theo dependency đã cấu hình ở Phase 1 cho ít nhất 1 project có nhánh song song thật (dùng data seed của Phase 1); danh sách chọn người phụ trách hiển thị đúng số việc đang làm khớp với số đếm tay qua SQL.

### Phase 8 — Escalation

**Đối chiếu audit:** M08 (Collaboration) liệt kê escalation là 1 hạng mục.

Phạm vi:
- Không có worker/queue trong hệ thống → escalation chạy dạng **script PHP CLI độc lập** `workflow-api/scripts/check_overdue_escalation.php`, dự kiến chạy 1 lần/ngày qua Windows Task Scheduler (việc cấu hình Task Scheduler nằm ngoài phạm vi code, chỉ ghi hướng dẫn trong spec/README, không tự ý cài đặt lên máy).
- Logic: tìm task quá hạn (`deadline < NOW()`, chưa DONE) từ N ngày trở lên (mặc định N=2, cấu hình được bằng hằng số) mà **chưa từng có** notification loại `OVERDUE_ESCALATION` cho task đó trong 24h gần nhất (tránh spam lặp lại mỗi lần chạy) → tạo notification mới, trigger thứ 4 bên cạnh 3 trigger đã có (TASK_ASSIGNED, CONFIRM_REQUESTED, STAGE_OPENED).
- **Quyết định cần Codex hỏi lại người dùng, không tự bịa:** hiện không có field "trưởng phòng ban" nào trong `wf_department`/`hr_lv0020` — escalate cho ai? Đề xuất mặc định: escalate cho tất cả user có `is_admin` (đã có sẵn khái niệm admin qua `wf_current_user_role`/`wf_is_admin`) + báo assignee gốc, nhưng đây là giả định cần xác nhận trước khi code, không phải điều tự quyết được.

**Acceptance:** Chạy script thủ công với 1 task đã seed quá hạn sẵn (vd `ACC001` theo ghi chú trong `TRANG_THAI_DU_AN.md` mục 5) → 1 notification mới xuất hiện; chạy lại lần 2 trong cùng ngày → không tạo trùng notification.

### Phase 9 — Business Modules M10 (thật, không phải stub)

**Đối chiếu audit:** §22 M10 (Contract, Profit, Development, Testing, Handover, Payment, Maintenance); §15 ("Payment Plan lấy Contract Value từ Contract").

Đây là phase lớn nhất và rủi ro nhất (đụng nhiều nhất vào backend PHP không có git). Nguyên tắc quan trọng: **đọc toàn bộ `src/pages/QuanLyDuAn/ChiTietDuAnWorkflow/ChiTietDuAnWorkflow.jsx` trước khi thiết kế schema** — file này chứa logic nghiệp vụ thật đã được người dùng validate trước đây (`programmingData.usedDays/totalPlannedDays` cho Development, `handleUpdateBugStatus` với state IN_FIX/RETEST cho Testing) và phải được **port sang**, không phải bịa mới từ đầu.

Phạm vi theo `stage_type` đã có sẵn trong schema (`CONTRACT`, `EXECUTION`, `TESTER`, `HANDOVER`, `PAYMENT`, `MAINTENANCE` — 6 giá trị này đã tồn tại từ file `docs/workflow_schema.sql` gốc, seed sẵn nhưng chưa có UI/logic chuyên biệt đọc theo `stage_type`):

- **Contract** (`stage_type='CONTRACT'`): bảng `wf_contract` (project_id, value, terms, signed_at, signed_by) — 1 hợp đồng/project.
- **Profit**: tính toán (không phải bảng riêng) = `wf_contract.value` trừ tổng chi phí — cần đọc kỹ file cũ để biết chi phí lấy từ đâu (có thể là ngày công lập trình × đơn giá, hoặc nhập tay); nếu file cũ không có công thức Profit rõ ràng, đây cũng là điểm cần hỏi lại người dùng thay vì tự bịa công thức tài chính.
- **Development** (`stage_type='EXECUTION'`): thay thế `ALLOCATION` item-type tự do bằng field có cấu trúc: `planned_days`, `used_days` (số, không phải text) gắn vào task hoặc vào `wf_project` — theo đúng cấu trúc `programmingData` cũ.
- **Testing** (`stage_type='TESTER'`): bảng `wf_bug` (task_id, title, description, severity, status: TODO/IN_FIX/RETEST/CLOSED, reporter, assignee, created_at, closed_at) thay thế `BUG` item-type tự do — port nguyên luồng trạng thái từ `handleUpdateBugStatus` cũ.
- **Handover** (`stage_type='HANDOVER'`): giữ `CHECKLIST` item-type nhưng thêm cột `is_required TINYINT(1)` — nếu có ít nhất 1 checklist `is_required=1` chưa xong thì chặn không cho stage này DONE (gate cục bộ theo stage_type, không mở rộng Completion Engine chung của Phase 5 để tránh phức tạp hoá mọi task).
- **Payment** (`stage_type='PAYMENT'`): bảng `wf_payment_installment` (project_id, amount, due_date, status: PENDING/PAID, paid_at) — validate tổng `amount` các đợt không vượt `wf_contract.value` (Single Source of Truth theo audit §15, không nhập tay lại giá trị hợp đồng).
- **Maintenance** (`stage_type='MAINTENANCE'`): bảng `wf_maintenance_ticket` (project_id, title, description, status, priority, sla_due_at).
- `wf_task_item` **không bị xoá** (tránh mất dữ liệu đã nhập qua bản stub) nhưng UI generic 4-loại trong `TaskDrawer.jsx` được thay bằng panel chuyên biệt hiển thị theo `stage.stage_type` của stage chứa task đó.
- Sau khi các panel chuyên biệt hoạt động và được người dùng xác nhận qua test tay, xoá phần UI generic ITEM_TYPES cũ trong cùng phase này (không để tồn tại song song 2 cách nhập cùng 1 loại dữ liệu).

**Acceptance:** với 1 project seed đủ 8 stage (đúng theo seed gốc trong `workflow_schema.sql` — GD01-GD08 đã có sẵn `stage_type` tương ứng), đi hết luồng: tạo Contract → hệ thống tính hiển thị được Profit → nhập ngày công Development → tạo Bug và đưa qua đủ TODO→IN_FIX→RETEST→CLOSED → checklist Handover bắt buộc chặn đúng khi chưa đủ → tạo Payment installment không vượt giá trị hợp đồng → tạo Maintenance ticket sau khi dự án đã bàn giao.

### Phase 10 — Regression + dọn code cũ + chốt tài liệu

Phạm vi:
- Chạy lại toàn bộ checklist QA cũ (20 TC) + toàn bộ TC mới phát sinh từ Phase 5-9 (TC06, TC11, và các kịch bản Acceptance của Phase 7/8/9 ở trên) thành 1 bộ checklist hợp nhất.
- Xoá các trang cũ đã được thay thế hoàn toàn: `src/pages/QuanLyDuAn/ChiTietDuAnWorkflow/`, `QuanLyWorkflow.jsx`, `QuanLyDuAnWorkflow.jsx` — **chỉ xoá sau khi** `grep` xác nhận không còn route/import nào trỏ tới (App.jsx đã redirect từ Phase 0) và người dùng xác nhận qua test tay không còn cần trang cũ.
- `DuAnMau.jsx`, `DanhMucGiaiDoanDuAn.jsx`, `KabanPhongBan.jsx`: kiểm tra riêng xem có còn được dùng bởi module nào khác ngoài Workflow cũ không trước khi quyết định xoá hay giữ (không tự ý xoá nếu chưa chắc).
- Cập nhật `docs/Audit_va_de_xuat_he_thong_Quan_ly_Quy_trinh_Du_an.docx` hoặc ghi chú kèm theo (không sửa trực tiếp file .docx bằng tay — có thể tạo file `docs/AUDIT_STATUS_UPDATE.md` ghi lại bảng §27 với điểm số mới) và `docs/TRANG_THAI_DU_AN.md` bản tổng kết cuối cùng.
- Sanity-check hiệu năng Dashboard/Kanban với dữ liệu seed đã tích luỹ qua các phase (không cần benchmark chính thức, chỉ cần xác nhận không có N+1 query rõ rệt khi mở trang có nhiều project/task).

**Acceptance:** toàn bộ checklist hợp nhất Pass, không còn file/route chết trỏ tới trang đã xoá, tài liệu trạng thái phản ánh đúng thực tế cuối cùng.

## 5. Trình tự & phụ thuộc giữa các phase

```
Phase 0 (dọn tồn đọng)
   │
   ▼
Phase 5 (Completion Engine: Reject/Rework)
   │
   ▼
Phase 6 (Handoff tuần tự) ── phụ thuộc Phase 5 (bước cuối handoff đi qua Completion Engine)
   │
   ▼
Phase 7 (Timeline + Workload) ── phụ thuộc Phase 1 (đọc dependency đã có), độc lập với Phase 5/6
   │
   ▼
Phase 8 (Escalation) ── phụ thuộc Phase 4 (Notification engine)
   │
   ▼
Phase 9 (Business Modules M10) ── phase lớn nhất, nên làm sau khi mọi engine nền tảng đã ổn định (đúng khuyến nghị audit §29: "Ưu tiên Workflow Designer + Dependency Engine + Runtime + Task Engine trước; sau đó Kanban, My Work, Dashboard và business module")
   │
   ▼
Phase 10 (Regression + dọn dẹp)
```

Phase 7 và Phase 8 về lý thuyết có thể đảo chỗ cho nhau hoặc làm song song ở 2 phiên khác nhau vì không phụ thuộc trực tiếp lẫn nhau — nhưng vẫn khuyến nghị làm tuần tự, mỗi phase 1 phiên Codex riêng, để giữ mỗi lần review/test của người dùng gọn trong 1 phạm vi thay đổi.

## 6. Việc KHÔNG làm (đã cân nhắc và loại trừ có chủ đích, theo YAGNI)

- Event bus / message queue thật (audit §16 là lý tưởng kiến trúc, không phải yêu cầu — codebase hiện dùng recompute đồng bộ, đã đạt hiệu quả tương đương ở quy mô hiện tại).
- Dependency type SS/FF/SF ngoài FS (Phase 1 đã quyết định giữ nguyên, không có nhu cầu nghiệp vụ cụ thể).
- Drag-to-reschedule trên Timeline (Phase 7 chỉ làm view đọc).
- Workflow Template versioning tường minh (số phiên bản) — mô hình copy Template→Instance hiện tại đã đạt được cách ly cần thiết mà audit §13 yêu cầu, không cần thêm cột version.
- Bất kỳ thay đổi nào trong 2 codebase ERP cũ (bán hàng/kho/thanh toán) — ngoài phạm vi đã chốt với người dùng.

## 7. Self-review

- **Placeholder scan:** không còn "TBD" — 2 điểm cần hỏi lại người dùng (Phase 8: escalate cho ai; Phase 9: công thức Profit) được ghi rõ là quyết định cần xác nhận, không phải chỗ bỏ trống.
- **Nhất quán nội bộ:** mọi bảng mới đều nêu rõ theo mẫu template/instance nào đã có (Phase 1 làm chuẩn), stage_type dùng cho Phase 9 đã tồn tại thật trong seed gốc (đã verify trong `workflow_schema.sql`), không phải suy đoán.
- **Phạm vi:** roadmap này chỉ phủ module Workflow theo đúng quyết định phạm vi của người dùng, không lấn sang ERP cũ.
- **Rà soát mơ hồ:** 2 điểm mơ hồ thật sự (escalation target, công thức Profit) được đánh dấu tường minh là "cần hỏi lại", các điểm còn lại đều có quyết định cụ thể kèm lý do (vd không làm Subtask-gate ở Phase 5, không làm event bus).
