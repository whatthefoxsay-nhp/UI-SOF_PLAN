# PMNH Desktop Kho - Ứng dụng Quản lý Kho

Ứng dụng quản lý kho được xây dựng bằng Electron và React, được tách riêng từ hệ thống PMBH.

## 🚀 Tính năng chính

### 📦 Quản lý Kho

- Thêm, sửa, xóa thông tin kho
- Danh sách các kho trong hệ thống
- Chọn kho để quản lý

### 📥 Nhập Kho

- Tạo phiếu nhập kho mới
- Chọn nguyên liệu/sản phẩm nhập
- Nhập từ nhà cung cấp
- Cập nhật số lượng tồn kho

### 📤 Xuất Kho

- Tạo phiếu xuất kho
- Xuất theo yêu cầu
- Theo dõi lý do xuất kho
- Cập nhật số lượng tồn

### 🔍 Kiểm Kho

- Tạo phiếu kiểm kho
- Kiểm tra số lượng thực tế vs hệ thống
- Điều chỉnh chênh lệch
- Lịch sử kiểm kho

### 📊 Báo Cáo

- Báo cáo tồn kho theo thời gian
- Báo cáo nhập xuất
- Báo cáo theo điều kiện tùy chọn
- Export dữ liệu

## 📁 Cấu trúc thư mục

```
PMNH_Desktop_Kho/
├── public/
│   ├── electron.js       # Main process Electron
│   ├── preload.js        # Preload script
│   └── images/           # Hình ảnh tĩnh
├── src/
│   ├── App.jsx           # Main App component với routes
│   ├── pages/            # Các trang chính
│   │   ├── Kho/          # Quản lý kho
│   │   ├── NhapKho/      # Nhập kho
│   │   ├── XuatKho/      # Xuất kho
│   │   ├── KiemKho/      # Kiểm kho
│   │   ├── ChonKhoQuanLy/ # Chọn kho quản lý
│   │   └── BaoCaoTheoDieuKien/ # Báo cáo
│   ├── components/
│   │   ├── Layout/       # Layout & SidebarMenu
│   │   ├── common/       # Components dùng chung
│   │   └── tables/       # Table components
│   ├── services/
│   │   └── apiServices.js # API calls
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   └── utils/            # Utility functions
├── package.json
└── README.md
```

## 🛠️ Cài đặt

### Yêu cầu

- Node.js >= 16
- npm hoặc yarn
- Backend API (pmbh_kho) đang chạy

### Các bước cài đặt

1. **Cài đặt dependencies:**

```bash
cd PMNH_Desktop_Kho
npm install
```

2. **Cấu hình API:**
   Mở file `src/config/config.js` và cập nhật `API_URL`:

```javascript
export const API_URL = "http://localhost/pmbh_kho/services.sof.vn/index.php";
```

3. **Chạy development:**

```bash
npm start
```

4. **Build production:**

```bash
npm run build
npm run electron-pack
```

## 🔧 Scripts

| Command                 | Mô tả                         |
| ----------------------- | ----------------------------- |
| `npm start`             | Chạy React development server |
| `npm run build`         | Build React app               |
| `npm run electron`      | Chạy Electron app             |
| `npm run electron-pack` | Package Electron app          |

## 🔗 API Endpoints

Base URL: `http://localhost/pmbh_kho/services.sof.vn/index.php`

### Kho

- `POST /` - `{table: "Mb_Kho", func: "data"}` - Lấy danh sách kho
- `POST /` - `{table: "Mb_Kho", func: "add"}` - Thêm kho
- `POST /` - `{table: "Mb_Kho", func: "edit"}` - Sửa kho

### Phiếu Nhập

- `POST /` - `{table: "Mb_PhieuNhap", func: "list"}` - Danh sách phiếu nhập
- `POST /` - `{table: "Mb_PhieuNhap", func: "add"}` - Tạo phiếu nhập

### Phiếu Xuất

- `POST /` - `{table: "Mb_PhieuXuat", func: "list"}` - Danh sách phiếu xuất
- `POST /` - `{table: "Mb_PhieuXuat", func: "add"}` - Tạo phiếu xuất

### Kiểm Kho

- `POST /` - `{table: "Mb_KiemKho", func: "list"}` - Danh sách phiếu kiểm
- `POST /` - `{table: "Mb_KiemKho", func: "add"}` - Tạo phiếu kiểm

## 📋 Công nghệ sử dụng

- **Frontend:** React 18, Ant Design 5
- **Desktop:** Electron
- **State Management:** React Context
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Build Tools:** Create React App, electron-builder

## 🔐 Authentication

Ứng dụng sử dụng token-based authentication qua CouchDB:

- Token được lưu trong localStorage
- Header `SOF-User-Token` gửi kèm mỗi request
- Auto logout khi token hết hạn

## 📝 License

Private - Internal use only.
