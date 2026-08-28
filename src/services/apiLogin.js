import axios from "axios";
import {
  url_login_api,
  environment,
  url_session_status,
  getServicesUrl,
  getLogoutUrl,
  getSessionStatusUrl,
} from "./url";

const urlApi = getServicesUrl;
const urlLoginApi = url_login_api;
const urlLogoutApi = getLogoutUrl;

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const AUTO_REFRESH_RETRY_DELAY_MS = 30 * 1000;
const MIN_REFRESH_DELAY_MS = 5 * 1000;

// Static auth headers for login authentication
const LOGIN_AUTH_HEADERS = {
  "X-Sof-User-Token": process.env.REACT_APP_LOGIN_AUTH_TOKEN || "8c4f2b9a71d6e3c9f0ab42d5e8c1f7a39b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8",
  "Content-Type": "application/json",
  Accept: "application/json",
};

// Static auth headers for service authentication after login
const SERVICES_AUTH_HEADERS = {
  "X-Sof-User-Token": process.env.REACT_APP_SERVICES_AUTH_TOKEN || process.env.REACT_APP_LOGIN_AUTH_TOKEN || "8c4f2b9a71d6e3c9f0ab42d5e8c1f7a39b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8",
  "SOF-User-Token": process.env.REACT_APP_SERVICES_AUTH_TOKEN || process.env.REACT_APP_LOGIN_AUTH_TOKEN || "8c4f2b9a71d6e3c9f0ab42d5e8c1f7a39b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8",
  "Content-Type": "application/json",
  Accept: "application/json",
};

const LOGIN_REQUEST_CONFIG = {
  headers: LOGIN_AUTH_HEADERS,
  timeout: 5000,
};

let authCache = null;
let authExpiry = null;
let lastCredentials = null;
let refreshPromise = null;
let autoRefreshTimer = null;
let autoRefreshEnabled = false;
let sessionConflictHandler = null;
const SESSION_CONFLICT_CODE = "session_conflict";
const SESSION_STATUS_ACTION = "session_status";

const normalizeSessionStatusResponse = (data) => {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      valid: false,
      message: data && data.message ? data.message : "invalid_response",
    };
  }

  if (typeof data.valid === "boolean") {
    return data;
  }

  if (String(data.message || "").toLowerCase() === SESSION_CONFLICT_CODE) {
    return {
      ...data,
      success: false,
      valid: false,
      message: SESSION_CONFLICT_CODE,
    };
  }

  return {
    ...data,
    valid: Boolean(data.success),
  };
};

const shouldAttemptSessionStatusFallback = (error) => {
  if (!error) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  return status === 404 || status === 500 || status === 0;
};

const isInvalidAuthResponse = (data) => {
  if (data === null || data === undefined) {
    return false;
  }

  if (typeof data === "string") {
    const normalized = data.toLowerCase();
    return normalized === "invalid" || normalized.includes("invalid token");
  }

  const message = data.message || data.error || data.statusMessage;
  if (!message) {
    return false;
  }

  const normalizedMessage = String(message).toLowerCase();
  return (
    normalizedMessage === "invalid" ||
    normalizedMessage.includes("invalid token")
  );
};

const isSessionConflictResponse = (data) => {
  if (!data) {
    return false;
  }
  const message =
    typeof data === "string"
      ? data
      : data.message || data.error || data.statusMessage;
  if (!message) {
    return false;
  }
  return String(message).toLowerCase() === SESSION_CONFLICT_CODE;
};

export const setSessionConflictHandler = (handler) => {
  sessionConflictHandler = typeof handler === "function" ? handler : null;
};

const notifySessionConflict = (message) => {
  if (typeof sessionConflictHandler === "function") {
    try {
      sessionConflictHandler(message);
    } catch (notifyError) {
      console.error("Session conflict handler failed:", notifyError);
    }
  }
};

function clearAutoRefreshTimer() {
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function scheduleAutoRefresh() {
  clearAutoRefreshTimer();

  if (!autoRefreshEnabled || !authExpiry || !lastCredentials) {
    return;
  }

  const now = Date.now();
  let refreshDelay = authExpiry - TOKEN_REFRESH_THRESHOLD_MS - now;

  if (!Number.isFinite(refreshDelay) || refreshDelay <= 0) {
    refreshDelay = MIN_REFRESH_DELAY_MS;
  }

  autoRefreshTimer = setTimeout(async () => {
    try {
      await getAuthToken(true);
    } catch (error) {
      console.error(
        "Automatic token refresh failed, will retry shortly:",
        error?.message || error,
      );
      autoRefreshTimer = setTimeout(
        scheduleAutoRefresh,
        AUTO_REFRESH_RETRY_DELAY_MS,
      );
      return;
    }

    scheduleAutoRefresh();
  }, refreshDelay);
}

const buildCredentialsPayload = (
  username,
  password,
  deviceType = "desktop",
  typeCode = process.env.REACT_APP_TYPE_SOF_CODE || "ERP",
) => ({
  method: "loginUser",
  username,
  password,
  deviceType,
  "TYPE-SOF-CODE": typeCode,
});

const getResponseUserCode = (result) =>
  result?.username || result?.code || result?.userCode || result?.txtUserName || "";

const cacheAuthResult = (result) => {
  const code = getResponseUserCode(result);
  authCache = {
    token: result.token,
    code,
    userId: result.userId || 1,
    role: result.role,
    chiNhanh: result.chiNhanh,
    deviceType: result.deviceType,
    right: result.right,
    counter: result.counter,
  };
  authExpiry = Date.now() + TOKEN_TTL_MS;
  scheduleAutoRefresh();
  return authCache;
};

const performLoginHandshake = async (credentials, options = {}) => {
  const isForce = Boolean(options.forceLogout);
  const payload = {
    ...credentials,
    forceLogout: isForce,
    force_logout: isForce,
  };

  if (options.currentToken) {
    payload.currentToken = options.currentToken;
  }

  if (options.vcode !== undefined && options.vcode !== null) {
    payload.vcode = options.vcode;
  }

  console.log("[SOF_DEBUG] >>> LOGIN REQUEST PAYLOAD:", JSON.stringify(payload, null, 2));
  const res = await axios.post(urlLoginApi, payload, LOGIN_REQUEST_CONFIG);
  console.log("[SOF_DEBUG] <<< LOGIN RESPONSE DATA:", JSON.stringify(res.data, null, 2));
  return res.data;
};

const requestLoginToken = async (credentials, options = {}) => {
  if (!credentials) {
    throw new Error("Missing credentials for login request");
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const result = await performLoginHandshake(credentials, options);

    if (result?.requiresForceLogout) {
      throw new Error("force_logout_required");
    }

    if (!result || !result.token || !getResponseUserCode(result)) {
      throw new Error(result?.message || "Invalid API response");
    }

    return cacheAuthResult(result);
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export function startTokenAutoRefresh() {
  autoRefreshEnabled = true;
  scheduleAutoRefresh();
}

export function stopTokenAutoRefresh() {
  autoRefreshEnabled = false;
  clearAutoRefreshTimer();
}

export async function refreshAuthToken() {
  return getAuthToken(true);
}

async function getAuthToken(forceRefresh = false) {
  if (authCache && authCache.token) {
    return authCache;
  }

  throw new Error("Invalid session. Please log in again.");
}

export async function getAuthHeaders(forceRefresh = false) {
  // Return static auth headers with user token if available
  try {
    const authData = await getAuthToken(forceRefresh);
    return {
      ...SERVICES_AUTH_HEADERS,
      "x-user-username": authData.code,
      "x-user-code": authData.code,
      "x-user-token": authData.token,
      "x-user-right": authData.right,
      "x-user-counter": authData.counter,
      "X-USER-CODE": authData.code,
      "X-USER-TOKEN": authData.token,
      "X-USER-RIGHT": authData.right,
      "X-USER-COUNTER": authData.counter,
    };
  } catch (error) {
    // Fallback to static headers without user token
    return {
      ...SERVICES_AUTH_HEADERS,
    };
  }
}

const isForceLogoutRequired = (data, status) => {
  if (!data && status !== 2001) return false;
  if (data?.requiresForceLogout === true || data?.requires_force_logout === true) return true;
  if (data?.status === 2001 || data?.status === "2001" || status === 2001) return true;
  const msg = String(data?.message || data?.error || "").toLowerCase();
  if (
    msg === "session_conflict" ||
    msg === "requires_force_logout" ||
    msg.includes("đã đăng nhập") ||
    msg.includes("nơi khác") ||
    msg.includes("thiết bị khác") ||
    msg.includes("trên máy khác")
  ) {
    return true;
  }
  return false;
};

async function callApiWithAuth(payload, retryCount = 0) {
  try {
    const headers = await getAuthHeaders(retryCount > 0);
    const apiUrl = typeof urlApi === "function" ? urlApi() : urlApi;
    const res = await axios.post(apiUrl, payload, { headers });
    const data = res.data;

    if (isSessionConflictResponse(data) || isInvalidAuthResponse(data)) {
      clearAuthCache();
      notifySessionConflict(
        "Tài khoản của bạn đã được đăng nhập ở nơi khác. Vui lòng đăng nhập lại.",
      );
      return { success: false, isSessionConflict: true };
    }

    return data;
  } catch (error) {
    if (
      error.response?.status === 401 ||
      isSessionConflictResponse(error.response?.data) ||
      isInvalidAuthResponse(error.response?.data)
    ) {
      clearAuthCache();
      notifySessionConflict(
        "Tài khoản của bạn đã được đăng nhập ở nơi khác. Vui lòng đăng nhập lại.",
      );
      return { success: false, isSessionConflict: true };
    }
    throw error;
  }
}

export async function login(username, password, options = {}) {
  const credentials = buildCredentialsPayload(
    username,
    password,
    options.deviceType || "desktop",
    options.typeCode || process.env.REACT_APP_TYPE_SOF_CODE || "ERP",
  );
  lastCredentials = credentials;

  try {
    const handshakeResponse = await performLoginHandshake(credentials, {
      forceLogout: Boolean(options.forceLogout),
      currentToken: options.currentToken || authCache?.token,
      vcode: options.vcode,
    });

    const isForceLogout = isForceLogoutRequired(handshakeResponse, handshakeResponse?.status);
    console.log("[SOF_DEBUG] handshakeResponse parsed:", handshakeResponse);
    console.log("[SOF_DEBUG] isForceLogoutRequired check:", isForceLogout);

    if (isForceLogout) {
      return {
        success: false,
        requiresForceLogout: true,
        message: handshakeResponse.message || "Tài khoản đang đăng nhập ở thiết bị khác",
        code: getResponseUserCode(handshakeResponse),
        chiNhanh: handshakeResponse.chiNhanh,
      };
    }

    if (handshakeResponse?.requires_captcha) {
      return {
        success: false,
        requires_captcha: true,
        captcha_data: handshakeResponse.captcha_data,
        message: handshakeResponse.message || "Vui lòng xác minh Captcha",
      };
    }

    if (
      !handshakeResponse ||
      !handshakeResponse.token ||
      !getResponseUserCode(handshakeResponse)
    ) {
      return {
        success: false,
        message: handshakeResponse?.message || "Đăng nhập thất bại",
        error_code: handshakeResponse?.error_code,
      };
    }

    // Thời gian chờ 20ms để hệ thống kịp ghi token giữa máy xác thực và máy dịch vụ DB
    await new Promise((resolve) => setTimeout(resolve, 20));

    const authData = cacheAuthResult(handshakeResponse);
    startTokenAutoRefresh();

    // Prefer domain/method from server response; fallback to current login URL
    let domainFromUrl = null;
    let methodFromUrl = null;
    try {
      const base =
        (typeof window !== "undefined" && window?.location?.origin) ||
        environment?.apiOrigin ||
        "http://localhost:3000";
      const loginUrl =
        typeof urlLoginApi === "function" ? urlLoginApi() : urlLoginApi;
      const apiUrl = new URL(loginUrl, base);
      domainFromUrl = apiUrl.hostname + (apiUrl.port ? ":" + apiUrl.port : "");
      methodFromUrl = apiUrl.protocol.replace(":", "");
    } catch (e) {
      domainFromUrl = null;
      methodFromUrl = null;
    }

    const domain = handshakeResponse?.domain || domainFromUrl;
    const method = handshakeResponse?.method || methodFromUrl;

    return {
      success: true,
      token: authData.token,
      userCode: authData.code,
      role: authData.role,
      chiNhanh: authData.chiNhanh,
      deviceType: authData.deviceType,
      domain,

      method,
      right: authData.right,
      counter: authData.counter,
      expireWarning: handshakeResponse?.expireWarning || false,
      expireDate: handshakeResponse?.expireDate || "",
      daysRemaining: handshakeResponse?.daysRemaining ?? 999,
      invalidDate: handshakeResponse?.invalidDate || handshakeResponse?.daysRemaining === -999,
      expiryMessage: handshakeResponse?.message || "",
      receiptId: handshakeResponse?.receiptId || handshakeResponse?.orderId,
      email: handshakeResponse?.email || handshakeResponse?.userCode || "",
    };
  } catch (error) {
    const responseData = error.response?.data;
    const messageFromServer = responseData?.message;
    const status = error.response?.status;

    console.log("[SOF_DEBUG] LOGIN ERROR CATCH:", {
      status,
      responseData,
      errorMessage: error.message,
    });

    const isForceLogout = isForceLogoutRequired(responseData, status);
    console.log("[SOF_DEBUG] isForceLogoutRequired on catch:", isForceLogout);

    if (isForceLogout) {
      return {
        success: false,
        requiresForceLogout: true,
        message: messageFromServer || "Tài khoản đang đăng nhập ở thiết bị khác",
      };
    }

    if (responseData?.requires_captcha) {
      return {
        success: false,
        requires_captcha: true,
        captcha_data: responseData.captcha_data,
        message: messageFromServer || "Vui lòng xác minh Captcha",
        status,
      };
    }

    return {
      success: false,
      message: messageFromServer || error.message || "Đăng nhập thất bại",
      error_code: responseData?.error_code,
      status,
    };
  }
}

export async function performLogout(username, token, deviceType = "desktop") {
  const userToken = token || (authCache ? authCache.token : "") || localStorage.getItem("pmbh_token") || "8c4f2b9a71d6e3c9f0ab42d5e8c1f7a39b6d0e4f1a2c8b7d5e9f3a1c6b4d2e8";
  
  const payload = {
    method: "logoutUser",
    username: username || "",
    deviceType: deviceType || "desktop",
  };

  const logoutHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-SOF-USER-TOKEN": userToken,
  };

  try {
    const logoutUrl = typeof getLogoutUrl === "function" ? getLogoutUrl() : (urlLogoutApi || "http://localhost/signout.sof.vn/index.php");
    console.log("[SOF_DEBUG] >>> LOGOUT REQUEST:", logoutUrl, JSON.stringify(payload, null, 2), logoutHeaders);
    const res = await axios.post(logoutUrl, payload, {
      headers: logoutHeaders,
      timeout: 5000,
    });
    console.log("[SOF_DEBUG] <<< LOGOUT RESPONSE:", res.data);
    return res.data;
  } catch (error) {
    console.warn("Logout API warning:", error?.message || error);
    return { success: false, message: error?.message || "Logout failed" };
  }
}

export function clearAuthCache() {
  stopTokenAutoRefresh();
  authCache = null;
  authExpiry = null;
  lastCredentials = null;
}

export async function verifySession(code, token) {
  if (!code || !token) {
    throw new Error("missing_session_info");
  }

  const payload = {
    code,
    token,
  };

  try {
    const sessionUrl =
      typeof getSessionStatusUrl === "function"
        ? getSessionStatusUrl()
        : url_session_status;
    const res = await axios.post(sessionUrl, payload, LOGIN_REQUEST_CONFIG);
    return normalizeSessionStatusResponse(res.data);
  } catch (error) {
    if (!shouldAttemptSessionStatusFallback(error)) {
      throw error;
    }

    const fallbackPayload = {
      ...payload,
      action: SESSION_STATUS_ACTION,
    };

    const fallbackResponse = await axios.post(
      urlLoginApi,
      fallbackPayload,
      LOGIN_REQUEST_CONFIG,
    );
    return normalizeSessionStatusResponse(fallbackResponse.data);
  }
}

export const authDebug = {
  get cache() {
    return authCache;
  },
  get expiresAt() {
    return authExpiry;
  },
  get hasCredentials() {
    return Boolean(lastCredentials);
  },
};

const apiLoginService = {
  login,
  performLogout,
  getAuthHeaders,
  clearAuthCache,
  verifySession,
  startTokenAutoRefresh,
  stopTokenAutoRefresh,
  refreshAuthToken,
  authDebug,
  environment,
  callApiWithAuth,
  get urlLogoutApi() {
    return typeof urlLogoutApi === "function" ? urlLogoutApi() : urlLogoutApi;
  },
  setSessionConflictHandler,
};

export default apiLoginService;
