/**/**

 * Custom hook for accessing language text * Custom hook for accessing language text

 * Uses the JSON language files loaded by LanguageContext * Uses the JSON language files loaded by LanguageContext

 */ */



import { useLanguageContext } from '../contexts/LanguageContext';import { useLanguageContext } from '../contexts/LanguageContext';

import EN from '../Languages/EN/en/en.json';import EN from '../Languages/EN/en/en.json';

import VN from '../Languages/VN/vi/vi.json';import VN from '../Languages/VN/vi/vi.json';



// Language data map// Language data map

const languageData = {const languageData = {

  EN: EN,  EN: EN,

  VN: VN,  VN: VN,

  // CN: CN  // Add Chinese when available  // CN: CN  // Add Chinese when available

};};



/**/**

 * Custom hook to get text from language files * Custom hook to get text from language files

 * @returns {Object} Object with getText function and language info * @returns {Object} Object with getText function and language info

 */ */

export const useLanguage = () => {export const useLanguage = () => {

  const { currentLanguage, isLoading, changeLanguage } = useLanguageContext();  const { currentLanguage, isLoading, changeLanguage } = useLanguageContext();

    

  /**  /**

   * Get text from language file using dot notation path   * Get text from language file using dot notation path

   * @param {string} path - Path to text in format "category.subcategory.key"   * @param {string} path - Path to text in format "category.subcategory.key"

   * @param {string} defaultText - Default text if not found   * @param {string} defaultText - Default text if not found

   * @returns {string} The translated text   * @returns {string} The translated text

   *    * 

   * @example   * @example

   * getText('other.general.ban_trong') // Returns "Empty table" in EN   * getText('other.general.ban_trong') // Returns "Empty table" in EN

   * getText('list.header.ban_nha_hang') // Returns "Restaurant Table" in EN   * getText('list.header.ban_nha_hang') // Returns "Restaurant Table" in EN

   */   */

  const getText = (path, defaultText = '') => {  const getText = (path, defaultText = '') => {

    try {    try {

      const langData = languageData[currentLanguage];      const langData = languageData[currentLanguage];

      if (!langData || !langData.texts) {      if (!langData || !langData.texts) {

        console.warn(`Language data not found for: ${currentLanguage}`);        console.warn(`Language data not found for: ${currentLanguage}`);

        return defaultText || path;        return defaultText || path;

      }      }



      // Split path and navigate through the object      // Split path and navigate through the object

      const keys = path.split('.');      const keys = path.split('.');

      let value = langData.texts;      let value = langData.texts;

            

      for (const key of keys) {      for (const key of keys) {

        if (value && typeof value === 'object' && key in value) {        if (value && typeof value === 'object' && key in value) {

          value = value[key];          value = value[key];

        } else {        } else {

          console.warn(`Text not found for path: ${path} in language: ${currentLanguage}`);          console.warn(`Text not found for path: ${path} in language: ${currentLanguage}`);

          return defaultText || path;          return defaultText || path;

        }        }

      }      }

            

      return typeof value === 'string' ? value : defaultText || path;      return typeof value === 'string' ? value : defaultText || path;

    } catch (error) {    } catch (error) {

      console.error('Error getting text:', error);      console.error('Error getting text:', error);

      return defaultText || path;      return defaultText || path;

    }    }

  };  };



  /**  /**

   * Get multiple texts at once   * Get multiple texts at once

   * @param {Object} pathMap - Object with keys and paths   * @param {Object} pathMap - Object with keys and paths

   * @returns {Object} Object with same keys but translated values   * @returns {Object} Object with same keys but translated values

   *    * 

   * @example   * @example

   * getTexts({   * getTexts({

   *   emptyTable: 'other.general.ban_trong',   *   emptyTable: 'other.general.ban_trong',

   *   restaurantTable: 'list.header.ban_nha_hang'   *   restaurantTable: 'list.header.ban_nha_hang'

   * })   * })

   * // Returns: { emptyTable: "Empty table", restaurantTable: "Restaurant Table" }   * // Returns: { emptyTable: "Empty table", restaurantTable: "Restaurant Table" }

   */   */

  const getTexts = (pathMap) => {  const getTexts = (pathMap) => {

    const result = {};    const result = {};

    for (const [key, path] of Object.entries(pathMap)) {    for (const [key, path] of Object.entries(pathMap)) {

      result[key] = getText(path);      result[key] = getText(path);

    }    }

    return result;    return result;

  };  };



  /**  /**

   * Check if a text exists in current language   * Check if a text exists in current language

   * @param {string} path - Path to text   * @param {string} path - Path to text

   * @returns {boolean} True if text exists   * @returns {boolean} True if text exists

   */   */

  const hasText = (path) => {  const hasText = (path) => {

    try {    try {

      const langData = languageData[currentLanguage];      const langData = languageData[currentLanguage];

      if (!langData || !langData.texts) return false;      if (!langData || !langData.texts) return false;



      const keys = path.split('.');      const keys = path.split('.');

      let value = langData.texts;      let value = langData.texts;

            

      for (const key of keys) {      for (const key of keys) {

        if (value && typeof value === 'object' && key in value) {        if (value && typeof value === 'object' && key in value) {

          value = value[key];          value = value[key];

        } else {        } else {

          return false;          return false;

        }        }

      }      }

            

      return typeof value === 'string';      return typeof value === 'string';

    } catch (error) {    } catch (error) {

      return false;      return false;

    }    }

  };  };



  // Short alias for getText  // Short alias for getText

  const t = getText;  const t = getText;



  return {  return {

    getText,    getText,

    getTexts,    getTexts,

    hasText,    hasText,

    t,  // Shorthand for getText    t,  // Shorthand for getText

    currentLanguage,    currentLanguage,

    isLoading,    isLoading,

    changeLanguage    changeLanguage

  };  };

};};



export default useLanguage;export default useLanguage;



  return {
    currentLanguage,
    isLoading,
    allModuleTexts,
    t,
    changeLanguage,
    loadAllModules
  };
}