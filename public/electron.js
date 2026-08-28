const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  shell,
  nativeImage,
} = require("electron");
const path = require("path");
// Tránh phụ thuộc vào electron-is-dev (throw lỗi khi chạy môi trường Mac/sandbox)
const isDev =
  (process.env.ELECTRON_IS_DEV === "true" ||
    process.env.NODE_ENV === "development") &&
  !app.isPackaged;
const IPCHandlers = require("./ipcHandlers");
const { URL } = require("url");
let mainWindow;
let ipcHandlers;
let customerDisplayWindow = null;
let vnpayPaymentWindow = null;
let vnpayPaymentParent = null;
let vnpayReturnUrl = null;
let momoPaymentWindow = null;
let momoPaymentParent = null;
let momoReturnUrl = null;
let zalopayPaymentWindow = null;
let zalopayPaymentParent = null;
let zalopayReturnUrl = null;
let paymentSuccessWindow = null;

const notifyVNPayParent = (payload) => {
  if (vnpayPaymentParent && !vnpayPaymentParent.isDestroyed()) {
    vnpayPaymentParent.send("vnpay:payment-result", payload);
  }
};

const closeVNPayPaymentWindow = () => {
  if (vnpayPaymentWindow && !vnpayPaymentWindow.isDestroyed()) {
    vnpayPaymentWindow.close();
  }
  vnpayPaymentWindow = null;
  vnpayPaymentParent = null;
  vnpayReturnUrl = null;
};

const handleVNPayReturnUrl = (targetUrl) => {
  if (!targetUrl || !vnpayReturnUrl) {
    return false;
  }

  try {
    const normalizedReturn = vnpayReturnUrl.trim();
    if (!normalizedReturn) {
      return false;
    }

    const parsedTarget = new URL(targetUrl);
    const parsedReturn = new URL(normalizedReturn, parsedTarget.origin);

    if (parsedTarget.origin !== parsedReturn.origin) {
      return false;
    }

    if (!parsedTarget.pathname.startsWith(parsedReturn.pathname)) {
      return false;
    }

    const queryEntries = Object.fromEntries(
      parsedTarget.searchParams.entries(),
    );

    notifyVNPayParent({
      source: "vnpay-window",
      url: targetUrl,
      query: queryEntries,
    });

    closeVNPayPaymentWindow();
    return true;
  } catch (error) {
    console.error("Failed to process VNPay return URL:", error);
    notifyVNPayParent({
      source: "vnpay-window",
      error: error.message,
      url: targetUrl,
    });
    closeVNPayPaymentWindow();
    return false;
  }
};

const openVNPayPaymentWindow = ({ paymentUrl, returnUrl }, sender) => {
  try {
    if (!paymentUrl) {
      throw new Error("Missing VNPay payment URL");
    }

    vnpayPaymentParent = sender;
    vnpayReturnUrl = returnUrl || null;

    if (vnpayPaymentWindow && !vnpayPaymentWindow.isDestroyed()) {
      vnpayPaymentWindow.loadURL(paymentUrl);
      vnpayPaymentWindow.focus();
      return { success: true };
    }

    vnpayPaymentWindow = new BrowserWindow({
      width: 480,
      height: 720,
      minWidth: 360,
      minHeight: 640,
      show: false,
      backgroundColor: "#ffffff",
      autoHideMenuBar: true,
      parent: mainWindow ?? undefined,
      modal: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: !app.isPackaged,
      },
    });

    vnpayPaymentWindow.on("closed", () => {
      if (vnpayPaymentParent && !vnpayPaymentParent.isDestroyed()) {
        vnpayPaymentParent.send("vnpay:payment-window-closed");
      }
      closeVNPayPaymentWindow();
    });

    vnpayPaymentWindow.webContents.on("will-redirect", (event, url) => {
      if (handleVNPayReturnUrl(url)) {
        event.preventDefault();
      }
    });

    vnpayPaymentWindow.webContents.on("did-navigate", (_event, url) => {
      handleVNPayReturnUrl(url);
    });

    vnpayPaymentWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    });

    vnpayPaymentWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        if (
          errorCode === -105 &&
          vnpayReturnUrl &&
          validatedURL &&
          validatedURL.startsWith(vnpayReturnUrl)
        ) {
          // Host unreachable for return URL, but we already handled it in will-redirect
          return;
        }
        console.error(
          "VNPay window failed to load:",
          errorCode,
          errorDescription,
          validatedURL,
        );
      },
    );

    vnpayPaymentWindow.loadURL(paymentUrl);
    vnpayPaymentWindow.once("ready-to-show", () => {
      if (vnpayPaymentWindow) {
        vnpayPaymentWindow.show();
        vnpayPaymentWindow.focus();
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error opening VNPay payment window:", error);
    if (sender && !sender.isDestroyed()) {
      sender.send("vnpay:payment-result", {
        source: "vnpay-window",
        error: error.message,
      });
    }
    closeVNPayPaymentWindow();
    return { success: false, error: error.message };
  }
};

const notifyMoMoParent = (payload) => {
  if (momoPaymentParent && !momoPaymentParent.isDestroyed()) {
    momoPaymentParent.send("momo:payment-result", payload);
  }
};

const closeMoMoPaymentWindow = () => {
  if (momoPaymentWindow && !momoPaymentWindow.isDestroyed()) {
    momoPaymentWindow.close();
  }
  momoPaymentWindow = null;
  momoPaymentParent = null;
  momoReturnUrl = null;
};

const handleMoMoReturnUrl = (targetUrl) => {
  if (!targetUrl || !momoReturnUrl) {
    return false;
  }

  try {
    const normalizedReturn = momoReturnUrl.trim();
    if (!normalizedReturn) {
      return false;
    }

    const parsedTarget = new URL(targetUrl);
    const parsedReturn = new URL(normalizedReturn, parsedTarget.origin);

    if (parsedTarget.origin !== parsedReturn.origin) {
      return false;
    }

    if (!parsedTarget.pathname.startsWith(parsedReturn.pathname)) {
      return false;
    }

    const queryEntries = Object.fromEntries(
      parsedTarget.searchParams.entries(),
    );

    notifyMoMoParent({
      source: "momo-window",
      url: targetUrl,
      query: queryEntries,
    });

    closeMoMoPaymentWindow();
    return true;
  } catch (error) {
    console.error("Failed to process MoMo return URL:", error);
    notifyMoMoParent({
      source: "momo-window",
      error: error.message,
      url: targetUrl,
    });
    closeMoMoPaymentWindow();
    return false;
  }
};

const openMoMoPaymentWindow = ({ paymentUrl, returnUrl }, sender) => {
  try {
    if (!paymentUrl) {
      throw new Error("Missing MoMo payment URL");
    }

    momoPaymentParent = sender;
    momoReturnUrl = returnUrl || null;

    if (momoPaymentWindow && !momoPaymentWindow.isDestroyed()) {
      momoPaymentWindow.loadURL(paymentUrl);
      momoPaymentWindow.focus();
      return { success: true };
    }

    momoPaymentWindow = new BrowserWindow({
      width: 480,
      height: 720,
      minWidth: 360,
      minHeight: 640,
      show: false,
      backgroundColor: "#ffffff",
      autoHideMenuBar: true,
      parent: mainWindow ?? undefined,
      modal: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: !app.isPackaged,
      },
    });

    momoPaymentWindow.on("closed", () => {
      if (momoPaymentParent && !momoPaymentParent.isDestroyed()) {
        momoPaymentParent.send("momo:payment-window-closed");
      }
      closeMoMoPaymentWindow();
    });

    momoPaymentWindow.webContents.on("will-redirect", (event, url) => {
      if (handleMoMoReturnUrl(url)) {
        event.preventDefault();
      }
    });

    momoPaymentWindow.webContents.on("did-navigate", (_event, url) => {
      handleMoMoReturnUrl(url);
    });

    momoPaymentWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    });

    momoPaymentWindow.once("ready-to-show", () => {
      if (momoPaymentWindow && !momoPaymentWindow.isDestroyed()) {
        momoPaymentWindow.show();
      }
    });

    momoPaymentWindow.loadURL(paymentUrl);

    return { success: true };
  } catch (error) {
    console.error("Failed to open MoMo payment window:", error);
    notifyMoMoParent({
      source: "momo-window",
      error: error.message,
    });
    closeMoMoPaymentWindow();
    return { success: false, error: error.message };
  }
};

const notifyZaloPayParent = (payload) => {
  if (zalopayPaymentParent && !zalopayPaymentParent.isDestroyed()) {
    zalopayPaymentParent.send("zalopay:payment-result", payload);
  }
};

const closeZaloPayPaymentWindow = ({ force = false } = {}) => {
  if (!zalopayPaymentWindow || zalopayPaymentWindow.isDestroyed()) {
    return;
  }

  const targetWindow = zalopayPaymentWindow;

  const destroyWindow = () => {
    if (targetWindow.isDestroyed()) {
      return;
    }
    try {
      targetWindow.destroy();
    } catch (error) {
      console.error("Failed to destroy ZaloPay payment window:", error);
    }
  };

  try {
    if (force) {
      destroyWindow();
      return;
    }

    targetWindow.close();

    setTimeout(() => {
      if (
        zalopayPaymentWindow === targetWindow &&
        zalopayPaymentWindow &&
        !zalopayPaymentWindow.isDestroyed()
      ) {
        destroyWindow();
      }
    }, 400);
  } catch (error) {
    console.error("Failed to close ZaloPay payment window gracefully:", error);
    destroyWindow();
  }
};

const handleZaloPayReturnUrl = (targetUrl) => {
  if (!targetUrl || !zalopayReturnUrl) {
    return false;
  }

  try {
    const normalizedReturn = zalopayReturnUrl.trim();
    if (!normalizedReturn) {
      return false;
    }

    const parsedTarget = new URL(targetUrl);
    const parsedReturn = new URL(normalizedReturn, parsedTarget.origin);

    if (parsedTarget.origin !== parsedReturn.origin) {
      return false;
    }

    if (!parsedTarget.pathname.startsWith(parsedReturn.pathname)) {
      return false;
    }

    const queryEntries = Object.fromEntries(
      parsedTarget.searchParams.entries(),
    );

    notifyZaloPayParent({
      source: "zalopay-window",
      url: targetUrl,
      query: queryEntries,
    });

    closeZaloPayPaymentWindow({ force: true });
    return true;
  } catch (error) {
    console.error("Failed to process ZaloPay return URL:", error);
    notifyZaloPayParent({
      source: "zalopay-window",
      error: error.message,
      url: targetUrl,
    });
    closeZaloPayPaymentWindow({ force: true });
    return false;
  }
};

const openZaloPayPaymentWindow = ({ paymentUrl, returnUrl }, sender) => {
  try {
    if (!paymentUrl) {
      throw new Error("Missing ZaloPay payment URL");
    }

    zalopayPaymentParent = sender;
    zalopayReturnUrl = returnUrl || null;

    if (zalopayPaymentWindow && !zalopayPaymentWindow.isDestroyed()) {
      zalopayPaymentWindow.loadURL(paymentUrl);
      zalopayPaymentWindow.focus();
      return { success: true };
    }

    zalopayPaymentWindow = new BrowserWindow({
      width: 480,
      height: 720,
      minWidth: 360,
      minHeight: 640,
      show: false,
      backgroundColor: "#ffffff",
      autoHideMenuBar: true,
      parent: mainWindow ?? undefined,
      modal: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: !app.isPackaged,
      },
    });

    zalopayPaymentWindow.on("closed", () => {
      if (zalopayPaymentParent && !zalopayPaymentParent.isDestroyed()) {
        zalopayPaymentParent.send("zalopay:payment-window-closed");
      }
      zalopayPaymentWindow = null;
      zalopayPaymentParent = null;
      zalopayReturnUrl = null;
    });

    zalopayPaymentWindow.webContents.on("will-redirect", (event, url) => {
      if (handleZaloPayReturnUrl(url)) {
        event.preventDefault();
      }
    });

    zalopayPaymentWindow.webContents.on("did-navigate", (_event, url) => {
      handleZaloPayReturnUrl(url);
    });

    zalopayPaymentWindow.webContents.on("will-prevent-unload", (event) => {
      console.warn("ZaloPay window attempted to block unload, forcing close.");
      event.preventDefault();
      closeZaloPayPaymentWindow({ force: true });
    });

    zalopayPaymentWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    });

    zalopayPaymentWindow.once("ready-to-show", () => {
      if (zalopayPaymentWindow && !zalopayPaymentWindow.isDestroyed()) {
        zalopayPaymentWindow.show();
      }
    });

    zalopayPaymentWindow.loadURL(paymentUrl);

    return { success: true };
  } catch (error) {
    console.error("Failed to open ZaloPay payment window:", error);
    notifyZaloPayParent({
      source: "zalopay-window",
      error: error.message,
    });
    closeZaloPayPaymentWindow({ force: true });
    zalopayPaymentWindow = null;
    zalopayPaymentParent = null;
    zalopayReturnUrl = null;
    return { success: false, error: error.message };
  }
};

const openPaymentSuccessWindow = ({ key }) => {
  try {
    if (!key) {
      throw new Error("Missing payment success key");
    }

    const { screen } = require("electron");
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    const windowWidth = Math.floor(screenWidth * 0.7);
    const windowHeight = screenHeight;

    if (paymentSuccessWindow && !paymentSuccessWindow.isDestroyed()) {
      paymentSuccessWindow.__skipNotifyOnClose = true;
      paymentSuccessWindow.close();
    }

    paymentSuccessWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: 0,
      y: 0,
      show: false,
      backgroundColor: "#ffffff",
      autoHideMenuBar: true,
      parent: mainWindow ?? undefined,
      modal: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false,
        preload: path.join(__dirname, "preload.js"),
        devTools: !app.isPackaged,
      },
    });
    const successWindow = paymentSuccessWindow;
    successWindow.__skipNotifyOnClose = false;

    const baseURL = isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`;

    const fullURL = `${baseURL}#/payment/success?key=${key}`;

    successWindow.loadURL(fullURL);

    successWindow.once("ready-to-show", () => {
      if (successWindow && !successWindow.isDestroyed()) {
        successWindow.show();
        successWindow.focus();
      }
    });

    successWindow.on("closed", () => {
      if (
        !successWindow.__skipNotifyOnClose &&
        mainWindow &&
        !mainWindow.isDestroyed()
      ) {
        mainWindow.webContents.send("payment-success-window-closed");
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
      }

      if (paymentSuccessWindow === successWindow) {
        paymentSuccessWindow = null;
      }
      successWindow.__skipNotifyOnClose = false;
    });

    return { success: true };
  } catch (error) {
    console.error("Error opening payment success window:", error);
    return { success: false, error: error.message };
  }
};

function createWindow() {
  if (process.platform === "darwin") {
    const iconPath = path.join(__dirname, "logo.png");
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true,
      devTools: !app.isPackaged,
      webSecurity: isDev ? false : true,
    },
    icon: path.join(__dirname, process.platform === 'win32' ? 'logo.ico' : 'logo.png'),
    show: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    fullscreen: false,
    maximizable: true,
    frame: false,
  });

  const loadURL = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../build/index.html")}`;

  // Always log for debugging
  console.log("=== Electron Debug Info ===");
  console.log("isDev:", isDev);
  console.log("ELECTRON_IS_DEV env:", process.env.ELECTRON_IS_DEV);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("Loading URL:", loadURL);
  console.log("__dirname:", __dirname);
  console.log("Build path:", path.join(__dirname, "../build/index.html"));
  console.log("==========================");

  mainWindow.loadURL(loadURL);

  // Intercept links with target="_blank" to open in the system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
    if (isDev) console.log("Window shown successfully");

    // Chỉ mở DevTools khi có biến ELECTRON_OPEN_DEVTOOLS=true
    // Mặc định tắt để tránh DevTools dock bên phải làm hẹp viewport,
    // kích hoạt responsive mobile/tablet và đẩy form đăng nhập xuống dưới
    if (isDev && process.env.ELECTRON_OPEN_DEVTOOLS === "true") {
      mainWindow.webContents.openDevTools();
    }

    // Reset webContents zoom về 1 sau khi load để tránh trạng thái zoom cũ
    // làm lộ nền trắng dưới màn hình đăng nhập
    mainWindow.webContents.setZoomFactor(1);
  });

  // Enable F12 and Ctrl+Shift+I shortcut to toggle DevTools only in development/test environments
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (!app.isPackaged) {
      if (
        input.key === "F12" ||
        (input.control && input.shift && input.key.toLowerCase() === "i")
      ) {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    }
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      if (isDev)
        console.error(
          "Failed to load:",
          errorCode,
          errorDescription,
          validatedURL,
        );
    },
  );

  mainWindow.webContents.on("dom-ready", () => {
    if (isDev) console.log("DOM ready");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (isDev) console.log("Page finished loading");
  });

  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      if (isDev) console.log(`Console [${level}]: ${message}`);
    },
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (ipcHandlers) {
      ipcHandlers.removeAllHandlers();
      ipcHandlers = null;
    }
  });

  // Clear session data when window is closing
  mainWindow.on("close", (event) => {
    // Clear localStorage session data (not remembered credentials)
    mainWindow.webContents
      .executeJavaScript(
        `
      localStorage.removeItem('pmbh_user');
      localStorage.removeItem('pmbh_token');
    `,
      )
      .catch(() => {
        // Ignore errors if webContents is already destroyed
      });
  });

  // Tạo menu
  const viewSubmenu = [
    { role: "reload", label: "Tải lại" },
    { role: "forceReload", label: "Buộc tải lại" },
  ];

  // Bật Toggle DevTools ở môi trường phát triển/test
  if (!app.isPackaged) {
    viewSubmenu.push({ role: "toggleDevTools", label: "Công cụ phát triển" });
  }

  viewSubmenu.push(
    { type: "separator" },
    { role: "resetZoom", label: "Đặt lại zoom" },
    { role: "zoomIn", label: "Phóng to" },
    { role: "zoomOut", label: "Thu nhỏ" },
    { type: "separator" },
    { role: "togglefullscreen", label: "Toàn màn hình" }
  );

  const template = [
    {
      label: "Tệp",
      submenu: [
        {
          label: "Đăng xuất",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Chỉnh sửa",
      submenu: [
        { role: "undo", label: "Hoàn tác" },
        { role: "redo", label: "Làm lại" },
        { type: "separator" },
        { role: "cut", label: "Cắt" },
        { role: "copy", label: "Sao chép" },
        { role: "paste", label: "Dán" },
      ],
    },
    {
      label: "Xem",
      submenu: viewSubmenu,
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create customer display window
function createCustomerDisplayWindow() {
  if (customerDisplayWindow) {
    customerDisplayWindow.focus();
    return { success: true, message: "Window already exists" };
  }

  customerDisplayWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      devTools: !app.isPackaged,
    },
    title: "Customer Display - SOF PLAN",
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f7fa",
  });

  const displayURL = isDev
    ? "http://localhost:3000/#/customer-display"
    : `file://${path.join(__dirname, "../build/index.html")}#/customer-display`;

  customerDisplayWindow.loadURL(displayURL);

  customerDisplayWindow.once("ready-to-show", () => {
    customerDisplayWindow.show();
    if (isDev) console.log("Customer display window shown");
  });

  customerDisplayWindow.on("closed", () => {
    customerDisplayWindow = null;
    // Notify main window that customer display is closed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("customer-display-closed");
    }
  });

  return { success: true, message: "Customer display window created" };
}

// Close customer display window
function closeCustomerDisplayWindow() {
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    customerDisplayWindow.close();
    customerDisplayWindow = null;
    return { success: true, message: "Customer display closed" };
  }
  return { success: false, message: "No customer display window to close" };
}

// Send data to customer display
function sendToCustomerDisplay(data) {
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    customerDisplayWindow.webContents.send("customer-display-update", data);
    return { success: true };
  }
  return { success: false, message: "Customer display not available" };
}

// Đặt tên app để menu macOS không hiện "Electron" mặc định
app.setName("SOF CMS E-commerce");

app.whenReady().then(() => {
  createWindow();

  // Initialize IPC handlers
  ipcHandlers = new IPCHandlers();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Window control IPC handlers
ipcMain.handle("window-minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("window-close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle("app-quit", () => {
  app.quit();
});

// IPC handlers
ipcMain.handle("show-message-box", async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle("show-save-dialog", async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Customer Display IPC handlers
ipcMain.handle("open-customer-display", async () => {
  return createCustomerDisplayWindow();
});

ipcMain.handle("close-customer-display", async () => {
  return closeCustomerDisplayWindow();
});

ipcMain.handle("send-to-customer-display", async (event, data) => {
  return sendToCustomerDisplay(data);
});

ipcMain.handle("request-customer-display-data", async () => {
  // Request main window to send current cart data
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("request-cart-data-for-display");
  }
  return { success: true };
});

ipcMain.handle("vnpay:open-payment-window", (event, payload) => {
  return openVNPayPaymentWindow(payload, event.sender);
});

ipcMain.handle("vnpay:close-payment-window", () => {
  closeVNPayPaymentWindow();
  return { success: true };
});

ipcMain.handle("momo:open-payment-window", (event, payload) => {
  return openMoMoPaymentWindow(payload, event.sender);
});

ipcMain.handle("momo:close-payment-window", () => {
  closeMoMoPaymentWindow();
  return { success: true };
});

ipcMain.handle("zalopay:open-payment-window", (event, payload) => {
  return openZaloPayPaymentWindow(payload, event.sender);
});

ipcMain.handle("zalopay:close-payment-window", (_event, options = {}) => {
  closeZaloPayPaymentWindow(options);
  return { success: true };
});

ipcMain.handle("open-payment-success-window", (event, payload) => {
  return openPaymentSuccessWindow(payload);
});

ipcMain.handle("focus-main-window", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
  return { success: true };
});
