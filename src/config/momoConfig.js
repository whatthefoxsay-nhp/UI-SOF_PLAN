/**
 * MoMo Payment Configuration
 * Cau hinh mac dinh cho tich hop MoMo (sandbox hoac production)
 */

// Helper to safely read environment variables (React exposes REACT_APP_ vars at build time)
const getEnvVar = (key, fallback = '') => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const momoConfig = {
  partnerCode: getEnvVar('REACT_APP_MOMO_PARTNER_CODE', 'MOMO'),
  accessKey: getEnvVar('REACT_APP_MOMO_ACCESS_KEY', 'F8BBA842ECF85'),
  secretKey: getEnvVar('REACT_APP_MOMO_SECRET_KEY', 'K951B6PE1waDMi640xX08PD3vg6EkVlz'),
  apiEndpoint: getEnvVar(
    'REACT_APP_MOMO_API_ENDPOINT',
    'https://test-payment.momo.vn/v2/gateway/api/create'
  ),
  redirectUrl: getEnvVar(
    'REACT_APP_MOMO_REDIRECT_URL',
    'http://localhost:3000/payment/momo-return'
  ),
  ipnUrl: getEnvVar('REACT_APP_MOMO_IPN_URL', 'http://localhost:3000/api/momo/ipn'),
  requestType: getEnvVar('REACT_APP_MOMO_REQUEST_TYPE', 'captureWallet'),
  lang: getEnvVar('REACT_APP_MOMO_LANG', 'vi'),
  autoCapture: getEnvVar('REACT_APP_MOMO_AUTO_CAPTURE', 'true') !== 'false',
  orderGroupId: getEnvVar('REACT_APP_MOMO_ORDER_GROUP_ID', ''),
  extraData: getEnvVar('REACT_APP_MOMO_EXTRA_DATA', ''),
};

if (process.env?.NODE_ENV === 'development') {
  console.log('=== MoMo Configuration ===');
  console.log('Partner Code:', momoConfig.partnerCode);
  console.log('API Endpoint:', momoConfig.apiEndpoint);
  console.log('Redirect URL:', momoConfig.redirectUrl);
  console.log('IPN URL:', momoConfig.ipnUrl);
  console.log(
    'Access Key:',
    momoConfig.accessKey ? `${momoConfig.accessKey.slice(0, 4)}***${momoConfig.accessKey.slice(-3)}` : 'NOT SET'
  );
  console.log(
    'Secret Key:',
    momoConfig.secretKey ? `***${momoConfig.secretKey.slice(-4)}` : 'NOT SET'
  );
  console.log('==========================');
}

export default momoConfig;
