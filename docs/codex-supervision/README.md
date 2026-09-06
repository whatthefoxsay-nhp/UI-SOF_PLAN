# Codex Supervision — module Quản lý Quy trình Dự án

Thư mục này phục vụ vai trò **supervisor**: Claude không tự code các phase
5-10 của roadmap nữa, mà (1) giao prompt cho Codex từng phase một, (2)
review diff Codex tạo ra, (3) tự test qua trình duyệt (Codex thường không
có browser trong môi trường của nó), (4) commit khi đã verify xong, (5) cập
nhật `PROGRESS.md` + `docs/TRANG_THAI_DU_AN.md`, rồi mới đưa prompt phase kế
tiếp.

## Cấu trúc

- `PROGRESS.md` — bảng trạng thái từng phase (Chưa giao / Đã giao chờ Codex /
  Codex báo xong chờ verify / Đã verify chờ commit / Đã commit xong). Đọc file
  này đầu tiên mỗi khi bắt đầu phiên supervisor mới.
- `prompts/phase-0-cleanup.md` ... `prompts/phase-10-regression-cleanup.md` —
  từng prompt phase, tách riêng từ
  `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-codex-prompts.md`
  để copy nhanh, không phải mở file gộp.

## Quy trình supervisor mỗi phase

1. Mở `PROGRESS.md`, tìm phase đang ở trạng thái "Đã giao chờ Codex" hoặc
   "Codex báo xong chờ verify".
2. Nếu Codex đã báo xong: đọc report của Codex + `git diff` / `git status`
   thực tế (đừng chỉ tin lời báo — xem ví dụ Phase 0 bên dưới, Codex báo
   "xong" nhưng thực tế **chưa commit, chưa test qua trình duyệt** vì môi
   trường Codex không có browser).
3. Tự chạy `npm start` (không dùng Electron) và test theo đúng "Acceptance"
   ghi trong prompt phase đó / trong
   `docs/superpowers/specs/2026-09-05-workflow-completion-roadmap-design.md`.
4. Nếu backend PHP bị đụng (`workflow-api/`, không có git) — đọc lại toàn bộ
   phần Codex sửa trước khi tin, vì không rollback được.
5. Khi đã verify xong: commit (theo từng phần việc nhỏ, không gộp), cập nhật
   `docs/TRANG_THAI_DU_AN.md` mục "Đã hoàn thành", cập nhật `PROGRESS.md`
   sang "Đã commit xong".
6. Lấy nguyên văn prompt phase kế tiếp trong `prompts/`, giao cho Codex.

## Trạng thái hiện tại (2026-09-05, cuối phiên brainstorming + giao Phase 0)

Xem chi tiết trong `PROGRESS.md`. Tóm tắt: **Phase 0 Codex đã viết code xong
nhưng CHƯA commit và CHƯA được test qua trình duyệt** — đây là việc đầu tiên
phiên supervisor ngày mai phải làm trước khi giao Phase 5.
