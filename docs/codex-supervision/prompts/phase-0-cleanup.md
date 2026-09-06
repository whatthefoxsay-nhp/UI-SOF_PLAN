<!-- Đã giao cho Codex ngày 2026-09-05. Codex báo xong nhưng CHƯA commit,
CHƯA test qua trình duyệt (môi trường Codex không có browser). Giữ lại file
này để tham chiếu / để giao lại phần còn thiếu nếu cần. Xem PROGRESS.md mục
"Chi tiết Phase 0" trước khi dùng lại prompt này. -->

# PROMPT — PHASE 0: Dọn tồn đọng trước khi làm module mới

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
