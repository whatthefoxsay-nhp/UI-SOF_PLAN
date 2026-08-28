const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  appQuit: () => ipcRenderer.invoke('app-quit'),
  exitApp: () => ipcRenderer.invoke('app-quit'),
  
  // Customer Display controls
  openCustomerDisplay: () => ipcRenderer.invoke('open-customer-display'),
  closeCustomerDisplay: () => ipcRenderer.invoke('close-customer-display'),
  sendToCustomerDisplay: (data) => ipcRenderer.invoke('send-to-customer-display', data),
  requestCustomerDisplayData: () => ipcRenderer.invoke('request-customer-display-data'),
  
  // Customer Display listeners
  onCustomerDisplayUpdate: (callback) => {
    ipcRenderer.on('customer-display-update', (event, data) => callback(data));
  },
  onCustomerDisplayClosed: (callback) => {
    ipcRenderer.on('customer-display-closed', () => callback());
  },
  onRequestCartData: (callback) => {
    ipcRenderer.on('request-cart-data-for-display', () => callback());
  },
  
  // Add other IPC methods as needed
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // VNPay helpers
  openVNPayPaymentWindow: (paymentUrl, returnUrl) =>
    ipcRenderer.invoke('vnpay:open-payment-window', { paymentUrl, returnUrl }),
  closeVNPayPaymentWindow: () => ipcRenderer.invoke('vnpay:close-payment-window'),
  onVNPayPaymentResult: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('vnpay:payment-result', listener);
    return () => ipcRenderer.removeListener('vnpay:payment-result', listener);
  },
  onceVNPayPaymentClosed: (callback) => {
    ipcRenderer.once('vnpay:payment-window-closed', () => callback());
  },

  // MoMo helpers
  openMoMoPaymentWindow: (paymentUrl, returnUrl) =>
    ipcRenderer.invoke('momo:open-payment-window', { paymentUrl, returnUrl }),
  closeMoMoPaymentWindow: () => ipcRenderer.invoke('momo:close-payment-window'),
  onMoMoPaymentResult: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('momo:payment-result', listener);
    return () => ipcRenderer.removeListener('momo:payment-result', listener);
  },
  onceMoMoPaymentClosed: (callback) => {
    ipcRenderer.once('momo:payment-window-closed', () => callback());
  },

  // ZaloPay helpers
  openZaloPayPaymentWindow: (paymentUrl, returnUrl) =>
    ipcRenderer.invoke('zalopay:open-payment-window', { paymentUrl, returnUrl }),
  closeZaloPayPaymentWindow: (options) =>
    ipcRenderer.invoke('zalopay:close-payment-window', options ?? {}),
  onZaloPayPaymentResult: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('zalopay:payment-result', listener);
    return () => ipcRenderer.removeListener('zalopay:payment-result', listener);
  },
  onceZaloPayPaymentClosed: (callback) => {
    ipcRenderer.once('zalopay:payment-window-closed', () => callback());
  },

  // Payment Success Window
  openPaymentSuccessWindow: (key) =>
    ipcRenderer.invoke('open-payment-success-window', { key }),
  onPaymentSuccessWindowClosed: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('payment-success-window-closed', listener);
    return () => ipcRenderer.removeListener('payment-success-window-closed', listener);
  },
  focusMainWindow: () => ipcRenderer.invoke('focus-main-window'),
});

