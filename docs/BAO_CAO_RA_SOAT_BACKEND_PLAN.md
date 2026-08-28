# Báo cáo rà soát backend SOF PLAN

Ngày lập: 2026-07-29
Phạm vi đọc: backend PLAN copy tại `C:\laragon\www\TAproduct.dev.erp\App\PLAN\v2.des.plan.banhangonline.top`.
Chưa sửa, chưa xóa file backend.

## 1. Hiện trạng backend

- Gateway chính: `services.sof.vn/index.php` có 16354 dòng.
- Thư mục DAO: `clsall` có 1532 file PHP.
- `index.php` dùng `CLSALL_PATH = dirname(__DIR__) . '/clsall'`, nhưng còn comment đường dẫn ERP cũ tại phần cấu hình đầu file.
- Gateway nhận `vtable/table` và `vfunc/func`, sau đó điều hướng qua `switch ($vtable)`, include DAO trực tiếp hoặc gọi nhánh generic.
- Có các helper generic quan trọng: `lv_generic_list_json`, `lv_generic_load_prefs`, `lv_generic_save_prefs`.

## 2. Kết quả bản đồ phụ thuộc frontend -> backend

| Chỉ số | Giá trị |
| --- | ---: |
| Route import từ App.jsx | 43 |
| File frontend được duyệt phụ thuộc | 164 |
| Mã nghiệp vụ/API phát hiện | 154 |
| Mã khớp trực tiếp file DAO trong clsall | 126 |
| Mã khớp trực tiếp case trong index.php | 116 |
| Mã xuất hiện đâu đó trong index.php | 123 |
| Mã chưa khớp trực tiếp DAO/case | 7 |
| Ứng viên DAO dư theo kiểm tra trực tiếp | 1406 |

Phân bổ mã nghiệp vụ theo prefix:

| Prefix | Số mã |
| --- | ---: |
| ac | 9 |
| cr | 64 |
| hr | 17 |
| jo | 12 |
| ki | 11 |
| lv | 2 |
| sl | 15 |
| tc | 12 |
| wh | 12 |

## 3. Nhóm mã nên giữ làm danh sách trắng ban đầu

Danh sách dưới đây là các mã có dấu hiệu đang được frontend PLAN gọi và/hoặc đã có case/DAO trong backend copy:

`ac_lv0002_select_kttm, ac_lv0004_select_kttm, ac_lv0005, ac_lv0019, ac_lv0030, ac_lv0030_select_kttm, ac_lv0075, ac_lv0077, ac_lv0302_select_kttm, cr_lv0002, cr_lv0003, cr_lv0004, cr_lv0005, cr_lv0005-1, cr_lv0005_12, cr_lv0005_select_kttm, cr_lv0006, cr_lv0007, cr_lv0008, cr_lv0025, cr_lv0025-1, cr_lv0025_xemtongcv, cr_lv0031, cr_lv0032, cr_lv0033, cr_lv0037, cr_lv0038, cr_lv0046, cr_lv0047, cr_lv0048, cr_lv0071, cr_lv0071-1, cr_lv0083, cr_lv0085, cr_lv0085_overdue, cr_lv0086, cr_lv0087, cr_lv0088, cr_lv0092, cr_lv0092-1, cr_lv0093, cr_lv0094, cr_lv0094_detail, cr_lv0129, cr_lv0141, cr_lv0145, cr_lv0150, cr_lv0150-17, cr_lv0151, cr_lv0155, cr_lv0157, cr_lv0158, cr_lv0158_unfinished, cr_lv0202, cr_lv0202-16, cr_lv0203, cr_lv0211, cr_lv0212, cr_lv0216, cr_lv0278, cr_lv0313, cr_lv0318, cr_lv0319, cr_lv0322, cr_lv0328, cr_lv0330, cr_lv0330-11, cr_lv0384, cr_lv0408, cr_lv0409, cr_lv0414, cr_lv0416, hr_lv0001, hr_lv0002, hr_lv0002_select, hr_lv0003, hr_lv0004, hr_lv0014, hr_lv0018, hr_lv0020, hr_lv0020_select_kttm, hr_lv0024, hr_lv0026, hr_lv0035, hr_lv0036, hr_lv0040, hr_lv0042, hr_lv0043, jo_lv0003, jo_lv0004, jo_lv0004_1, jo_lv0008, jo_lv0009, jo_lv0010, jo_lv0012, jo_lv0013, jo_lv0014, jo_lv0016, jo_lv0040, jo_lv0100_select, ki_lv0001, ki_lv0001_select, ki_lv0002, ki_lv0002_select, ki_lv0003, ki_lv0004, ki_lv0005, ki_lv0007, ki_lv0008, ki_lv0009, ki_lv0010, sl_lv0001, sl_lv0005, sl_lv0005_select_kttm, sl_lv0006, sl_lv0007, sl_lv0008, sl_lv0009, sl_lv0010, sl_lv0010-1, sl_lv0013, sl_lv0013-1, sl_lv0014, sl_lv0016, sl_lv0034, tc_lv0001, tc_lv0002, tc_lv0002_select, tc_lv0003, tc_lv0004, tc_lv0004_select, tc_lv0005, tc_lv0013, tc_lv0013_select, tc_lv0017, tc_lv0018, tc_lv0045, wh_lv0001, wh_lv0002, wh_lv0003, wh_lv0003_select_kttm, wh_lv0004, wh_lv0005, wh_lv0008, wh_lv0021, wh_lv0021-1, wh_lv0021_select_kttm`

Các mã chưa khớp trực tiếp cần kiểm tra thủ công trước khi kết luận:

`cr_lv0025-21, hr_nhansu, lv_loaddataapi, lv_loadnhanvien, sl_lv0201, wh_lv0006, wh_lv0007`

Ghi chú: một số mã trong nhóm chưa khớp là tên hàm frontend generic như `lv_loaddataapi`, hoặc mã được đặt trong service dùng chung chưa chắc đang chạy ở route PLAN. Không nên dùng nhóm này để xóa ngay.

## 4. Rủi ro nếu xóa backend trực tiếp

- Một case trong `index.php` có thể include nhiều DAO phụ không xuất hiện trực tiếp trong frontend, ví dụ các màn kế hoạch/công việc có thể kéo thêm nhân sự, tài khoản, kho, bán hàng để hiển thị dropdown hoặc báo cáo.
- Nhiều endpoint dùng tên biến động như `$vclass`, `$vtable`, `$className`; nếu chỉ đối chiếu tên file tĩnh sẽ thiếu phụ thuộc runtime.
- Module nghỉ phép và KPI vẫn dùng nhiều mã HR/TC/KI; nếu coi đây là “không liên quan kế hoạch” rồi xóa sẽ làm hỏng route đã được yêu cầu giữ.
- Một số helper preference/list_json dùng bảng vật lý và cấu hình động; cần giữ cho tới khi smoke test xác nhận không dùng.

## 5. Hướng xử lý đề xuất khi được duyệt

1. Sao lưu backend PLAN copy hoặc tạo nhánh riêng trước khi sửa.
2. Sinh whitelist backend từ 3 nguồn: mã frontend đã phát hiện, case trong `index.php`, và các file DAO được include bên trong từng case liên quan.
3. Thu gọn `index.php` theo từng khối: giữ bootstrap/auth/CORS/generic helpers, giữ các case thuộc whitelist, đưa case ngoài whitelist vào file lưu trữ tạm.
4. Với `clsall`, không xóa ngay. Trước tiên di chuyển DAO ngoài whitelist sang `clsall_unused_pending_review` trong backend PLAN copy.
5. Chạy kiểm tra PHP syntax cho `index.php` và DAO còn lại.
6. Chạy smoke test frontend qua các route sidebar: đăng nhập, mở màn, tải danh sách, thêm/sửa/xóa nếu có, dropdown, export/import nếu có.
7. Sau 1 vòng kiểm thử ổn định mới xóa vĩnh viễn thư mục tạm.

## 6. Câu hỏi cần bạn xác nhận trước khi dọn backend

1. Có đổi `REACT_APP_TYPE_SOF_CODE=ERP` sang `PLAN` không, hay backend xác thực vẫn dùng mã ERP?
2. Với nhóm Quản lý nghỉ phép trong sidebar, bạn muốn xem là một phần của SOF PLAN và giữ đầy đủ backend HR/TC liên quan đúng không?
3. Khi thu gọn backend, bạn muốn di chuyển file dư vào thư mục tạm trước hay cho phép xóa trực tiếp trong backend PLAN copy?
4. Có cần giữ lại các API import/export Excel cũ nếu không còn route hiển thị chúng trong SOF PLAN không?

## 7. File dữ liệu audit

Dữ liệu chi tiết được lưu tại: `docs/sof_plan_backend_audit.json`.
