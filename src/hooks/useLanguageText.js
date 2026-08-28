/**
 * Custom hook for accessing language text from JSON files
 * Uses the JSON language files loaded by LanguageContext
 */

import { useLanguageContext } from '../contexts/LanguageContext';
import EN from '../Languages/EN/en/en.json';
import VN from '../Languages/VN/vi/vi.json';

// Supported language data map
const languageData = {
  EN: EN,
  VN: VN,
  // CN: CN // Add additional languages here when available
};

// Flatten language json into value -> path map for quick lookup by default text
const valueToPathMap = (() => {
  const map = new Map();

  const buildMap = (node, pathParts = []) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      const currentPath = [...pathParts, key];

      if (value && typeof value === 'object') {
        buildMap(value, currentPath);
      } else if (typeof value === 'string') {
        const normalizedValue = value.trim();
        if (!normalizedValue) {
          return;
        }

        const mapKey = normalizedValue;
        const path = currentPath.join('.');
        const existing = map.get(mapKey);

        if (existing) {
          existing.push(path);
        } else {
          map.set(mapKey, [path]);
        }
      }
    });
  };

  // Use Vietnamese texts as source for default values
  if (VN?.texts) {
    buildMap(VN.texts);
  }

  return map;
})();

const applyValues = (text, values = {}) => {
  if (!text || typeof text !== 'string' || !values) {
    return text;
  }

  return Object.entries(values).reduce((result, [placeholder, replacement]) => {
    const safeReplacement = replacement ?? '';
    return result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), safeReplacement);
  }, text);
};

/**
 * Custom hook to get text from language files
 * @returns {Object} Object with getText function and language info
 */
export const useLanguageText = () => {
  const { currentLanguage, isLoading, changeLanguage } = useLanguageContext();
  const activeLanguage = languageData[currentLanguage] ? currentLanguage : 'VN';
  const langData = languageData[activeLanguage];
  
  /**
   * Get text from language file using dot notation path
   * @param {string} path - Path to text in format "category.subcategory.key"
   * @param {string} defaultText - Default text if not found
   * @returns {string} The translated text
   * 
   * @example
   * getText('other.general.ban_trong') // Returns "Empty table" in EN
   * getText('list.header.ban_nha_hang') // Returns "Restaurant Table" in EN
   */
  const getText = (path, defaultText = '') => {
    try {
      if (!langData || !langData.texts) {
        console.warn(`Language data not found for: ${currentLanguage}`);
        return defaultText || path;
      }

      // Split path and navigate through the object
      const keys = path.split('.');
      let value = langData.texts;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          console.warn(`Text not found for path: ${path} in language: ${currentLanguage}`);
          return defaultText || path;
        }
      }
      
      return typeof value === 'string' ? value : defaultText || path;
    } catch (error) {
      console.error('Error getting text:', error);
      return defaultText || path;
    }
  };

  /**
   * Try to resolve translation by default text value (Vietnamese source)
   * @param {string} value - Default text value in Vietnamese
   * @param {string} defaultText - Fallback text if not found
   * @returns {string}
   */
  const getTextByValue = (value, defaultText = '') => {
    if (!value) {
      return defaultText || '';
    }

    const normalized = value.trim();
    if (!normalized) {
      return defaultText || '';
    }

    const candidatePaths = valueToPathMap.get(normalized);

    if (candidatePaths && candidatePaths.length > 0) {
      for (const candidatePath of candidatePaths) {
        const translated = getText(candidatePath, defaultText || normalized);
        if (translated && translated !== candidatePath) {
          return translated;
        }
      }
    }

    return defaultText || normalized;
  };

  /**
   * Translate by path or default text with optional template values
   * @param {string} identifier - Either a path (with dot notation) or the default Vietnamese text
   * @param {Object} options - Options including values and defaultText
   * @returns {string}
   */
  const translate = (identifier, options = {}) => {
    if (!identifier) {
      return options.defaultText || '';
    }

    const { values = {}, defaultText } = options;
    const isPath = typeof identifier === 'string' && identifier.includes('.');

    const baseText = isPath
      ? getText(identifier, defaultText || identifier)
      : getTextByValue(identifier, defaultText || identifier);

    return applyValues(baseText, values);
  };

  const translateByValue = (value, values = {}, defaultText) =>
    translate(value, { values, defaultText: defaultText ?? value });

  /**
   * Get multiple texts at once
   * @param {Object} pathMap - Object with keys and paths
   * @returns {Object} Object with same keys but translated values
   * 
   * @example
   * getTexts({
   *   emptyTable: 'other.general.ban_trong',
   *   restaurantTable: 'list.header.ban_nha_hang'
   * })
   * // Returns: { emptyTable: "Empty table", restaurantTable: "Restaurant Table" }
   */
  const getTexts = (pathMap) => {
    const result = {};
    for (const [key, path] of Object.entries(pathMap)) {
      result[key] = getText(path);
    }
    return result;
  };

  /**
   * Check if a text exists in current language
   * @param {string} path - Path to text
   * @returns {boolean} True if text exists
   */
  const hasText = (path) => {
    try {
      const langData = languageData[currentLanguage];
      if (!langData || !langData.texts) return false;

      const keys = path.split('.');
      let value = langData.texts;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return false;
        }
      }
      
      return typeof value === 'string';
    } catch (error) {
      return false;
    }
  };

  // Short alias for getText
  const t = getText;

  return {
    getText,
    getTexts,
    hasText,
    t,  // Shorthand for getText
    currentLanguage,
    isLoading,
    changeLanguage,
    translate,
    translateByValue,
    getTextByValue
  };
};

export default useLanguageText;
