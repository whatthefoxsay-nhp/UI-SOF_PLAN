import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme phải được sử dụng trong ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const colors = {
    light: {
      primary: '#0b6bc5ff',
      secondary: '#f0f0f0',
      background: '#ffffff',
      text: '#000000',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f'
    },
    dark: {
      primary: '#0b6bc5ff',
      secondary: '#1f1f1f',
      background: '#141414',
      text: '#ffffff',
      success: '#49aa19',
      warning: '#d89614',
      error: '#d32f2f'
    }
  };

  const value = {
    theme,
    toggleTheme,
    colors: colors[theme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
