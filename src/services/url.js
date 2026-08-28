import {
  isElectron,
  isDevelopment,
  normalizeOrigin,
} from "../utils/environment";

const getApiBasePath = () => {
  const origin = process.env.REACT_APP_API_ORIGIN || "";
  if (
    origin.includes("192.168.1.20") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1")
  ) {
    return "/v2.des.plan.banhangonline.top";
  }
  return "";
};

const API_BASE_PATH = getApiBasePath();
const isLocalApiOrigin = Boolean(API_BASE_PATH);


const LOGIN_PATH = isLocalApiOrigin
  ? `http://localhost/pmQLNS/login/index.php`
  : `${API_BASE_PATH}/login/index.php`;

const LOGOUT_PATH = isLocalApiOrigin
  ? `${API_BASE_PATH}/logout.php`
  : `${API_BASE_PATH}/logout.php`;
const SESSION_STATUS_PATH = LOGIN_PATH;
const SERVICES_PATH = `${API_BASE_PATH}/services.sof.vn/index.php`;

// const SERVICES_PATH = `http://localhost/pmQLNS/services.sof.vn/index.php`;

const PROXY_PATH = `${API_BASE_PATH}/services.sof.vn/proxy.php`;

const DEFAULT_API_ORIGIN = normalizeOrigin(
  process.env.REACT_APP_API_ORIGIN || "http://localhost:3000",
);
const DEFAULT_LOGIN_ORIGIN = normalizeOrigin(
  process.env.REACT_APP_LOGIN_ORIGIN || "http://localhost",
);
const DEFAULT_IMAGE_ORIGIN = normalizeOrigin(
  process.env.REACT_APP_IMAGE_ORIGIN || DEFAULT_API_ORIGIN,
);
const DEFAULT_CHART_URL =
  process.env.REACT_APP_CHART_API_URL || "http://localhost:5555/areaCharts";
const CHART_PROXY_PATH = process.env.REACT_APP_CHART_PROXY_PATH || "";

const shouldUseDevProxy = false;

let dynamicApiConfig = null;

export const setDynamicApiConfig = (config) => {
  if (config && config.domain) {
    let cleanMethod = (config.method || "http").replace(/[^a-zA-Z]/g, "").toLowerCase() || "http";
    const protocolMatch = config.domain.match(/^(https?):\/\//i);
    if (protocolMatch) {
      cleanMethod = protocolMatch[1].toLowerCase();
    }

    const cleanDomain = config.domain
      .replace(/^https?:\/\//i, "")
      .replace(/^https?:\/\//i, "")
      .replace(/^https?(\/\/)/i, "")
      .replace(/\/$/, "");

    const newOrigin = `${cleanMethod}://${cleanDomain}`;
    dynamicApiConfig = {
      domain: cleanDomain,
      method: cleanMethod,
      origin: newOrigin,
    };

    // Dynamically update exported variables
    url_api = buildUrl(newOrigin, API_BASE_PATH);
    url_image_base = buildUrl(newOrigin, API_BASE_PATH);
    url_api_services = buildUrl(newOrigin, SERVICES_PATH);
    url_proxy_upload = buildUrl(newOrigin, PROXY_PATH);
    url_api_logout = buildUrl(newOrigin, LOGOUT_PATH);

    // Parse host to set chart port to 5555
    let chartHost = cleanDomain;
    if (chartHost.includes(":")) {
      chartHost = chartHost.split(":")[0];
    }
    url_chart_api = `${cleanMethod}://${chartHost}:5555/areaCharts`;

    // Sync environment object
    environment.apiOrigin = newOrigin;
    environment.imageOrigin = newOrigin;
    environment.baseUrl = url_api;
    environment.servicesUrl = url_api_services;
    environment.chartUrl = url_chart_api;
    environment.imageBaseUrl = url_image_base;

  
  } else {
    dynamicApiConfig = null;
    url_api = baseUrl;
    url_image_base = imageBaseUrl;
    url_api_services = servicesUrl;
    url_proxy_upload = proxyUrl;
    url_api_logout = logoutUrl;
    url_chart_api = chartUrl;

    environment.apiOrigin = DEFAULT_API_ORIGIN;
    environment.imageOrigin = DEFAULT_IMAGE_ORIGIN;
    environment.baseUrl = baseUrl;
    environment.servicesUrl = servicesUrl;
    environment.chartUrl = chartUrl;
    environment.imageBaseUrl = imageBaseUrl;
  }
};

export const clearDynamicApiConfig = () => {
  setDynamicApiConfig(null);
};

export const getDynamicApiConfig = () => dynamicApiConfig;

const getApiOrigin = () => {
  if (shouldUseDevProxy) {
    return "";
  }
  return dynamicApiConfig ? dynamicApiConfig.origin : DEFAULT_API_ORIGIN;
};

const getImageOrigin = () => {
  if (shouldUseDevProxy) {
    return "";
  }
  return dynamicApiConfig ? dynamicApiConfig.origin : DEFAULT_IMAGE_ORIGIN;
};

const buildUrl = (origin, path) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  let finalUrl = "";
  if (!origin) {
    finalUrl = path;
  } else if (!path.startsWith("/")) {
    finalUrl = `${origin}/${path}`;
  } else {
    finalUrl = `${origin}${path}`;
  }

  if (shouldUseDevProxy && !isElectron && isDevelopment) {
    let targetUrl = finalUrl;
    if (!origin) {
      targetUrl = !path.startsWith("/")
        ? `${DEFAULT_API_ORIGIN}/${path}`
        : `${DEFAULT_API_ORIGIN}${path}`;
    }

    const baseOrigin = origin || DEFAULT_API_ORIGIN;
    const proxyUrl = `${baseOrigin}${API_BASE_PATH}/services.sof.vn/proxy.php`;
    return `${proxyUrl}?target_url=${encodeURIComponent(targetUrl)}`;
  }

  return finalUrl;
};

export const wrapInProxy = (targetUrl) => {
  if (!shouldUseDevProxy || isElectron || !isDevelopment) return targetUrl;

  const origin = getApiOrigin();
  const baseOrigin = origin || DEFAULT_API_ORIGIN;
  const proxyUrl = `${baseOrigin}${API_BASE_PATH}/services.sof.vn/proxy.php`;
  return `${proxyUrl}?target_url=${encodeURIComponent(targetUrl)}`;
};

export const buildApiUrl = (path) => buildUrl(getApiOrigin(), path);
export const buildImageUrl = (path) => buildUrl(getImageOrigin(), path);

const getLoginOrigin = () => {
  try {
    return new URL(DEFAULT_LOGIN_ORIGIN).origin;
  } catch (e) {
    const match = DEFAULT_LOGIN_ORIGIN.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] : DEFAULT_LOGIN_ORIGIN;
  }
};

export const getLoginUrl = () => loginUrl;
export const getLogoutUrl = () => logoutUrl;
export const getSessionStatusUrl = () => sessionStatusUrl;
export const getServicesUrl = () => buildApiUrl(SERVICES_PATH);
export const getBaseUrl = () => buildApiUrl(API_BASE_PATH);
export const getImageBaseUrl = () => buildImageUrl(API_BASE_PATH);

const loginUrl = buildUrl(
  shouldUseDevProxy ? "" : getLoginOrigin(),
  LOGIN_PATH,
);
const logoutUrl = buildUrl(
  shouldUseDevProxy ? "" : getLoginOrigin(),
  LOGOUT_PATH,
);
const sessionStatusUrl = buildUrl(
  shouldUseDevProxy ? "" : getLoginOrigin(),
  SESSION_STATUS_PATH,
);
const servicesUrl = buildUrl(
  shouldUseDevProxy ? "" : DEFAULT_API_ORIGIN,
  SERVICES_PATH,
);
const proxyUrl = buildUrl(
  shouldUseDevProxy ? "" : DEFAULT_API_ORIGIN,
  PROXY_PATH,
);
const baseUrl = buildUrl(
  shouldUseDevProxy ? "" : DEFAULT_API_ORIGIN,
  API_BASE_PATH,
);
const imageBaseUrl = buildUrl(
  shouldUseDevProxy ? "" : DEFAULT_IMAGE_ORIGIN,
  API_BASE_PATH,
);

const chartUrl =
  shouldUseDevProxy && CHART_PROXY_PATH ? CHART_PROXY_PATH : DEFAULT_CHART_URL;

export let url_api_services = servicesUrl;
export let url_proxy_upload = proxyUrl;
export let url_login_api = loginUrl;
export let url_api_logout = logoutUrl;
export let url_session_status = sessionStatusUrl;
export let url_api = baseUrl;
export let url_chart_api = chartUrl;
export let url_image_base = imageBaseUrl;

export const environment = {
  isElectron,
  isDevelopment,
  usesDevProxy: shouldUseDevProxy,
  apiOrigin: shouldUseDevProxy ? "relative" : DEFAULT_API_ORIGIN,
  imageOrigin: shouldUseDevProxy ? "relative" : DEFAULT_IMAGE_ORIGIN,
  baseUrl,
  loginUrl,
  logoutUrl,
  sessionStatusUrl,
  servicesUrl,
  chartUrl,
  imageBaseUrl,
  getDynamicOrigin: () => (dynamicApiConfig ? dynamicApiConfig.origin : null),
};
