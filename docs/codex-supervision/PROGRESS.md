# Tiến độ roadmap — module Quản lý Quy trình Dự án

Cập nhật lần cuối: 2026-09-06 (Phase 0 verify + commit xong, giao Phase 5).

Nguồn kế hoạch gốc: `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md`.

| Phase | Nội dung | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | Dọn tồn đọng (QA checklist, commit fix cũ, di trú route, fix bug bell-notification, verify UI dependency task-template) | **Đã commit xong (2026-09-06)** | Verify bằng Playwright (cài riêng, không dùng Electron). Xem mục "Chi tiết Phase 0" bên dưới, gồm 1 vấn đề follow-up mới phát hiện. |
| 5 | Completion Engine — Reject → Rework (TC06) | **Sẵn sàng giao cho Codex** | Phụ thuộc Phase 0 đã commit xong — điều kiện đã đủ, prompt đã đưa cho người dùng 2026-09-06 |
| 6 | Task Handoff tuần tự đa phòng ban | Chưa giao | Phụ thuộc Phase 5 |
| 7 | Timeline/Gantt + Workload-aware Assignment | Chưa giao | Độc lập, có thể làm sau Phase 5/6 |
| 8 | Escalation quá hạn | Chưa giao | Cần hỏi người dùng "escalate cho ai" trước khi Codex code (xem prompt) |
| 9 | Business Modules M10 (Contract/Profit/Development/Testing/Handover/Payment/Maintenance) | Chưa giao | Phase lớn/rủi ro nhất — bắt buộc Codex đọc toàn bộ `ChiTietDuAnWorkflow.jsx` cũ trước khi code, có thể cần hỏi công thức Profit |
| 10 | Regression toàn diện + dọn code cũ + chốt tài liệu | Chưa giao | Cuối roadmap |

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
