# PROMPT — PHASE 10: Regression toàn diện + dọn code cũ + chốt tài liệu

Ngữ cảnh 3 codebase / quy tắc test / quy tắc backend-không-git: xem mô tả đầu prompt Phase 0 (`docs/codex-supervision/prompts/phase-0-cleanup.md`).

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
