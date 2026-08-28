import React from "react";
import { Layout, Dropdown, Avatar, Space, Typography, Button, Modal } from "antd";
import {
  Minus,
  Square,
  X,
  Bell,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTabs } from "../../../contexts/TabContext";
import { getElectronAPI } from "../../../utils/environment";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUserInfo,
  lv_LoadDataAPI,
  getImageUrlFromToken,
} from "../../../services/apiServices";
import "./HeaderBar.css";
import authLogo from "../../../auth/logo.png";

const { Header } = Layout;
const { Text } = Typography;

const HeaderBar = ({ isCollapsed }) => {
  const { user, logout } = useAuth();
  const { addTab } = useTabs();
  const navigate = useNavigate();
  const electronAPI = getElectronAPI();
  const isElectronRuntime = Boolean(electronAPI);

  const [hasOverlay, setHasOverlay] = React.useState(false);
  const [employeeInfo, setEmployeeInfo] = React.useState(null);
  const [avatarUrl, setAvatarUrl] = React.useState(null);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const WEEKDAYS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const timeLabel = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = `${WEEKDAYS[now.getDay()]}, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`;

  const fetchUserData = React.useCallback(async () => {
    try {
      const info = await getCurrentUserInfo();
      if (info && info.success && info.lv001) {
        setEmployeeInfo(info);
        const fullList = await lv_LoadDataAPI('hr_lv0020', 'load');
        if (Array.isArray(fullList)) {
          const matched = fullList.find((item) => String(item.lv001) === String(info.lv001));
          if (matched) {
            if (matched.lv007) {
              setAvatarUrl(getImageUrlFromToken(matched.lv007));
            }
            if (matched.lv002) {
              setEmployeeInfo((prev) => ({
                ...prev,
                hoTen: matched.lv002,
              }));
            }
          }
        }
      }
    } catch (err) {
      console.error("Lỗi nạp thông tin nhân viên tại HeaderBar:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchUserData();
    const handleProfileUpdate = () => {
      fetchUserData();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchUserData]);

  React.useEffect(() => {
    const checkOverlay = () => {
      const hasOpenDrawer = document.querySelector('.ant-drawer-open') !== null;
      const hasOpenModal = document.querySelector('.ant-modal-open') !== null || 
                           document.querySelector('.ant-modal-wrap:not(.ant-modal-wrap-hidden)') !== null;
      setHasOverlay(hasOpenDrawer || hasOpenModal);
    };

    checkOverlay();

    const observer = new MutationObserver(() => {
      checkOverlay();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleMinimize = () => {
    electronAPI?.windowMinimize?.();
  };

  const handleMaximize = () => {
    electronAPI?.windowMaximize?.();
  };

  const handleClose = () => {
    Modal.confirm({
      title: "Xác nhận thoát",
      content: "Bạn có chắc chắn muốn đóng ứng dụng quản trị doanh nghiệp này không?",
      okText: "Thoát",
      cancelText: "Hủy",
      okType: "danger",
      centered: true,
      onOk: () => {
        electronAPI?.appQuit?.();
      },
    });
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <User size={16} />,
      label: "Thông tin cá nhân",
      onClick: () => addTab("/thong-tin-ca-nhan"),
    },
    {
      key: "settings",
      icon: <Settings size={16} />,
      label: "Cài đặt",
      onClick: () => navigate("/cai-dat"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogOut size={16} />,
      label: "Đăng xuất",
      onClick: logout,
    },
  ];

  return (
    <Header className="header-bar">
      <div className="header-left">
        <div className={`drag-region ${hasOverlay ? "no-drag" : ""}`} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isCollapsed ? (
            <div className="header-logo-brand" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => navigate("/quan-ly-ke-hoach")}>
              <img src={authLogo} alt="Logo" style={{ height: "60px", objectFit: "contain" }} />
              <span className="logo-text" style={{ fontSize: "18px", fontWeight: "800", color: "var(--primary-color, #197dd3)", whiteSpace: "nowrap" }}>
                <span style={{ color: "#ff4d4f" }}>SOF</span> PLAN
              </span>
            </div>
          ) : (
            <Text strong style={{ fontSize: "16px" }}>
              <span style={{ color: "var(--ink, #10182b)" }}>Hệ Thống Quản Trị Doanh Nghiệp</span> - <span style={{ color: "#ff4d4f" }}>SOF</span>
            </Text>
          )}
        </div>
      </div>

      <div className="header-center">
        <Space size="middle">
          <div className="header-clock-widget">
            <span className="header-clock-time">{timeLabel}</span>
            <span className="header-clock-date">{dateLabel}</span>
          </div>

          <Button
            type="text"
            icon={<Bell size={16} />}
            className="notification-btn"
          />

          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Space className="user-info" style={{ cursor: "pointer", marginRight: "10px" }}>
              <Avatar src={avatarUrl} icon={<User size={14} />} />
              <div className="user-details">
                <Text strong>{employeeInfo?.hoTen || user?.hoTen || "Người dùng"}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  {user?.hoTen || "Tên đăng nhập"}
                </Text>
              </div>
            </Space>
          </Dropdown>
        </Space>
      </div>

      <div className="header-right">
        {isElectronRuntime && (
          <div className="window-controls">
            <Button
              type="text"
              icon={<Minus size={18} />}
              className="window-control-btn minimize-btn"
              onClick={handleMinimize}
            />
            <Button
              type="text"
              icon={<Square size={15} />}
              className="window-control-btn maximize-btn"
              onClick={handleMaximize}
            />
            <Button
              type="text"
              icon={<X size={18} />}
              className="window-control-btn close-btn"
              onClick={handleClose}
            />
          </div>
        )}
      </div>
    </Header>
  );
};

export default HeaderBar;
