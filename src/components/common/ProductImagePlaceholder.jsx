import React, { useState } from 'react';
import { Image } from 'antd';
import { ImageIcon } from 'lucide-react';
import { getSafeImageUrl, getInitial, getPlaceholderColor } from '../../utils/imageUtils';
import './ProductImagePlaceholder.css';

const ProductImagePlaceholder = ({ 
  src, 
  alt, 
  fallbackText, 
  size = 60, 
  shape = 'circle', // 'circle' | 'square' | 'rounded'
  variant = 'gradient', // 'gradient' | 'solid' | 'outlined'
  style = {},
  className = '',
  showError = false,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // Determine size class
  const getSizeClass = () => {
    if (size <= 40) return 'product-image-small';
    if (size <= 60) return 'product-image-medium';
    if (size <= 80) return 'product-image-large';
    return 'product-image-xlarge';
  };

  // Sử dụng safe image URL
  const safeImageUrl = getSafeImageUrl(src);
  const initial = getInitial(fallbackText);
  const placeholderColor = getPlaceholderColor(fallbackText);

  const baseStyle = {
    width: size,
    height: size,
    background: variant === 'gradient' ? placeholderColor : undefined,
    ...style
  };

  const placeholderClasses = [
    'product-image-placeholder',
    shape,
    variant,
    getSizeClass(),
    imageLoading ? 'product-image-loading' : '',
    (showError || imageError) ? 'product-image-error' : '',
    className
  ].filter(Boolean).join(' ');

  const imageContainerClasses = [
    'product-image-container',
    shape,
    className
  ].filter(Boolean).join(' ');

  // Nếu không có src hoặc có lỗi, hiển thị placeholder
  if (!safeImageUrl || imageError) {
    return (
      <div 
        className={placeholderClasses}
        style={baseStyle}
        title={alt || fallbackText || 'Product image'}
        {...props}
      >
        {initial !== '?' ? initial : <ImageIcon size={size * 0.4} />}
      </div>
    );
  }

  return (
    <div className={imageContainerClasses} style={baseStyle}>
      <Image
        src={safeImageUrl}
        alt={alt || 'Product image'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        preview={false}
        fallback={
          <div 
            className={placeholderClasses}
            style={{ 
              width: '100%', 
              height: '100%', 
              margin: 0,
              background: placeholderColor
            }}
          >
            {initial !== '?' ? initial : <ImageIcon size={size * 0.4} />}
          </div>
        }
        {...props}
      />
    </div>
  );
};

export default ProductImagePlaceholder;