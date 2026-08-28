# 🎨 HƯỚNG DẪN SỬ DỤNG CSS SYSTEM

## 📖 TỔNG QUAN

Hệ thống CSS này được thiết kế theo nguyên tắc **"CSS tập thể"** - nghĩa là khi bạn thay đổi một biến CSS ở file `variables.css`, tất cả các component trong toàn ứng dụng sẽ được cập nhật tự động.

## 🚀 CÁCH SỬ DỤNG

### 1. **Import CSS chính vào ứng dụng**

```javascript
// Trong App.jsx hoặc main.jsx
import './styles/main.css';
```

### 2. **Sử dụng CSS Classes có sẵn**

```jsx
// Buttons
<button className="btn btn-primary btn-lg">Đăng nhập</button>
<button className="btn btn-outline-danger btn-sm">Hủy</button>

// Cards
<div className="card card--elevated">
  <div className="card-header">
    <h3 className="card-title">Tiêu đề</h3>
  </div>
  <div className="card-body">
    <p className="card-text">Nội dung card</p>
  </div>
</div>

// Forms
<div className="form-group">
  <label className="form-label">Tên đăng nhập</label>
  <input className="form-input" type="text" placeholder="Nhập tên..." />
</div>

// Tables
<table className="table table--striped">
  <thead>
    <tr>
      <th>Tên sản phẩm</th>
      <th className="table-col--currency">Giá</th>
    </tr>
  </thead>
</table>
```

### 3. **Sử dụng CSS Variables**

```css
/* Trong custom CSS của bạn */
.my-custom-component {
  background-color: var(--color-primary);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-base);
  font-size: var(--font-size-lg);
}

.my-price-display {
  font-family: var(--font-family-mono);
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}
```

## 🎨 BIẾN CSS QUAN TRỌNG

### **Colors (Màu sắc)**
```css
var(--color-primary)        /* Màu chính */
var(--color-secondary)      /* Màu phụ */
var(--color-success)        /* Xanh lá - thành công */
var(--color-warning)        /* Vàng - cảnh báo */
var(--color-danger)         /* Đỏ - nguy hiểm */
var(--color-info)           /* Xanh dương - thông tin */
```

### **Spacing (Khoảng cách)**
```css
var(--space-1)    /* 4px */
var(--space-2)    /* 8px */
var(--space-3)    /* 12px */
var(--space-4)    /* 16px */
var(--space-6)    /* 24px */
var(--space-8)    /* 32px */
```

### **Font Sizes (Cỡ chữ)**
```css
var(--font-size-xs)    /* 12px */
var(--font-size-sm)    /* 14px */
var(--font-size-base)  /* 16px */
var(--font-size-lg)    /* 18px */
var(--font-size-xl)    /* 20px */
var(--font-size-2xl)   /* 24px */
```

### **Border Radius (Bo góc)**
```css
var(--radius-sm)     /* 4px */
var(--radius-base)   /* 8px */
var(--radius-lg)     /* 12px */
var(--radius-xl)     /* 16px */
var(--radius-full)   /* 9999px - tròn hoàn toàn */
```

### **Shadows (Đổ bóng)**
```css
var(--shadow-sm)     /* Bóng nhỏ */
var(--shadow-base)   /* Bóng cơ bản */
var(--shadow-lg)     /* Bóng lớn */
var(--shadow-xl)     /* Bóng rất lớn */
```

## 🎯 CLASSES CHO CAFE POS

### **Bàn (Tables)**
```jsx
<div className="ban-item ban-item--trong">
  <div className="ban-so">05</div>
  <div className="ban-trang-thai">Trống</div>
</div>

<div className="ban-item ban-item--co-khach">
  <div className="ban-so">12</div>
  <div className="ban-trang-thai">Có khách</div>
  <div className="ban-thoi-gian">14:30</div>
</div>
```

### **Sản phẩm (Products)**
```jsx
<div className="san-pham-card">
  <img className="san-pham-hinh" src="..." alt="..." />
  <div className="san-pham-thong-tin">
    <h4 className="san-pham-ten">Cà phê đen</h4>
    <div className="san-pham-gia">25,000đ</div>
  </div>
</div>
```

### **Giỏ hàng (Cart)**
```jsx
<div className="gio-hang-item">
  <img className="gio-hang-item-hinh" src="..." />
  <div className="gio-hang-item-info">
    <div className="gio-hang-item-ten">Cà phê sữa</div>
    <div className="gio-hang-item-gia">30,000đ</div>
  </div>
  <div className="gio-hang-item-controls">
    <div className="gio-hang-item-so-luong">
      <button className="gio-hang-item-btn">-</button>
      <input className="gio-hang-item-input" value="2" />
      <button className="gio-hang-item-btn">+</button>
    </div>
  </div>
</div>
```

### **Form thanh toán**
```jsx
<div className="thanh-toan-container">
  <div className="phuong-thuc-thanh-toan">
    <div className="phuong-thuc-item phuong-thuc-item--active">
      <div className="phuong-thuc-icon">💰</div>
      <div className="phuong-thuc-ten">Tiền mặt</div>
    </div>
    <div className="phuong-thuc-item">
      <div className="phuong-thuc-icon">💳</div>
      <div className="phuong-thuc-ten">Thẻ</div>
    </div>
  </div>
</div>
```

## 🔧 TÙY CHỈNH THEME

### **Thay đổi màu sắc chính**
```css
/* Sửa trong variables.css */
:root {
  --color-primary: #8B4513;      /* Màu nâu cafe */
  --color-primary-light: #D2B48C; /* Màu nâu nhạt */
  --color-primary-dark: #654321;  /* Màu nâu đậm */
}
```

### **Thay đổi font chữ**
```css
:root {
  --font-family-base: 'Inter', 'Segoe UI', sans-serif;
  --font-family-mono: 'Fira Code', 'Consolas', monospace;
}
```

### **Thay đổi khoảng cách**
```css
:root {
  --space-base: 4px;  /* Thay đổi base unit */
  /* Tất cả spacing sẽ tự động cập nhật */
}
```

## 🎨 LAYOUT SYSTEM

### **Grid System**
```jsx
<div className="grid grid-cols-3 gap-4">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
  <div className="card">Item 3</div>
</div>

<!-- Responsive grid -->
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Content -->
</div>
```

### **Flexbox Utilities**
```jsx
<div className="flex items-center justify-between p-4">
  <h2>Tiêu đề</h2>
  <button className="btn btn-primary">Action</button>
</div>
```

### **Spacing Utilities**
```jsx
<div className="p-4 m-2">         <!-- Padding 16px, Margin 8px -->
<div className="px-6 py-3">       <!-- Horizontal 24px, Vertical 12px -->
<div className="mt-4 mb-2">       <!-- Margin top 16px, bottom 8px -->
```

## 📱 RESPONSIVE DESIGN

### **Breakpoints có sẵn**
```css
/* Mobile first approach */
.my-class {
  /* Mobile styles */
}

@media (min-width: 768px) {
  .my-class {
    /* Tablet styles */
  }
}

@media (min-width: 1024px) {
  .my-class {
    /* Desktop styles */
  }
}
```

### **Responsive classes**
```jsx
<div className="text-sm md:text-base lg:text-lg">
  <!-- Font size thay đổi theo màn hình -->
</div>

<div className="p-2 md:p-4 lg:p-6">
  <!-- Padding thay đổi theo màn hình -->
</div>
```

## 🚨 LƯU Ý QUAN TRỌNG

### ✅ **NÊN LÀM**
- Sử dụng CSS variables thay vì hard-code values
- Sử dụng classes có sẵn trước khi tạo custom CSS
- Kiểm tra responsive trên nhiều màn hình
- Sử dụng semantic HTML với các class phù hợp

### ❌ **KHÔNG NÊN LÀM**
- Hard-code màu sắc, spacing trong CSS
- Override !important trừ khi thật sự cần thiết
- Tạo custom CSS khi đã có class tương tự
- Ignore responsive design guidelines

## 🔍 DEBUGGING CSS

### **Developer Tools**
```css
/* Add để debug layout */
.debug-border * {
  border: 1px solid red !important;
}

/* Add để debug spacing */
.debug-spacing * {
  background-color: rgba(255, 0, 0, 0.1) !important;
}
```

### **CSS Custom Properties Inspector**
```javascript
// Xem tất cả CSS variables trong console
const root = document.documentElement;
const styles = getComputedStyle(root);
console.log('--color-primary:', styles.getPropertyValue('--color-primary'));
```

## 📚 TÀI LIỆU THAM KHẢO

- [CSS Custom Properties (Variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [CSS Grid Layout](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [BEM Methodology](http://getbem.com/)

---

**Chúc bạn code CSS vui vẻ! 🎨✨**
