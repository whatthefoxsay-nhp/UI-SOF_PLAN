/**
 * Language Loader for PMBH Desktop App
 * Loads and manages text strings from language files
 */

class LanguageLoader {
  constructor() {
    this.currentLanguage = 'VN';
    this.textCache = new Map();
    this.loadedModules = new Set();
    this.listeners = new Set();
  }

  /**
   * Load text module from file
   * @param {string} module - Module name (common, auth, sales, etc.)
   * @returns {Promise<Map>} Text map for the module
   */
  async loadModule(module) {
    const cacheKey = `${this.currentLanguage}_${module}`;
    
    if (this.textCache.has(cacheKey)) {
      return this.textCache.get(cacheKey);
    }

    try {
      // Build the correct path for both development and production
      let languagePath;
      
      if (window.location.protocol === 'file:') {
        // Production mode (Electron) - use relative path from the build directory
        languagePath = `./languages/${this.currentLanguage}/${module}.txt`;
      } else {
        // Development mode - use public folder path
        languagePath = `/languages/${this.currentLanguage}/${module}.txt`;
      }
      
      const response = await fetch(languagePath);
      
      if (!response.ok) {
        console.warn(`Could not load language file: ${module}.txt`);
        return new Map();
      }

      const text = await response.text();
      const textMap = this.parseTextFile(text);
      
      this.textCache.set(cacheKey, textMap);
      this.loadedModules.add(module);
      
      return textMap;
    } catch (error) {
      console.error(`Error loading language module ${module}:`, error);
      return new Map();
    }
  }

  /**
   * Parse text file content into line-indexed map
   * @param {string} content - File content
   * @returns {Map<number, string>} Map of line number to text
   */
  parseTextFile(content) {
    const textMap = new Map();
    const lines = content.split('\n');
    
    let lineIndex = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (trimmedLine === '' || trimmedLine.startsWith('//')) {
        continue;
      }
      
      textMap.set(lineIndex, trimmedLine);
      lineIndex++;
    }
    
    return textMap;
  }

  /**
   * Get text by module and line number
   * @param {string} module - Module name
   * @param {number} line - Line number in the module
   * @returns {Promise<string>} The text string
   */
  async getText(module, line) {
    const textMap = await this.loadModule(module);
    return textMap.get(line) || `[${module}.${line}]`;
  }

  /**
   * Get multiple texts from a module
   * @param {string} module - Module name  
   * @param {number[]} lines - Array of line numbers
   * @returns {Promise<string[]>} Array of text strings
   */
  async getTexts(module, lines) {
    const textMap = await this.loadModule(module);
    return lines.map(line => textMap.get(line) || `[${module}.${line}]`);
  }

  /**
   * Get all texts from a module
   * @param {string} module - Module name
   * @returns {Promise<Map<number, string>>} All texts in the module
   */
  async getAllTexts(module) {
    return await this.loadModule(module);
  }

  /**
   * Change language and reload all modules
   * @param {string} language - Language code (VN, EN, CN)
   */
  async setLanguage(language) {
    if (this.currentLanguage === language) return;
    
    this.currentLanguage = language;
    this.textCache.clear();
    
    // Reload all previously loaded modules
    const modulesToReload = Array.from(this.loadedModules);
    this.loadedModules.clear();
    
    for (const module of modulesToReload) {
      await this.loadModule(module);
    }
    
    // Notify listeners
    this.notifyLanguageChange(language);
  }

  /**
   * Add language change listener
   * @param {Function} callback - Callback function
   */
  addLanguageChangeListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove language change listener
   * @param {Function} callback - Callback function
   */
  removeLanguageChangeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners about language change
   * @param {string} language - New language
   */
  notifyLanguageChange(language) {
    this.listeners.forEach(callback => {
      try {
        callback(language);
      } catch (error) {
        console.error('Error in language change listener:', error);
      }
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.textCache.clear();
    this.loadedModules.clear();
  }

  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Check if module is loaded
   * @param {string} module - Module name
   * @returns {boolean} True if module is loaded
   */
  isModuleLoaded(module) {
    return this.loadedModules.has(module);
  }
}

// Create singleton instance
const languageLoader = new LanguageLoader();

export default languageLoader;

// Export convenience functions
export const getText = (module, line) => languageLoader.getText(module, line);
export const getTexts = (module, lines) => languageLoader.getTexts(module, lines);
export const getAllTexts = (module) => languageLoader.getAllTexts(module);
export const setLanguage = (language) => languageLoader.setLanguage(language);
export const getCurrentLanguage = () => languageLoader.getCurrentLanguage();
export const addLanguageChangeListener = (callback) => languageLoader.addLanguageChangeListener(callback);
export const removeLanguageChangeListener = (callback) => languageLoader.removeLanguageChangeListener(callback);