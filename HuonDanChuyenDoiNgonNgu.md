# BÁO CÁO PHÂN TÍCH & HƯỚNG DẪN TRIỂN KHAI TÍNH NĂNG CHUYỂN ĐỔI NGÔN NGỮ (i18n) CHO HỆ THỐNG SOF_ERP

---

## 1. TỔNG QUAN KIẾN TRÚC ĐA NGÔN NGỮ (i18n ARCHITECTURE)

Hệ thống đa ngôn ngữ cho ứng dụng ERP được xây dựng dựa trên hệ sinh thái **i18next** và **react-i18next** nhằm đảm bảo tính đồng bộ trên toàn bộ giao diện: từ **Sidebar Menu**, **Route Tabs**, **Header**, **Data Tables**, **Form Validations** đến **Toast Messages**.

### Các thành phần cốt lõi:
1. **i18n Core Engine (`src/i18n/index.js`)**: Khởi tạo cấu hình `i18next`, tự động phát hiện ngôn ngữ (`LanguageDetector`), quản lý các bộ tài nguyên từ vựng (`vi.json`, `en.json`).
2. **Dynamic Menu Config (`src/constants/menuConfig.jsx`)**: Xuất hàm `getMenuConfig(t)` nhận vào hàm dịch `t` để sinh ra cây menu động theo ngôn ngữ hiện tại.
3. **Tab Navigation Manager (`src/components/Layout/RouteTabs/RouteTabs.jsx`)**: Quản lý danh sách các tab đang mở (`tabs`), tự động cập nhật tiêu đề tất cả các tab (active & inactive) khi đổi ngôn ngữ.
4. **Theme & Language Switcher (`src/components/Layout/SidebarMenu/SidebarMenu.jsx`)**: Cung cấp UI chuyển đổi ngôn ngữ, gọi `i18n.changeLanguage(lang)` và lưu trạng thái vào `localStorage`.

---

## 2. PHÂN TÍCH SỰ CỐ TIÊU ĐỀ TAB KHÔNG ĐỒNG BỘ & CÁCH XỬ LÝ

### 2.1. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)
Khi triển khai ứng dụng dạng **Multi-Tab Dashboard** (cho phép mở nhiều chức năng dưới dạng tab), vấn đề tiêu đề tab không đổi khi chuyển ngôn ngữ xảy ra do các nguyên nhân sau:

1. **Lưu trữ chuỗi tĩnh trong State/LocalStorage**:
   Khi một tab được mở, thông tin tab bao gồm `{ key, path, label }` được đẩy vào state `tabs` và lưu vào `localStorage`. Giá trị `label` lúc này là một chuỗi tĩnh (Static String) tại thời điểm mở tab.
2. **Cập nhật thiếu phụ thuộc trong `useEffect`**:
   Trước đây, hook `useEffect` theo dõi sự thay đổi của ngôn ngữ (`t` / `menuMetaMap`) nhưng chỉ cập nhật lại `label` cho **duy nhất tab hiện tại đang được kích hoạt (`activeKey`)**:
   ```jsx
   // CODE LỖI CŨ: Chỉ cập nhật tab đang active
   setTabs((currentTabs) => {
     return currentTabs.map((tab) => (tab.key === activeKey ? { ...tab, label } : tab));
   });
   ```
   Do đó, các tab còn lại đang mở (ở trạng thái inactive) giữ nguyên tiêu đề ngôn ngữ cũ cho tới khi người dùng nhấp sang từng tab đó.

### 2.2. Giải pháp kỹ thuật xử lý triệt để (Triển khai trong RouteTabs)

Để khắc phục hoàn toàn vấn đề này, giải pháp 3 lớp được áp dụng:

#### Layer 1: Cập nhật State cho TOÀN BỘ các Tab trong `useEffect`
Mỗi khi ngôn ngữ thay đổi (`t` hoặc `menuMetaMap` thay đổi), `useEffect` sẽ duyệt qua toàn bộ mảng `currentTabs` và gọi lại `getTabLabel(tab.path)` cho từng tab:
```jsx
useEffect(() => {
  setTabs((currentTabs) => {
    // Cập nhật tiêu đề cho TOÀN BỘ các tab đang mở
    const updatedTabs = currentTabs.map((tab) => ({
      ...tab,
      label: getTabLabel(tab.path),
    }));

    const exists = updatedTabs.some((tab) => tab.key === activeKey);
    if (exists) {
      return updatedTabs;
    }

    const activeTabLabel = getTabLabel(activePath);
    const nextTab = {
      key: activeKey,
      path: activePath,
      search: location.search || "",
      label: activeTabLabel,
      closable: activePath !== "/tong-quan",
    };
    return [...updatedTabs, nextTab];
  });
}, [activeKey, activePath, location.search, menuMetaMap, dynamicRouteLabels]);
```

#### Layer 2: Render trực tiếp với Dynamic Fallback trên UI
Để giao diện không bị giật lag và cập nhật ngay lập tức ở render frame đầu tiên khi thay đổi ngôn ngữ:
```jsx
{tabs.map((tab) => {
  const active = tab.key === activeKey;
  // Luôn lấy tiêu đề mới nhất từ hàm getTabLabel
  const label = getTabLabel(tab.path) || tab.label;

  return (
    <button key={tab.key} title={label}>
      <span className="route-tab-title">{label}</span>
    </button>
  );
})}
```

#### Layer 3: Đa ngôn ngữ hóa Tuyến đường Động (Dynamic Routes) & Menu ngữ cảnh
Các tuyến đường chứa thông số (ví dụ: `/tickets/:id`, `/customers/:id`) và các nút thao tác (chuột phải đóng tab) được bọc trong `useMemo` phụ thuộc vào `t`:
```jsx
const dynamicRouteLabels = useMemo(
  () => [
    { pattern: "/tickets/:id", label: ({ id }) => `${t("service.detailTitle", "Chi tiết phiếu")} ${id}` },
    { pattern: "/customers/:id", label: ({ id }) => `${t("menu.customer", "Khách hàng")} ${id}` },
    { pattern: "/employees/:id", label: ({ id }) => `${t("menu.employee", "Nhân viên")} ${id}` },
  ],
  [t]
);
```

---

## 3. HƯỚNG DẪN TRIỂN KHAI CHO HỆ THỐNG ERP (`SOF_ERP`)

### Bước 1: Khởi tạo Cấu hình `i18n` Engine (`src/i18n/index.js`)

```javascript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import translationVI from "./locales/vi.json";
import translationEN from "./locales/en.json";

const resources = {
  vi: { translation: translationVI },
  en: { translation: translationEN },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "vi",
    supportedLngs: ["vi", "en"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false, // React đã tự chống XSS
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "erp_language",
      caches: ["localStorage"],
    },
  });

export default i18n;
```

---

### Bước 2: Chuẩn hóa File Từ điển JSON (`vi.json` & `en.json`)

Phân chia từ điển theo nhóm chức năng mô-đun ERP rõ ràng:

**`src/i18n/locales/vi.json`**:
```json
{
  "common": {
    "save": "Lưu",
    "cancel": "Hủy",
    "delete": "Xóa",
    "edit": "Sửa",
    "closeThisTab": "Đóng tab này",
    "closeAllTabs": "Đóng tất cả tab",
    "closeTab": "Đóng tab"
  },
  "menu": {
    "dashboard": "Tổng quan",
    "company": "Công ty",
    "department": "Phòng ban",
    "employee": "Nhân viên",
    "sales": "Kinh doanh",
    "warehouse": "Quản lý Kho",
    "accounting": "Kế toán"
  }
}
```

**`src/i18n/locales/en.json`**:
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "closeThisTab": "Close this tab",
    "closeAllTabs": "Close all tabs",
    "closeTab": "Close tab"
  },
  "menu": {
    "dashboard": "Dashboard",
    "company": "Company",
    "department": "Department",
    "employee": "Employees",
    "sales": "Sales",
    "warehouse": "Warehouse",
    "accounting": "Accounting"
  }
}
```

---

### Bước 3: Cấu hình Menu Động (`src/constants/menuConfig.js`)

```jsx
import React from "react";
import { LayoutDashboard, Building, Users, ShoppingCart } from "lucide-react";

export const getMenuConfig = (t) => [
  {
    key: "/tong-quan",
    icon: <LayoutDashboard size={16} />,
    label: t("menu.dashboard", "Tổng quan"),
  },
  {
    key: "quan-tri",
    icon: <Building size={16} />,
    label: t("menu.company", "Công ty"),
    children: [
      { key: "/phong-ban", label: t("menu.department", "Phòng ban") },
      { key: "/nhan-vien", label: t("menu.employee", "Nhân viên") },
    ],
  },
  {
    key: "/ban-hang",
    icon: <ShoppingCart size={16} />,
    label: t("menu.sales", "Bán hàng"),
  },
];
```

---

### Bước 4: Xử lý Chuyển đổi Ngôn ngữ tại Sidebar (`SidebarMenu.jsx`)

```jsx
import React from "react";
import { Select } from "antd";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("erp_language", lang);
  };

  return (
    <Select
      value={i18n.language?.startsWith("en") ? "en" : "vi"}
      onChange={handleLanguageChange}
      options={[
        { value: "vi", label: "Tiếng Việt" },
        { value: "en", label: "English" },
      ]}
    />
  );
};
```

---

### Bước 5: Cấu hình RouteTabs Hoàn chỉnh cho Hệ thống ERP (`RouteTabs.jsx`)

```jsx
import React, { useEffect, useMemo, useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getMenuConfig } from "../../constants/menuConfig";

const STORAGE_KEY = "erp-open-tabs";
const DEFAULT_TAB = { key: "/tong-quan", path: "/tong-quan", label: "Tổng quan", closable: false };

const flattenMenuItems = (items = [], result = []) => {
  items.forEach((item) => {
    if (item?.key?.startsWith?.("/")) {
      result.push({ key: item.key, label: item.label });
    }
    if (item?.children?.length) {
      flattenMenuItems(item.children, result);
    }
  });
  return result;
};

const normalizePath = (pathname) => (pathname === "/" ? "/tong-quan" : pathname);

const readStoredTabs = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.length ? parsed : [DEFAULT_TAB];
  } catch {
    return [DEFAULT_TAB];
  }
};

const RouteTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tabs, setTabs] = useState(() => readStoredTabs());

  // 1. Map lưu cấu hình menu động theo ngôn ngữ hiện tại
  const menuMetaMap = useMemo(() => {
    const map = new Map();
    flattenMenuItems(getMenuConfig(t)).forEach((item) => map.set(item.key, item));
    return map;
  }, [t]);

  // 2. Nhãn cho các tuyến đường động có tham số
  const dynamicRouteLabels = useMemo(
    () => [
      { pattern: "/nhan-vien/:id", label: ({ id }) => `${t("menu.employee", "Nhân viên")} #${id}` },
    ],
    [t]
  );

  // 3. Hàm tính tiêu đề tab từ đường dẫn
  const getTabLabel = (pathname) => {
    const normalizedPath = normalizePath(pathname);
    const menuItem = menuMetaMap.get(normalizedPath);
    if (menuItem) return menuItem.label;

    for (const route of dynamicRouteLabels) {
      const match = matchPath({ path: route.pattern, end: true }, normalizedPath);
      if (match) return route.label(match.params);
    }

    return normalizedPath.split("/").filter(Boolean).join(" / ") || t("menu.dashboard", "Tổng quan");
  };

  const activePath = normalizePath(location.pathname);
  const activeKey = `${activePath}${location.search || ""}`;

  // 4. Effect tự động cập nhật tiêu đề cho CẢ TAB ACTIVE LẪN INACTIVE khi đổi ngôn ngữ
  useEffect(() => {
    setTabs((currentTabs) => {
      const updatedTabs = currentTabs.map((tab) => ({
        ...tab,
        label: getTabLabel(tab.path),
      }));

      const exists = updatedTabs.some((tab) => tab.key === activeKey);
      if (exists) return updatedTabs;

      const activeTabLabel = getTabLabel(activePath);
      const nextTab = {
        key: activeKey,
        path: activePath,
        search: location.search || "",
        label: activeTabLabel,
        closable: activePath !== "/tong-quan",
      };
      return [...updatedTabs, nextTab];
    });
  }, [activeKey, activePath, location.search, menuMetaMap, dynamicRouteLabels]);

  // 5. Đồng bộ vào LocalStorage
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  return (
    <div className="route-tabs">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const displayLabel = getTabLabel(tab.path) || tab.label;

        return (
          <button
            key={tab.key}
            className={`tab-item ${active ? "active" : ""}`}
            onClick={() => navigate(`${tab.path}${tab.search || ""}`)}
          >
            <span>{displayLabel}</span>
          </button>
        );
      })}
    </div>
  );
};

export default RouteTabs;
```

---

## 4. NGUYÊN TẮC VÀ BEST PRACTICES CHO HỆ THỐNG ERP CHUYÊN NGHIỆP

1. **Cột Bảng Dữ liệu (Ant Design Table Columns / TanStack Table)**:
   Không định nghĩa cột tĩnh bên ngoài component. Luôn bọc danh sách cột trong `useMemo(() => [...], [t])` để tiêu đề cột tự động cập nhật khi đổi ngôn ngữ.
2. **Thông báo hệ thống (Toast Messages / Notifications)**:
   Sử dụng `t("messages.success")` trong các hàm xử lý API thay vì hardcode chuỗi thông báo.
3. **Biểu mẫu & Validation (Form Validation Rules)**:
   Sử dụng hàm dịch trong quy tắc kiểm tra dữ liệu: `rules={[{ required: true, message: t("validation.required") }]}`.
4. **Hiệu năng (Performance)**:
   Luôn bọc hàm sinh menu và danh sách route động trong `useMemo` phụ thuộc vào `t` để tránh tính toán lại không cần thiết trên mỗi re-render.
