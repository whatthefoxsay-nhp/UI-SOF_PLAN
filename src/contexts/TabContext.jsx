import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTabMetadata } from '../utils/menuUtils';

const TabContext = createContext();

const HOME_PATH = '/quan-ly-ke-hoach';
const HISTORY_KEY = 'plan_tab_history';
const MAX_HISTORY = 20;

export const TabProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [tabs, setTabs] = useState([
    {
      key: HOME_PATH,
      path: HOME_PATH,
      label: getTabMetadata(HOME_PATH, t).label || 'Quản lý kế hoạch',
      iconName: 'Briefcase',
      isClosable: false,
    },
  ]);
  const [activeTabKey, setActiveTabKey] = useState(HOME_PATH);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        const meta = getTabMetadata(tab.path, t);
        return { ...tab, label: meta.label };
      }),
    );
  }, [t]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error('Failed to load tab history from localStorage:', e);
    }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save tab history to localStorage:', e);
    }
  };

  const addToHistory = (tab) => {
    if (tab.path === HOME_PATH) return;
    const historyItem = {
      path: tab.path,
      label: tab.label,
      iconName: tab.iconName,
      timestamp: Date.now(),
    };
    const filtered = history.filter((item) => item.path !== tab.path);
    saveHistory([historyItem, ...filtered].slice(0, MAX_HISTORY));
  };

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === '/') return;

    const existingTab = tabs.find((tab) => tab.key === path);
    if (!existingTab) {
      const meta = getTabMetadata(path, t);
      const newTab = {
        key: path,
        path,
        label: meta.label,
        iconName: meta.iconName,
        isClosable: meta.isClosable,
      };
      setTabs((prevTabs) => {
        if (prevTabs.some((tab) => tab.key === newTab.key)) return prevTabs;
        return [...prevTabs, newTab];
      });
    }
    setActiveTabKey(path);
  }, [location, t, tabs]);

  const selectTab = (key) => {
    setActiveTabKey(key);
    navigate(key);
  };

  const addTab = (path, customLabel = null, state = null) => {
    const meta = getTabMetadata(path, t);
    const label = customLabel || meta.label;
    const newTab = {
      key: path,
      path,
      label,
      iconName: meta.iconName,
      isClosable: meta.isClosable,
      state,
    };

    setTabs((prevTabs) => {
      if (prevTabs.some((tab) => tab.key === path)) return prevTabs;
      return [...prevTabs, newTab];
    });

    setActiveTabKey(path);
    navigate(path, { state });
  };

  const closeTab = (tabKey) => {
    const tabToClose = tabs.find((tab) => tab.key === tabKey);
    if (!tabToClose || !tabToClose.isClosable) return;

    addToHistory(tabToClose);
    const activeIndex = tabs.findIndex((tab) => tab.key === tabKey);
    const newTabs = tabs.filter((tab) => tab.key !== tabKey);
    setTabs(newTabs);

    if (activeTabKey === tabKey) {
      const newActiveKey = newTabs[activeIndex - 1]?.key || newTabs[0]?.key || HOME_PATH;
      setActiveTabKey(newActiveKey);
      navigate(newActiveKey);
    }
  };

  const closeAll = () => {
    tabs.forEach((tab) => {
      if (tab.isClosable) addToHistory(tab);
    });

    const homeTab = tabs.find((tab) => tab.key === HOME_PATH) || {
      key: HOME_PATH,
      path: HOME_PATH,
      label: 'Quản lý kế hoạch',
      iconName: 'Briefcase',
      isClosable: false,
    };

    setTabs([homeTab]);
    setActiveTabKey(HOME_PATH);
    navigate(HOME_PATH);
  };

  const closeOthers = (tabKey) => {
    tabs.forEach((tab) => {
      if (tab.key !== tabKey && tab.isClosable) addToHistory(tab);
    });

    const homeTab = tabs.find((tab) => tab.key === HOME_PATH);
    const keepTab = tabs.find((tab) => tab.key === tabKey);
    const newTabs = [homeTab, keepTab].filter(Boolean);
    const uniqueTabs = Array.from(new Set(newTabs.map((tab) => tab.key))).map((key) =>
      newTabs.find((tab) => tab.key === key),
    );

    setTabs(uniqueTabs);
    setActiveTabKey(tabKey);
    navigate(tabKey);
  };

  const restoreTabs = (paths) => {
    const tabsToRestore = [];
    paths.forEach((path) => {
      const meta = getTabMetadata(path);
      const historyItem = history.find((item) => item.path === path);
      tabsToRestore.push({
        key: path,
        path,
        label: historyItem?.label || meta.label,
        iconName: historyItem?.iconName || meta.iconName,
        isClosable: meta.isClosable,
      });
    });

    setTabs((prevTabs) => {
      const filteredNew = tabsToRestore.filter((tab) => !prevTabs.some((existing) => existing.key === tab.key));
      return [...prevTabs, ...filteredNew];
    });

    saveHistory(history.filter((item) => !paths.includes(item.path)));
    if (tabsToRestore.length > 0) {
      const targetPath = tabsToRestore[0].key;
      setActiveTabKey(targetPath);
      navigate(targetPath);
    }
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  const updateTabPath = (oldKey, newPath) => {
    setTabs((prevTabs) => {
      const targetAlreadyExists = prevTabs.some((tab) => tab.key === newPath && tab.key !== oldKey);
      if (targetAlreadyExists) return prevTabs.filter((tab) => tab.key !== oldKey);

      return prevTabs.map((tab) => {
        if (tab.key === oldKey) {
          const meta = getTabMetadata(newPath);
          return {
            ...tab,
            key: newPath,
            path: newPath,
            label: meta.label,
            iconName: meta.iconName,
          };
        }
        return tab;
      });
    });
    setActiveTabKey(newPath);
  };

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabKey,
        history,
        addTab,
        closeTab,
        closeAll,
        closeOthers,
        restoreTabs,
        clearHistory,
        selectTab,
        updateTabPath,
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const useTabs = () => {
  const context = useContext(TabContext);
  if (!context) throw new Error('useTabs must be used within a TabProvider');
  return context;
};
