/**
 * Receipt Logo Manager
 * Manages receipt logo stored in localStorage
 */

const RECEIPT_LOGO_KEY = 'receipt_logo';

export const receiptLogoManager = {
  /**
   * Get the receipt logo from localStorage
   * @returns {string|null} Logo URL or null if not set
   */
  getLogo: () => {
    try {
      const logo = localStorage.getItem(RECEIPT_LOGO_KEY);
      return logo || null;
    } catch (error) {
      console.error('Error getting receipt logo:', error);
      return null;
    }
  },

  /**
   * Set the receipt logo to localStorage
   * @param {string} logoUrl - URL of the logo
   * @returns {boolean} Success status
   */
  setLogo: (logoUrl) => {
    try {
      if (logoUrl && typeof logoUrl === 'string') {
        localStorage.setItem(RECEIPT_LOGO_KEY, logoUrl);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting receipt logo:', error);
      return false;
    }
  },

  /**
   * Remove the receipt logo from localStorage
   * @returns {boolean} Success status
   */
  removeLogo: () => {
    try {
      localStorage.removeItem(RECEIPT_LOGO_KEY);
      return true;
    } catch (error) {
      console.error('Error removing receipt logo:', error);
      return false;
    }
  },

  /**
   * Convert file to base64 for storage
   * @param {File} file - Image file
   * @returns {Promise<string>} Base64 string
   */
  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Generate HTML for receipt logo
   * @returns {string} HTML string for logo or empty string
   */
  getLogoHTML: () => {
    const logo = receiptLogoManager.getLogo();
    if (!logo) return '';
    
    return `
      <div class="receipt-logo">
        <img src="${logo}" alt="Logo" />
      </div>
    `;
  },

  /**
   * Get CSS styles for receipt logo
   * @returns {string} CSS string for logo styles
   */
  getLogoCSS: () => {
    return `
      .receipt-logo {
        text-align: center;
        margin-bottom: 12px;
      }
      .receipt-logo img {
        max-width: 80px;
        max-height: 80px;
        object-fit: contain;
      }
    `;
  }
};

export default receiptLogoManager;
