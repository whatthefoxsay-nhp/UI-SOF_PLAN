# Báo cáo kết quả dọn SOF PLAN

Ngày thực hiện: 2026-07-29

## Phạm vi đã thực hiện

- Chỉ thao tác trên dự án clone frontend: `C:\Users\Theanh\SOF\QLNS\SOF_PLAN`.
- Chỉ thao tác trên backend PLAN copy: `C:\laragon\www\TAproduct.dev.erp\App\PLAN\v2.des.plan.banhangonline.top`.
- Không chỉnh sửa dự án gốc `C:\Users\Theanh\SOF\QLNS\SOF_ERP`.
- Giữ nguyên `REACT_APP_TYPE_SOF_CODE=ERP` theo xác nhận.
- Giữ đầy đủ nhóm Quản lý nghỉ phép.

## Frontend SOF_PLAN

- Đã giữ route theo sidebar PLAN và trang đầu `/quan-ly-ke-hoach`.
- Đã xóa trực tiếp 525 file dư trong `src/pages`.
- Đã xóa 145 thư mục rỗng/dư trong `src/pages`.
- Số file còn lại trong `src/pages`: 111.
- Đã dọn dấu vết Dashboard trong mã chạy chính; Dashboard không còn route/sidebar.
- Đã đổi nhãn nhận diện SOF ERP sang SOF PLAN trong giao diện/chạy chính.

## Backend PLAN

- `services.sof.vn/index.php` đã thu gọn còn 9987 dòng.
- Số nhánh `switch ($vtable)` giữ lại: 184.
- Số nhánh `switch ($vtable)` đã loại bỏ: 175.
- `clsall` hiện còn 175 file PHP.
- Đã xóa trực tiếp 1.383 DAO PHP dư, sau đó khôi phục 26 DAO cần thiết được endpoint PLAN gọi gián tiếp.
- Đã kiểm tra không còn include literal tới DAO `clsall` bị thiếu trong `index.php`.

## Kiểm tra đã chạy

- `npm run build` cho frontend SOF_PLAN: thành công, còn warning cũ.
- PHP 8.3 lint `services.sof.vn/index.php`: không lỗi cú pháp.
- PHP 8.3 lint toàn bộ DAO còn lại trong `clsall`: không lỗi cú pháp.

## Warning còn lại cần xử lý sau

- Nhiều warning ESLint cũ: unused import, dependency hook, CSS order.
- Một cảnh báo đáng chú ý: `src/pages/QuanLyKeHoach/QuanLyKeHoach.jsx` có duplicate prop tại dòng 1268.
- Các warning này không làm fail build nhưng nên được xử lý ở vòng tối ưu chất lượng mã.
