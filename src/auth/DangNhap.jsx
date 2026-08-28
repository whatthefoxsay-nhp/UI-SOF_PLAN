import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Checkbox,
  Alert,
  Divider,
  Typography,
  message,
  Modal,
  Carousel,
} from "antd";
import {
  User,
  Users,
  Lock,
  LogIn,
  X,
  BarChart,
  Clock,
  Minus,
  Square,
  ArrowUpRight,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getElectronAPI } from "../utils/environment";
import { getImageUrlFromToken } from "../services/apiServices";
import authLogo from "./logo.png";
import "../styles/pages/DangNhap.css";
import axios from "axios";
import { url_api } from "../services/url";
import SliderVerify from "../components/Auth/SliderVerify";
import CryptoJS from "crypto-js";

const { Title, Text } = Typography;

const SECRET_KEY = "SOF_PLAN_SECURE_KEY_2026";

const encryptPassword = (password) => {
  if (!password) return "";
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

const decryptPassword = (encryptedPassword) => {
  if (!encryptedPassword) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) {
      return decrypted;
    }
  } catch (error) {
    console.warn("Decryption failed, using fallback");
  }
  return encryptedPassword;
};

const defaultSlides = [
  {
    order: 1,
    imageToken: "2026062314484794YCjBDZtbuAOGPoKR",
    link: "#",
  },
  {
    order: 2,
    imageToken: "2026062314484717PZXLmJ4esNnvToWU",
    link: "#",
  },
];

const DangNhap = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [expiryInfo, setExpiryInfo] = useState({
    expireDate: "",
    daysRemaining: 999,
    expireWarning: false,
    invalidDate: false,
    message: "",
  });
  const [pendingLogin, setPendingLogin] = useState(null);
  const [renewUrl, setRenewUrl] = useState("");
  const [showRenewWeb, setShowRenewWeb] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [pendingWarningLoginData, setPendingWarningLoginData] = useState(null);
  const [isLoginCardDark, setIsLoginCardDark] = useState(false);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaData, setCaptchaData] = useState(null);
  const { login: authLogin, completeWarningLogin } = useAuth();
  const electronAPI = getElectronAPI();
  const isElectronRuntime = Boolean(electronAPI);
  const [promoSlides, setPromoSlides] = useState(defaultSlides);

  const getSlideImageUrl = (slide) => {
    if (slide.image) return slide.image;
    if (slide.imageToken) return getImageUrlFromToken(slide.imageToken);
    return "";
  };

  React.useEffect(() => {
    const fetchPromoSlides = async () => {
      try {
        const endpoint = `${url_api}/quang-cao/index.php`;
        const response = await axios.post(endpoint, {}, { timeout: 10000 });
        if (response.data && Array.isArray(response.data)) {
          const sorted = [...response.data].sort((a, b) => (a.order || 0) - (b.order || 0));
          setPromoSlides(sorted);
        }
      } catch (error) {
        console.error("Lỗi khi tải slideshow quảng cáo:", error);
      }
    };
    fetchPromoSlides();
  }, []);


  const handleExitApp = () => {
    electronAPI?.exitApp?.();
  };

  // Hàm xử lý thanh toán gia hạn
  const handlePayment = async () => {
    setPaymentLoading(true);
    setShowExpiredModal(false);

    const orderId = pendingLogin?.receiptId || "";
    const user = pendingLogin?.email || "";
    const token = pendingLogin?.token || "";

    console.log("Payment info:", JSON.stringify({ orderId, user, token }));

    try {
      const response = await fetch("http://localhost/api/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, user, token }),
      });

      const json = await response.json();
      const redirectUrl = json?.redirectUrl || "";

      if (!redirectUrl) {
        message.error(json?.message || "Không lấy được link gia hạn");
        setPaymentLoading(false);
        return;
      }

      const fullUrl = redirectUrl.startsWith("http")
        ? redirectUrl
        : `http://localhost${redirectUrl}`;

      setRenewUrl(fullUrl);
      setShowRenewWeb(true);
    } catch (err) {
      console.error("Payment error:", err);
      message.error("Không thể mở trang gia hạn");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Hàm xử lý thanh toán từ modal cảnh báo sắp hết hạn
  const handlePaymentFromWarning = async () => {
    setShowWarningModal(false);
    await handlePayment();
  };

  // Hàm xử lý tiếp tục đăng nhập khi bỏ qua cảnh báo sắp hết hạn
  const handleContinueLogin = async () => {
    setShowWarningModal(false);
    setLoading(true);

    try {
      if (!pendingWarningLoginData) {
        message.error("Đã xảy ra lỗi, vui lòng đăng nhập lại");
        return;
      }

      const result = await completeWarningLogin(pendingWarningLoginData);

      if (result.success) {
        // Lưu thông tin đăng nhập nếu đã chọn ghi nhớ
        if (pendingLogin?.remember) {
          localStorage.setItem("remembered_user", pendingLogin.userCode);
          localStorage.setItem("remembered_password", encryptPassword(pendingLogin.password));
        } else {
          localStorage.removeItem("remembered_user");
          localStorage.removeItem("remembered_password");
        }

        message.success(`Đăng nhập thành công! Chào mừng bạn!`);
        // AuthContext sẽ tự động redirect vì isAuthenticated = true
      } else {
        message.error(result.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      message.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const confirmForceLogout = () =>
    new Promise((resolve) => {
      Modal.confirm({
        title: "Phiên đăng nhập đang được sử dụng",
        content:
          "Đã đăng nhập tài khoản ở một nơi khác, bạn muốn đăng xuất tài khoản đó ra không?",
        okText: "Đăng xuất thiết bị kia",
        cancelText: "Giữ phiên cũ",
        centered: true,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  const xuLyDangNhap = async (values) => {
    setLoading(true);
    setShowError(false);
    setErrorMessage("");

    try {
      const { tenDangNhap, matKhau, ghi_nho } = values;

      // Call auth login with full form values so backend options like vcode can pass through.
      let result = await authLogin(tenDangNhap, matKhau, values);
      console.log("[SOF_DEBUG DangNhap] authLogin result:", result);

      if (result.requires_captcha) {
        setLoading(false);
        setRequiresCaptcha(true);
        setCaptchaData(result.captcha_data);
        if (result.message && !requiresCaptcha) {
          message.warning(result.message);
        } else if (values.vcode) {
          message.error("Xác minh không chính xác, vui lòng thử lại!");
        }
        return;
      }

      if (result.requiresForceLogout) {
        setLoading(false);
        const shouldForceLogout = await confirmForceLogout();

        if (!shouldForceLogout) {
          message.info("Bạn đã hủy yêu cầu đăng nhập.");
          return;
        }

        setLoading(true);
        result = await authLogin(tenDangNhap, matKhau, { ...values, forceLogout: true });
      }

      if (result.success) {
        // Kiểm tra trạng thái hết hạn từ BE
        const {
          expireWarning,
          expireDate,
          daysRemaining,
          needsWarningConfirmation,
        } = result;

        // Lưu thông tin để sử dụng khi thanh toán
        setPendingLogin({
          userCode: tenDangNhap,
          password: matKhau,
          email: result.email || "",
          token: result.token || "",
          receiptId: result.receiptId || "",
          remember: ghi_nho,
        });

        // Định dạng ngày hết hạn để hiển thị
        let formattedDate = "";
        if (expireDate) {
          const expiry = new Date(expireDate);
          formattedDate = expiry.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }

        setExpiryInfo({
          expireDate: formattedDate,
          daysRemaining,
          expireWarning,
        });

        // Xử lý cảnh báo sắp hết hạn - cần xác nhận từ người dùng
        if (needsWarningConfirmation && result._loginData) {
          setPendingWarningLoginData({
            ...result._loginData,
            token: result.token,
          });
          setShowWarningModal(true);
          return;
        }

        // Đăng nhập bình thường - không có cảnh báo hoặc đã xử lý xong
        // Clear any previous errors
        setShowError(false);
        setErrorMessage("");

        // Save/clear login credentials if remember is checked
        if (ghi_nho) {
          localStorage.setItem("remembered_user", tenDangNhap);
          localStorage.setItem("remembered_password", encryptPassword(matKhau));
        } else {
          localStorage.removeItem("remembered_user");
          localStorage.removeItem("remembered_password");
        }

        message.success(`Đăng nhập thành công! Chào mừng bạn!`);

        // Login successful, AuthContext will handle the redirect
        // by changing isAuthenticated to true
      } else if (result.expired) {
        // Đã hết hạn hoặc ngày không hợp lệ - hiển thị modal đỏ
        const {
          expireDate,
          daysRemaining,
          invalidDate,
          message: expiryMessage,
        } = result;

        // Lưu thông tin để sử dụng khi thanh toán
        setPendingLogin({
          userCode: tenDangNhap,
          password: matKhau,
          email: result.email || "",
          token: result.token || "",
          receiptId: result.receiptId || "",
          remember: ghi_nho,
        });

        let formattedDate = "";
        if (expireDate) {
          const expiry = new Date(expireDate);
          formattedDate = expiry.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }

        setExpiryInfo({
          expireDate: formattedDate,
          daysRemaining: daysRemaining ?? -1,
          expireWarning: true,
          invalidDate: invalidDate || false,
          message: expiryMessage || "Tài khoản đã hết hạn sử dụng",
        });
        setShowExpiredModal(true);
      } else {
        if (requiresCaptcha) {
          setRequiresCaptcha(false);
          setCaptchaData(null);
        }
        setShowError(true);
        setErrorMessage(
          result.message || "Tên đăng nhập hoặc mật khẩu không đúng",
        );
        message.error(
          result.message || "Tên đăng nhập hoặc mật khẩu không đúng",
        );
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      setShowError(true);
      setErrorMessage(error.message || "Có lỗi xảy ra khi đăng nhập");
      message.error(error.message || "Có lỗi xảy ra khi đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Load remembered credentials
    const rememberedUser = localStorage.getItem("remembered_user");
    const rememberedPasswordRaw = localStorage.getItem("remembered_password");
    const rememberedPassword = decryptPassword(rememberedPasswordRaw);

    if (rememberedUser && rememberedPassword) {
      form.setFieldsValue({
        tenDangNhap: rememberedUser,
        matKhau: rememberedPassword,
        ghi_nho: true,
      });
    } else if (rememberedUser) {
      // Chỉ có username, không có password
      form.setFieldsValue({
        tenDangNhap: rememberedUser,
        ghi_nho: true,
      });
    }
  }, [form]);

  return (
    <div className="login-container">
      {/* Window Controls */}
      {isElectronRuntime && (
        <div className="login-window-controls">
          <Button
            className="login-window-btn minimize"
            type="text"
            icon={<Minus size={16} />}
            onClick={() => electronAPI?.windowMinimize?.()}
            title="Thu nhỏ"
          />
          <Button
            className="login-window-btn maximize"
            type="text"
            icon={<Square size={14} />}
            onClick={() => electronAPI?.windowMaximize?.()}
            title="Phóng to"
          />
          <Button
            className="login-window-btn close"
            type="text"
            icon={<X size={16} />}
            onClick={handleExitApp}
            title="Thoát ứng dụng"
          />
        </div>
      )}

      {/* Left Side - Introduction Slide Show */}
      <div className={`login-intro-wrapper ${isLoginCardDark ? "login-intro-wrapper-dark" : ""}`}>
        <div className="login-intro-section">
          <div className="login-carousel-container">
            <Carousel autoplay effect="fade" speed={800} autoplaySpeed={3500} arrows={true}>
              {promoSlides.map((slide, index) => (
                <div key={index} className="promo-slide">
                  <a
                    href={slide.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="promo-link"
                  >
                    <div className="promo-image-wrapper">
                      <div
                        className="promo-image-blur-bg"
                        style={{ backgroundImage: `url(${getSlideImageUrl(slide)})` }}
                      />
                      <img
                        src={getSlideImageUrl(slide)}
                        alt={`SOF PLAN Promo ${slide.order || index + 1}`}
                        className="promo-image"
                      />
                    </div>
                  </a>
                </div>
              ))}
            </Carousel>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form - Tách ra ngoài không có Card wrapper */}
      <div className={`login-form-wrapper ${isLoginCardDark ? "login-form-wrapper-dark" : ""}`}>
        <div
          className={`login-form-section ${
            isLoginCardDark ? "login-form-section-dark" : ""
          }`}
        >
          <div
            className={`login-form-container ${
              isLoginCardDark ? "login-form-container-dark" : ""
            }`}
          >
            <Button
              type="text"
              className="login-theme-toggle"
              icon={isLoginCardDark ? <Sun size={16} /> : <Moon size={16} />}
              onClick={() => setIsLoginCardDark((prev) => !prev)}
              aria-label={isLoginCardDark ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
              title={isLoginCardDark ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
            />

            {/* Login Header - Tách ra ngoài */}
            <div className="login-header">
              <div className="login-logo">
                <img src={authLogo} alt="Logo" className="login-logo-image" />
              </div>
              <Title level={2} className="login-title login-brand-title">
                <span className="brand-sof">SOF</span> PLAN
              </Title>
              <Text className="login-subtitle">
                Phần mềm Quản trị doanh nghiệp - SOF
              </Text>
              <Title level={2} className="login-title">
                Đăng nhập
              </Title>
              
            </div>

            {/* Error Alert - Tách ra ngoài */}
            {showError && (
              <Alert
                message="Đăng nhập thất bại"
                description={
                  errorMessage ||
                  "Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại."
                }
                type="error"
                showIcon
                className="login-error-alert"
              />
            )}

            {/* Login Form - Tách ra ngoài */}
            <Form
              form={form}
              name="login"
              onFinish={xuLyDangNhap}
              layout="vertical"
              size="large"
              className="login-form"
            >
              {/* Username Input - Component riêng */}
              <Form.Item
                name="tenDangNhap"
                label="Tên đăng nhập"
                rules={[
                  { required: true, message: "Vui lòng nhập tên đăng nhập!" },
                ]}
                className="login-form-item"
              >
                <Input
                  prefix={<User size={16} className="login-input-prefix" />}
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  className="login-input"
                />
              </Form.Item>

              {/* Password Input - Component riêng */}
              <Form.Item
                name="matKhau"
                label="Mật khẩu"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
                className="login-form-item"
              >
                <Input.Password
                  prefix={<Lock size={16} className="login-input-prefix" />}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  className="login-input"
                />
              </Form.Item>

              {/* Remember Checkbox - Component riêng */}
              <div className="login-remember-section">
                <Form.Item name="ghi_nho" valuePropName="checked" noStyle>
                  <Checkbox className="login-checkbox">
                    Ghi nhớ đăng nhập
                  </Checkbox>
                </Form.Item>
              </div>

              {/* Login Button - Component riêng */}
              <div className="login-button-section">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  icon={<LogIn size={16} />}
                  className="login-button"
                >
                  Đăng nhập
                </Button>
              </div>

              <Divider className="login-purchase-divider">Hoặc</Divider>

              <div className="login-purchase-card">
                <div className="login-purchase-content">
                  <Text className="login-purchase-title">MUA TÀI KHOẢN SOF</Text>
                  <Text className="login-purchase-subtitle">
                    Trải nghiệm đầy đủ tính năng
                  </Text>
                  <Text className="login-purchase-link">
                    Khám phá ngay tại SOF PLAN
                  </Text>
                </div>
                <Button
                  type="primary"
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-purchase-button"
                  icon={<ArrowUpRight size={15} />}
                >
                  Khám phá
                </Button>
              </div>
            </Form>

            {/* Footer - Component riêng */}
            <div className="login-footer">
              <Text className="login-footer-text">Phiên bản 1.0.0</Text>
            </div>

            <div className="login-intro-footer">
              <Text className="login-copyright-text">
                © 2026 POWERED BY{" "}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-copyright-link"
                >
                  SOF PLAN
                </a>
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Captcha Modal */}
      <Modal
        title="Xác minh bảo mật"
        open={requiresCaptcha}
        footer={null}
        closable={true}
        onCancel={() => {
          setRequiresCaptcha(false);
          setLoading(false);
        }}
        width={370}
        centered
        destroyOnClose
        className="captcha-modal"
      >
        <div style={{ padding: "10px 0" }}>
          <Text style={{ display: "block", marginBottom: 15, textAlign: "center" }}>
            Vui lòng trượt mảnh ghép để hoàn tất đăng nhập
          </Text>
          <SliderVerify 
            v={captchaData?.v}
            k={captchaData?.k}
            i={captchaData?.i}
            onSuccess={(x) => {
              const salt = Math.random().toString(36).substring(2, 6);
              const vcode = window.btoa(salt + "SOFDev|" + x + "|" + (captchaData?.s || ""));
              
              const values = form.getFieldsValue();
              xuLyDangNhap({ ...values, vcode });
              setRequiresCaptcha(false);
            }}
            onRefresh={async () => {
              const values = form.getFieldsValue();
              const result = await authLogin(
                values.tenDangNhap,
                values.matKhau,
                values
              );
              if (result.requires_captcha) {
                setCaptchaData(result.captcha_data);
              }
            }}
          />
        </div>
      </Modal>

      {/* Modal thông báo hết hạn - Cảnh báo đỏ, không cho đăng nhập */}
      <Modal
        open={showExpiredModal}
        centered
        closable={false}
        footer={null}
        className="expired-modal"
      >
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
              color: "#ff4d4f",
            }}
          >
            {expiryInfo.invalidDate ? "🚫" : "⚠️"}
          </div>
          <Title level={4} style={{ marginBottom: "16px", color: "#cf1322" }}>
            {expiryInfo.invalidDate ? "Lỗi hệ thống" : "Tài khoản đã hết hạn"}
          </Title>
          <Text
            style={{
              display: "block",
              marginBottom: "24px",
              fontSize: "14px",
              color: "#595959",
            }}
          >
            {expiryInfo.invalidDate ? (
              // Hiển thị message từ backend cho trường hợp ngày không hợp lệ
              <>
                {expiryInfo.message ||
                  "Ngày hết hạn không hợp lệ. Vui lòng liên hệ admin."}
              </>
            ) : (
              // Hiển thị message bình thường cho trường hợp hết hạn
              <>
                Tài khoản của bạn đã hết hạn vào ngày{" "}
                <strong>{expiryInfo.expireDate}</strong>.
                <br />
                Vui lòng gia hạn để tiếp tục sử dụng phần mềm.
              </>
            )}
          </Text>
          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <Button onClick={() => setShowExpiredModal(false)}>Đóng</Button>
            {!expiryInfo.invalidDate && (
              <Button
                type="primary"
                danger
                loading={paymentLoading}
                onClick={handlePayment}
              >
                Thanh toán ngay
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal cảnh báo sắp hết hạn - Cảnh báo vàng, vẫn cho đăng nhập */}
      <Modal
        open={showWarningModal}
        centered
        closable={false}
        footer={null}
        className="warning-modal"
      >
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
              color: "#faad14",
            }}
          >
            ⚠️
          </div>
          <Title level={4} style={{ marginBottom: "16px", color: "#d48806" }}>
            Tài khoản sắp hết hạn
          </Title>
          <Text
            style={{
              display: "block",
              marginBottom: "24px",
              fontSize: "14px",
              color: "#595959",
            }}
          >
            Tài khoản của bạn sẽ hết hạn vào ngày{" "}
            <strong>{expiryInfo.expireDate}</strong>
            {expiryInfo.daysRemaining > 0 && (
              <>
                {" "}
                (còn <strong>{expiryInfo.daysRemaining}</strong> ngày)
              </>
            )}
            {expiryInfo.daysRemaining === 0 && (
              <>
                {" "}
                (<strong>hôm nay</strong>)
              </>
            )}
            .
            <br />
            Vui lòng gia hạn để tránh gián đoạn sử dụng.
          </Text>
          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <Button onClick={handleContinueLogin}>Bỏ qua</Button>
            <Button
              type="primary"
              loading={paymentLoading}
              onClick={handlePaymentFromWarning}
            >
              Thanh toán ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal hiển thị trang thanh toán */}
      <Modal
        open={showRenewWeb}
        centered
        width="90%"
        style={{ maxWidth: 900 }}
        title="Thanh toán gia hạn"
        onCancel={() => {
          setShowRenewWeb(false);
          setRenewUrl("");
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setShowRenewWeb(false);
              setRenewUrl("");
            }}
          >
            Đóng
          </Button>,
        ]}
        className="renew-web-modal"
      >
        {renewUrl && (
          <iframe
            src={renewUrl}
            style={{
              width: "100%",
              height: "70vh",
              border: "none",
              borderRadius: "8px",
            }}
            title="Trang thanh toán gia hạn"
          />
        )}
      </Modal>
    </div>
  );
};
export default DangNhap;
