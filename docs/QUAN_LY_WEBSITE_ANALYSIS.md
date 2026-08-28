# Phan tich module Quan ly Website

Nguon yeu cau: `C:\Users\Theanh\Downloads\BaoCaoCongViec\Prompt_Module_Quan_Ly_Website.docx`.

## Muc tieu

Xay dung lai module `Quan ly Website` tu he thong cu `soferp/soft` sang frontend client-side tai:

`C:\Users\Theanh\SOF\QLNS\PMQL_Desktop_ERP`

Nghiep vu, quyen, them/sua/xoa/duyet va thao tac co so du lieu phai ke thua tu DAO cu trong:

`C:\laragon\www\v2.des.erp.banhangonline.top\clsall`

Frontend goi backend qua `lv_LoadDataAPI` trong:

`C:\Users\Theanh\SOF\QLNS\PMQL_Desktop_ERP\src\services\apiServices.js`

Backend trung gian la:

`C:\laragon\www\v2.des.erp.banhangonline.top\services.sof.vn\index.php`

## Pham vi menu cu

Menu module `Quan ly Website` trong DOCX gom cac man:

| Menu | Link cu | DAO/thu muc cu | Trang thai frontend moi |
| --- | --- | --- | --- |
| Quan ly noi dung | `wb_lv0001/wb_lv0001.php` | `wb_lv0001` | Da co `QuanLyNoiDung` |
| Noi dung chi tiet | `wb_lv0002/wb_lv0002.php` | `wb_lv0002` | Da co `NoiDungChiTiet` |
| Quan ly banner | `wb_lv0031/wb_lv0031.php` | `wb_lv0031` | Da co `QuanLyBanner` |
| Quan ly video | `wb_lv0501/wb_lv0501.php` | `wb_lv0501` | Da co `QuanLyVideo` |
| Nhom loai san pham | `wb_lv0004/wb_lv0004.php` | `wb_lv0004` | Da co `NhomLoaiSanPham` |
| Loai san pham | `wb_lv0005/wb_lv0005.php` | `wb_lv0005` | Da co `LoaiSanPham` |
| Quan ly san pham | `wb_lv0006/wb_lv0006.php` | `wb_lv0006` | Chua thay route/frontend trong module moi |
| Chi tiet san pham | `wb_lv0007/wb_lv0007.php` | `wb_lv0007` | Chua thay route/frontend trong module moi |
| Quan ly gia theo chi nhanh | `wb_lv0301/wb_lv0301.php` | `wb_lv0301` | Chua thay route/frontend trong module moi |
| Quan ly menu | `wb_lv0008/wb_lv0008.php` | `wb_lv0008` | Chua thay route/frontend trong module moi |
| Quan ly menu cap 2 | `wb_lv0009/wb_lv0009.php` | `wb_lv0009` | Chua thay route/frontend trong module moi |
| Quan ly menu cap 3 | `wb_lv0010/wb_lv0010.php` | `wb_lv0010` | Chua thay route/frontend trong module moi |
| Quan ly tien te | `wb_lv0011/wb_lv0011.php` | `wb_lv0011` | Backend dang co `hr_lv0018`, can chot dung bang |
| Quan ly tin tuc | `wb_lv0012/wb_lv0012.php` | `wb_lv0012` | Chua thay route/frontend trong module moi |
| Chi tiet tin tuc | `wb_lv0013/wb_lv0013.php` | `wb_lv0013` | Chua thay route/frontend trong module moi |
| Nha cung cap | `wb_lv0014/wb_lv0014.php` | `wb_lv0014` | Chua thay route/frontend trong module moi |
| Quan ly don hang | `wb_lv0016/wb_lv0016.php` | `wb_lv0016` | Backend co case CRUD chung |
| Chi tiet don hang | `wb_lv0017/wb_lv0017.php` | `wb_lv0017` | Chua thay route/frontend trong module moi |
| Ngon ngu | `wb_lv0018/wb_lv0018.php` | `wb_lv0018` | Chua thay route/frontend trong module moi |
| Trang thai giao dich | `wb_lv0019/wb_lv0019.php` | `wb_lv0019` | Chua thay route/frontend trong module moi |
| Danh sach hinh anh | `wb_lv0021/wb_lv0021.php` | `wb_lv0021` | Chua thay route/frontend trong module moi |
| Quan ly hoi dap | `wb_lv0099/wb_lv0099.php` | `wb_lv0099` | Chua thay route/frontend trong module moi |
| Quan ly cau hinh | `wb_lv0302/wb_lv0302.php` | `wb_lv0302` | Chua thay route/frontend trong module moi |

DOCX co mot so link rong: `wb_lv0022`, `wb_lv0015`, `wb_lv0026`. Nen bo qua hoac an khoi menu moi neu chua co ten chuc nang ro rang.

## Tinh trang backend moi

Da thay case chuyen biet trong `services.sof.vn/index.php`:

| Backend case | Ghi chu |
| --- | --- |
| `wb_lv0001` | Quan ly noi dung |
| `wb_lv0002` | Noi dung chi tiet |
| `wb_lv0031` | Quan ly banner |
| `wb_lv0501` | Quan ly video |
| `wb_lv0004` | Nhom loai san pham |
| `wb_lv0005` | Loai san pham |
| `wb_lv0016` | Di qua case CRUD chung |
| `hr_lv0018` | Dang dung cho Tien te chung he thong, can xac nhan co thay `wb_lv0011` hay khong |

Chua thay case rieng cho nhieu DAO con lai: `wb_lv0006`, `wb_lv0007`, `wb_lv0008`, `wb_lv0009`, `wb_lv0010`, `wb_lv0011`, `wb_lv0012`, `wb_lv0013`, `wb_lv0014`, `wb_lv0017`, `wb_lv0018`, `wb_lv0019`, `wb_lv0021`, `wb_lv0099`, `wb_lv0301`, `wb_lv0302`.

Ket luan: neu chi tao frontend cho tat ca man con lai ngay bay gio, nhieu man se goi API khong ton tai hoac khong dung ham. Can bo sung backend mapping toi DAO truoc, hoac thong nhat dung mot endpoint CRUD generic cho cac DAO `wb_lv...`.

## De xuat route frontend

Nen giu route tieng Viet khong dau, theo pattern hien co:

| Component | Route |
| --- | --- |
| `QuanLySanPhamWebsite` | `/quan-ly-san-pham-website` |
| `ChiTietSanPhamWebsite` | `/chi-tiet-san-pham-website` |
| `QuanLyGiaTheoChiNhanh` | `/quan-ly-gia-theo-chi-nhanh` |
| `QuanLyMenuWebsite` | `/quan-ly-menu-website` |
| `QuanLyMenuCap2` | `/quan-ly-menu-cap-2` |
| `QuanLyMenuCap3` | `/quan-ly-menu-cap-3` |
| `QuanLyTienTeWebsite` | `/quan-ly-tien-te-website` |
| `QuanLyTinTuc` | `/quan-ly-tin-tuc` |
| `ChiTietTinTuc` | `/chi-tiet-tin-tuc` |
| `NhaCungCapWebsite` | `/nha-cung-cap-website` |
| `QuanLyDonHangWebsite` | `/quan-ly-don-hang-website` |
| `ChiTietDonHangWebsite` | `/chi-tiet-don-hang-website` |
| `NgonNguWebsite` | `/ngon-ngu-website` |
| `TrangThaiGiaoDich` | `/trang-thai-giao-dich` |
| `DanhSachHinhAnh` | `/danh-sach-hinh-anh` |
| `QuanLyHoiDap` | `/quan-ly-hoi-dap` |
| `QuanLyCauHinhWebsite` | `/quan-ly-cau-hinh-website` |

Can khai bao lazy import trong `App.jsx`, them route trong block route chinh, va them item/subitem trong `SidebarMenu.jsx` tai nhom `Quan ly Website`.

## Huong trien khai de giam lap code

1. Tao mot component generic `WebsiteCrudPage.jsx` dung Ant Design:
   - load data qua `lv_LoadDataAPI(table, loadFunc, params)`
   - tim kiem client-side hoac server-side neu backend ho tro `searchText`
   - them/sua/xoa mot ban ghi
   - bulk delete neu backend ho tro
   - form render theo config field
   - table render theo config column
2. Tao file config `websiteModuleConfigs.js`:
   - mapping title, table, load/add/edit/delete func, fields, columns, route
   - bat dau voi cac bang co DAO don gian: menu, ngon ngu, trang thai, cau hinh, hoi dap
3. Voi cac man phuc tap:
   - San pham, chi tiet san pham, gia theo chi nhanh, don hang, chi tiet don hang, tin tuc, chi tiet tin tuc can tach component rieng neu co upload anh, editor noi dung, quan he master-detail, duyet/trang thai.
4. Backend:
   - bo sung case API cho tung `wb_lv...` con thieu hoac them mot case CRUD generic an toan cho danh sach cho phep.
   - khong cho frontend truyen table tuy y ngoai allowlist.
5. UTF-8:
   - file moi luu UTF-8.
   - khong sua mojibake hang loat trong file cu neu khong nam trong pham vi chinh, tranh diff lon.

## Cau hoi can lam ro truoc khi trien khai het

1. Pham vi dot nay co yeu cau lam tat ca 17 man con lai cung luc, hay uu tien nhom nao truoc?
2. Voi `Quan ly tien te`, he thong moi nen dung DAO cu `wb_lv0011` theo menu Website hay dung API chung `hr_lv0018` da co trong backend?
3. Cac link rong trong menu cu (`wb_lv0015`, `wb_lv0022`, `wb_lv0026`) co can khoi tao trang khong, hay bo qua?
4. Co chap nhan tao mot `WebsiteCrudPage` generic cho cac man CRUD don gian, sau do tach rieng man phuc tap khi can nghiep vu dac thu khong?
5. Co cho phep bo sung backend `index.php` cho cac case `wb_lv...` con thieu trong dot nay khong? Neu khong, frontend chi co the route den man nhung API se chua hoat dong day du.

## De xuat thu tu lam

1. Chot cau hoi tren.
2. Bo sung backend allowlist CRUD cho cac `wb_lv...` con thieu co DAO don gian.
3. Tao `WebsiteCrudPage` va config cho cac man CRUD don gian.
4. Tao component rieng cho nhom phuc tap: san pham, tin tuc, don hang.
5. Gan route trong `App.jsx` va menu trong `SidebarMenu.jsx`.
6. Chay lint/build, sua loi import/UTF-8 neu co.
