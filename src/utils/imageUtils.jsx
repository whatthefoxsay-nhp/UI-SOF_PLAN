import { DEFAULT_IMAGES } from '../constants';

/**
 * Kiểm tra xem URL hình ảnh có hợp lệ không
 * @param {string} url - URL của hình ảnh
 * @returns {boolean} - True nếu URL hợp lệ
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Kiểm tra các format hình ảnh phổ biến
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;
  const isDataUrl = url.startsWith('data:image/');
  const isHttpUrl = url.startsWith('http://') || url.startsWith('https://');
  const isRelativeUrl = url.startsWith('/') || url.startsWith('./');
  
  return (imageExtensions.test(url) || isDataUrl) && (isHttpUrl || isRelativeUrl);
};

/**
 * Lấy URL hình ảnh an toàn, trả về null nếu không hợp lệ hoặc là default image
 * @param {string} imageUrl - URL hình ảnh
 * @returns {string|null} - URL hình ảnh hợp lệ hoặc null
 */
export const getSafeImageUrl = (imageUrl) => {
  if (!imageUrl || imageUrl === DEFAULT_IMAGES.PRODUCT) {
    return null;
  }
  
  return isValidImageUrl(imageUrl) ? imageUrl : null;
};

/**
 * Lấy chữ cái đầu từ tên để làm placeholder
 * @param {string} name - Tên sản phẩm
 * @returns {string} - Chữ cái đầu
 */
export const getInitial = (name) => {
  if (!name || typeof name !== 'string') return '?';
  return name.trim().charAt(0).toUpperCase();
};

/**
 * Tạo màu placeholder ngẫu nhiên từ palette
 * @param {string} seed - Chuỗi seed để tạo màu nhất quán
 * @returns {string} - Màu background
 */
export const getPlaceholderColor = (seed = '') => {
  const colors = [
    'linear-gradient(135deg, #197dd3, #77d4fb)',
    'linear-gradient(135deg, #77d4fb, #bdbcc4)', 
    'linear-gradient(135deg, #bdbcc4, #4b4344)',
    'linear-gradient(135deg, #4b4344, #197dd3)'
  ];
  
  if (!seed) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Resize hình ảnh về kích thước mong muốn (cho canvas)
 * @param {File} file - File hình ảnh
 * @param {number} maxWidth - Chiều rộng tối đa
 * @param {number} maxHeight - Chiều cao tối đa
 * @param {number} quality - Chất lượng (0-1)
 * @returns {Promise<string>} - Data URL của hình ảnh đã resize
 */
export const resizeImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Tính toán kích thước mới giữ nguyên tỷ lệ
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Vẽ hình ảnh với kích thước mới
      ctx.drawImage(img, 0, 0, width, height);
      
      // Chuyển về data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Kiểm tra kích thước file hình ảnh
 * @param {File} file - File hình ảnh
 * @param {number} maxSizeMB - Kích thước tối đa (MB)
 * @returns {boolean} - True nếu kích thước hợp lệ
 */
export const isValidImageSize = (file, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Kiểm tra định dạng file hình ảnh
 * @param {File} file - File hình ảnh
 * @returns {boolean} - True nếu định dạng hợp lệ
 */
export const isValidImageFormat = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};