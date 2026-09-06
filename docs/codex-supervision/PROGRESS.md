# Tiến độ roadmap — module Quản lý Quy trình Dự án

Cập nhật lần cuối: 2026-09-06 (Phase 5 verify xong qua Playwright, giao Phase 6).

Nguồn kế hoạch gốc: `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md`.

| Phase | Nội dung | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Dọn tồn đọng (QA checklist, commit fix cũ, di trú route, fix bug bell-notification, verify UI dependency task-template) | **Đã commit xong (2026-09-06)** | Verify bằng Playwright (cài riêng, không dùng Electron). Xem mục "Chi tiết Phase 0" bên dưới, gồm 1 vấn đề follow-up mới phát hiện. |
| 5 | Completion Engine — Reject → Rework (TC06) | **Đã verify + xong (2026-09-06)** | Codex tự implement + tự commit (3 commit) rồi báo xong. Claude verify độc lập qua Playwright — xem "Chi tiết Phase 5" bên dưới. |
| 6 | Task Handoff tuần tự đa phòng ban | **Sẵn sàng giao cho Codex** | Phụ thuộc Phase 5 đã verify xong — điều kiện đã đủ, prompt đưa cho người dùng 2026-09-06 |
| 7 | Timeline/Gantt + Workload-aware Assignment | Chưa giao | Độc lập, có thể làm sau Phase 5/6 |
| 8 | Escalation quá hạn | Chưa giao | Cần hỏi người dùng "escalate cho ai" trước khi Codex code (xem prompt) |
| 9 | Business Modules M10 (Contract/Profit/Development/Testing/Handover/Payment/Maintenance) | Chưa giao | Phase lớn/rủi ro nhất — bắt buộc Codex đọc toàn bộ `ChiTietDuAnWorkflow.jsx` cũ trước khi code, có thể cần hỏi công thức Profit |
| 10 | Regression toàn diện + dọn code cũ + chốt tài liệu | Chưa giao | Cuối roadmap |

## Chi tiết Phase 5 — ĐÃ XONG (2026-09-06)

**Lệch quy trình cần lưu ý:** khác với Phase 0 (Codex chủ động không commit khi
chưa verify được qua trình duyệt), lần này Codex tự implement, tự test qua
CLI/backend (`_wf_invoke.php`), rồi **tự commit luôn** (3 commit:
`c8b1f7c` spec/plan/SQL, `69c3392` code frontend, `2b97173` cập nhật
`TRANG_THAI_DU_AN.md`) trước khi có browser verification. Code đúng và migration
đã áp dụng vào DB thật nên không cần sửa gì, nhưng ghi lại đây để phiên sau biết
là không thể mặc định tin "chưa commit nghĩa là chưa xong" — luôn phải tự
`git status`/`git log` kiểm tra thực tế thay vì chỉ đọc báo cáo.

**Đã verify độc lập qua Playwright (browser thật, không phải chỉ đọc code/CLI
report của Codex):**
- Migration `reject_reason VARCHAR(500)` đã có thật trong bảng `wf_task_confirm`
  của DB `hao_erp_sofv5_0` (kiểm tra bằng `DESCRIBE` trực tiếp).
- Route `task.confirmReject` → `wf_h_task_confirm_reject` đã đăng ký đúng trong
  `workflow-api/index.php`.
- **TC06 (Reject → Rework) — PASS qua trình duyệt thật:** dùng task KD177 (đã có
  2 phòng ban PB001/PB002 cần xác nhận). Xác nhận PB002 trước, sau đó PB001 bấm
  "Từ chối" kèm lý do qua Modal trong `TaskDrawer.jsx`. Kết quả kiểm tra thẳng
  trong DB sau thao tác: dòng PB001 → `REJECTED` + đúng `reject_reason`; dòng
  PB002 (đã CONFIRMED trước đó) bị reset về `PENDING` đúng như spec; task status
  quay về cột `TODO` (cột Kanban đầu tiên chưa-done); `wf_history` có
  `TASK_REJECTED` với actor + lý do; `wf_notification` có bản ghi
  `TASK_REJECTED` gửi đúng `assignee_code` (NV003) của task.
- **TC05 hồi quy (auto-DONE khi đủ xác nhận, không ai từ chối) — PASS qua trình
  duyệt thật:** dùng task KD062 (1 phòng ban, không bị chặn bởi dependency) —
  xác nhận xong, DB xác nhận `status` chuyển thẳng `DONE` + `completed_at` được
  ghi, `wf_history` có `STATUS_DONE`. (Thử với KD019 — 2 phòng ban — trước đó
  cho kết quả `AUTO_DONE_SKIPPED_BLOCKED`, nhưng đây là do STAGE của task đó
  đang `BLOCKED` bởi Dependency Engine — đúng hành vi pre-existing từ Phase 1,
  không phải lỗi của Phase 5, nên đổi sang task khác không bị chặn để có phép
  thử auto-DONE sạch.)
- Spec (`docs/superpowers/specs/2026-09-05-completion-engine-reject-rework-design.md`)
  đã đọc lại, xác nhận mục "Out of scope" ghi rõ **không** làm gate Subtask —
  đúng yêu cầu của roadmap, không có scope creep. Grep code cũng không thấy dấu
  hiệu tự ý thêm gate Subtask.

**Không cần commit thêm gì cho code Phase 5** (Codex đã commit sẵn, verify xong
khớp đúng). Chỉ cập nhật tài liệu tiến độ trong phiên này.

## Chi tiết Phase 0 — ĐÃ XONG (2026-09-06)

Verify bằng Playwright (cài trực tiếp vào scratchpad qua npm, không đụng
`package.json` của dự án — môi trường Claude này không có MCP browser sẵn
nên phải tự cài công cụ để test qua trình duyệt thật) + tài khoản đăng nhập
thật (không phải tài khoản demo `admin/admin` trong code, vì tài khoản demo
không có token thật nên mọi API call bị 401 và app tự đăng xuất giữa
chừng).

**Đã verify PASS:**
- 3 route cũ (`workflow-templates`, `danh-sach`, `chi-tiet/:id`) đều
  redirect/mở đúng khi test TRONG PHIÊN TRÌNH DUYỆT SẠCH (mỗi route test
  riêng, đăng nhập mới, chưa có tab nào khác mở) — khớp đúng acceptance
  criteria.
- Bell-notification: click 1 thông báo có `project_id` mở đúng project
  trong tab "Danh Sách Dự Án" (dùng `addTab`, không tạo tab trùng).
- TC4.5: ô multi-select "Phòng ban cần xác nhận" hiển thị đúng trong
  TaskDrawer.
- TC4.8: nút "Làm mới" ở Dashboard có, bấm vào có gọi lại API dashboard.

**Vấn đề MỚI phát hiện trong lúc verify (chưa fix, ghi lại làm follow-up):**
Nếu trong CÙNG MỘT PHIÊN (không reload trang) người dùng mở LẦN LƯỢT từ 2
route cũ trở lên trong số 3 route ở trên (ví dụ mở `workflow-templates`
xong rồi mở `danh-sach` mà không F5), có race condition trong
`TabContext`/`RouteListener` (cơ chế đồng bộ MemoryRouter-per-tab redirect
ngược ra outer HashRouter) khiến route thứ 2/3 đôi khi bị "dính" vào tab
đầu tiên thay vì mở đúng tab riêng — quan sát được là không nhất quán giữa
các lần chạy (khi thì dính label sai, khi thì dính đúng route 1) nên đúng
tính chất race condition, không phải lỗi logic cố định. Vì đây là route cũ
đã deprecated (ít khả năng người dùng có 2 bookmark cũ khác nhau và bấm cả
2 trong cùng phiên chưa F5) nên KHÔNG chặn commit Phase 0, nhưng nên fix
trước khi phase sau xây thêm trên cùng cơ chế tab này nếu có thời gian.

**Đã commit (4 commit riêng theo từng nhóm việc):**
`9f93df7` (route migration + sync), `070ce59` (bell-notification dedup),
`537b0b4` (TC4.5 + TC4.8), `794dbda` (cosmetic ChiTietDuAnWorkflow.jsx).

---

### Ghi chú gốc lúc giao việc (giữ lại để tham khảo lịch sử)

**Những gì Codex thực sự đã làm** (verify bằng `git status`/`git diff` trực
tiếp, không chỉ dựa vào báo cáo của Codex):

- Đã sửa code cho: hoàn tất di trú route Workflow cũ → mới (`App.jsx`,
  `menuUtils.js`), đồng bộ query `?tab=` trong `QuanLyQuyTrinhDuAn.jsx`, sửa
  bug bell-notification bằng cách chuyển sang dùng `addTab()` chống tab
  trùng + chuẩn hoá sidebar highlight (`TabContext.jsx`, `HeaderBar.jsx`,
  `SidebarMenu.jsx`, `TabBar.jsx`).
- 2 file fix QA cũ (TC4.5, TC4.8) vẫn còn nguyên trong working tree:
  `Dashboard.jsx`, `TaskDrawer.jsx`.
- Đã verify (đọc code): `WorkflowManager.jsx` có UI dependency ở cả Stage
  (`depends_on_stage_ids`) lẫn Task Template (`depends_on_task_template_ids`)
  — không cần sửa thêm cho mục này.
- `npm run build` đã chạy thành công (chỉ còn warning lint/CSS có sẵn từ
  trước).

**Những gì CHƯA xong (theo đúng lời Codex tự ghi trong
`docs/TRANG_THAI_DU_AN.md` mục 7 "Bàn giao cuối phiên"):**

- **Chưa test qua trình duyệt** — môi trường Codex không có browser
  (`browsers.list() = []`). 3 route cũ redirect và hành vi bell-notification
  chưa được xác nhận chạy đúng thật sự, chỉ mới đúng theo đọc code.
- **Chưa commit bất kỳ thay đổi nào** — Codex tự quyết định không commit khi
  chưa verify được qua trình duyệt (quyết định đúng, nên giữ nguyên tinh
  thần này cho các phase sau).
- **QA checklist 20 TC chưa có kết quả cuối** — chưa ai hỏi lại người dùng,
  TC4.5/TC4.8 chưa được xác nhận lại sau fix.

**Việc supervisor (Claude) cần làm trước khi coi Phase 0 là xong:**

1. `git status` để xem đúng 10 file đang sửa dở (đối chiếu danh sách ở trên
   còn khớp không — có thể người dùng đã tự sửa thêm gì đó).
2. Chạy `npm start`, test 3 route cũ:
   - `/quan-ly-du-an/workflow-templates` → phải redirect và mở đúng tab
     "Mẫu Quy Trình (Workflow)".
   - `/quan-ly-du-an/danh-sach` → phải redirect và mở đúng tab "Danh Sách Dự
     Án".
   - `/quan-ly-du-an/chi-tiet/:projectId` → phải mở đúng project trong
     `QuanLyQuyTrinhDuAn`, không phải trang `ChiTietDuAnWorkflow` cũ.
3. Test bell-notification: bấm nhiều thông báo liên tiếp trong `HeaderBar`,
   xác nhận không mở tab trùng, sidebar highlight đúng mục đang chọn.
4. Test lại TC4.5 (multi-select phòng ban xác nhận trong `TaskDrawer.jsx`)
   và TC4.8 (nút "Làm mới" ở `Dashboard.jsx`) — hỏi người dùng nếu cần biết
   thêm ngữ cảnh test case cụ thể từ checklist 20 TC.
5. Nếu mọi thứ pass: commit theo từng nhóm việc riêng (route migration, bug
   bell-notification, 2 fix QA cũ) — không gộp 1 commit. Cập nhật
   `docs/TRANG_THAI_DU_AN.md` mục "Đã hoàn thành" xác nhận Phase 0 xong thật,
   cập nhật bảng ở trên sang "Đã commit xong".
6. Nếu có lỗi khi test: ghi lại lỗi cụ thể, có thể tự sửa nếu nhỏ, hoặc soạn
   prompt fix riêng cho Codex nếu cần điều tra sâu ở backend PHP.
7. Chỉ sau khi Phase 0 chuyển "Đã commit xong" mới lấy
   `prompts/phase-5-completion-engine.md` giao cho Codex.
