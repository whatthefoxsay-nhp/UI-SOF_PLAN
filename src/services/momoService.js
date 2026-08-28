/**
 * MoMo Payment Service
 * Xu ly tao yeu cau thanh toan va xac thuc chu ky phan hoi
 */

import CryptoJS from 'crypto-js';
import momoConfig from '../config/momoConfig';

const REQUEST_SIGNATURE_FIELDS = [
  'accessKey',
  'amount',
  'extraData',
  'ipnUrl',
  'orderId',
  'orderInfo',
  'partnerCode',
  'redirectUrl',
  'requestId',
  'requestType',
];

const RETURN_SIGNATURE_FIELDS = [
  'accessKey',
  'amount',
  'extraData',
  'message',
  'orderId',
  'orderInfo',
  'orderType',
  'partnerCode',
  'payType',
  'requestId',
  'responseTime',
  'resultCode',
  'transId',
];

const normalizeNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.round(num);
};

const sanitizeOrderInfo = (text) => {
  if (!text) {
    return 'Thanh toan don hang';
  }

  const normalized = text
    .normalize('NFD')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[\u007f-\u009f]/g, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');

  const cleaned = normalized.replace(/[^0-9A-Za-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return 'Thanh toan don hang';
  }

  return cleaned.slice(0, 255);
};

const buildSignatureString = (fields, dataMap) =>
  fields
    .map((key) => `${key}=${dataMap[key] ?? ''}`)
    .join('&');

const createHmacSHA256 = (secretKey, data) =>
  CryptoJS.HmacSHA256(data, secretKey).toString(CryptoJS.enc.Hex);

const ensureExtraDataString = (extraData) => {
  if (!extraData) {
    return '';
  }

  if (typeof extraData === 'string') {
    return extraData;
  }

  try {
    return JSON.stringify(extraData);
  } catch (error) {
    console.warn('Failed to encode MoMo extraData, fallback to empty string:', error);
    return '';
  }
};

const generateOrderId = (invoiceCode) => {
  const prefix = (invoiceCode || momoConfig.partnerCode || 'ORDER')
    .toString()
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 12);
  return `${prefix}${Date.now()}`;
};

const generateRequestId = (orderId) => `${orderId}-${Math.random().toString(36).slice(2, 10)}`;

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    console.error('Unable to parse MoMo response JSON:', error);
    return null;
  }
};

export const createMoMoPayment = async ({
  invoiceCode,
  amount,
  orderInfo,
  orderId,
  requestId,
  redirectUrl,
  ipnUrl,
  extraData,
  requestType,
  lang,
  orderGroupId,
  autoCapture,
} = {}) => {
  if (!momoConfig.partnerCode || !momoConfig.accessKey || !momoConfig.secretKey) {
    throw new Error('Thieu cau hinh MoMo (partnerCode/accessKey/secretKey).');
  }

  const numericAmount = normalizeNumber(amount);
  if (numericAmount <= 0) {
    throw new Error('So tien thanh toan MoMo khong hop le.');
  }

  const finalOrderId = orderId || generateOrderId(invoiceCode);
  const finalRequestId = requestId || generateRequestId(finalOrderId);
  const sanitizedOrderInfo =
    orderInfo || `Thanh toan hoa don ${invoiceCode || finalOrderId.slice(-8)}`;

  const payloadCommon = {
    partnerCode: momoConfig.partnerCode,
    accessKey: momoConfig.accessKey,
    orderId: finalOrderId,
    requestId: finalRequestId,
    amount: numericAmount.toString(),
    orderInfo: sanitizeOrderInfo(sanitizedOrderInfo),
    redirectUrl: redirectUrl || momoConfig.redirectUrl,
    ipnUrl: ipnUrl ?? momoConfig.ipnUrl ?? '',
    extraData: ensureExtraDataString(extraData ?? momoConfig.extraData),
    requestType: requestType || momoConfig.requestType || 'captureWallet',
  };

  const signatureSource = buildSignatureString(REQUEST_SIGNATURE_FIELDS, payloadCommon);
  const signature = createHmacSHA256(momoConfig.secretKey, signatureSource);

  const body = {
    ...payloadCommon,
    lang: lang || momoConfig.lang || 'vi',
    autoCapture:
      typeof autoCapture === 'boolean'
        ? autoCapture
        : momoConfig.autoCapture,
    orderGroupId: orderGroupId || momoConfig.orderGroupId || '',
    signature,
  };

  const response = await fetch(momoConfig.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `MoMo API tra ve loi HTTP ${response.status}: ${errorText || 'Unknown error'}`
    );
  }

  const result = await parseJsonSafe(response);

  if (!result) {
    throw new Error('Khong the doc du lieu phan hoi tu MoMo.');
  }

  if (result.resultCode !== 0) {
    throw new Error(result.message || `MoMo tra ve resultCode ${result.resultCode}`);
  }

  return {
    success: true,
    orderId: finalOrderId,
    requestId: finalRequestId,
    payUrl: result.payUrl || result.shortLink || '',
    deeplink: result.deeplink || '',
    qrCodeUrl: result.qrCodeUrl || '',
    response: result,
    payload: body,
  };
};

export const verifyMoMoReturnSignature = (queryParams = {}) => {
  if (!queryParams || typeof queryParams !== 'object') {
    return {
      isValid: false,
      message: 'Thieu tham so phan hoi tu MoMo.',
    };
  }

  const receivedSignature = queryParams.signature || '';

  const signatureData = {
    accessKey: momoConfig.accessKey,
    amount: queryParams.amount ?? '',
    extraData: queryParams.extraData ?? '',
    message: queryParams.message ?? '',
    orderId: queryParams.orderId ?? '',
    orderInfo: queryParams.orderInfo ?? '',
    orderType: queryParams.orderType ?? '',
    partnerCode: queryParams.partnerCode ?? '',
    payType: queryParams.payType ?? '',
    requestId: queryParams.requestId ?? '',
    responseTime: queryParams.responseTime ?? '',
    resultCode: queryParams.resultCode ?? '',
    transId: queryParams.transId ?? '',
  };

  const signatureSource = buildSignatureString(RETURN_SIGNATURE_FIELDS, signatureData);
  const expectedSignature = createHmacSHA256(momoConfig.secretKey, signatureSource);
  const isValid = receivedSignature === expectedSignature;

  return {
    isValid,
    expectedSignature,
    receivedSignature,
    signatureSource,
    signatureData,
  };
};

export const normalizeMoMoResultCode = (code) => {
  if (code === null || code === undefined) {
    return '-1';
  }
  return code.toString();
};

export const getMoMoResultMessage = (resultCode) => {
  const messages = {
    '0': 'Giao dich thanh cong.',
    '9000': 'Giao dich da duoc xac nhan thanh cong.',
    '7000': 'Thanh toan dang duoc xu ly.',
    '8000': 'Giao dich dang cho nguoi dung xac nhan.',
    '11': 'Giao dich bi tu choi vi sai dinh dang du lieu.',
    '12': 'Giao dich bi tu choi do sai thong tin xac thuc.',
    '13': 'Giao dich bi tu choi do loi he thong.',
    '20': 'Giao dich bi tu choi vi so tien khong hop le.',
    '40': 'Giao dich bi tu choi do bi nghi ngo gian lan.',
    '51': 'So du tai khoan khong du.',
    '58': 'Tai khoan khong duoc phep giao dich.',
    '1000': 'Giao dich da bi huy boi nguoi dung.',
    '1001': 'Giao dich da ton tai.',
    '1002': 'Sai chu ky.',
    '1003': 'Sai ma doi tac.',
    '2001': 'He thong MoMo dang bao tri.',
  };

  const key = normalizeMoMoResultCode(resultCode);
  return messages[key] || 'Khong the xac dinh trang thai giao dich.';
};

export const logMoMoTransaction = (logData = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...logData,
  };

  console.log('=== MoMo Transaction Log ===');
  console.log(JSON.stringify(logEntry, null, 2));
  console.log('============================');
  return logEntry;
};

export default {
  createMoMoPayment,
  verifyMoMoReturnSignature,
  normalizeMoMoResultCode,
  getMoMoResultMessage,
  logMoMoTransaction,
};
