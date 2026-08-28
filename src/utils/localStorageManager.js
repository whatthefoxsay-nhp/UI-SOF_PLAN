/**
 * LocalStorage Manager Utility
 * Quản lý và theo dõi dung lượng LocalStorage
 */

export const localStorageManager = {
  /**
   * Get total size of localStorage in bytes
   * @returns {number} Size in bytes
   */
  getTotalSize: () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  },

  /**
   * Get size of a specific item in bytes
   * @param {string} key - LocalStorage key
   * @returns {number} Size in bytes
   */
  getItemSize: (key) => {
    const item = localStorage.getItem(key);
    if (!item) return 0;
    return item.length + key.length;
  },

  /**
   * Get all localStorage items with their sizes
   * @returns {Array} Array of objects with key, value, and size
   */
  getAllItems: () => {
    const items = [];
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        const size = value.length + key.length;
        items.push({
          key,
          value: value,
          size,
          sizeFormatted: localStorageManager.formatBytes(size)
        });
      }
    }
    return items.sort((a, b) => b.size - a.size); // Sort by size descending
  },

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Size in bytes
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted string
   */
  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Get storage quota and usage (Chromium specific)
   * @returns {Promise<Object>} Storage estimate
   */
  getStorageEstimate: async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usageFormatted: localStorageManager.formatBytes(estimate.usage || 0),
          quotaFormatted: localStorageManager.formatBytes(estimate.quota || 0),
          percentage: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0
        };
      } catch (error) {
        console.error('Error getting storage estimate:', error);
        return null;
      }
    }
    return null;
  },

  /**
   * Get estimated localStorage quota (typically 5-10MB)
   * @returns {number} Estimated quota in bytes
   */
  getEstimatedQuota: () => {
    // LocalStorage typically has 5-10MB limit
    // We'll estimate 10MB as a safe maximum
    return 10 * 1024 * 1024; // 10MB in bytes
  },

  /**
   * Calculate percentage of localStorage used
   * @returns {number} Percentage (0-100)
   */
  getUsagePercentage: () => {
    const used = localStorageManager.getTotalSize();
    const quota = localStorageManager.getEstimatedQuota();
    return ((used / quota) * 100).toFixed(2);
  },

  /**
   * Get remaining space in localStorage
   * @returns {number} Remaining space in bytes
   */
  getRemainingSpace: () => {
    const used = localStorageManager.getTotalSize();
    const quota = localStorageManager.getEstimatedQuota();
    return Math.max(0, quota - used);
  },

  /**
   * Get statistics about localStorage
   * @returns {Object} Statistics object
   */
  getStatistics: () => {
    const totalSize = localStorageManager.getTotalSize();
    const quota = localStorageManager.getEstimatedQuota();
    const remaining = localStorageManager.getRemainingSpace();
    const itemCount = Object.keys(localStorage).length;

    return {
      totalSize,
      totalSizeFormatted: localStorageManager.formatBytes(totalSize),
      quota,
      quotaFormatted: localStorageManager.formatBytes(quota),
      remaining,
      remainingFormatted: localStorageManager.formatBytes(remaining),
      percentage: localStorageManager.getUsagePercentage(),
      itemCount,
      items: localStorageManager.getAllItems()
    };
  },

  /**
   * Clear a specific item
   * @param {string} key - Key to remove
   * @returns {boolean} Success status
   */
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing item:', error);
      return false;
    }
  },

  /**
   * Clear all localStorage (with confirmation)
   * @returns {boolean} Success status
   */
  clearAll: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },

  /**
   * Export localStorage data as JSON
   * @returns {string} JSON string of all data
   */
  exportData: () => {
    const data = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        data[key] = localStorage.getItem(key);
      }
    }
    return JSON.stringify(data, null, 2);
  },

  /**
   * Test localStorage write capability
   * @returns {boolean} Whether localStorage is working
   */
  isAvailable: () => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get preview of value (truncated if too long)
   * @param {string} value - Value to preview
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated value
   */
  getValuePreview: (value, maxLength = 100) => {
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  },

  /**
   * Detect if value is JSON
   * @param {string} value - Value to check
   * @returns {boolean} True if valid JSON
   */
  isJSON: (value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get type of stored value
   * @param {string} value - Value to check
   * @returns {string} Type description
   */
  getValueType: (value) => {
    if (!value) return 'Empty';
    if (localStorageManager.isJSON(value)) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return 'JSON Array';
      if (typeof parsed === 'object') return 'JSON Object';
      return 'JSON';
    }
    if (value.startsWith('data:image')) return 'Base64 Image';
    if (value.startsWith('http://') || value.startsWith('https://')) return 'URL';
    return 'String';
  }
};

export default localStorageManager;
