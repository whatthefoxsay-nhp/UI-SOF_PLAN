## CẤU TRÚC THƯ MỤC ELECTRON APP:

```
PMBH_Desktop_App/
│
├── public/
│   ├── electron.js                    # Main process Electron
│   ├── index.html
│   └── icon.ico
│
├── src/
│   ├── index.jsx                      # Entry point React
│   ├── App.jsx                        # Main App component
│   ├── AppMain.jsx                    # Main layout
│   │
│   ├── auth/                          # XÁC THỰC & PHÂN QUYỀN
│   │   ├── DangNhap.jsx              # Màn hình đăng nhập
│   │   ├── DangXuat.jsx              # Xử lý đăng xuất
│   │   ├── DoiMatKhau.jsx            # Đổi mật khẩu
│   │   ├── QuenMatKhau.jsx           # Quên mật khẩu
│   │   ├── PhanQuyen.jsx             # Phân quyền người dùng
│   │   └── context/
│   │       ├── AuthContext.jsx        # Context xác thực
│   │       └── AuthProvider.jsx       # Provider xác thực
│   │
│   ├── trangchu/                      # TRANG CHỦ & DASHBOARD
│   │   ├── TrangChu.jsx              # Dashboard chính
│   │   ├── ThongKeTongQuan.jsx       # Thống kê tổng quan
│   │   ├── BieuDoDoanhThu.jsx        # Biểu đồ doanh thu
│   │   ├── ThongBaoHeThong.jsx       # Thông báo hệ thống
│   │   └── TienIch.jsx               # Tiện ích nhanh
│   │
│   ├── banhang/                       # MODULE BÁN HÀNG
│   │   ├── QuanLyBan/                # Quản lý bàn
│   │   │   ├── DanhSachBan.jsx       # Danh sách bàn
│   │   │   ├── TaoBanMoi.jsx         # Tạo bàn mới
│   │   │   ├── SuaBan.jsx            # Sửa thông tin bàn
│   │   │   ├── XoaBan.jsx            # Xóa bàn
│   │   │   ├── TrangThaiBan.jsx      # Trạng thái bàn
│   │   │   └── KhuVucBan.jsx         # Khu vực bàn
│   │   │
│   │   ├── GoiMon/                   # Gọi món
│   │   │   ├── MenuGoiMon.jsx        # Menu gọi món
│   │   │   ├── ChonSanPham.jsx       # Chọn sản phẩm
│   │   │   ├── GioHang.jsx           # Giỏ hàng
│   │   │   ├── GhiChuMon.jsx         # Ghi chú món
│   │   │   ├── KhuyenMai.jsx         # Khuyến mãi
│   │   │   └── TinhTien.jsx          # Tính tiền
│   │   │
│   │   ├── ThanhToan/                # Thanh toán
│   │   │   ├── ManHinhThanhToan.jsx  # Màn hình thanh toán
│   │   │   ├── PhuongThucThanhToan.jsx # Phương thức thanh toán
│   │   │   ├── TienMat.jsx           # Thanh toán tiền mặt
│   │   │   ├── ChuyenKhoan.jsx       # Thanh toán chuyển khoản
│   │   │   ├── TheNganHang.jsx       # Thanh toán thẻ
│   │   │   ├── InHoaDon.jsx          # In hóa đơn
│   │   │   ├── GuiEmail.jsx          # Gửi hóa đơn email
│   │   │   └── TraLai.jsx            # Tính tiền thừa trả lại
│   │   │
│   │   ├── QuanLyHoaDon/             # Quản lý hóa đơn
│   │   │   ├── DanhSachHoaDon.jsx    # Danh sách hóa đơn
│   │   │   ├── ChiTietHoaDon.jsx     # Chi tiết hóa đơn
│   │   │   ├── TimKiemHoaDon.jsx     # Tìm kiếm hóa đơn
│   │   │   ├── SuaHoaDon.jsx         # Sửa hóa đơn
│   │   │   ├── HuyHoaDon.jsx         # Hủy hóa đơn
│   │   │   ├── TachBan.jsx           # Tách bàn
│   │   │   ├── ChuyenBan.jsx         # Chuyển bàn
│   │   │   └── GopBan.jsx            # Gộp bàn
│   │   │
│   │   └── TienIchBanHang/           # Tiện ích bán hàng
│   │       ├── MaVach.jsx            # Quét mã vạch
│   │       ├── TinhTienNhanh.jsx     # Tính tiền nhanh
│   │       ├── LichSuGiaoDich.jsx    # Lịch sử giao dịch
│   │       └── BanTamTinh.jsx        # Bàn tạm tính
│   │
│   ├── sanpham/                       # MODULE SẢN PHẨM
│   │   ├── QuanLySanPham/            # Quản lý sản phẩm
│   │   │   ├── DanhSachSanPham.jsx   # Danh sách sản phẩm
│   │   │   ├── ThemSanPham.jsx       # Thêm sản phẩm mới
│   │   │   ├── SuaSanPham.jsx        # Sửa sản phẩm
│   │   │   ├── XoaSanPham.jsx        # Xóa sản phẩm
│   │   │   ├── TimKiemSanPham.jsx    # Tìm kiếm sản phẩm
│   │   │   ├── AnhSanPham.jsx        # Ảnh sản phẩm
│   │   │   └── MaVachSanPham.jsx     # Mã vạch sản phẩm
│   │   │
│   │   ├── DanhMuc/                  # Danh mục sản phẩm
│   │   │   ├── DanhSachDanhMuc.jsx   # Danh sách danh mục
│   │   │   ├── ThemDanhMuc.jsx       # Thêm danh mục
│   │   │   ├── SuaDanhMuc.jsx        # Sửa danh mục
│   │   │   ├── XoaDanhMuc.jsx        # Xóa danh mục
│   │   │   └── SapXepDanhMuc.jsx     # Sắp xếp danh mục
│   │   │
│   │   ├── KhoHang/                  # Kho hàng
│   │   │   ├── TonKho.jsx            # Tồn kho
│   │   │   ├── NhapKho.jsx           # Nhập kho
│   │   │   ├── XuatKho.jsx           # Xuất kho
│   │   │   ├── KiemKeKho.jsx         # Kiểm kê kho
│   │   │   ├── LichSuNhapXuat.jsx    # Lịch sử nhập xuất
│   │   │   └── CanhBaoTonKho.jsx     # Cảnh báo tồn kho
│   │   │
│   │   ├── GiaBan/                   # Giá bán
│   │   │   ├── QuanLyGia.jsx         # Quản lý giá
│   │   │   ├── BangGia.jsx           # Bảng giá
│   │   │   ├── KhuyenMai.jsx         # Khuyến mãi
│   │   │   ├── GiaTheoKhachHang.jsx  # Giá theo khách hàng
│   │   │   └── GiaTheoThoiGian.jsx   # Giá theo thời gian
│   │   │
│   │   └── NguyenLieu/               # Nguyên liệu
│   │       ├── DanhSachNguyenLieu.jsx # Danh sách nguyên liệu
│   │       ├── CongThucPhaChe.jsx     # Công thức pha chế
│   │       ├── TinhToanNguyenLieu.jsx # Tính toán nguyên liệu
│   │       └── BaoCaoNguyenLieu.jsx   # Báo cáo nguyên liệu
│   │
│   ├── khachhang/                     # MODULE KHÁCH HÀNG
│   │   ├── QuanLyKhachHang/          # Quản lý khách hàng
│   │   │   ├── DanhSachKhachHang.jsx # Danh sách khách hàng
│   │   │   ├── ThemKhachHang.jsx     # Thêm khách hàng
│   │   │   ├── SuaKhachHang.jsx      # Sửa khách hàng
│   │   │   ├── XoaKhachHang.jsx      # Xóa khách hàng
│   │   │   ├── TimKiemKhachHang.jsx  # Tìm kiếm khách hàng
│   │   │   └── LichSuMuaHang.jsx     # Lịch sử mua hàng
│   │   │
│   │   ├── TheThanhVien/             # Thẻ thành viên
│   │   │   ├── QuanLyTheTV.jsx       # Quản lý thẻ thành viên
│   │   │   ├── CapTheTV.jsx          # Cấp thẻ thành viên
│   │   │   ├── NapTienThe.jsx        # Nạp tiền thẻ
│   │   │   ├── LichSuGiaoDichThe.jsx # Lịch sử giao dịch thẻ
│   │   │   └── BaoCaoTheTV.jsx       # Báo cáo thẻ thành viên
│   │   │
│   │   ├── ChuongTrinhKhuyenMai/     # Chương trình khuyến mãi
│   │   │   ├── QuanLyKhuyenMai.jsx   # Quản lý khuyến mãi
│   │   │   ├── TaoKhuyenMai.jsx      # Tạo khuyến mãi
│   │   │   ├── SuaKhuyenMai.jsx      # Sửa khuyến mãi
│   │   │   ├── ApDungKhuyenMai.jsx   # Áp dụng khuyến mãi
│   │   │   └── BaoCaoKhuyenMai.jsx   # Báo cáo khuyến mãi
│   │   │
│   │   └── TichDiem/                 # Tích điểm
│   │       ├── QuanLyTichDiem.jsx    # Quản lý tích điểm
│   │       ├── QuyDoiDiem.jsx        # Quy đổi điểm
│   │       ├── LichSuTichDiem.jsx    # Lịch sử tích điểm
│   │       └── BaoCaoTichDiem.jsx    # Báo cáo tích điểm
│   ├── favicon.ico                     # Icon ứng dụng
│   └── logo.png                        # Logo quán café
│
├── 📁 src/                             # Mã nguồn chính
│   ├── 📁 auth/                        # Xác thực và đăng nhập
│   │   ├── DangNhap.jsx               ✅ # Trang đăng nhập
│   │   └── index.js                    # Export module auth
│   │
│   ├── 📁 trangchu/                    # Trang chủ & Dashboard
│   │   ├── TrangChuChinh.jsx          ✅ # Dashboard chính
│   │   └── index.js                    # Export module trangchu
│   │
│   ├── 📁 banhang/                     # Quản lý bán hàng
│   │   ├── BanHang.jsx                ✅ # Giao diện POS bán hàng
│   │   ├── GioHang.jsx                 # Component giỏ hàng
│   │   ├── ThanhToan.jsx               # Xử lý thanh toán
│   │   └── index.js                    # Export module banhang
│   │
│   ├── 📁 sanpham/                     # Quản lý sản phẩm
│   │   ├── QuanLySanPham.jsx          ✅ # Danh sách & CRUD sản phẩm
│   │   ├── ThemSanPham.jsx             # Form thêm sản phẩm
│   │   ├── DanhMucSanPham.jsx          # Quản lý danh mục
│   │   └── index.js                    # Export module sanpham
│   │
│   ├── 📁 ban/                         # Quản lý bàn
│   │   ├── QuanLyBan.jsx              ✅ # Sơ đồ & trạng thái bàn
│   │   ├── DatBan.jsx                  # Đặt bàn trước
│   │   └── index.js                    # Export module ban
│   │
│   ├── 📁 khachhang/                   # Quản lý khách hàng
│   │   ├── QuanLyKhachHang.jsx        ✅ # CRM khách hàng
│   │   ├── ThemKhachHang.jsx           # Form thêm khách hàng
│   │   ├── LichSuMuaHang.jsx           # Lịch sử giao dịch
│   │   └── index.js                    # Export module khachhang
│   │
│   ├── 📁 nhanvien/                    # Quản lý nhân viên
│   │   ├── QuanLyNhanVien.jsx         ✅ # CRUD nhân viên
│   │   ├── ChamCong.jsx                # Chấm công
│   │   ├── TinhLuong.jsx               # Tính lương
│   │   └── index.js                    # Export module nhanvien
│   │
│   ├── 📁 baocao/                      # Báo cáo & thống kê
│   │   ├── BaoCaoThongKe.jsx          ✅ # Dashboard thống kê
│   │   ├── BaoCaoDoanhThu.jsx          # Báo cáo doanh thu
│   │   ├── BaoCaoTonKho.jsx            # Báo cáo tồn kho
│   │   ├── BaoCaoKhachHang.jsx         # Thống kê khách hàng
│   │   └── index.js                    # Export module baocao
│   │
│   ├── 📁 caidat/                      # Cài đặt hệ thống
│   │   ├── CaiDatHeThong.jsx          ✅ # Cài đặt tổng quát
│   │   ├── CaiDatIn.jsx                # Cài đặt máy in
│   │   ├── CaiDatKetNoi.jsx            # Cài đặt kết nối
│   │   └── index.js                    # Export module caidat
│   │
│   ├── 📁 components/                  # Components tái sử dụng
│   │   ├── 📁 common/                  # Components chung
│   │   │   ├── Loading.jsx             # Component loading
│   │   │   ├── ConfirmDialog.jsx       # Dialog xác nhận
│   │   │   ├── SearchBox.jsx           # Ô tìm kiếm
│   │   │   └── index.js                # Export components
│   │   │
│   │   ├── 📁 layout/                  # Layout components
│   │   │   ├── Header.jsx              # Header chung
│   │   │   ├── Sidebar.jsx             # Sidebar menu
│   │   │   ├── Footer.jsx              # Footer
│   │   │   └── index.js                # Export layout
│   │   │
│   │   └── 📁 forms/                   # Form components
│   │       ├── ProductForm.jsx         # Form sản phẩm
│   │       ├── CustomerForm.jsx        # Form khách hàng
│   │       ├── EmployeeForm.jsx        # Form nhân viên
│   │       └── index.js                # Export forms
│   │
│   ├── 📁 utils/                       # Tiện ích & helpers
│   │   ├── database.jsx               ✅ # Kết nối SQLite
│   │   ├── helpers.jsx                 # Functions tiện ích
│   │   ├── constants.jsx               # Hằng số ứng dụng
│   │   ├── formatter.jsx               # Format dữ liệu
│   │   └── validation.jsx              # Validation rules
│   │
│   ├── 📁 hooks/                       # Custom React hooks
│   │   ├── useLocalStorage.jsx         # Hook localStorage
│   │   ├── useApi.jsx                  # Hook API calls
│   │   ├── usePagination.jsx           # Hook phân trang
│   │   └── index.js                    # Export hooks
│   │
│   ├── 📁 context/                     # React Context
│   │   ├── AuthContext.jsx             # Context xác thực
│   │   ├── AppContext.jsx              # Context ứng dụng
│   │   └── index.js                    # Export contexts
│   │
│   ├── 📁 assets/                      # Tài nguyên tĩnh
│   │   ├── 📁 images/                  # Hình ảnh
│   │   │   ├── logo.png                # Logo chính
│   │   │   ├── default-product.png     # Ảnh sản phẩm mặc định
│   │   │   └── background.jpg          # Ảnh nền
│   │   │
│   │   ├── 📁 icons/                   # Icons
│   │   │   ├── coffee.svg              # Icon cà phê
│   │   │   ├── table.svg               # Icon bàn
│   │   │   └── customer.svg            # Icon khách hàng
│   │   │
│   │   └── 📁 styles/                  # Stylesheet
│   │       ├── global.css              # Style toàn cục
│   │       ├── variables.css           # CSS variables
│   │       └── components.css          # Style components
│   │
│   ├── 📁 data/                        # Dữ liệu mẫu
│   │   ├── mockData.jsx                # Dữ liệu demo
│   │   ├── sampleProducts.jsx          # Sản phẩm mẫu
│   │   └── sampleCustomers.jsx         # Khách hàng mẫu
│   │
│   ├── AppMain.jsx                    ✅ # Component App chính
│   ├── index.jsx                       # Entry point React
│   └── setupTests.js                   # Cấu hình test
│
├── 📁 electron/                        # Electron main process
│   ├── main.js                         # Main process chính
│   ├── preload.js                      # Preload script
│   ├── menu.js                         # Application menu
│   └── 📁 modules/                     # Electron modules
│       ├── windowManager.js            # Quản lý cửa sổ
│       ├── fileManager.js              # Quản lý file
│       └── printManager.js             # Quản lý in ấn
│
├── 📁 database/                        # Cơ sở dữ liệu
│   ├── cafe_pos.db                     # SQLite database
│   ├── schema.sql                      # Database schema
│   ├── seeds.sql                       # Dữ liệu khởi tạo
│   └── backup/                         # Thư mục backup
│       └── backup_YYYYMMDD.db          # File backup theo ngày
│
├── 📁 logs/                           # Logs hệ thống
│   ├── app.log                         # Log ứng dụng
│   ├── error.log                       # Log lỗi
│   └── sales.log                       # Log bán hàng
│
├── 📁 temp/                           # Thư mục tạm
│   ├── exports/                        # Export files
│   └── uploads/                        # Upload files
│
├── 📁 config/                         # Cấu hình
│   ├── app.config.js                   # Cấu hình ứng dụng
│   ├── database.config.js              # Cấu hình database
│   └── print.config.js                 # Cấu hình in ấn
│
├── 📁 tests/                          # Unit tests
│   ├── 📁 components/                  # Test components
│   ├── 📁 utils/                       # Test utilities
│   └── setupTests.js                   # Test setup
│
├── package.json                        # Dependencies
├── electron-builder.json              # Electron builder config
├── tsconfig.json                       # TypeScript config
├── README.md                           # Tài liệu dự án
├── .gitignore                          # Git ignore
└── CayThuMucChiTiet.md                ✅ # File này
```

