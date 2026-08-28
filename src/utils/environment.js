// Runtime environment helpers for Electron vs. web contexts.

const detectElectron = () => {
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    return true;
  }

  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent || '';
    if (userAgent.toLowerCase().includes('electron')) {
      return true;
    }
  }

  return false;
};

export const normalizeOrigin = (origin) => {
  if (!origin) {
    return '';
  }

  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

export const isElectron = detectElectron();
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isWeb = !isElectron;

export const getElectronAPI = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.electronAPI || null;
};

export const hasElectronAPI = () => Boolean(getElectronAPI());

export const environment = {
  isElectron,
  isDevelopment,
  isWeb,
  electronAPIAvailable: hasElectronAPI(),
};

export default environment;
