import {
  isElectron,
  isDevelopment,
  normalizeOrigin,
} from "../utils/environment";

const API_BASE_PATH = "/gmac";
const LOGIN_PATH = `${API_BASE_PATH}/login/index.php`;
const LOGOUT_PATH = `${API_BASE_PATH}/signout.sof.vn/index.php`;
const SESSION_STATUS_PATH = `${API_BASE_PATH}/login.sof.vn/session_status.php`;
const SERVICES_PATH = `${API_BASE_PATH}/services.sof.vn/index.php`;

const DEFAULT_API_ORIGIN = normalizeOrigin(
  process.env.REACT_APP_API_ORIGIN || "http://192.168.1.18"
);
const DEFAULT_IMAGE_ORIGIN = normalizeOrigin(
  process.env.REACT_APP_IMAGE_ORIGIN || DEFAULT_API_ORIGIN
);
const DEFAULT_CHART_URL =
  process.env.REACT_APP_CHART_API_URL || "http://192.168.1.91:5000/areaCharts";
const CHART_PROXY_PATH = process.env.REACT_APP_CHART_PROXY_PATH || "";

const shouldUseDevProxy =
  !isElectron &&
  isDevelopment &&
  process.env.REACT_APP_DISABLE_DEV_PROXY !== "true";

const apiOriginForRuntime = shouldUseDevProxy ? "" : DEFAULT_API_ORIGIN;
const imageOriginForRuntime = shouldUseDevProxy ? "" : DEFAULT_IMAGE_ORIGIN;

const buildUrl = (origin, path) => {
  if (!origin) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${origin}/${path}`;
  }

  return `${origin}${path}`;
};

const baseUrl = buildUrl(apiOriginForRuntime, API_BASE_PATH);
const loginUrl = buildUrl(apiOriginForRuntime, LOGIN_PATH);
const logoutUrl = buildUrl(apiOriginForRuntime, LOGOUT_PATH);
const sessionStatusUrl = buildUrl(apiOriginForRuntime, SESSION_STATUS_PATH);
const servicesUrl = buildUrl(apiOriginForRuntime, SERVICES_PATH);
const imageBaseUrl = buildUrl(imageOriginForRuntime, API_BASE_PATH);

const chartUrl =
  shouldUseDevProxy && CHART_PROXY_PATH ? CHART_PROXY_PATH : DEFAULT_CHART_URL;

export const url_api_services = servicesUrl;
export const url_login_api = loginUrl;
export const url_api_logout = logoutUrl;
export const url_session_status = sessionStatusUrl;
export const url_api = baseUrl;
export const url_chart_api = chartUrl;
export const url_image_base = imageBaseUrl;

export const environment = {
  isElectron,
  isDevelopment,
  usesDevProxy: shouldUseDevProxy,
  apiOrigin: apiOriginForRuntime || "relative",
  imageOrigin: imageOriginForRuntime || "relative",
  baseUrl,
  loginUrl,
  logoutUrl,
  sessionStatusUrl,
  servicesUrl,
  chartUrl,
  imageBaseUrl,
};
