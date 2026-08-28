# Báo cáo hiện trạng tách SOF ERP thành SOF PLAN

Ngày lập: 2026-07-29
Phạm vi thao tác: chỉ dự án clone `C:\Users\Theanh\SOF\QLNS\SOF_PLAN`. Hệ thống gốc `C:\Users\Theanh\SOF\QLNS\SOF_ERP` không bị chỉnh sửa.

## 1. Yêu cầu đã chốt

- Trang đầu chuyển sang `/quan-ly-ke-hoach`, bỏ Dashboard khỏi luồng khởi động.
- Giữ nguyên tất cả route đang có trong Sidebar Menu của module kế hoạch/công việc/dự án/KPI/nghỉ phép/cảnh báo.
- Giữ đầy đủ tab và chức năng hiện có của màn `QuanLyKeHoach`.
- Đổi nhận diện giao diện từ SOF ERP sang SOF PLAN.
- Frontend trỏ local API về backend PLAN copy: `/v2.des.plan.banhangonline.top`.

## 2. Các file frontend đã chỉnh trong SOF_PLAN

- `src/App.jsx`: thu gọn route còn các route thuộc menu PLAN, `/` redirect về `/quan-ly-ke-hoach`.
- `src/components/Layout/SidebarMenu/SidebarMenu.jsx`: bỏ Dashboard khỏi sidebar, logo mở `/quan-ly-ke-hoach`.
- `src/contexts/TabContext.jsx`: tab mặc định là Quản lý kế hoạch, key lịch sử tab chuyển sang `plan_tab_history`.
- `src/utils/menuUtils.js`: metadata route chỉ giữ nhóm PLAN tương ứng sidebar.
- `src/components/Layout/HeaderBar/HeaderBar.jsx`, `src/auth/DangNhap.jsx`, `public/index.html`, `public/manifest.json`, `public/electron.js`, `package.json`: đổi tên/nhãn hiển thị sang SOF PLAN.
- `src/services/url.js`: local API prefix đổi từ ERP sang PLAN.

## 3. Route được giữ trong App.jsx

- `./pages/QuanLyKeHoach/QuanLyKeHoach`
- `./pages/QuanLyKeHoach/ChiTietKeHoach`
- `./pages/QuanLyCongViec/LapKeHoach/XemKeHoach/QuanLyKeHoach`
- `./pages/QuanLyCongViec/QuanLyCongViec/NhapCongViec/NhapCongViec`
- `./pages/QuanLyCongViec/QuanLyCongViec/CongViecPhaiLam/CongViecPhaiLam`
- `./pages/QuanLyCongViec/QuanLyCongViec/CongViecPhaiLamGiaoViec/CongViecPhaiLamGiaoViec`
- `./pages/QuanLyCongViec/QuanLyCongViec/CongViecDoiDuyet/CongViecDoiDuyet`
- `./pages/QuanLyCongViec/QuanLyCongViec/CongViecKhongHoanThanh/CongViecKhongHoanThanh`
- `./pages/QuanLyCongViec/QuanLyCongViec/CongViecHoanThanh/CongViecHoanThanh`
- `./pages/QuanLyCongViec/QuanLyCongViec/BaoCaoCongViecHangNgay/BaoCaoCongViecHangNgay`
- `./pages/QuanLyCongViec/QuanLyCongViec/CongViecHangNgay/CongViecHangNgay`
- `./pages/QuanLyCongViec/QuanLyCongViec/CongViecChuaBaoCao/CongViecChuaBaoCao.jsx`
- `./pages/QuanLyCongViec/QuanLyCongViec/BaoCaoDuAn/BaoCaoDuAn`
- `./pages/QuanLyCongViec/QuanLyCongViec/LuocDoKeHoach/LuocDoKeHoach`
- `./pages/QuanLyCongViec/CanhBao/CanhBaoModules`
- `./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages`
- `./pages/DieuKhienKPI/CacTieuChiKPI/CacTieuChiKPI`
- `./pages/DieuKhienKPI/ThietLapKPI/ThietLapKPI`
- `./pages/DieuKhienKPI/ThietLapKPI/ChiTietKPI`
- `./pages/DieuKhienKPI/KPIHangThang/KPIHangThang`
- `./pages/DieuKhienKPI/KPIGiamDoc/KPIGiamDoc`
- `./pages/DieuKhienKPI/KPINhanSu/KPINhanSu`
- `./pages/DieuKhienKPI/KPIQuanLy/KPIQuanLy`
- `./pages/DieuKhienKPI/KPIBaoCao/KPIBaoCao`
- `./pages/QuanLyNghiPhep/TrangThaiDonXinPhep/TrangThaiDonXinPhep`
- `./pages/QuanLyNghiPhep/BaoCaoDonXinPhep/BaoCaoDonXinPhep`
- `./pages/QuanLyNghiPhep/DonXinPhep/DonXinPhep`
- `./pages/QuanLyNghiPhep/DonXinPhepTheoPhongBan/DonXinPhepTheoPhongBan`
- `./pages/QuanLyNghiPhep/BgdDuyetDon/BgdDuyetDon`
- `./pages/QuanLyNghiPhep/QuanLyTrucTiepDuyetDon/QuanLyTrucTiepDuyetDon`
- `./pages/QuanLyDuAn/KabanPhongBan/KabanPhongBan`
- `./pages/QuanLyDuAn/DanhMucDuAn/DanhMucDuAn`
- `./pages/Common/UnderDevelopment`

## 4. Ghi nhận quan trọng

- Dashboard không còn nằm trong route khởi động hay sidebar. Thư mục `src/pages/Dashboard` hiện vẫn tồn tại nhưng là thành phần dư thừa, có thể xóa trong pha dọn `pages` sau khi bạn duyệt.
- Một số thư mục trang ngoài PLAN vẫn còn trong `src/pages` do đây mới là bước tách route/luồng chạy. Có thể dọn vật lý ở pha tiếp theo bằng cách di chuyển vào thư mục lưu trữ trước, sau đó build lại.
- Biến `REACT_APP_TYPE_SOF_CODE=ERP` trong `.env` chưa đổi vì có thể liên quan xác thực/session backend. Cần xác nhận nếu muốn đổi mã hệ thống đăng nhập sang `PLAN`.

## 5. Hướng xử lý pha dọn frontend tiếp theo

1. Tạo danh sách trắng từ các import trong `src/App.jsx` và phụ thuộc trực tiếp của các màn PLAN.
2. Di chuyển thư mục trang không còn được route tới thư mục lưu trữ tạm, chưa xóa vĩnh viễn.
3. Chạy build, mở từng nhóm route chính: kế hoạch, công việc, cảnh báo, nghỉ phép, KPI, dự án.
4. Nếu ổn định, mới xóa thư mục lưu trữ khỏi dự án clone.
