import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import viData from "../Languages/VN/vi/vi.json";
import enData from "../Languages/EN/en/en.json";

// Merge base structure and texts section
const translationVI = {
  ...viData,
  ...(viData.texts || {}),
};

const translationEN = {
  ...enData,
  ...(enData.texts || {}),
};

// Migrate old language keys (VN -> vi, EN -> en)
let initialLanguage =
  localStorage.getItem("sofcare_language") ||
  localStorage.getItem("pmbh_language") ||
  localStorage.getItem("erp_language");

if (initialLanguage) {
  if (initialLanguage === "VN" || initialLanguage === "vi-VN") initialLanguage = "vi";
  else if (initialLanguage === "EN" || initialLanguage === "en-US") initialLanguage = "en";
} else {
  initialLanguage = "vi";
}

const resources = {
  vi: { translation: translationVI },
  en: { translation: translationEN },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: "vi",
    supportedLngs: ["vi", "en"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "sofcare_language",
      caches: ["localStorage"],
    },
  });

if (i18n.language === "VN" || i18n.language === "vi-VN") {
  i18n.changeLanguage("vi");
} else if (i18n.language === "EN" || i18n.language === "en-US") {
  i18n.changeLanguage("en");
}

export default i18n;
