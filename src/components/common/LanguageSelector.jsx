import React from 'react';
import { Select, Dropdown, Button, Menu, Space } from 'antd';
import { GlobalOutlined, DownOutlined } from '@ant-design/icons';
import { useLanguageContext } from '../../contexts/LanguageContext';

/**
 * Language Selector Component (Select style)
 */
export function LanguageSelect({ 
  style = {}, 
  className = '',
  size = 'middle',
  placeholder = 'Chọn ngôn ngữ',
  ...props 
}) {
  const { 
    currentLanguage, 
    changeLanguage, 
    availableLanguages, 
    isLoading 
  } = useLanguageContext();

  const handleChange = async (value) => {
    try {
      await changeLanguage(value);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <Select
      value={currentLanguage}
      onChange={handleChange}
      loading={isLoading}
      style={{ minWidth: 120, ...style }}
      className={className}
      size={size}
      placeholder={placeholder}
      {...props}
    >
      {availableLanguages.map(lang => (
        <Select.Option key={lang.code} value={lang.code}>
          {lang.name}
        </Select.Option>
      ))}
    </Select>
  );
}

/**
 * Language Selector Component (Dropdown style)
 */
export function LanguageDropdown({ 
  style = {}, 
  className = '',
  size = 'middle',
  showIcon = true,
  ...props 
}) {
  const { 
    currentLanguage, 
    changeLanguage, 
    availableLanguages, 
    getLanguageName,
    isLoading 
  } = useLanguageContext();

  const handleMenuClick = async ({ key }) => {
    try {
      await changeLanguage(key);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      {availableLanguages.map(lang => (
        <Menu.Item 
          key={lang.code}
          disabled={lang.code === currentLanguage}
        >
          {lang.name}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Dropdown 
      overlay={menu} 
      disabled={isLoading}
      {...props}
    >
      <Button 
        style={style} 
        className={className}
        size={size}
        loading={isLoading}
      >
        <Space>
          {showIcon && <GlobalOutlined />}
          {getLanguageName(currentLanguage)}
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  );
}

/**
 * Simple Language Toggle Component (for 2 languages)
 */
export function LanguageToggle({ 
  languages = ['VN', 'EN'],
  style = {},
  className = '',
  size = 'middle',
  ...props 
}) {
  const { 
    currentLanguage, 
    changeLanguage, 
    getLanguageName,
    isLoading 
  } = useLanguageContext();

  const handleToggle = async () => {
    const nextLanguage = languages.find(lang => lang !== currentLanguage) || languages[0];
    
    try {
      await changeLanguage(nextLanguage);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const nextLanguage = languages.find(lang => lang !== currentLanguage) || languages[0];

  return (
    <Button
      onClick={handleToggle}
      loading={isLoading}
      style={style}
      className={className}
      size={size}
      title={`Chuyển sang ${getLanguageName(nextLanguage)}`}
      {...props}
    >
      <Space>
        <GlobalOutlined />
        {getLanguageName(currentLanguage)}
      </Space>
    </Button>
  );
}

/**
 * Language Flag Component (visual representation)
 */
export function LanguageFlag({ language, size = 24, style = {}, ...props }) {
  const flagEmojis = {
    VN: '🇻🇳',
    EN: '🇺🇸',
    CN: '🇨🇳'
  };

  const flagStyle = {
    fontSize: size,
    lineHeight: 1,
    ...style
  };

  return (
    <span style={flagStyle} {...props}>
      {flagEmojis[language] || '🌐'}
    </span>
  );
}

/**
 * Compact Language Selector with flags
 */
export function LanguageFlagSelector({ 
  style = {},
  className = '',
  size = 'small',
  ...props 
}) {
  const { 
    currentLanguage, 
    changeLanguage, 
    availableLanguages, 
    isLoading 
  } = useLanguageContext();

  const handleMenuClick = async ({ key }) => {
    try {
      await changeLanguage(key);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      {availableLanguages.map(lang => (
        <Menu.Item 
          key={lang.code}
          disabled={lang.code === currentLanguage}
        >
          <Space>
            <LanguageFlag language={lang.code} size={16} />
            {lang.name}
          </Space>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Dropdown 
      overlay={menu} 
      disabled={isLoading}
      {...props}
    >
      <Button 
        type="text"
        style={style} 
        className={className}
        size={size}
        loading={isLoading}
      >
        <Space>
          <LanguageFlag language={currentLanguage} size={18} />
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  );
}

export default LanguageSelect;