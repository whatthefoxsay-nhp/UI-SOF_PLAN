# Báo cáo rà soát tách SOF_PLAN khỏi SOF_ERP

Ngày lập: 2026-07-29

## 1. Phạm vi và nguyên tắc

- Dự án gốc: `C:\Users\Theanh\SOF\QLNS\SOF_ERP` chỉ dùng để đối chiếu, tuyệt đối không xóa/chỉnh.
- Dự án tách: `C:\Users\Theanh\SOF\QLNS\SOF_PLAN` là nơi được phép xử lý sau khi được duyệt.
- Mục tiêu: giữ cấu trúc app hiện tại, chỉ thu gọn `src/App.jsx`, `src/components/Layout/SidebarMenu/SidebarMenu.jsx` và `src/pages` theo module quản lý kế hoạch, công việc, dự án, nghỉ phép, KPI như menu đã nêu.
- Trạng thái hiện tại: `SOF_PLAN` đã được nhân bản từ `SOF_ERP`. Sau khi tạo báo cáo, git status đang có file báo cáo mới và `src/components/Layout/SidebarMenu/SidebarMenu.jsx` đang ở trạng thái modified. Tôi không thực hiện thao tác sửa `SidebarMenu.jsx` trong lượt lập báo cáo này; diff hiện cho thấy file đã được rút gọn mạnh theo hướng bỏ nhiều menu ERP gốc, cần anh xác nhận đây là thay đổi mong muốn trước khi tiếp tục.

## 2. Hiện trạng chính

### 2.1. App.jsx

`src/App.jsx` vẫn khai báo rất nhiều lazy component và route của ERP gốc. Các route liên quan menu mục tiêu đã có ở các đoạn chính:

- Lazy import module kế hoạch/công việc/dự án: khoảng dòng 105-163.
- Lazy import KPI/nghỉ phép: khoảng dòng 500-550.
- Route kế hoạch/công việc/cảnh báo: khoảng dòng 1234-1302.
- Route dự án: khoảng dòng 1164-1166.
- Route KPI/nghỉ phép: khoảng dòng 1361-1403.

Điểm cần chú ý: nhóm menu `Mục chung công việc` có các key `/lap-ke-hoach/...`, nhưng trong `App.jsx` chưa thấy route tương ứng. Component đã tồn tại tại:

- `src/pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages.jsx`
- `src/pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/danhMucCongViec.config.js`

Vì vậy nếu muốn các mục này hoạt động, cần bổ sung lazy import và route cho 7 trang danh mục.

### 2.2. SidebarMenu.jsx

`SidebarMenu.jsx` trong working tree hiện có `Dashboard`, nhóm `Quản lý công việc` và `Quản lý dự án`; git diff cho thấy file đã bị rút gọn khoảng 1000 dòng so với bản gốc. Cần xác nhận thay đổi này là chủ ý, sau đó mới chuẩn hóa lại `menuItems` theo danh sách route được duyệt và dọn các import/icon/logic dư còn sót.

Ngoài menu, file này còn phụ thuộc:

- `contexts/TabContext`
- `auth/logo.png`
- `SidebarMenu.css`
- i18n/theme/localStorage hiện có

Các phụ thuộc này nên giữ lại để shell ứng dụng vẫn chạy đúng.

### 2.3. src/pages

Nhóm trang trực tiếp cần giữ theo menu:

- `src/pages/QuanLyCongViec`
- `src/pages/QuanLyKeHoach`
- `src/pages/QuanLyDuAn`
- `src/pages/DieuKhienKPI`
- `src/pages/QuanLyNghiPhep`
- `src/pages/Common/UnderDevelopment.jsx` nếu vẫn giữ route fallback
- `src/pages/Dashboard` nếu vẫn giữ dashboard làm trang đầu

Nhóm trang có thể phải giữ tạm hoặc refactor trước khi xóa vì đang được import gián tiếp bởi module kế hoạch:

- `src/pages/NhanVien/styles.module.css`: đang được `CanhBaoModules`, `CongViecPhaiLam`, `CongViecDoiDuyet`, `DanhMucDuAn`, `KabanPhongBan` dùng làm style chung.
- `src/pages/ChamCong&TienLuong/ThongTinCC/style.module.css`: đang được nhiều trang KPI dùng làm style chung.
- `src/pages/ChamCong&TienLuong/ChamCong/ChiTietChamCong/styles.module.css`: đang được `LuocDoKeHoach.jsx` dùng.
- `src/pages/KeToanTienMat/PhieuChi/NhapPhieuChiNhanh.jsx`: đang được `QuanLyKeHoach/tabs/ChiTienTab.jsx` dùng.
- `src/pages/PhieuMuaHang/PhieuChiTabUI.jsx` và `src/pages/PhieuMuaHang/PhieuMuaHang.css`: đang được `QuanLyKeHoach/tabs/MuaHangTab.jsx` dùng.
- `src/pages/QuanLyDeNghiVatTu/QuanLyDeNghiVatTu.css`: đang được `QuanLyKeHoach/tabs/DeNghiVatTuTab.jsx` dùng.

Nếu xóa thẳng các thư mục trên mà không refactor import, build sẽ lỗi.

## 3. Danh sách route đề xuất giữ

### 3.1. Quản lý công việc / cảnh báo

| Route | Component hiện tại | Ghi chú |
| --- | --- | --- |
| `/canh-bao` | `CanhBao` từ `QuanLyCongViec/CanhBao/CanhBaoModules` | Giữ |
| `/xu-ly-canh-bao` | `XuLyCanhBao` từ `CanhBaoModules` | Giữ |
| `/bao-cao-canh-bao-hang-ngay` | `BaoCaoCanhBaoHangNgay` từ `CanhBaoModules` | Giữ |
| `/lich-canh-bao-theo-thang` | `LichCanhBaoTheoThang` từ `CanhBaoModules` | Giữ |

### 3.2. Lập kế hoạch

| Route | Component hiện tại | Ghi chú |
| --- | --- | --- |
| `/xem-ke-hoach` | `QuanLyCongViec/LapKeHoach/XemKeHoach/QuanLyKeHoach` | Đã có route |
| `/lap-ke-hoach/loai-doi-tuong` | `LoaiDoiTuong` từ `DanhMucPages.jsx` | Cần bổ sung route |
| `/lap-ke-hoach/loai-cong-viec` | `LoaiCongViec` từ `DanhMucPages.jsx` | Cần bổ sung route |
| `/lap-ke-hoach/muc-cong-viec-phai-lam` | `MucCongViecPhaiLam` từ `DanhMucPages.jsx` | Cần bổ sung route |
| `/lap-ke-hoach/diem-kpi` | `DiemKpi` từ `DanhMucPages.jsx` | Cần bổ sung route |
| `/lap-ke-hoach/tien-do-du-an` | `TienDoDuAn` từ `DanhMucPages.jsx` | Cần bổ sung route |
| `/lap-ke-hoach/trang-thai-du-an` | `TrangThaiDuAn` từ `DanhMucPages.jsx` | Cần bổ sung route |
| `/lap-ke-hoach/thuong-hieu` | `ThuongHieu` từ `DanhMucPages.jsx` | Cần bổ sung route |

### 3.3. Quản lý công việc

| Route | Component hiện tại | Ghi chú |
| --- | --- | --- |
| `/quan-ly-ke-hoach` | `QuanLyKeHoach` | Đã có route |
| `/quan-ly-ke-hoach/:id` | `ChiTietKeHoach` | Nên giữ vì trang chi tiết có thể mở từ danh sách |
| `/nhap-cong-viec` | `NhapCongViec` | Giữ |
| `/cong-viec-phai-lam` | `CongViecPhaiLam` | Giữ |
| `/cong-viec-phai-lam-giao-viec` | `CongViecPhaiLamGiaoViec` | Giữ |
| `/cong-viec-doi-duyet` | `CongViecDoiDuyet` | Giữ |
| `/cong-viec-hoan-thanh` | `CongViecHoanThanh` | Giữ |
| `/cong-viec-khong-hoan-thanh` | `CongViecKhongHoanThanh` | Giữ |
| `/bao-cao-cong-viec-hang-ngay` | `BaoCaoCongViecHangNgay` | Giữ |
| `/bao-cao-du-an` | `BaoCaoDuAn` | Giữ |
| `/luoc-do-ke-hoach` | `LuocDoKeHoach` | Giữ |
| `/cong-viec-hang-ngay` | `CongViecHangNgay` | Giữ |
| `/cong-viec-chua-bao-cao` | `CongViecChuaBaoCao` | Giữ |

### 3.4. Quản lý nghỉ phép

| Route | Component hiện tại | Ghi chú |
| --- | --- | --- |
| `/trang-thai-don-xin-phep` | `TrangThaiDonXinPhep` | Giữ nếu nghỉ phép thuộc phạm vi SOF_PLAN |
| `/don-xin-phep` | `DonXinPhep` | Giữ nếu nghỉ phép thuộc phạm vi SOF_PLAN |
| `/tao-don-xin-phep-theo-phong-ban` | `DonXinPhepTheoPhongBan` | Giữ nếu nghỉ phép thuộc phạm vi SOF_PLAN |
| `/bao-cao-don-xin-phep` | `BaoCaoDonXinPhep` | Giữ nếu nghỉ phép thuộc phạm vi SOF_PLAN |
| `/bgd-duyet-don` | `BgdDuyetDon` | Giữ nếu nghỉ phép thuộc phạm vi SOF_PLAN |
| `/quan-ly-truc-tiep-duyet-don` | `QuanLyTrucTiepDuyetDon` | Giữ nếu nghỉ phép thuộc phạm vi SOF_PLAN |

### 3.5. KPI

| Route | Component hiện tại | Ghi chú |
| --- | --- | --- |
| `/cac-tieu-chi-kpi` | `CacTieuChiKPI` | Giữ |
| `/thiet-lap-kpi` | `ThietLapKPI` | Giữ |
| `/chi-tiet-kpi` | `ChiTietKPI` | Giữ |
| `/kpi-hang-thang` | `KPIHangThang` | Giữ |
| `/kpi-giam-doc` | `KPIGiamDoc` | Giữ |
| `/kpi-nhan-su` | `KPINhanSu` | Giữ |
| `/kpi-quan-ly` | `KPIQuanLy` | Giữ |
| `/kpi-bao-cao` | `KPIBaoCao` | Giữ |

### 3.6. Quản lý dự án

| Route | Component hiện tại | Ghi chú |
| --- | --- | --- |
| `/quan-ly-du-an/du-an-mau` | `DuAnMau` từ `QuanLyDuAn/DanhMucDuAn/DanhMucDuAn` | Giữ |
| `/quan-ly-du-an/danh-muc-giai-doan` | `DanhMucGiaiDoan` từ cùng file | Giữ |
| `/kaban-phong-ban` | `KabanPhongBan` | Giữ |

## 4. Hướng xử lý đề xuất

### Giai đoạn 1: Khóa phạm vi giữ lại

- Xác nhận route mặc định: giữ `/dashboard` hay chuyển trang đầu về `/xem-ke-hoach` hoặc `/quan-ly-ke-hoach`.
- Xác nhận có giữ nhóm `Quản lý nghỉ phép` trong SOF_PLAN hay không.
- Xác nhận có giữ toàn bộ tab phụ trong `src/pages/QuanLyKeHoach` hay chỉ giữ tab kế hoạch/công việc. Nếu giữ toàn bộ, cần giữ thêm một số phụ thuộc từ mua hàng/kế toán/vật tư như đã liệt kê.

### Giai đoạn 2: Thu gọn SidebarMenu.jsx

- Giữ menu Dashboard nếu được duyệt; nếu không, bỏ khỏi menu.
- Giữ đúng 2 nhóm lớn: `Quản lý công việc` và `Quản lý dự án`.
- Xác nhận phần rút gọn hiện có của `SidebarMenu.jsx`; sau đó xóa/chuẩn hóa mọi nhóm ERP còn sót nếu có và dọn import/icon không còn dùng.
- Giữ logic tab, theme, ngôn ngữ, collapse để không phá shell ứng dụng.

### Giai đoạn 3: Thu gọn App.jsx

- Xóa lazy import không thuộc route giữ lại.
- Xóa route không thuộc menu giữ lại.
- Bổ sung lazy import cho `DanhMucPages.jsx` và 7 route `/lap-ke-hoach/...` đang thiếu.
- Chuyển route `/` theo quyết định ở giai đoạn 1.
- Giữ `DangNhap`, `LanguageProvider`, `TabProvider`, `SidebarMenu`, `HeaderBar`, `TabBar`, `UnderDevelopment` hoặc fallback tương đương.

### Giai đoạn 4: Dọn src/pages theo mức an toàn

Mức an toàn 1, khuyến nghị làm trước:

- Chỉ xóa các thư mục page chắc chắn không còn route và không còn import gián tiếp.
- Không xóa các thư mục đang được module kế hoạch import style/component như `NhanVien`, `ChamCong&TienLuong`, `KeToanTienMat`, `PhieuMuaHang`, `QuanLyDeNghiVatTu` cho đến khi refactor xong.

Mức an toàn 2, làm sau khi build xanh:

- Di chuyển các style dùng chung từ `pages/NhanVien` và `pages/ChamCong&TienLuong` sang `src/styles/shared` hoặc `src/components/common`.
- Nếu không cần tab chi tiền/mua hàng/vật tư trong `QuanLyKeHoach`, bỏ tab và xóa phụ thuộc liên quan.
- Nếu vẫn cần các tab đó, giữ lại đúng file phụ thuộc tối thiểu thay vì giữ cả module kế toán/mua hàng/vật tư.

### Giai đoạn 5: Cấu hình nhận diện SOF_PLAN

Sau khi route/page đã ổn định, nên đổi các phần nhận diện:

- `package.json`: `name`, `description`, `build.productName`, `nsis.shortcutName` từ ERP sang SOF PLAN.
- `README.md` và tài liệu liên quan nếu cần.
- Logo/icon nếu muốn tách nhận diện.
- `.env` hoặc `src/services/url.js`: xác nhận dùng backend ERP hiện tại hay backend riêng cho PLAN.

## 5. Rủi ro kỹ thuật

- Xóa `pages` quá mạnh có thể làm vỡ import style/component gián tiếp.
- Các trang kế hoạch hiện vẫn dùng API/tables ERP như `cr_lv...`, `ac_lv...`; tách frontend không đồng nghĩa tách backend/database.
- `QuanLyKeHoach` là module lớn, có tab liên quan đề nghị vật tư, mua hàng, chi tiền, nhập/xuất kho. Cần quyết định đây là nghiệp vụ thuộc PLAN hay phần thừa kế từ ERP.
- Một số text hiển thị trong terminal bị mojibake khi đọc bằng PowerShell, nhưng file có thể vẫn là UTF-8. Khi chỉnh cần giữ encoding UTF-8 để không làm hỏng tiếng Việt.
- Nếu xóa `Dashboard` nhưng route `/` vẫn redirect `/dashboard`, app sẽ mở vào trang lỗi/fallback.

## 6. Kiểm thử sau khi được duyệt thực thi

- Chạy build: `npm run build` trong `SOF_PLAN`.
- Kiểm tra không còn import lỗi bằng build output.
- Mở app web/electron và thử từng route trong sidebar.
- Kiểm tra các thao tác chính: tải danh sách, thêm/sửa/xóa, mở drawer/detail, xuất Excel/Word nếu có.
- So sánh `git status` để xác nhận chỉ `SOF_PLAN` thay đổi.
- Tuyệt đối không chạy thao tác xóa/chỉnh trong `SOF_ERP`.

## 7. Câu hỏi cần xác nhận trước khi thực thi

1. Trang đầu của SOF_PLAN nên là `/dashboard`, `/xem-ke-hoach`, hay `/quan-ly-ke-hoach`?
2. Nhóm `Quản lý nghỉ phép` có chắc chắn thuộc SOF_PLAN không, hay cần tách khỏi bản PLAN?
3. Trong `QuanLyKeHoach`, các tab liên quan mua hàng, vật tư, chi tiền, nhập kho, xuất kho có cần giữ không?
4. SOF_PLAN sẽ tiếp tục dùng backend/database ERP hiện tại, hay có backend/database riêng?
5. Có cần đổi nhận diện ứng dụng ngay trong đợt tách này không: tên app, shortcut, logo, README?

## 8. Kết luận đề xuất

Nên thực thi theo hướng chia 2 bước:

1. Bước 1: thu gọn `SidebarMenu.jsx` và `App.jsx`, bổ sung route thiếu cho `Mục chung công việc`, chưa xóa mạnh `pages` ngoài phạm vi nếu còn import gián tiếp.
2. Bước 2: sau khi build xanh, dọn `src/pages` theo dependency thực tế; refactor style/component đang mượn từ module nhân sự/chấm công/kế toán/mua hàng trước khi xóa các thư mục đó.

Cách này giúp SOF_PLAN tách khỏi menu/route ERP gốc trước, nhưng vẫn giữ khả năng chạy ổn định của các component kế hoạch hiện tại.

