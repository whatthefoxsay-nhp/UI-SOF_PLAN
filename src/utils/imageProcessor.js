/**
 * IMAGE PROCESSING UTILITIES
 * Xử lý ảnh sản phẩm từ database và tối ưu hóa hiển thị
 */

import cafeImg from '../assets/Img/cafe.png';

/**
 * Kiểm tra xem URL có phải là ảnh hợp lệ không
 * @param {string} url 
 * @returns {boolean}
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Loại bỏ các URL không hợp lệ
  const invalidPatterns = [
    '/images/default-product.svg',
    'C:/images/default-product.svg',
    '../assets/Img/cafe.png',
    'default-product',
    'no-image'
  ];
  
  const isInvalid = invalidPatterns.some(pattern => url.includes(pattern));
  if (isInvalid) return false;
  
  // Kiểm tra extension hợp lệ
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const hasValidExtension = validExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  );
  
  // Kiểm tra URL pattern
  const urlPattern = /^(https?:\/\/|\/|\.\/|\.\.\/)/;
  const isValidPattern = urlPattern.test(url);
  
  return hasValidExtension && isValidPattern;
};

/**
 * Xử lý URL ảnh từ database
 * @param {string} imageUrl 
 * @returns {string|null}
 */
export const processImageUrl = (imageUrl) => {
  if (!imageUrl || !isValidImageUrl(imageUrl)) {
    return null; // Sẽ fallback về cafe.png
  }
  
  // Nếu là URL tương đối, chuyển thành absolute
  if (imageUrl.startsWith('./') || imageUrl.startsWith('../')) {
    return imageUrl;
  }
  
  // Nếu là URL tuyệt đối từ server
  if (imageUrl.startsWith('/')) {
    // Có thể cần thêm base URL của server
    return imageUrl;
  }
  
  // Nếu là URL đầy đủ (http/https)
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  return null;
};

/**
 * Tạo srcSet cho responsive images
 * @param {string} baseUrl 
 * @returns {string}
 */
export const createImageSrcSet = (baseUrl) => {
  if (!baseUrl) return '';
  
  const sizes = [
    { width: 120, suffix: '_thumb' },
    { width: 240, suffix: '_small' },
    { width: 480, suffix: '_medium' },
    { width: 720, suffix: '_large' }
  ];
  
  return sizes.map(({ width, suffix }) => {
    const url = baseUrl.replace(/\.(jpg|jpeg|png|gif|webp)$/i, `${suffix}.$1`);
    return `${url} ${width}w`;
  }).join(', ');
};

/**
 * Tối ưu hóa ảnh cho hiển thị
 * @param {string} imageUrl 
 * @param {Object} options 
 * @returns {Object}
 */
export const optimizeImageForDisplay = (imageUrl, options = {}) => {
  const {
    width = 200,
    height = 200,
    quality = 80,
    format = 'webp'
  } = options;
  
  const processedUrl = processImageUrl(imageUrl);
  
  if (!processedUrl) {
    return {
      src: cafeImg,
      srcSet: '',
      isPlaceholder: true
    };
  }
  
  // Nếu có dịch vụ tối ưu ảnh (như Cloudinary, ImageKit)
  // có thể thêm query parameters để resize
  const optimizedUrl = processedUrl;
  
  return {
    src: optimizedUrl,
    srcSet: createImageSrcSet(optimizedUrl),
    isPlaceholder: false,
    sizes: '(max-width: 768px) 150px, 200px'
  };
};

/**
 * Preload ảnh để cải thiện performance
 * @param {string[]} imageUrls 
 */
export const preloadImages = (imageUrls) => {
  imageUrls.forEach(url => {
    const processedUrl = processImageUrl(url);
    if (processedUrl) {
      const img = new Image();
      img.src = processedUrl;
    }
  });
};

/**
 * Lazy load ảnh với Intersection Observer
 * @param {Element} element 
 * @param {string} imageUrl 
 * @param {Function} callback 
 */
export const lazyLoadImage = (element, imageUrl, callback) => {
  const processedUrl = processImageUrl(imageUrl);
  
  if (!processedUrl) {
    callback(cafeImg, true); // isPlaceholder = true
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = new Image();
        img.onload = () => callback(processedUrl, false);
        img.onerror = () => callback(cafeImg, true);
        img.src = processedUrl;
        observer.unobserve(element);
      }
    });
  });
  
  observer.observe(element);
};

export default {
  isValidImageUrl,
  processImageUrl,
  createImageSrcSet,
  optimizeImageForDisplay,
  preloadImages,
  lazyLoadImage
};