import { Card, Menu, Select } from "antd";
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,  Palette,Globe,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./SidebarMenu.css";
import { useTabs } from "../../../contexts/TabContext";
import authLogo from "../../../auth/logo.png";

const { Option } = Select;

const SidebarMenu = ({ isCollapsed = false, onCollapseChange }) => {
  const location = useLocation();
  const { addTab } = useTabs();
  const { t, i18n } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem("system-theme") || "default";
  });
  const [openKeys, setOpenKeys] = useState([]);

  const handleLanguageChange = (value) => {
    i18n.changeLanguage(value);
    localStorage.setItem("sofcare_language", value);
    localStorage.setItem("pmbh_language", value);
    localStorage.setItem("plan_language", value);
  };

  const currentLanguage = i18n.language?.startsWith("en") ? "en" : "vi";

  const menuItems = [
// ===== QUẢN LÝ CÔNG VIỆC =====
    {
      key: "quan-ly-cong-viec-root",
      icon: <Briefcase size={16} />,
      label: "Quản lý công việc",
      children: [
        {
              key: "canh-bao-cong-viec",
              label: "Cảnh báo",
              children: [
                {
                  key: "/canh-bao",
                  label: "Cảnh báo",
                },
                {
                  key: "/xu-ly-canh-bao",
                  label: "Xử lý cảnh báo",
                },
                {
                  key: "/bao-cao-canh-bao-hang-ngay",
                  label: "Báo cáo cảnh báo hàng ngày",
                },
                {
                  key: "/lich-canh-bao-theo-thang",
                  label: "Lịch cảnh báo theo tháng",
                },
              ],
            },
        {
          key: "lap-ke-hoach",
          label: "Lập kế hoạch",
          children: [
            {
              key: "/xem-ke-hoach",
              label: "Xem kế hoạch",
            },
            {
              key: "muc-chung-cong-viec",
              label: "Mục chung công việc",
              children: [
                { key: "/lap-ke-hoach/loai-doi-tuong", label: "Loại đối tượng" },
                { key: "/lap-ke-hoach/loai-cong-viec", label: "Loại công việc" },
                { key: "/lap-ke-hoach/muc-cong-viec-phai-lam", label: "Mục công việc phải làm" },
                { key: "/lap-ke-hoach/diem-kpi", label: "Điểm ± KPI" },
                { key: "/lap-ke-hoach/tien-do-du-an", label: "Tiến độ dự án" },
                { key: "/lap-ke-hoach/trang-thai-du-an", label: "Trạng thái dự án" },
                { key: "/lap-ke-hoach/thuong-hieu", label: "Thương hiệu" },
              ],
            },
            

          ],
        },
        {
          key: "quan-ly-nghi-phep",
          label: "Quản lý nghỉ phép",
          children: [
            {
              key: "/trang-thai-don-xin-phep",
              label: "Trạng thái Đơn xin phép",
            },
            {
              key: "/don-xin-phep",
              label: "Tạo đơn xin phép",
            },
            {
              key: "/tao-don-xin-phep-theo-phong-ban",
              label: "Tạo đơn xin phép theo phòng ban",
            },
            {
              key: "/bao-cao-don-xin-phep",
              label: "Báo cáo đơn xin phép",
            },
            {
              key: "/bgd-duyet-don",
              label: "BGĐ duyệt đơn",
            },
            {
              key: "/quan-ly-truc-tiep-duyet-don",
              label: "Quản lý trực tiếp duyệt",
            },
          ],
        },
        {
          key: "dieu-khien-kpi",
          label: "Điều khiển KPI",
          children: [
            {
              key: "/cac-tieu-chi-kpi",
              label: "Các tiêu chí KPI",
            },
            {
              key: "/thiet-lap-kpi",
              label: (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParentItemClick("thiet-lap-kpi", "/thiet-lap-kpi");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  Thiết lập KPI theo công việc
                </span>
              ),
              children: [
                {
                  key: "/chi-tiet-kpi",
                  label: "Chi tiết KPI",
                },
              ],
            },
            {
              key: "kpi-hang-thang",
              label: (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleParentItemClick("kpi-hang-thang", "/kpi-hang-thang");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  KPI Hàng Tháng
                </span>
              ),
              children: [
                {
                  key: "/kpi-giam-doc",
                  label: "KPI Giám Đốc",
                },
                {
                  key: "/kpi-nhan-su",
                  label: "KPI Nhân Sự",
                },
                {
                  key: "/kpi-quan-ly",
                  label: "KPI Quản Lý",
                },
              ],
            },
            {
              key: "/kpi-bao-cao",
              label: "KPI Báo Cáo",
            },
          ],
        },
        {
          key: "quan-ly-cong-viec",
          label: "Quản lý công việc",
          children: [
            {
              key: "/quan-ly-ke-hoach",
              label: "Quản lý kế hoạch",
            },
            {
              key: "/nhap-cong-viec",
              label: "Nhập công việc",
            },
            {
              key: "/cong-viec-phai-lam",
              label: "Công việc phải làm",
            },
            {
              key: "/cong-viec-phai-lam-giao-viec",
              label: "Công việc phải làm giao việc",
            },
            {
              key: "/cong-viec-doi-duyet",
              label: "Công việc đợi duyệt",
            },
            {
              key: "/cong-viec-hoan-thanh", 
              label: "Công việc hoàn thành",
            },
            {
              key: "/cong-viec-khong-hoan-thanh", 
              label: "Công việc không hoàn thành",
            },
            {
              key: "/bao-cao-cong-viec-hang-ngay", 
              label: "Báo cáo công việc hàng ngày",
            },
            {
              key: "/bao-cao-du-an", 
              label: "Báo cáo dự án",
            },
            {
              key: "/luoc-do-ke-hoach", 
              label: "Lược đồ kế hoạch",
            },
            {
              key: "/cong-viec-hang-ngay", 
              label: "Công việc hàng ngày",
            },
            {
              key: "/cong-viec-chua-bao-cao", 
              label: "Công việc chưa báo cáo",
            },
            


          ],
        },
      ],
    },


    // ===== QUẢN LÝ DỰ ÁN =====
    {
      key: "QL-du-an",
      icon: <Briefcase size={16} />,
      label: "Quản lý dự án",
      children: [
        {
          key: "Quan-ly-du-an",
          label: "Quản lý quy trình dự án",
          children: [
            {
              key: "/quan-ly-quy-trinh-du-an?tab=dashboard",
              label: "Tổng quan",
            },
            {
              key: "/quan-ly-quy-trinh-du-an?tab=my-tasks",
              label: "Công việc của tôi",
            },
            {
              key: "/quan-ly-quy-trinh-du-an?tab=workflow",
              label: "Mẫu Quy Trình (Workflow)",
            },
            {
              key: "/quan-ly-quy-trinh-du-an?tab=projects",
              label: "Danh Sách Dự Án",
            },
          ],
        },
      ],
    },

   
  ];

  const colorThemes = [
    { value: "default", label: "Mặc định", colors: ["#197dd3", "#77d4fb"] },
    { value: "ocean", label: "Đại dương", colors: ["#0066cc", "#66ccff"] },
    { value: "forest", label: "Rừng xanh", colors: ["#006600", "#66cc66"] },
    { value: "sunset", label: "Hoàng hôn", colors: ["#ff6600", "#ffcc66"] },
    { value: "purple", label: "Tím", colors: ["#6600cc", "#cc66ff"] },
  ];

  // Hàm xử lý click vào parent item (có cả navigation và dropdown)
  const handleParentItemClick = (key, path) => {
    // Navigate đến trang bằng addTab
    addTab(path);

    // Chỉ mở dropdown nếu chưa mở (không đóng nếu đã mở)
    if (!openKeys.includes(key)) {
      setOpenKeys([...openKeys, key]);
    }
  };

  const handleMenuClick = ({ key }) => {
    // Chỉ xử lý navigation cho các items con (routes) bằng addTab
    if (key.startsWith("/")) {
      addTab(key);
    }
  };

  const toggleSidebar = () => {
    onCollapseChange?.(!isCollapsed);
  };

  // Hàm tìm sibling keys có children tại cùng cấp
  const findSiblingKeysWithChildren = (items, targetKey, parentPath = []) => {
    for (const item of items) {
      if (item.key === targetKey) {
        // Tìm thấy key, trả về các sibling có children
        const parent =
          parentPath.length > 0 ? parentPath[parentPath.length - 1] : null;
        const siblings = parent ? parent.children : items;
        return siblings
          .filter((sibling) => sibling.key !== targetKey && sibling.children)
          .map((sibling) => sibling.key);
      }
      if (item.children) {
        const result = findSiblingKeysWithChildren(item.children, targetKey, [
          ...parentPath,
          item,
        ]);
        if (result) return result;
      }
    }
    return null;
  };

  // Hàm lấy tất cả các key con của một item (bao gồm cả key của item đó)
  const getDescendantKeys = (items, targetKey) => {
    const keys = [];
    const findAndCollect = (itemList) => {
      for (const item of itemList) {
        if (item.key === targetKey) {
          // Tìm thấy, thu thập tất cả children keys
          if (item.children) {
            const collect = (children) => {
              children.forEach((child) => {
                keys.push(child.key);
                if (child.children) collect(child.children);
              });
            };
            collect(item.children);
          }
          return true;
        }
        if (item.children && findAndCollect(item.children)) {
          return true;
        }
      }
      return false;
    };
    findAndCollect(items);
    return keys;
  };

  // Danh sách các parent keys có navigation (không được đóng tự động)
  const navigableParentKeys = [
    "cong-ty",
    "nhan-vien-cong-ty",
    "phieu-thu",
    "phieu-chi",
    "thiet-lap-kpi",
    "kpi-hang-thang",
    "/luong",
    "/cham-cong",
  ];

  // Hàm xử lý khi submenu được mở/đóng - Accordion behavior
  const handleOpenChange = (keys) => {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));
    const closingKey = openKeys.find((key) => !keys.includes(key));

    // Nếu đang đóng một navigable parent, ngăn chặn việc đóng
    if (closingKey && navigableParentKeys.includes(closingKey)) {
      // Kiểm tra xem đang ở trang của parent đó không
      const parentPaths = {
        "cong-ty": "/cong-ty",
        "nhan-vien-cong-ty": "/nhan-vien-cong-ty",
        "phieu-thu": "/phieu-thu",
        "phieu-chi": "/phieu-chi",
        "thiet-lap-kpi": "/thiet-lap-kpi",
        "kpi-hang-thang": "/kpi-hang-thang",
        "/luong": "/luong",
        "/cham-cong": "/cham-cong",
      };

      // Nếu đang ở trang của parent, không cho đóng
      if (location.pathname === parentPaths[closingKey]) {
        return; // Không thay đổi openKeys
      }
    }

    if (latestOpenKey) {
      // Tìm các sibling keys có children
      const siblingKeys = findSiblingKeysWithChildren(menuItems, latestOpenKey);

      if (siblingKeys && siblingKeys.length > 0) {
        // Thu thập tất cả các key cần đóng (sibling và con cháu của chúng)
        const keysToClose = new Set(siblingKeys);
        siblingKeys.forEach((sibKey) => {
          const descendants = getDescendantKeys(menuItems, sibKey);
          descendants.forEach((d) => keysToClose.add(d));
        });

        // Lọc bỏ các key cần đóng khỏi danh sách keys mới
        const filteredKeys = keys.filter((key) => !keysToClose.has(key));
        setOpenKeys(filteredKeys);
      } else {
        setOpenKeys(keys);
      }
    } else {
      // Đang đóng menu, giữ nguyên
      setOpenKeys(keys);
    }
  };

  useEffect(() => {
    const selectedColors = colorThemes.find(
      (theme) => theme.value === selectedTheme,
    )?.colors;
    if (selectedColors) {
      // Helper function to convert hex to rgb for opacity support in CSS
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
      };

      const primaryRgb = hexToRgb(selectedColors[0]);

      // Set basic color variables
      document.documentElement.style.setProperty(
        "--primary-color",
        selectedColors[0],
      );
      document.documentElement.style.setProperty(
        "--secondary-color",
        selectedColors[1],
      );
      document.documentElement.style.setProperty(
        "--primary-color-rgb",
        primaryRgb,
      );

      // Set system theme variables for components
      document.documentElement.style.setProperty(
        "--color-primary",
        selectedColors[0],
      );
      document.documentElement.style.setProperty(
        "--color-primary-light",
        selectedColors[1],
      );
      document.documentElement.style.setProperty(
        "--color-primary-gradient",
        `linear-gradient(135deg, ${selectedColors[0]} 0%, ${selectedColors[1]} 100%)`,
      );
      document.documentElement.style.setProperty(
        "--shadow-primary",
        `0 4px 14px ${selectedColors[0]}40`,
      );
    }
  }, [selectedTheme]);

  const handleThemeChange = (value) => {
    setSelectedTheme(value);
    localStorage.setItem("system-theme", value);
  };

  const renderedOpenKeys = isCollapsed ? [] : openKeys;

  return (
    <div className={`sidebar-menu ${isCollapsed ? "collapsed" : ""}`}>
      <div className="logo-section">
        <div className="logo-brand" onClick={() => addTab("/quan-ly-ke-hoach")} style={{ cursor: "pointer" }}>
          <div className="logo-icon" style={{ background: "transparent", padding: 0 }}>
            <img src={authLogo} alt="Logo" style={{ height: "70px", width: "70px", objectFit: "contain" }} />
          </div>
          <span className="logo-text">SOF PLAN</span>
        </div>
        <button
          type="button"
          className="collapse-toggle"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      <Menu
        mode="inline"
        inlineIndent={8}
        selectedKeys={[location.pathname + location.search, location.pathname]}
        openKeys={renderedOpenKeys}
        onClick={handleMenuClick}
        onOpenChange={handleOpenChange}
        items={menuItems}
        style={{ border: "none" }}
        className="main-menu"
        inlineCollapsed={isCollapsed}
      />

      <div className="theme-selector">
        <Card
          size="small"
          title={
            <div className="theme-title">
              <Palette size={16} />
              <span>{t("form.label.chon_giao_dien", "Cấu hình Giao diện")}</span>
            </div>
          }
        >
          <div className="theme-option-row" style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="theme-option-label" style={{ fontSize: 12, color: "var(--text-secondary, #64748b)" }}>
              {t("other.general.ngon_ngu", "Ngôn ngữ")}
            </span>
            <Select
              value={currentLanguage}
              onChange={handleLanguageChange}
              className="theme-select"
              size="small"
              suffixIcon={<Globe size={14} />}
              options={[
                { value: "vi", label: "Tiếng Việt" },
                { value: "en", label: "English" },
              ]}
              style={{ width: "100%" }}
            />
          </div>
          <div className="theme-option-row" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="theme-option-label" style={{ fontSize: 12, color: "var(--text-secondary, #64748b)" }}>
              {t("form.label.chon_bo_mau", "Tông màu")}
            </span>
            <Select
              value={selectedTheme}
              onChange={handleThemeChange}
              className="theme-select"
              size="small"
              suffixIcon={<ChevronDown size={16} />}
              style={{ width: "100%" }}
            >
              {colorThemes.map((theme) => (
                <Option key={theme.value} value={theme.value}>
                  <div className="theme-option">
                    <div className="theme-colors">
                      <div
                        className="color-dot"
                        style={{ backgroundColor: theme.colors[0] }}
                      />
                      <div
                        className="color-dot"
                        style={{ backgroundColor: theme.colors[1] }}
                      />
                    </div>
                    <span>{theme.label}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SidebarMenu;
