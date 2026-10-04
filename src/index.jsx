import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import viVN from 'antd/locale/vi_VN';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import './i18n';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  // <React.StrictMode>
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={viVN}
          theme={{
            token: {
              colorPrimary: '#2563eb',
              colorSuccess: '#10b981',
              colorWarning: '#f59e0b',
              colorError: '#ef4444',
              colorInfo: '#3b82f6',
              colorTextBase: '#0f172a',
              colorBorder: '#e2e8f0',
              borderRadius: 10,
              fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            },
            components: {
              Card: { 
                borderRadiusLG: 14,
                boxShadowSecondary: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
              },
              Button: { 
                borderRadius: 8, 
                controlHeight: 38,
                fontWeight: 600,
              },
              Table: { 
                borderRadius: 12, 
                headerBg: '#f8fafc',
                headerColor: '#334155',
              },
              Input: {
                borderRadius: 8,
                controlHeight: 38,
              },
              Select: {
                borderRadius: 8,
                controlHeight: 38,
              },
              Tabs: {
                titleFontSize: 13.5,
                horizontalItemPadding: '10px 18px',
              },
              Modal: { 
                borderRadiusLG: 16,
              },
              Tag: { 
                borderRadiusSM: 6,
                fontSize: 12,
              },
            },
          }}
        >
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </HashRouter>
  // </React.StrictMode>
);
