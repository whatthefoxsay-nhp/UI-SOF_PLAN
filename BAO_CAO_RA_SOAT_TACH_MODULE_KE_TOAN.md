# Báo cáo rà soát tách module Kế toán

**Phạm vi rà soát:** cây `Kế toán` trong `src/components/Layout/SidebarMenu/SidebarMenu.jsx` (dòng 874–1122), các khai báo lazy import/`Route` tương ứng trong `src/App.jsx`, và các component, context, API, dropdown được các route đó kéo vào. Đây là rà soát tĩnh mã nguồn; chưa chạy nghiệp vụ với dữ liệu thực tế.

## Kết luận nhanh

- Có **37 điểm truy cập nghiệp vụ trên menu**. Ba điểm duyệt phiếu KT chỉ là ba tab của **một route**; App có đủ route cho mọi trang lá của menu.
- Có 3 key submenu có dạng URL nhưng **không có `Route`**: `/ke-toan-luong`, `/bao-cao`, `/qldn-ct`. Nếu code menu chuyển hướng key cha, chúng rơi vào `UnderDevelopment`; không được đưa chúng vào ứng dụng mới như route nghiệp vụ.
- Route duyệt phiếu kế toán (`/quan-ly-duyet-phieu-kt`) hiện đang bị đặt bên trong `ApprovalProvider` của **Duyệt đề nghị vật tư** trong `App.jsx` (khoảng dòng 940–968). Component này đồng thời tự tạo `AccountingApprovalProvider`. Khi tách, cần bỏ dependency bao ngoài của vật tư và giữ provider chuyên kế toán.
- Module không độc lập chỉ bằng cách copy `pages/KeToan*`: nó cần xác thực/quyền, `apiServices`, nhiều dropdown dữ liệu dùng chung và dữ liệu từ Nhân sự, Kho, Mua hàng, Công việc/Dự án.

## Cách App hiện khởi tạo module

`AppContent` chỉ render toàn bộ router sau khi `useAuth().isAuthenticated` là true. Mỗi trang được lazy-load trong `Suspense`; router đang là `MemoryRouter`, còn Sidebar dùng `TabProvider`/`addTab` để mở trang thành tab. Khung dùng chung gồm `LanguageProvider`, `SidebarMenu`, `HeaderBar`, `TabBar`, Ant Design `Layout` và hook `useAutoZoom`.

Vì vậy, ứng dụng nhỏ vẫn phải thay thế hoặc mang theo tối thiểu:

1. `AuthContext` và cấu trúc `user.permissions` (các quyền Add/Edit/Del có kiểm tra trong chứng từ).
2. `services/apiServices` (`lv_LoadDataAPI`, `execCRUD`) cùng backend case/class tương ứng.
3. Các dropdown dùng chung dưới `src/components/DropDown` và API dữ liệu sau chúng.
4. Router; chỉ giữ mô hình tab nếu thật sự cần nhiều tab. Nếu bỏ tab, Sidebar phải chuyển sang `navigate()` thông thường.

## Ma trận menu → Route → component được App load

| Nhóm | Menu/route | Component lazy đầu vào từ `App.jsx` | Chuỗi component/nghiệp vụ chính |
|---|---|---|---|
| Tiền mặt | `/tai-khoan` | `KeToanTienMat/TaiKhoan/TaiKhoan` | `TaiKhoanForm`; danh mục tài khoản |
| Tiền mặt | `/phieu-thu` | `KeToanTienMat/PhieuThu/PhieuThu` | danh sách, thêm/sửa/xóa; gọi `NhapPhieuThuNhanh` → `NhapPhieuThuNhanhContent` + `NhapChiTietThuTien` |
| Tiền mặt | `/nhap-phieu-thu-nhanh` | `.../PhieuThu/NhapPhieuThuNhanh` | header + chi tiết thu; UUID tạm `phieuThu_temporaryId` trong `localStorage` |
| Tiền mặt | `/phieu-chi` | `KeToanTienMat/PhieuChi/PhieuChi` | danh sách, thêm/sửa/xóa; `NhapPhieuChiNhanh` → header + `NhapChiTietPhieuChi` |
| Tiền mặt | `/nhap-phieu-chi-nhanh` | `.../PhieuChi/NhapPhieuChiNhanh` | UUID tạm `phieuChi_temporaryId`; header/chi tiết |
| Tiền mặt | `/tra-tien-luong` | `.../KeToanLuong/TraTienLuong` | `TraTienLuongContent`, `NhapChiTietChiTien`, `BieuDienCacKhoanLuong` |
| Tiền mặt | `/tra-tien-thue-thu-nhap` | `.../KeToanThue/TraTienThueThuNhap` | header thuế TNCN + `NhapChiTietThueTNCN` |
| Tiền mặt | `/tra-tien-bao-hiem` | `.../KeToanBaoHiem/TraTienBaoHiem` | header bảo hiểm + `NhapChiTietBaoHiem` |
| Tiền mặt | `/so-chi-tiet-tai-khoan` | `KeToanTienMat/BaoCao/SoChiTietTaiKhoan` | báo cáo `ac_lv0004_report`; helper `exportSoChiTietTaiKhoan.js` xuất PDF/DOCX |
| Tiền mặt | `/so-dot` | `KeToanTienMat/SoDot/SoDot` | CRUD số đợt (`ac_lv0302`) |
| Đề nghị chi tiền | `/quan-ly-de-nghi-chi-tien` và `/qldn-ct/quan-ly-dnpc` | `QuanLyDeNGhiChiTien/QuanLyDeNGhiChiTien` | trang quản lý đề nghị; cần giữ cả hai URL nếu tương thích bookmark/tab cũ |
| Ngân hàng | `/the-tin-dung` | `KeToanNganHang/TheTinDung/NhapTheTinDungNhanh` | wrapper UUID + `NhapTheTinDungNhanhContent`, `NhapChiTietTheTinDung`, danh sách thẻ |
| Ngân hàng | `/phat-hanh-sec` | `.../PhatHanhSec/NhapSecNhanh` | wrapper UUID + header/chi tiết séc, `DanhSachSec` |
| Ngân hàng | `/chuyen-khoan` | `.../ChuyenKhoan/NhapChuyenKhoanNhanh` | wrapper UUID + header/chi tiết chuyển khoản, `DanhSachChuyenKhoan` |
| Ngân hàng | `/lich-su-chuyen-khoan` | `.../ChuyenKhoan/LichSuChuyenKhoan` | lịch sử chuyển khoản |
| Ngân hàng | `/nop-tien-vao-tai-khoan` | `.../NopTienVaoTaiKhoan/NhapNopTienNhanh` | wrapper UUID + header/chi tiết nộp tiền, `DanhSachNopTien` |
| Bán hàng | `/ke-toan-ban-hang/hoa-don` | `KeToanBanHang/HoaDonBanHang/HoaDonBanHang` | danh sách hóa đơn; điều hướng sang tạo/xuất hóa đơn, truyền `location.state.record` khi sửa |
| Bán hàng | `/ke-toan-ban-hang/chi-tiet-hoa-don` | `.../ChiTietHoaDonBanHang/ChiTietHoaDonBanHang` | danh sách chi tiết hóa đơn |
| Bán hàng | `/ke-toan-ban-hang/tao-xuat-hoa-don` | `.../TaoXuatHoaDon/TaoXuatHoaDon` | UUID tạm + `TaoXuatHoaDonContent` và `ChiTietTaoXuatHoaDon` |
| Cấu hình | `/ke-toan/loai-tai-khoan` | `KeToan/LoaiTaiKhoan/LoaiTaiKhoan` | CRUD `ac_lv0001` |
| Cấu hình | `/ke-toan/loai-nhap-xuat` | `KeToan/LoaiNhapXuat/LoaiNhapXuat` | CRUD `kt_ac_lv0003` |
| Cấu hình | `/ke-toan/cau-hinh-ke-toan` | `KeToan/CauHinhKeToan/CauHinhKeToan` | CRUD `ac_lv0114` |
| Cấu hình | `/ke-toan/cau-hinh-kt-hang-ngay` | `KeToan/CauHinhKTHangNgay/CauHinhKTHangNgay` | CRUD `ac_lv0314` |
| CTNV khác | `/ke-toan-ctnvk/danh-sach` | `KeToanCTNVKhac/ChungTuNghiepVuKhac` | danh sách/xóa; `navigate` sang nhập nhanh với `state.record` |
| CTNV khác | `/ke-toan-ctnvk/nhap-nhanh` | `KeToanCTNVKhac/NhapNhanhCTNVK` | UUID tạm + `NhapNhanhCTNVKContent`; chi tiết nằm trong `ChiTietCTNVK` |
| Duyệt phiếu KT | `/quan-ly-duyet-phieu-kt?tab=ktt` | `QuanLyDuyetPhieuKT/QuanLyDuyetPhieuKT` | `AccountingApprovalProvider` + `KT_KTT_Duyet` |
| Duyệt phiếu KT | `/quan-ly-duyet-phieu-kt?tab=ptgd` | cùng component | `AccountingApprovalProvider` + `KT_PTGD_Duyet` |
| Duyệt phiếu KT | `/quan-ly-duyet-phieu-kt?tab=bgd` | cùng component | `AccountingApprovalProvider` + `KT_BGD_Duyet` |
| ĐNCT | `/qldn-ct/mau-tam-ung-tt` | `QuanLyDeNGhiChiTien/MauTamUngThanhToan/MauTamUngThanhToan` | quản lý mẫu tạm ứng/thanh toán |
| ĐNCT | `/qldn-ct/ls-duyet-dnct` | `QuanLyDeNGhiChiTien/LichSuDuyetDNPCPage` | lịch sử duyệt `cr_lv0312` |
| Duyệt ĐNCT | `/qldn-ct/duyet-de-nghi-chi-tien` | `QuanLyDuyetDeNghiChiTien/DuyetDeNghiChiTien` | cấp Admin |
| Duyệt ĐNCT | `/qldn-ct/TL-duyet-dnct` | `.../TL_DuyetDNCT` | cấp TL |
| Duyệt ĐNCT | `/qldn-ct/QL-duyet-dnct` | `.../QL_DuyetDNCT` | cấp QL |
| Duyệt ĐNCT | `/qldn-ct/KT-duyet-dnct` | `.../KT_DuyetDNCT` | cấp Kế toán/hóa đơn |
| Duyệt ĐNCT | `/qldn-ct/KTT-duyet-dnct` | `.../KTT_DuyetDNCT` | cấp Kế toán trưởng |
| Duyệt ĐNCT | `/qldn-ct/TLGD-duyet-dnct` | `.../TLGD_DuyetDNCT` | cấp Trợ lý GD |
| Duyệt ĐNCT | `/qldn-ct/BGD-duyet-dnct` | `.../BGD_DuyetDNCT` | cấp Ban giám đốc |
| Duyệt ĐNCT | `/qldn-ct/HT-duyet-dnct` | `.../HT_DuyetDNCT` | hoàn thành |

Tám route duyệt ĐNCT cuối bảng cùng đi qua `ApprovalChiTienLayout` → `ApprovalChiTienProvider`; provider này không được bỏ khi tách vì nó tải/cập nhật trạng thái dùng chung cho các cấp duyệt.

## Dữ liệu/API và liên phân hệ bắt buộc

| Miền nghiệp vụ | Backend class/API thấy trực tiếp | Dữ liệu/quan hệ phải giữ |
|---|---|---|
| Danh mục & tiền mặt | `ac_lv0001`, `kt_ac_lv0003`, `ac_lv0002`, `ac_lv0302`, `ac_lv0018_kttm_pt`, `ac_lv0019`, `ac_lv0074`, `ac_lv0075`, `ac_lv0076`, `ac_lv0077` | tài khoản, loại tài khoản, số đợt, phiếu thu/chi và chi tiết |
| Lương/thuế/bảo hiểm | `ac_lv0011`, `ac_lv0012`, `ac_lv0043`, `ac_lv0044`, `ac_lv0053`, `ac_lv0054`, `ac_lv0316` | lần tính lương, nhân viên, khoản lương, TNCN, bảo hiểm |
| Ngân hàng | `ac_lv0020`, `ac_lv0021`, `ac_lv0023`, `ac_lv0024`, `ac_lv0103`, `ac_lv0106` | thẻ, séc, chuyển khoản, nộp tiền, báo cáo và phê duyệt/hủy phê duyệt |
| Báo cáo | `ac_lv0004_report.GetReportData` | font `public/fonts/TimesNewRoman.ttf`; helper còn fallback CDN Roboto, cần quyết định đóng gói offline |
| Bán hàng/CTNVK | `KeToan_HoaDonBanHang`, `KeToan_ChiTietHoaDonBanHang`, `KeToan_TaoXuatHoaDon`, `KeToan_ChungTuNghiepVuKhac`, `KeToan_NhapNhanhCTNVK`, `KeToan_ChiTietCTNVK` | hóa đơn, khách hàng, kho/đơn vị, dự án, PBH |
| ĐNCT & phê duyệt | `cr_lv0202`, `cr_lv0203`, `cr_lv0312`, `cr_lv0309`, `cr_lv0205`, `ac_lv0002` | đề nghị, chi tiết, lịch sử, mẫu tạm ứng và tài khoản |
| Duyệt phiếu KT | `cr_lv0316`, `cr_lv0315`, `cr_lv0317`, `ac_lv0005`, `cr_lv0321` | ba cấp KTT → P.TGĐ → BGĐ, chi tiết và lịch sử phê duyệt |

Các dropdown gọi ra ngoài module gồm: `SelectChiNhanh`, `SelectSoDot`, `SelectCongViec`, `SelectPBH`, `SelectNguonPhieu`, `SelectKhachHang`, `SelectTaiKhoan`, `SelectTienTe`, `SelectPMH`, `SelectNCC`, `SelectMaLienKet`, `SelectNhanVien`, `SelectLanTinhLuong`, `SelectDonVi`. Đó là các hợp đồng dữ liệu với Chi nhánh, Công việc/Dự án, Bán hàng/khách hàng, Kho, Mua hàng/NCC và Nhân sự/Lương; cần chuyển thành API tham chiếu của ứng dụng mới hoặc copy nguyên các nguồn dữ liệu này.

## Xác thực, quyền và trạng thái cục bộ

- `AuthContext` được dùng bởi các chứng từ để kiểm tra `hasPermission(moduleCode, Add|Edit|Del)`. Các mã thấy trực tiếp: `Ac0018` (phiếu thu), `Ac0019` (phiếu chi), `Ac0084` (chuyển khoản/séc), `Ac0086` (thẻ tín dụng). Không nên bỏ kiểm soát này chỉ vì Sidebar không chặn route.
- Các trang nhập nhanh dùng `uuid` và `localStorage` làm khóa header/chi tiết tạm. Các khóa phải được giữ riêng theo chứng từ, và phải xóa sau lưu/hủy để không ghép nhầm chi tiết của phiên cũ.
- Các trang danh sách tự chứa form/modal nhập; vì vậy chỉ copy route “nhập nhanh” là thiếu chức năng sửa/xóa/duyệt từ danh sách.
- Bán hàng và CTNVK chuyển trang bằng React Router `location.state.record`; ứng dụng mới cần duy trì cách truyền state hoặc thay bằng `:id`/state store trước khi bỏ route cũ.

## Mục không route, mã trùng và rủi ro khi copy

1. **Ba key menu không hợp lệ như route:** `/ke-toan-luong`, `/bao-cao`, `/qldn-ct`. Chúng chỉ nên là nhóm menu. Nếu muốn chúng có trang tổng quan, phải xây route rõ ràng.
2. **Route duyệt phiếu KT bị bọc nhầm ngữ cảnh vật tư:** hiện nằm dưới `ApprovalProvider` import từ `pages/DuyetDeNghiVatTu/ApprovalContext`. Tách nó ra thành route độc lập, chỉ giữ `AccountingApprovalProvider` bên trong `QuanLyDuyetPhieuKT`.
3. **Mã nguồn trùng không được App gọi:** `src/pages/KeToan/{HoaDonBanHang,ChiTietHoaDonBanHang,TaoXuatHoaDon}` là bản trùng với `src/pages/KeToanBanHang/...`; App dùng bản **KeToanBanHang**. Tương tự `KeToanNganHang` chứa các bản phiếu thu/chi, tài khoản, số đợt, báo cáo giống `KeToanTienMat`, trong khi App dùng bản **KeToanTienMat** cho các route tiền mặt. Không copy cả hai trước khi quyết định bản chuẩn, tránh hai nhánh sửa đổi lệch nhau.
4. `QuanLyDuyetPhieuKT` và `QuanLyDuyetDeNghiChiTien` còn có các file `DNVT_*`, `DuyetDeNghiVatTu`, context liên quan đề nghị vật tư. Chúng không phải entry của menu Kế toán hiện tại. Chỉ giữ nếu sản phẩm nhỏ chủ đích bao gồm luồng vật tư; nếu không, loại khỏi dependency graph sau khi tách route duyệt phiếu KT.
5. Cùng một component `QuanLyDeNGhiChiTien` có hai URL (`/quan-ly-de-nghi-chi-tien`, `/qldn-ct/quan-ly-dnpc`). Phải giữ redirect tương thích hoặc chọn một canonical URL, không âm thầm bỏ route cũ.

## Checklist tách sang ứng dụng nhỏ

- [ ] Tạo route độc lập theo toàn bộ bảng trên, bao gồm query `?tab=ktt|ptgd|bgd` và tám route cấp duyệt ĐNCT.
- [ ] Di chuyển/chỉnh `apiServices` và bảo đảm backend hỗ trợ toàn bộ class trong bảng dữ liệu/API.
- [ ] Mang theo hoặc thay bằng API riêng cho toàn bộ dropdown dùng chung.
- [ ] Mang theo `AuthProvider`/quyền và ánh xạ bốn `MODULE_CODE`; kiểm thử Add/Edit/Del cho từng loại chứng từ.
- [ ] Giữ cơ chế UUID tạm và dọn `localStorage`; kiểm thử tạo mới, reload trước khi lưu, hủy và sửa chứng từ.
- [ ] Giữ asset font báo cáo hoặc loại fallback mạng để ứng dụng Electron vẫn xuất báo cáo khi offline.
- [ ] Tách route `/quan-ly-duyet-phieu-kt` khỏi provider vật tư; giữ `ApprovalChiTienLayout` cho toàn bộ route ĐNCT.
- [ ] Chọn một bản chuẩn cho các thư mục trùng, rồi viết test regression CRUD và duyệt trước khi xóa bản còn lại.
- [ ] Kiểm thử phân quyền, truyền record khi sửa hóa đơn/CTNVK, các dropdown và toàn bộ cấp duyệt bằng dữ liệu thật.

## Tệp nguồn đã đối chiếu

- `src/App.jsx`: lazy import nhóm kế toán khoảng dòng 555–636; route duyệt phiếu KT khoảng dòng 940–968; các route kế toán chính khoảng dòng 1407–1484.
- `src/components/Layout/SidebarMenu/SidebarMenu.jsx`: cây menu Kế toán dòng 874–1122; `handleMenuClick` điều hướng mọi key bắt đầu bằng `/` thông qua `addTab`.
- Các thư mục entry đã lần theo: `pages/KeToanTienMat`, `pages/KeToanNganHang`, `pages/KeToanBanHang`, `pages/KeToanCTNVKhac`, `pages/KeToan`, `pages/QuanLyDuyetPhieuKT`, `pages/QuanLyDeNGhiChiTien`, `pages/QuanLyDuyetDeNghiChiTien`.
