import React from 'react';
import { Input } from 'antd';

const ONhapLieu = ({ 
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onPressEnter,
  prefix,
  suffix,
  size = 'middle',
  disabled = false,
  maxLength,
  showCount = false,
  allowClear = false,
  className,
  ...props 
}) => {
  const InputComponent = type === 'password' ? Input.Password : 
                        type === 'textarea' ? Input.TextArea : Input;

  return (
    <InputComponent
      placeholder={placeholder}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onPressEnter={onPressEnter}
      prefix={prefix}
      suffix={suffix}
      size={size}
      disabled={disabled}
      maxLength={maxLength}
      showCount={showCount}
      allowClear={allowClear}
      className={className}
      {...props}
    />
  );
};

export default ONhapLieu;
