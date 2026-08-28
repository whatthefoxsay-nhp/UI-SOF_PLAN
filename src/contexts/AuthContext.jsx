import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { message, Modal } from "antd";
import {
  login as apiLogin,
  performLogout,
  clearAuthCache,
  setSessionConflictHandler,
} from "../services/apiLogin";
import {
  setApiSessionConflictHandler,
  testServiceConnection,
  loadUserPermissions, // Thêm import này
} from "../services/apiServices";
import { setDynamicApiConfig, clearDynamicApiConfig } from "../services/url";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isConflictModalOpen = useRef(false);

  const handleForcedLogout = useCallback((conflictMessage) => {
    if (isConflictModalOpen.current) return;
    isConflictModalOpen.current = true;

    // Read from localStorage to avoid closure issues with user state
    try {
      const storedUserRaw = localStorage.getItem("pmbh_user");
      if (storedUserRaw) {
        const storedUser = JSON.parse(storedUserRaw);
        if (storedUser && storedUser.taiKhoan && storedUser.token) {
          performLogout(storedUser.taiKhoan, storedUser.token).catch((err) => {
            console.warn("Server-side logout request failed:", err);
          });
        }
      }
    } catch (e) {
      console.warn("Error parsing user for server logout:", e);
    }

    clearAuthCache();
    clearDynamicApiConfig(); // Reset all dynamic URLs to default
    localStorage.removeItem("pmbh_user");
    localStorage.removeItem("pmbh_token");

    Modal.warning({
      title: "Phiên đăng nhập đã kết thúc",
      content:
        conflictMessage ||
        "Tài khoản của bạn đã được đăng nhập ở nơi khác. Vui lòng đăng nhập lại.",
      okText: "Đăng nhập lại",
      centered: true,
      maskClosable: false,
      keyboard: false,
      onOk: () => {
        isConflictModalOpen.current = false;
        setUser(null);
        setIsAuthenticated(false);
      },
    });
  }, []);

  useEffect(() => {
    // Clear session trước, không restore từ localStorage
    // App yêu cầu logout mỗi lần restart
    localStorage.removeItem("pmbh_user");
    localStorage.removeItem("pmbh_token");

    setLoading(false);
  }, []);

  useEffect(() => {
    setSessionConflictHandler(handleForcedLogout);
    setApiSessionConflictHandler(handleForcedLogout);
    return () => {
      setSessionConflictHandler(null);
      setApiSessionConflictHandler(null);
    };
  }, [handleForcedLogout]);

  // Tạm thời tắt polling session mỗi 5 giây
  // Chỉ hiện thông báo khi user thao tác và nhận lỗi "invalid" từ API
  // useEffect(() => {
  //   if (!user?.taiKhoan || !user?.token) {
  //     return undefined;
  //   }
  //
  //   let cancelled = false;
  //   const pollIntervalMs = 5000;
  //
  //   const pollSession = async () => {
  //     try {
  //       const status = await verifySession(user.taiKhoan, user.token);
  //       if (!status?.valid && !cancelled) {
  //         const reason = status?.message === 'session_conflict'
  //           ? 'Tài khoản của bạn đã được đăng nhập ở nơi khác. Vui lòng đăng nhập lại.'
  //           : 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';
  //         handleForcedLogout(reason);
  //       }
  //     } catch (error) {
  //       if (cancelled) {
  //         return;
  //       }
  //       const rawMessage = error?.response?.data?.message || error?.message;
  //       if (rawMessage === 'session_conflict') {
  //         handleForcedLogout('Tài khoản của bạn đã được đăng nhập ở nơi khác. Vui lòng đăng nhập lại.');
  //       }
  //     }
  //   };
  //
  //   pollSession();
  //   const intervalId = setInterval(pollSession, pollIntervalMs);
  //   return () => {
  //     cancelled = true;
  //     clearInterval(intervalId);
  //   };
  // }, [user?.taiKhoan, user?.token, handleForcedLogout]);

  const login = async (taiKhoan, matKhau, options = {}) => {
    try {
      // Demo accounts for testing
      const demoAccounts = [
        {
          username: "admin",
          password: "admin",
          role: "Admin",
          chiNhanh: "Chi nhánh chính",
        },
        {
          username: "manager",
          password: "123",
          role: "Manager",
          chiNhanh: "Chi nhánh 1",
        },
        {
          username: "user",
          password: "123",
          role: "User",
          chiNhanh: "Chi nhánh 2",
        },
        {
          username: "demo",
          password: "demo",
          role: "Demo",
          chiNhanh: "Chi nhánh demo",
        },
      ];

      // Check demo accounts first
      const demoAccount = demoAccounts.find(
        (acc) => acc.username === taiKhoan && acc.password === matKhau,
      );

      if (demoAccount) {
        const userData = {
          id: demoAccount.username,
          taiKhoan: demoAccount.username,
          hoTen: demoAccount.username,
          vaiTro: demoAccount.role,
          email: `${demoAccount.username}@demo.com`,
          token: `demo_token_${Date.now()}`,
          chiNhanh: demoAccount.chiNhanh,
        };

        setUser(userData);
        setIsAuthenticated(true);

        localStorage.setItem("pmbh_user", JSON.stringify(userData));
        localStorage.setItem("pmbh_token", userData.token);

        return { success: true };
      }

      // If not demo account, try real API
      const result = await apiLogin(taiKhoan, matKhau, options);
      console.log("[SOF_DEBUG AuthContext] apiLogin result:", result);

      if (result.requiresForceLogout) {
        return {
          success: false,
          requiresForceLogout: true,
          message: result.message || "Tài khoản đang đăng nhập ở thiết bị khác",
        };
      }

      // Check for unauthorized service access
      if (!result.success) {
        if (result.requires_captcha) {
          return result;
        }
        return {
          success: false,
          message: result.message || "Đăng nhập thất bại",
          error_code: result.error_code,
        };
      }

      if (result.success && result.userCode && result.token) {
        // Thiết lập khoảng thời gian chờ 20ms để máy dịch vụ DB ghi/đồng bộ token từ máy xác thực
        await new Promise((resolve) => setTimeout(resolve, 20));

        // Kiểm tra ngày hết hạn - sử dụng kết quả từ backend
        // Backend trả về: expireWarning, expireDate, daysRemaining
        const { expireWarning, expireDate, daysRemaining } = result;

        // Nếu có cảnh báo hết hạn, trả về cho FE xử lý hiển thị
        if (expireWarning) {
          if (daysRemaining < 0) {
            // Đã hết hạn hoặc ngày không hợp lệ - không cho authenticate
            const defaultMessage = result.invalidDate
              ? "Ngày hết hạn không hợp lệ. Vui lòng liên hệ admin."
              : "Tài khoản đã hết hạn sử dụng";

            return {
              success: false,
              expired: true,
              expireWarning: true,
              expireDate: expireDate,
              daysRemaining: daysRemaining,
              invalidDate: result.invalidDate || false,
              receiptId: result.receiptId,
              token: result.token,
              email: result.email || "",
              message: result.expiryMessage || defaultMessage,
            };
          } else {
            // Sắp hết hạn - KHÔNG set isAuthenticated ở đây
            // Trả về cho FE hiển thị modal cảnh báo trước
            // FE sẽ gọi lại với option confirmWarning=true nếu người dùng bỏ qua
            return {
              success: true,
              needsWarningConfirmation: true,
              expireWarning: true,
              expireDate: expireDate,
              daysRemaining: daysRemaining,
              receiptId: result.receiptId,
              token: result.token,
              email: result.email || "",
              // Lưu thông tin để FE có thể hoàn tất đăng nhập sau
              _loginData: {
                userCode: result.userCode,
                role: result.role,
                chiNhanh: result.chiNhanh,
                counter: result.counter,
                right: result.right,
                domain: result.domain,
                method: result.method,
              },
            };
          }
        }

        // Set dynamic API config from login response
        if (result.domain && result.method) {
          setDynamicApiConfig({
            domain: result.domain,
            method: result.method,
          });
        }

        // // Test service connection before proceeding
        // try {
        //   const serviceTest = await testServiceConnection();
        //   if (!serviceTest.success) {
        //     // Service not available - rollback and show error
        //     clearDynamicApiConfig();
        //     return {
        //       success: false,
        //       message:
        //         serviceTest.message || "Không thể kết nối đến máy chủ dịch vụ",
        //       error_code: "service_unavailable",
        //     };
        //   }
        // } catch (testError) {
        //   console.error("Service connection test failed:", testError);
        //   clearDynamicApiConfig();
        //   return {
        //     success: false,
        //     message:
        //       "Không thể kết nối đến máy chủ dịch vụ. Vui lòng kiểm tra lại.",
        //     error_code: "service_connection_failed",
        //   };
        // }

        const userData = {
          id: result.userCode,
          taiKhoan: result.userCode,
          hoTen: result.userCode,
          vaiTro: result.role || "user",
          email: "",
          token: result.token,
          chiNhanh: result.chiNhanh,
          counter: result.counter,
          right: result.right,
        };

        setUser(userData);
        setIsAuthenticated(true);

        localStorage.setItem("pmbh_user", JSON.stringify(userData));
        localStorage.setItem("pmbh_token", result.token);

        // Load permissions sau khi đăng nhập thành công
        await loadPermissions(userData);

        // Đăng nhập bình thường - không có cảnh báo
        return {
          success: true,
          expireWarning: false,
          expireDate: result.expireDate || "",
          daysRemaining: result.daysRemaining ?? 999,
          receiptId: result.receiptId,
        };
      } else {
        return {
          success: false,
          message: result.message || "Đăng nhập thất bại",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || "Đã xảy ra lỗi khi đăng nhập",
      };
    }
  };

  const logout = useCallback((options = {}) => {
    const doExecuteLogout = () => {
      let username = user?.taiKhoan || user?.username || "";
      let token = user?.token || "";

      if (!username || !token) {
        try {
          const storedUserRaw = localStorage.getItem("pmbh_user");
          if (storedUserRaw) {
            const storedUser = JSON.parse(storedUserRaw);
            username = username || storedUser?.taiKhoan || storedUser?.username || "";
            token = token || storedUser?.token || "";
          }
        } catch (e) {
          console.warn("Error parsing user for logout:", e);
        }
      }

      if (username) {
        performLogout(username, token).catch((err) => {
          console.warn("Server logout error:", err);
        });
      }

      clearAuthCache();
      clearDynamicApiConfig();
      localStorage.removeItem("pmbh_user");
      localStorage.removeItem("pmbh_token");
      setUser(null);
      setIsAuthenticated(false);
      message.success("Đã đăng xuất tài khoản thành công!");
    };

    if (options?.skipConfirm) {
      doExecuteLogout();
      return;
    }

    Modal.confirm({
      title: "Xác nhận đăng xuất",
      content: "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?",
      okText: "Đăng xuất",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => {
        doExecuteLogout();
      },
    });
  }, [user]);

  // Hàm hoàn tất đăng nhập sau khi người dùng bỏ qua cảnh báo sắp hết hạn
  const completeWarningLogin = async (loginData) => {
    try {
      // Thiết lập khoảng thời gian chờ 20ms để máy dịch vụ DB ghi/đồng bộ token từ máy xác thực
      await new Promise((resolve) => setTimeout(resolve, 20));

      const {
        userCode,
        role,
        chiNhanh,
        counter,
        right,
        domain,
        method,
        token,
      } = loginData;

      // Set dynamic API config
      if (domain && method) {
        setDynamicApiConfig({ domain, method });
      }

      // Test service connection
      try {
        const serviceTest = await testServiceConnection();
        if (!serviceTest.success) {
          clearDynamicApiConfig();
          return {
            success: false,
            message:
              serviceTest.message || "Không thể kết nối đến máy chủ dịch vụ",
            error_code: "service_unavailable",
          };
        }
      } catch (testError) {
        console.error("Service connection test failed:", testError);
        clearDynamicApiConfig();
        return {
          success: false,
          message:
            "Không thể kết nối đến máy chủ dịch vụ. Vui lòng kiểm tra lại.",
          error_code: "service_connection_failed",
        };
      }

      const userData = {
        id: userCode,
        taiKhoan: userCode,
        hoTen: userCode,
        vaiTro: role || "user",
        email: "",
        token: token,
        chiNhanh: chiNhanh,
        counter: counter,
        right: right,
      };

      setUser(userData);
      setIsAuthenticated(true);

      localStorage.setItem("pmbh_user", JSON.stringify(userData));
      localStorage.setItem("pmbh_token", token);

      // Load permissions sau khi hoàn tất đăng nhập (trường hợp có cảnh báo)
      await loadPermissions(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Đã xảy ra lỗi khi hoàn tất đăng nhập",
      };
    }
  };

  // Hàm kiểm tra quyền
  const hasPermission = useCallback(
    (moduleCode, actionName) => {
      // [DEVELOPMENT MODE] Luôn trả về true theo yêu cầu của Admin đang phát triển
      return true;

      /* 
      // Logic thực tế sau này khi triển khai phân quyền:
      if (!user || !user.permissions) return false;
      const modulePerms = user.permissions[moduleCode];
      return modulePerms && (modulePerms[actionName] === 1 || modulePerms[actionName] === "1");
      */
    },
    [user],
  );

  // Hàm load permissions từ server
  const loadPermissions = async (currentUser) => {
    try {
      const result = await loadUserPermissions();
      if (result && result.success) {
        setUser((prev) => ({
          ...prev,
          permissions: result.permissions,
          package: result.package,
        }));
      }
    } catch (error) {
      console.warn("Could not load permissions:", error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    completeWarningLogin,
    hasPermission, // Export hàm kiểm tra quyền
    loadPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
