/**
 * ZaloPay Payment Configuration
 * Cau hinh mac dinh cho tich hop ZaloPay (sandbox hoac production)
 */

// Helper to safely read environment variables (React exposes REACT_APP_ vars at build time)
const getEnvVar = (key, fallback = '') => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const zalopayConfig = {
  appId: getEnvVar('REACT_APP_ZALOPAY_APP_ID', '2553'),
  key1: getEnvVar('REACT_APP_ZALOPAY_KEY1', 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL'),
  key2: getEnvVar('REACT_APP_ZALOPAY_KEY2', 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz'),
  apiEndpoint: getEnvVar(
    'REACT_APP_ZALOPAY_API_ENDPOINT',
    'https://sb-openapi.zalopay.vn'
  ),
  redirectUrl: getEnvVar(
    'REACT_APP_ZALOPAY_REDIRECT_URL',
    'http://localhost:3000/payment/zalopay-return'
  ),
  callbackUrl: getEnvVar('REACT_APP_ZALOPAY_CALLBACK_URL', 'http://localhost:3000/api/zalopay/callback'),
  appUser: getEnvVar('REACT_APP_ZALOPAY_APP_USER', 'PMBH_POS'),
};

if (process.env?.NODE_ENV === 'development') {
  console.log('=== ZaloPay Configuration ===');
  console.log('App ID:', zalopayConfig.appId);
  console.log('API Endpoint:', zalopayConfig.apiEndpoint);
  console.log('Redirect URL:', zalopayConfig.redirectUrl);
  console.log('Callback URL:', zalopayConfig.callbackUrl);
  console.log(
    'Key1:',
    zalopayConfig.key1 ? `${zalopayConfig.key1.slice(0, 4)}***${zalopayConfig.key1.slice(-3)}` : 'NOT SET'
  );
  console.log(
    'Key2:',
    zalopayConfig.key2 ? `***${zalopayConfig.key2.slice(-4)}` : 'NOT SET'
  );
  console.log('==========================');
}

export default zalopayConfig;