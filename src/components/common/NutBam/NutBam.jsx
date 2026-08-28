import React from 'react';
import { Button } from 'antd';

const NutBam = ({ 
  type = 'default', 
  size = 'middle', 
  loading = false, 
  disabled = false,
  icon,
  children,
  onClick,
  className,
  ...props 
}) => {
  return (
    <Button
      type={type}
      size={size}
      loading={loading}
      disabled={disabled}
      icon={icon}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
};

export default NutBam;
