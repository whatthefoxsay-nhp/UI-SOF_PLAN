import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import languageLoader, { 
  setLanguage, 
  getCurrentLanguage,
  addLanguageChangeListener,
  removeLanguageChangeListener 
} from '../utils/languageLoader';

// Language Context
const LanguageContext = createContext();

// Available languages
export const LANGUAGES = {
  VN: 'Tiếng Việt',
  EN: 'English', 
  CN: '中文'
};

// Language Provider Component
export function LanguageProvider({ children, defaultLanguage = 'VN' }) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Try to get from localStorage first
    const saved = localStorage.getItem('pmbh_language');
    return saved || defaultLanguage;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language system
  useEffect(() => {
    const initializeLanguage = async () => {
      setIsLoading(true);
      try {
        await setLanguage(currentLanguage);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing language system:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, []);

  // Handle language changes
  useEffect(() => {
    const handleLanguageChange = (newLanguage) => {
      setCurrentLanguage(newLanguage);
      localStorage.setItem('pmbh_language', newLanguage);
    };

    addLanguageChangeListener(handleLanguageChange);

    return () => {
      removeLanguageChangeListener(handleLanguageChange);
    };
  }, []);

  // Change language function
  const changeLanguage = useCallback(async (newLanguage) => {
    if (currentLanguage === newLanguage) return;

    setIsLoading(true);
    try {
      await setLanguage(newLanguage);
      localStorage.setItem('pmbh_language', newLanguage);
    } catch (error) {
      console.error('Error changing language:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage]);

  // Get language name
  const getLanguageName = useCallback((langCode) => {
    return LANGUAGES[langCode] || langCode;
  }, []);

  // Get available languages
  const getAvailableLanguages = useCallback(() => {
    return Object.keys(LANGUAGES).map(code => ({
      code,
      name: LANGUAGES[code]
    }));
  }, []);

  const contextValue = {
    // State
    currentLanguage,
    isLoading,
    isInitialized,
    
    // Functions
    changeLanguage,
    getLanguageName,
    getAvailableLanguages,
    
    // Constants
    languages: LANGUAGES,
    availableLanguages: getAvailableLanguages()
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use language context
export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
}

// High-order component for language support
export function withLanguage(WrappedComponent) {
  return function LanguageEnhancedComponent(props) {
    const languageContext = useLanguageContext();
    
    return (
      <WrappedComponent
        {...props}
        language={languageContext}
      />
    );
  };
}

export default LanguageContext;