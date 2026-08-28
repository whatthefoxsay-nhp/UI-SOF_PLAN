const { createProxyMiddleware } = require("http-proxy-middleware");

const API_PROXY_PATH = process.env.REACT_APP_API_PROXY_PATH || "/gmac";
const API_PROXY_TARGET =
  process.env.PMBH_API_PROXY_TARGET ||
  process.env.REACT_APP_API_ORIGIN ||
  "http://localhost";
const API_PROXY_BASE_PATH =
  process.env.PMBH_API_PROXY_BASE_PATH ||
  process.env.REACT_APP_API_PROXY_BASE_PATH ||
  "/gmac";
const DISABLE_PROXY = process.env.REACT_APP_DISABLE_DEV_PROXY === "true";
const PROXY_LOG_LEVEL = process.env.PMBH_PROXY_LOG_LEVEL || "warn";

const CHART_PROXY_PATH = process.env.REACT_APP_CHART_PROXY_PATH;
const CHART_PROXY_TARGET =
  process.env.PMBH_CHART_PROXY_TARGET || process.env.REACT_APP_CHART_API_URL;

module.exports = function setupProxy(app) {
  if (!DISABLE_PROXY) {
    app.use(
      [API_PROXY_PATH, `${API_PROXY_PATH}/**`],
      createProxyMiddleware({
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        logLevel: PROXY_LOG_LEVEL,
        pathRewrite: (path) => {
          if (!API_PROXY_PATH || API_PROXY_PATH === "/") {
            return path;
          }

          const normalizedBase =
            !API_PROXY_BASE_PATH || API_PROXY_BASE_PATH === "/"
              ? ""
              : API_PROXY_BASE_PATH.startsWith("/")
                ? API_PROXY_BASE_PATH
                : `/${API_PROXY_BASE_PATH}`;

          const rewritten = path.replace(
            new RegExp(`^${API_PROXY_PATH}`),
            normalizedBase || ""
          );

          return rewritten.startsWith("//")
            ? rewritten.replace(/^\/+/, "/")
            : rewritten;
        },
        onError(err, req, res) {
          console.error("Proxy error:", err.message);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "text/plain" });
          }
          res.end("Proxy error: " + err.message);
        },
        onProxyRes(proxyRes) {
          proxyRes.headers["Access-Control-Allow-Origin"] = "*";
          proxyRes.headers["Access-Control-Allow-Methods"] =
            "GET,PUT,POST,DELETE,OPTIONS";
          proxyRes.headers["Access-Control-Allow-Headers"] =
            "Content-Type, Authorization, Content-Length, X-Requested-With, X-USER-CODE, X-USER-TOKEN";
        },
      })
    );
  }

  if (!DISABLE_PROXY && CHART_PROXY_PATH && CHART_PROXY_TARGET) {
    app.use(
      [CHART_PROXY_PATH, `${CHART_PROXY_PATH}/**`],
      createProxyMiddleware({
        target: CHART_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        logLevel: PROXY_LOG_LEVEL,
        pathRewrite: { [`^${CHART_PROXY_PATH}`]: "" },
        onError(err, req, res) {
          console.error("Chart proxy error:", err.message);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "text/plain" });
          }
          res.end("Chart proxy error: " + err.message);
        },
      })
    );
  }
};
