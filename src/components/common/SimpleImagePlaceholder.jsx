import React from 'react';
import { ImageIcon, Package } from 'lucide-react';

const SimpleImagePlaceholder = ({ 
  text, 
  size = 60, 
  shape = 'circle',
  variant = 'gradient', // 'gradient' | 'solid' | 'outlined'
  icon = 'letter', // 'letter' | 'image' | 'package'
  style = {},
  className = ''
}) => {
  const baseStyle = {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: Math.max(size * 0.3, 12),
    ...style
  };

  const shapeStyles = {
    circle: { borderRadius: '50%' },
    square: { borderRadius: 0 },
    rounded: { borderRadius: '8px' }
  };

  const variantStyles = {
    gradient: {
      background: 'linear-gradient(135deg, #197dd3, #77d4fb)',
      color: 'white',
      border: 'none'
    },
    solid: {
      backgroundColor: '#197dd3',
      color: 'white',
      border: 'none'
    },
    outlined: {
      backgroundColor: '#f5f5f5',
      color: '#197dd3',
      border: '2px solid #197dd3'
    }
  };

  const finalStyle = {
    ...baseStyle,
    ...shapeStyles[shape],
    ...variantStyles[variant]
  };

  const getIcon = () => {
    const iconSize = size * 0.4;
    switch (icon) {
      case 'image':
        return <ImageIcon size={iconSize} />;
      case 'package':
        return <Package size={iconSize} />;
      case 'letter':
      default:
        return text ? text.charAt(0).toUpperCase() : '?';
    }
  };

  return (
    <div 
      style={finalStyle}
      className={className}
      title={text || 'Product image'}
    >
      {getIcon()}
    </div>
  );
};

export default SimpleImagePlaceholder;