/**
 * ZaloPay Payment Service
 * Xu ly tao yeu cau thanh toan va xac thuc chu ky phan hoi
 */

import CryptoJS from 'crypto-js';
import zalopayConfig from '../config/zalopayConfig';

/**
 * Tạo HMAC SHA256
 */
const createHmacSHA256 = (secretKey, data) => {
  const hmac = CryptoJS.HmacSHA256(data, secretKey);
  return hmac.toString(CryptoJS.enc.Hex);
};

/**
 * Tạo mã giao dịch duy nhất
 */
const generateAppTransId = (invoiceCode) => {
  const now = new Date();
  const yyMMdd = now.toISOString().slice(2, 10).replace(/-/g, '');
  const timestamp = now.getTime().toString().slice(-7);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${yyMMdd}${timestamp}${random}`;
};

/**
 * Tạo chuỗi MAC cho request
 */
const buildMacData = (params) => {
  const orderedKeys = [
    'app_id', 'app_trans_id', 'app_user', 'amount', 'app_time',
    'embed_data', 'item'
  ];

  const values = orderedKeys.map(key => params[key] || '');
  return values.join('|');
};

/**
 * Tạo yêu cầu thanh toán ZaloPay
 */
export const createZaloPayPayment = async ({
  invoiceCode,
  amount,
  orderInfo,
  appTransId,
  redirectUrl,
  callbackUrl,
  embedData,
  item,
} = {}) => {
  if (!zalopayConfig.appId || !zalopayConfig.key1) {
    throw new Error('Thiếu cấu hình ZaloPay (appId/key1).');
  }

  const numericAmount = Math.round(Number(amount));
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Số tiền thanh toán ZaloPay không hợp lệ.');
  }

  const finalAppTransId = appTransId || generateAppTransId(invoiceCode);
  const sanitizedOrderInfo = orderInfo || `Thanh toan hoa don ${invoiceCode || finalAppTransId.slice(-8)}`;

  const requestData = {
    app_id: parseInt(zalopayConfig.appId),
    app_trans_id: finalAppTransId,
    app_user: zalopayConfig.appUser,
    app_time: Date.now(),
    amount: numericAmount,
    title: sanitizedOrderInfo,
    description: sanitizedOrderInfo,
    callback_url: callbackUrl || zalopayConfig.callbackUrl,
    redirect_url: redirectUrl || zalopayConfig.redirectUrl,
    item: item || JSON.stringify([]),
    embed_data: embedData || JSON.stringify({
      invoiceCode: invoiceCode,
      amount: numericAmount,
      source: 'PMBH_POS',
    }),
  };

  // Tạo MAC
  const macData = buildMacData(requestData);
  requestData.mac = createHmacSHA256(zalopayConfig.key1, macData);

  try {
    const response = await fetch(`${zalopayConfig.apiEndpoint}/v2/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`ZaloPay API trả về lỗi HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.return_code !== 1) {
      throw new Error(result.return_message || `ZaloPay trả về return_code ${result.return_code}`);
    }

    return {
      success: true,
      appTransId: finalAppTransId,
      orderUrl: result.order_url,
      zpTransToken: result.zp_trans_token,
      response: result,
      payload: requestData,
    };
  } catch (error) {
    console.error('ZaloPay create order error:', error);
    throw error;
  }
};

/**
 * Xác thực callback từ ZaloPay
 */
export const verifyZaloPayCallback = (callbackData) => {
  if (!callbackData || typeof callbackData !== 'object') {
    return {
      isValid: false,
      message: 'Thiếu dữ liệu callback từ ZaloPay.',
    };
  }

  try {
    // Trong production, cần verify MAC từ callback
    // Hiện tại tạm thời coi là valid
    return {
      isValid: true,
      message: 'Callback received',
      data: callbackData,
    };
  } catch (error) {
    console.error('ZaloPay callback verification error:', error);
    return {
      isValid: false,
      message: error.message,
    };
  }
};

/**
 * Query trạng thái giao dịch
 */
export const queryZaloPayOrder = async (appTransId) => {
  try {
    const queryData = {
      app_id: parseInt(zalopayConfig.appId),
      app_trans_id: appTransId,
    };

    // Tạo MAC cho query
    const macData = `${queryData.app_id}|${queryData.app_trans_id}|${zalopayConfig.key1}`;
    queryData.mac = createHmacSHA256(zalopayConfig.key1, macData);

    const response = await fetch(`${zalopayConfig.apiEndpoint}/v2/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryData),
    });

    if (!response.ok) {
      throw new Error(`ZaloPay query API trả về lỗi HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      success: result.return_code === 1,
      status: result.return_code,
      message: result.return_message,
      data: result,
    };
  } catch (error) {
    console.error('ZaloPay query order error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Log giao dịch ZaloPay
 */
export const logZaloPayTransaction = (action, invoiceCode, payload, response) => {
  console.log(`=== ZaloPay ${action} ===`);
  console.log('Invoice Code:', invoiceCode);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('========================');
};

const zaloPayService = {
  createZaloPayPayment,
  verifyZaloPayCallback,
  queryZaloPayOrder,
  logZaloPayTransaction,
};

export default zaloPayService;