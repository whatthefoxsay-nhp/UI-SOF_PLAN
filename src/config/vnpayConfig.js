/**
 * VNPay Configuration
 * Cấu hình thanh toán VNPay cho sandbox và production
 */

// Helper function to safely read environment variables
const getEnvVar = (key, fallback = '') => {
  // In browser, React exposes process.env with REACT_APP_ variables at build time
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const vnpayConfig = {
  // Terminal Code (Mã website của merchant)
  vnp_TmnCode: getEnvVar('REACT_APP_VNP_TMN_CODE', 'HF0KUL29'),

  // Secret Key để ký HMAC-SHA512
  vnp_HashSecret: getEnvVar('REACT_APP_VNP_HASH_SECRET', 'DQQ45HXFYTQ3N90OM4QIQC8B1PNZUEVE'),

  // URL thanh toán VNPay
  vnp_Url: getEnvVar('REACT_APP_VNP_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),

  // URL nhận kết quả trả về sau khi thanh toán (Return URL)
  vnp_ReturnUrl: getEnvVar('REACT_APP_VNP_RETURN_URL', 'http://localhost:3000/payment/vnpay-success'),

  // URL nhận thông báo IPN (Instant Payment Notification)
  vnp_IpnUrl: getEnvVar('REACT_APP_VNP_IPN_URL', ''),

  // Version API
  vnp_Version: '2.1.0',

  // Command thanh toán
  vnp_Command: 'pay',

  // Mã tiền tệ (VND)
  vnp_CurrCode: 'VND',

  // Ngôn ngữ hiển thị (vn hoặc en)
  vnp_Locale: 'vn',

  // Mã ngân hàng để hiển thị QR trực tiếp (để trống = hiển thị tất cả)
  vnp_BankCode_QR: '',

  // Thời gian hết hạn thanh toán (phút)
  vnp_ExpireMinutes: 15,

  // Order Type (đặt 'other' theo khuyến nghị VNPay)
  vnp_OrderType: getEnvVar('REACT_APP_VNP_ORDER_TYPE', 'other'),

  // Tuỳ chọn ép IP client (để trống để loại khỏi request)
  vnp_ClientIp: getEnvVar('REACT_APP_VNP_CLIENT_IP', ''),
};

// Log config for debugging (chỉ trong development)
if (process.env.NODE_ENV === 'development') {
  console.log('=== VNPay Configuration ===');
  console.log('TMN Code:', vnpayConfig.vnp_TmnCode);
  console.log('Payment URL:', vnpayConfig.vnp_Url);
  console.log('Return URL:', vnpayConfig.vnp_ReturnUrl);
  console.log('IPN URL:', vnpayConfig.vnp_IpnUrl);
  console.log('Hash Secret:', vnpayConfig.vnp_HashSecret ? '***' + vnpayConfig.vnp_HashSecret.slice(-4) : 'NOT SET');
  console.log('==========================');
}

export default vnpayConfig;
