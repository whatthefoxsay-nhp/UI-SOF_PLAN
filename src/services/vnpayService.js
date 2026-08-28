/**
 * VNPay Payment Service
 * Xử lý tạo URL thanh toán, xác thực chữ ký và IPN
 */

import CryptoJS from 'crypto-js';
import qs from 'qs';
import vnpayConfig from '../config/vnpayConfig';

/**
 * Tạo chữ ký HMAC SHA512
 */
const createHmacSHA512 = (secretKey, data) => {
  const hmac = CryptoJS.HmacSHA512(data, secretKey);
  return hmac.toString(CryptoJS.enc.Hex);
};

/**
 * Loại bỏ các tham số null/undefined/empty string
 */
const filterParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    )
  );

/**
 * Tạo chuỗi hash/query theo đúng chuẩn VNPay (PHP urlencode)
 * Sử dụng RFC1738 để space = + (tương thích VNPay PHP)
 * QUAN TRỌNG: Phải đồng nhất tuyệt đối cho cả ký và query
 */
const buildSignedQuery = (params) => {
  const filtered = filterParams(params);
  const sorted = Object.keys(filtered)
    .sort()
    .reduce((o, k) => ((o[k] = filtered[k]), o), {});
  // Encode kiểu form (space = '+') cho cả ký và query
  return qs.stringify(sorted, { encode: true, format: 'RFC1738' });
};

/**
 * Loại bỏ dấu tiếng Việt và ký tự đặc biệt trong OrderInfo
 */
const sanitizeOrderInfo = (text) => {
  if (!text) {
    return 'Thanh toan don hang';
  }

  const normalized = text
    .normalize('NFD')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[\u007f-\u009f]/g, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  const cleaned = normalized.replace(/[^0-9A-Za-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return cleaned ? cleaned.slice(0, 255) : 'Thanh toan don hang';
};

/**
 * Format date theo định dạng yyyyMMddHHmmss
 */
const formatDateTime = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const normalizeVNPayCode = (code) => {
  if (code === null || code === undefined) {
    return '';
  }
  const value = String(code);
  return value === '0' ? '00' : value;
};

/**
 * Tạo mã giao dịch duy nhất (TxnRef)
 * Format: Chỉ [A-Z a-z 0-9], độ dài ≤ 34 (theo VNPay sandbox)
 */
const generateTxnRef = (invoiceCode) => {
  const base = String(invoiceCode)
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 12);
  const ts = Date.now().toString(36).slice(-10);
  const rnd = Math.random().toString(36).slice(2, 6);
  return (base + ts + rnd).slice(0, 34);
};

/**
 * Lấy địa chỉ IP của client
 * Trong môi trường Electron, có thể dùng IP mặc định
 */
const getClientIpAddress = () => {
  // Trong Electron Desktop, sử dụng IP local hoặc IP public nếu có
  return '127.0.0.1';
};

/**
 * Tạo URL thanh toán VNPay
 * @param {Object} invoiceData - Thông tin hóa đơn
 * @param {string} invoiceData.maHd - Mã hóa đơn
 * @param {number} invoiceData.tongTien - Tổng tiền (VNĐ)
 * @param {string} invoiceData.moTa - Mô tả đơn hàng
 * @param {boolean} directToQR - Hiển thị trực tiếp màn hình QR
 * @returns {Object} { paymentUrl, txnRef, signData }
 */
export const createVNPayPaymentUrl = (invoiceData, directToQR = true) => {
  try {
    const { maHd, tongTien, moTa } = invoiceData;
    if (!maHd || tongTien === undefined || tongTien === null) {
      throw new Error('Thiếu thông tin mã hóa đơn hoặc tổng tiền');
    }
    const numericAmount = Number(tongTien);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Tổng tiền không hợp lệ');
    }
    const txnRef = generateTxnRef(maHd);
    const createDate = formatDateTime(new Date());

    const amount = Math.round(numericAmount * 100);

    // Tạo params theo đúng thứ tự và đầy đủ theo tài liệu VNPay
    const baseParams = {
      vnp_Version: vnpayConfig.vnp_Version,
      vnp_Command: vnpayConfig.vnp_Command,
      vnp_TmnCode: vnpayConfig.vnp_TmnCode,
      vnp_Amount: amount,
      vnp_CreateDate: createDate,
      vnp_CurrCode: vnpayConfig.vnp_CurrCode,
      vnp_IpAddr: vnpayConfig.vnp_ClientIp || getClientIpAddress(),
      vnp_Locale: vnpayConfig.vnp_Locale,
      vnp_OrderInfo: sanitizeOrderInfo(moTa || `Thanh toan hoa don ${maHd}`),
      vnp_OrderType: vnpayConfig.vnp_OrderType, // BẮT BUỘC - loại đơn hàng
      vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
      vnp_TxnRef: txnRef,
    };

    // Thêm vnp_BankCode nếu muốn chuyển thẳng đến QR code của ngân hàng cụ thể
    if (directToQR && vnpayConfig.vnp_BankCode_QR) {
      baseParams.vnp_BankCode = vnpayConfig.vnp_BankCode_QR;
    }

    const vnpParams = filterParams(baseParams);

    // Log all parameters for debugging
    console.log('VNPay Request Parameters:');
    console.log('  - vnp_TmnCode:', vnpParams.vnp_TmnCode);
    console.log('  - vnp_Amount:', vnpParams.vnp_Amount);
    console.log('  - vnp_OrderType:', vnpParams.vnp_OrderType);
    console.log('  - vnp_IpAddr:', vnpParams.vnp_IpAddr);
    console.log('  - vnp_OrderInfo:', vnpParams.vnp_OrderInfo);
    console.log('  - vnp_ReturnUrl:', vnpParams.vnp_ReturnUrl);

    const signData = buildSignedQuery(vnpParams);
    const secureHash = createHmacSHA512(vnpayConfig.vnp_HashSecret, signData);

    const paymentUrl = `${vnpayConfig.vnp_Url}?${signData}&vnp_SecureHash=${secureHash}`;

    // Log để debug (production nên tắt)
    console.log('=== VNPay Payment URL Generation ===');
    console.log('TxnRef:', txnRef);
    console.log('Amount:', amount, '(VNĐ:', numericAmount, ')');
    console.log('Sign Data:', signData);
    console.log('Secure Hash:', secureHash);
    console.log('Payment URL (masked):', paymentUrl.replace(/vnp_TmnCode=[^&]+/, 'vnp_TmnCode=***'));
    console.log('===================================');

    return {
      success: true,
      paymentUrl,
      txnRef,
      signData,
      secureHash,
      amount: numericAmount,
      createDate,
    };
  } catch (error) {
    console.error('Error creating VNPay payment URL:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Xác thực chữ ký từ VNPay Return URL
 * @param {Object} queryParams - Các tham số từ return URL
 * @returns {Object} { isValid, message, vnp_ResponseCode, vnp_TransactionStatus, ... }
 */
export const verifyVNPayReturnUrl = (queryParams) => {
  try {
    const vnp_SecureHash = queryParams.vnp_SecureHash;

    if (!vnp_SecureHash) {
      throw new Error('Thiếu chữ ký từ VNPay');
    }

    // Loại bỏ các tham số không cần thiết
    const paramsToVerify = { ...queryParams };
    delete paramsToVerify.vnp_SecureHash;
    delete paramsToVerify.vnp_SecureHashType;

    // Tạo chuỗi dữ liệu
    const signData = buildSignedQuery(paramsToVerify);

    // Tạo chữ ký để so sánh
    const secureHash = createHmacSHA512(vnpayConfig.vnp_HashSecret, signData);

    // So sánh chữ ký
    const isValid = secureHash === vnp_SecureHash;

    // Lấy thêm các field quan trọng để caller sử dụng
    const vnp_ResponseCode = normalizeVNPayCode(queryParams.vnp_ResponseCode);
    const vnp_TransactionStatus = normalizeVNPayCode(queryParams.vnp_TransactionStatus);
    const vnp_TxnRef = queryParams.vnp_TxnRef;

    const vnp_Amount = Number.isFinite(parseInt(queryParams.vnp_Amount))
      ? parseInt(queryParams.vnp_Amount)
      : undefined;

    const isSuccess = vnp_ResponseCode === '00' && vnp_TransactionStatus === '00';

    console.log('=== VNPay Return URL Verification ===');
    console.log('Sign Data:', signData);
    console.log('Expected Hash:', secureHash);
    console.log('Received Hash:', vnp_SecureHash);
    console.log('Is Valid:', isValid);
    console.log('vnp_ResponseCode:', vnp_ResponseCode);
    console.log('vnp_TransactionStatus:', vnp_TransactionStatus);
    console.log('TxnRef:', vnp_TxnRef);
    console.log('=====================================');

    return {
      isValid,
      message: isValid ? 'Chữ ký hợp lệ' : 'Chữ ký không hợp lệ',
      vnp_ResponseCode,
      vnp_TransactionStatus,
      isSuccess,
      txnRef: vnp_TxnRef,
      amount: vnp_Amount ? vnp_Amount / 100 : undefined,
      bankCode: queryParams.vnp_BankCode,
      bankTranNo: queryParams.vnp_BankTranNo,
      cardType: queryParams.vnp_CardType,
      payDate: queryParams.vnp_PayDate,
      transactionNo: queryParams.vnp_TransactionNo,
      orderInfo: queryParams.vnp_OrderInfo,
    };
  } catch (error) {
    console.error('Error verifying VNPay return URL:', error);
    return {
      isValid: false,
      message: error.message,
    };
  }
};

/**
 * Xác thực IPN từ VNPay
 * @param {Object} queryParams - Các tham số từ IPN request
 * @returns {Object} { isValid, shouldConfirm, responseCode, vnp_ResponseCode, vnp_TransactionStatus, ... }
 */
export const verifyVNPayIPN = (queryParams) => {
  try {
    // Bước 1: Kiểm tra chữ ký
    const verification = verifyVNPayReturnUrl(queryParams);

    if (!verification.isValid) {
      return {
        isValid: false,
        shouldConfirm: false,
        responseCode: '97', // Signature không đúng
        message: 'Chữ ký không hợp lệ',
      };
    }

    // Bước 2: Kiểm tra mã phản hồi từ VNPay
    const vnp_ResponseCode = normalizeVNPayCode(queryParams.vnp_ResponseCode);
    const vnp_TransactionStatus = normalizeVNPayCode(queryParams.vnp_TransactionStatus);

    // Chỉ coi là thành công khi cả 2 mã đều là 00
    const isSuccess = vnp_ResponseCode === '00' && vnp_TransactionStatus === '00';

    // Bước 3: Kiểm tra TxnRef
    const vnp_TxnRef = queryParams.vnp_TxnRef;

    // Bước 4: Kiểm tra số tiền
    const vnp_Amount = parseInt(queryParams.vnp_Amount);
    // TODO: So khớp số tiền với database
    // const expectedAmount = getAmountFromDatabase(vnp_TxnRef);
    // if (vnp_Amount !== expectedAmount * 100) {
    //   return { isValid: false, shouldConfirm: false, responseCode: '04', message: 'Số tiền không khớp' };
    // }

    console.log('=== VNPay IPN Verification ===');
    console.log('Response Code:', vnp_ResponseCode);
    console.log('Transaction Status:', vnp_TransactionStatus);
    console.log('TxnRef:', vnp_TxnRef);
    console.log('Amount:', vnp_Amount / 100, 'VNĐ');
    console.log('Is Success:', isSuccess);
    console.log('==============================');

    return {
      isValid: true,
      shouldConfirm: isSuccess,
      responseCode: isSuccess ? '00' : vnp_ResponseCode, // Mã trả về cho VNPay
      vnp_ResponseCode,
      vnp_TransactionStatus,
      message: isSuccess ? 'Giao dịch thành công' : 'Giao dịch thất bại',
      txnRef: vnp_TxnRef,
      amount: vnp_Amount / 100,
      bankCode: queryParams.vnp_BankCode,
      bankTranNo: queryParams.vnp_BankTranNo,
      cardType: queryParams.vnp_CardType,
      payDate: queryParams.vnp_PayDate,
      transactionNo: queryParams.vnp_TransactionNo,
      orderInfo: queryParams.vnp_OrderInfo,
    };
  } catch (error) {
    console.error('Error verifying VNPay IPN:', error);
    return {
      isValid: false,
      shouldConfirm: false,
      responseCode: '99', // Lỗi không xác định
      message: error.message,
    };
  }
};

/**
 * Parse response code từ VNPay thành message tiếng Việt
 */
export const getVNPayResponseMessage = (responseCode) => {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
    '09': 'Thẻ/Tài khoản chưa đăng ký InternetBanking',
    '10': 'Xác thực thông tin thẻ/tài khoản sai quá 3 lần',
    '11': 'Hết hạn chờ thanh toán, vui lòng thanh toán lại',
    '12': 'Thẻ/Tài khoản bị khóa',
    '13': 'Nhập sai OTP',
    '24': 'Khách hàng hủy giao dịch',
    '51': 'Không đủ số dư',
    '65': 'Vượt hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
    '97': 'Chữ ký không hợp lệ',
    '99': 'Các lỗi khác',
  };
  return messages[responseCode] || 'Lỗi không xác định';
};

/**
 * Lưu log giao dịch VNPay
 * @param {Object} logData - Dữ liệu log
 */
export const logVNPayTransaction = (logData) => {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    ...logData,
  };

  // Log ra console
  console.log('=== VNPay Transaction Log ===');
  console.log(JSON.stringify(log, null, 2));
  console.log('============================');

  // TODO: Lưu vào database hoặc file log
  // saveToDatabase(log);

  return log;
};

export default {
  createVNPayPaymentUrl,
  verifyVNPayReturnUrl,
  verifyVNPayIPN,
  getVNPayResponseMessage,
  logVNPayTransaction,
};
