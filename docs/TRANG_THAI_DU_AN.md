# Trạng thái dự án SOF_PLAN

> File này là "bộ nhớ" giữa các session làm việc. Cập nhật file này mỗi khi
> kết thúc một phiên làm việc đáng kể, để phiên sau đọc lại là nắm được ngay
> đang ở đâu, không cần hỏi lại từ đầu.
>
> Cập nhật lần cuối: 2026-09-06

## 1. Bối cảnh & 3 codebase liên quan

| Codebase | Đường dẫn | Git? | Vai trò |
|---|---|---|---|
| Frontend SOF_PLAN | `e:/SOF/PLAN/SOF_PLAN` | ✅ có git (branch `master`) | React 18 + antd 5.29.3 + recharts |
| Backend Workflow API (mới) | `c:/laragon/www/v2.des.plan.banhangonline.top/workflow-api` | ❌ KHÔNG có git | PHP 8.3 + mysqli, không framework. **Mọi sửa file ở đây là sửa trực tiếp, không rollback được qua git** — luôn đọc kỹ trước khi sửa. |
| Legacy monolith | `c:/laragon/www/v2.des.plan.banhangonline.top/services.sof.vn/index.php` | ❌ KHÔNG có git | File dispatcher ~9000+ dòng, case-based. Ít đụng tới trừ khi cần sync 2 chiều với module Kế hoạch cũ. |

DB: MySQL, database `hao_erp_sofv5_0`, PHP CLI:
`C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe` (hoặc dạng bash
`/c/laragon/bin/php/php-8.3.30-Win32-vs16-x64/php.exe`).

Muốn gọi thử 1 handler PHP từ dòng lệnh (vì mọi handler kết thúc bằng
`exit()` nên không gọi 2 hàm liên tiếp trong cùng 1 tiến trình được), dùng
shim có sẵn:
```
php workflow-api/scripts/_wf_invoke.php <ten_ham_handler> <base64(json_encode($input))>
```
Nếu thêm handler file mới, phải thêm `require_once` cho file đó vào
`_wf_invoke.php` (nó có danh sách require riêng, không tự đọc theo
`index.php`).

Chạy web app: `npm start` trong `SOF_PLAN` (theo yêu cầu người dùng — **không
dùng Electron để test UI**, chỉ test qua trình duyệt/web).

## 2. Đã hoàn thành (theo thứ tự thời gian)

Toàn bộ đã commit lên `master` (không có branch riêng, người dùng đồng ý làm
thẳng trên master vì 2/3 codebase không có git nên worktree không có lợi ích
cách ly nào).

1. **Project Workflow Engine (khởi tạo module)** — Project → Stage → Task →
   Kanban, phân quyền theo phòng ban, Kanban cột động theo từng workflow,
   board tổng quan dự án.
2. **Workflow ↔ Kế hoạch cross-module sync** (spec:
   `docs/superpowers/specs/2026-08-28-workflow-kehoach-sync-design.md`, plan
   cùng tên) — liên kết công việc trong "Quản lý kế hoạch" (module cũ,
   `cr_lv0094`) với task trong Workflow mới, đồng bộ trạng thái 2 chiều,
   autofill khi chọn task liên kết.
3. **Phase 1 — Dependency & Execution Engine** (spec/plan
   `2026-08-29-dependency-execution-engine*`) — khai báo phụ thuộc giữa
   stage/task, `execution_state` READY/BLOCKED, UI cấu hình phụ thuộc trong
   Workflow Designer, badge "bị chặn" trên Kanban + filter trong My Tasks.
4. **Phase 2 — Master Data Normalization** (spec/plan
   `2026-08-29-master-data-normalization*`) — chuẩn hoá khách hàng
   (`wf_customer`) và loại dự án (`wf_project_type`) thành bảng riêng thay vì
   text tự do, Select tìm-kiếm-được/tạo-mới-được ở ProjectList và
   WorkflowManager.
5. **Phase 3 — Kanban tổng thể dự án + My Work** — `StageOverviewCard` (board
   tiến độ theo từng giai đoạn, đúng mock 2 tầng trong tài liệu audit), bộ
   lọc theo hạn (`dueFilter`: Quá hạn/Hôm nay/Sắp tới/Đang làm/Chờ xác
   nhận/Hoàn thành) trong `MyTasksTab.jsx`.
6. **Phase 4 — Notification + Dashboard** (spec/plan
   `2026-08-30-notification-dashboard*`) — hệ thống thông báo thật (3 trigger:
   TASK_ASSIGNED, CONFIRM_REQUESTED, STAGE_OPENED), Dashboard tổng quan
   (dự án/công việc/quá hạn/bị chặn theo phòng ban + hoạt động gần đây), bell
   icon ở HeaderBar nối vào feed backend thật.
7. **Fix UX Kanban horizontal scroll** (2 vòng, commit `389dbaa` +
   `2c50655`) — lỗi flexbox `min-width` khiến cả trang bị tràn ngang thay vì
   khung Kanban tự cuộn; sau đó phát hiện thêm thanh cuộn CSS tuỳ biến ẩn/hiện
   thất thường theo % zoom trình duyệt → thay bằng nút mũi tên trái/phải
   luôn hiển thị (`ScrollableKanbanRow` trong `ProjectDetail.jsx`), không phụ
   thuộc quyết định render scrollbar của trình duyệt nữa.

8. **Phase 0 — xử lý tồn đọng code (2026-09-05, verify + commit 2026-09-06)**
   — hoàn tất route migration về module Workflow, đồng bộ redirect qua tab
   ngoài, sửa mở thông báo qua `addTab()` để chống tab trùng, chuẩn hóa
   sidebar highlight, thêm multi-select "Phòng ban cần xác nhận" (TC4.5) và
   nút "Làm mới" Dashboard (TC4.8). Verify bằng Playwright (cài riêng vào
   scratchpad, tài khoản đăng nhập thật) — xem chi tiết + 1 vấn đề race
   condition mới phát hiện (không chặn commit) trong
   `docs/codex-supervision/PROGRESS.md`. Đã commit (4 commit):
   `9f93df7`, `070ce59`, `537b0b4`, `794dbda`.

9. **Phase 5 — Completion Engine: Reject → Rework (2026-09-06)** — thêm luồng từ chối xác nhận có lý do: reset các xác nhận cùng task, đưa task về cột Kanban chưa DONE đầu tiên, ghi `TASK_REJECTED`, thông báo cho assignee, và UI modal "Từ chối" trong TaskDrawer. Codex tự commit 3 commit (`c8b1f7c` spec/plan/SQL, `69c3392` code, `2b97173` doc) rồi báo xong.
   - **TC06 — Pass, verify lại qua Playwright (trình duyệt thật, 2026-09-06):** task KD177, xác nhận PB002 rồi PB001 bấm "Từ chối" kèm lý do qua UI thật — đối chiếu DB xác nhận đúng: PB001 REJECTED + reject_reason, PB002 reset PENDING, task về cột TODO, có `TASK_REJECTED` trong history và notification tới assignee.
   - **TC05 hồi quy — Pass, verify lại qua Playwright:** task KD062 (không bị chặn dependency) xác nhận xong tự động chuyển DONE đúng như trước Phase 5. (Task KD019 có 2 phòng ban nhưng stage đang bị Dependency Engine chặn nên đúng ra phải `AUTO_DONE_SKIPPED_BLOCKED` — hành vi pre-existing từ Phase 1, không phải lỗi Phase 5.)
   - **Browser acceptance:** đã xác nhận bằng Playwright (cài riêng vào scratchpad, tài khoản đăng nhập thật) — xem chi tiết trong `docs/codex-supervision/PROGRESS.md` mục "Chi tiết Phase 5".

## 3. Đang làm dở — QA thủ công theo checklist

> Cập nhật 2026-09-06: TC4.5 và TC4.8 đã được Claude tự verify lại bằng
> Playwright (xem `docs/codex-supervision/PROGRESS.md` mục Phase 0) — cả
> hai control đều hiển thị/hoạt động đúng. Bộ 20 TC đầy đủ vẫn chưa có kết
> quả Pass/Fail cuối cùng từ người dùng (chỉ 2 TC này được verify lại).

Người dùng đang test tay theo bộ checklist 20 test case (artifact):
**https://claude.ai/code/artifact/1aa896c7-d903-4e69-8944-beda4c040983**
(5 nhóm: Dependency Engine, Master Data, Kanban tổng & My Work, Notification
& Dashboard, Hồi quy). Checklist lưu Pass/Fail trong localStorage của trình
duyệt người dùng — **Claude không đọc được kết quả này**, phải hỏi trực
tiếp người dùng khi cần biết TC nào fail.

### Đã phát hiện & xử lý trong phiên 2026-08-30:

- **TC4.5 (Thêm phòng ban xác nhận cho 1 công việc) — FAIL, đã fix.**
  Nguyên nhân: `TaskDrawer.jsx` chỉ hiển thị phòng ban xác nhận **đã có sẵn**
  (kèm nút "Xác nhận"), không có control nào để **thêm mới**. Backend
  (`wf_h_task_save`, `kanban.php:161-226`) đã hỗ trợ đủ tham số
  `confirm_departments` (chỉ phòng ban mới thêm mới nhận thông báo, đúng như
  kỳ vọng test case). Đã thêm ô multi-select "Phòng ban cần xác nhận" vào
  form trong `TaskDrawer.jsx`. **Verify lại 2026-09-06 qua Playwright: control
  hiển thị đúng trong drawer.**

- **TC4.8 (Số liệu Quá hạn Dashboard khớp My Tasks) — FAIL, điều tra xong,
  không phải bug tính toán.** Đối chiếu trực tiếp DB: mọi số trên Dashboard
  (dự án, tổng task, done, in_progress, blocked, quá hạn theo từng phòng ban)
  đều khớp 100% với SQL tính tay. Nguyên nhân thật: `Dashboard.jsx` trước đó
  chỉ fetch dữ liệu 1 lần lúc mount (`useEffect(..., [])`), mà app giữ tab
  luôn mở (không unmount) — nên nếu mở tab Dashboard trước rồi mới hoàn
  thành/sửa task ở nơi khác, Dashboard hiển thị số liệu cũ mãi. Đã thêm nút
  **"Làm mới"** vào Dashboard để fetch lại theo yêu cầu. **Người dùng sau đó
  báo "toàn dashboard đang bị sai" nhưng khi đối chiếu lại từng số với DB thì
  vẫn khớp 100% — nghi ngờ là do bundle cũ (cần hard-refresh) hoặc số liệu
  cache cũ (cần bấm nút Làm mới mới). Verify lại 2026-09-06 qua Playwright:
  nút "Làm mới" tồn tại và bấm vào có gọi lại API dashboard đúng như kỳ
  vọng.**

### Trạng thái commit (2026-09-06): tất cả đã commit, không còn file dở

Toàn bộ các file Phase 0 đã được commit thành 4 commit riêng theo nhóm việc
— xem `docs/codex-supervision/PROGRESS.md` mục Phase 0 để biết chi tiết
từng commit và cách verify.

## 4. Việc còn treo / cần quyết định

- **Business Modules (mục M10 trong tài liệu audit)** — đã hỏi người dùng có
  muốn triển khai không, người dùng chưa trả lời/định hướng. Không tự ý làm
  vì chưa có yêu cầu nghiệp vụ cụ thể.
- **Race condition trong tab system khi mở nhiều route Workflow cũ liên
  tiếp cùng phiên (phát hiện 2026-09-06, chưa fix)** — xem chi tiết trong
  `docs/codex-supervision/PROGRESS.md` mục Phase 0. Phạm vi hẹp (route đã
  deprecated), không chặn tiến độ nhưng nên fix trước khi các phase sau xây
  thêm trên `TabContext`.

## 5. Dữ liệu seed hiện tại (để biết test với tài khoản nào)

Phòng ban (`wf_department`): PB001 = CNTT, PB002 = Kinh doanh,
PB003 = Nhân sự, PB004 = Kế toán, PB005 = Tester.

Cách xem nhanh nhân viên theo phòng ban qua phpMyAdmin — chạy SQL:
```sql
SELECT e.lv001 AS ma_nv, e.lv002 AS ten_nv, d.code AS ma_pb, d.name AS ten_phong_ban
FROM hr_lv0020 e
LEFT JOIN wf_department d ON d.code = e.lv029
ORDER BY d.code, e.lv002;
```
(Nhân viên nằm ở bảng cũ `hr_lv0020`, không có bảng nhân viên riêng của
Workflow module.)

Task có deadline/gán người để test tính năng quá hạn/thông báo (được seed
trực tiếp qua `_wf_invoke.php wf_h_task_save`, không phải SQL thô):
TEC002→NV001, ACC001→NV009, KD014→NV003, TST001→NV012 (đã bị người dùng
đánh dấu DONE trong lúc test, không còn quá hạn nữa), TEC010→NV002. Hiện tại
(2026-08-30) chỉ còn **ACC001 (PB004)** đang quá hạn thật.

## 6. Ghi chú kỹ thuật dễ quên

- `wf_project.kanban_columns_json` là **snapshot đông cứng** lúc tạo dự án —
  không tự cập nhật khi sửa cột Kanban gốc của workflow sau này. Mọi chỗ xác
  định "done" phải resolve qua snapshot (`wf_project_kanban_columns()`),
  không JOIN trực tiếp bảng `wf_kanban_column` sống.
- `React.lazy()` trong `App.jsx` khiến code của module Workflow (bao gồm
  `ProjectDetail.jsx`) nằm ở 1 chunk riêng
  (`src_pages_QuanLyQuyTrinhDuAn_QuanLyQuyTrinhDuAn_jsx.chunk.js`), không
  nằm trong `bundle.js` chính — tìm nhầm file này từng gây hiểu lầm "code
  chưa build" trong khi thực ra đã build đúng.
- Có thể có 2 tiến trình `npm start` cùng chạy song song (1 của Claude, 1 của
  người dùng) trên 2 port khác nhau (3000/3001) — cả 2 đều tự rebuild khi
  sửa file, không phải dấu hiệu lỗi.

## 7. Bàn giao cuối phiên 2026-09-05

- Đã hoàn tất phần code Phase 0: route cũ Workflow, query `?tab=`, đồng bộ `MemoryRouter` với tab ngoài, notification không tạo tab trùng, sidebar highlight đúng, và `QuanLyQuyTrinhDuAn.jsx` đọc query/project id đúng.
- Hai fix QA cũ vẫn có trong working tree: `Dashboard.jsx` (nút Làm mới, TC4.8) và `TaskDrawer.jsx` (multi-select phòng ban xác nhận, TC4.5).
- Các file route/tab/thông báo đã sửa: `App.jsx`, `TabContext.jsx`, `menuUtils.js`, `HeaderBar.jsx`, `SidebarMenu.jsx`, `TabBar.jsx`, `QuanLyQuyTrinhDuAn.jsx`. File cosmetic `ChiTietDuAnWorkflow.jsx` giữ nguyên thay đổi cũ.
- `WorkflowManager.jsx` đã verify có UI dependency ở cả Stage (`depends_on_stage_ids`) và Task Template (`depends_on_task_template_ids`).
- `npm run build`, `git diff --check` và eslint các file route/tab đã chạy; build thành công, còn warning có sẵn.
- Browser runtime không có backend kết nối (`browsers.list() = []`), nên chưa test được 3 route cũ và chuông qua trình duyệt. QA 20 TC, TC4.5, TC4.8 chưa có kết quả cuối; không tự đánh dấu Pass.
- Chưa tạo commit nào trong phiên này theo quy tắc không commit khi chưa verify browser. Ngày mai: mở browser trong ChatGPT Desktop hoặc kết nối Chrome extension, test 3 route cũ + click nhiều notification, sau đó commit từng phần và ghi nhận QA.

## 8. Bàn giao cuối phiên 2026-09-06

- Phase 0 đã verify xong qua Playwright (tự cài vào scratchpad, không có
  MCP browser sẵn trong môi trường này) và đã commit thành 4 commit riêng
  — xem `docs/codex-supervision/PROGRESS.md`.
- Dùng tài khoản đăng nhập thật của người dùng để test (tài khoản demo
  `admin/admin` trong code không có token thật nên bị 401 → tự đăng xuất
  giữa chừng, không test được). Người dùng đã đồng ý cho force-logout
  phiên đang mở ở nơi khác để lấy lại quyền đăng nhập.
- Phát hiện 1 vấn đề mới: race condition khi mở 2+ route Workflow cũ liên
  tiếp trong cùng phiên (chưa F5) — không chặn Phase 0 vì route đã
  deprecated, nhưng ghi lại làm follow-up trước khi phase sau xây thêm lên
  cùng `TabContext`.
- Đã đưa prompt `prompts/phase-5-completion-engine.md` (Completion Engine —
  Reject → Rework, TC06) cho người dùng để chuyển cho Codex — Claude không
  có kênh trực tiếp gọi Codex trong phiên này. Việc tiếp theo của phiên
  supervisor kế: đọc report Codex, tự `git status`/`git diff` verify (đừng
  tin lời báo "xong"), test qua Playwright, rồi mới commit và giao Phase 6.

## 9. Bàn giao cuối phiên 2026-09-06 (verify Phase 5)

- Codex báo Phase 5 xong. Verify độc lập: `git log`/`git diff` xác nhận 3
  commit Codex tự tạo (`c8b1f7c`, `69c3392`, `2b97173`) đúng như báo cáo;
  backend PHP (không có git) đọc trực tiếp xác nhận `wf_h_task_confirm_reject`
  đã nối đúng route, migration `reject_reason` đã áp dụng thật vào DB.
- Test qua Playwright (trình duyệt thật, tài khoản đăng nhập thật): TC06
  (reject → rework) và TC05 hồi quy (auto-DONE) đều Pass — chi tiết đầy đủ
  trong `docs/codex-supervision/PROGRESS.md` mục "Chi tiết Phase 5".
- Phát hiện phụ (không phải lỗi): 1 task có 2 phòng ban xác nhận nhưng stage
  đang bị Dependency Engine (Phase 1) chặn nên auto-DONE bị skip đúng thiết
  kế (`AUTO_DONE_SKIPPED_BLOCKED`) — chọn task khác không bị chặn để có phép
  thử TC05 sạch.
- Ghi nhận lệch quy trình: Codex tự commit trước khi có browser verification
  (khác Phase 0). Không chặn gì vì code verify đúng, nhưng phiên sau không
  nên mặc định suy luận trạng thái commit từ báo cáo — luôn tự kiểm tra
  `git log`.
- Đã đưa prompt `prompts/phase-6-task-handoff.md` (Task Handoff tuần tự đa
  phòng ban, TC11) cho người dùng để chuyển cho Codex.

10. **Phase 6 — Task Handoff tuần tự đa phòng ban (2026-09-06)** — thêm
    cấu hình chuỗi handoff trên task template, snapshot `wf_task_handoff`
    khi tạo project, quyền thao tác theo phòng ban ACTIVE, transition tuần tự
    và UI cấu hình/stepper. Bước cuối dùng chung Completion Engine với
    multi-confirm; task không có handoff giữ nguyên hành vi cũ. Frontend đã
    commit `e4d8df5` (API + WorkflowManager) và `d12acec` (TaskDrawer);
    backend sửa trực tiếp theo quy tắc codebase không có Git.
    - **TC11 — Pass (backend/CLI):** fixture `DA2026010`, task `KD184`,
      chain `PB002 → PB001 → PB002`; PB001 bị 403 trước lượt, lần lượt
      `NV003 → NV001 → NV003` hoàn tất đúng ba bước, không còn ACTIVE,
      rồi hai confirm đưa task qua Completion Engine thành `DONE`. History
      có ba action `TASK_HANDOFF` và status/history auto-DONE đúng.
    - **TC05 hồi quy — Pass (backend/CLI):** task không có handoff `KD185`
      vẫn confirm song song PB002/PB001 và tự động `DONE` khi đủ xác nhận.
    - **Browser acceptance:** chưa thể xác minh trong phiên này vì browser
      runtime tích hợp trả `browsers: {}`; đã chạy `npm run build` thành công
      (chỉ còn warning CSS/lint có sẵn). Không đánh dấu browser TC11 Pass khi
      chưa có browser khả dụng.
