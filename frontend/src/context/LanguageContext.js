import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

const DEFAULT_LANGUAGE = 'en';

const getNestedValue = (source, path) => {
  return path.split('.').reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), source);
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || DEFAULT_LANGUAGE);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const value = useMemo(() => {
    const t = (key) => {
      const selected = getNestedValue(translations[language], key);
      if (selected !== undefined) return selected;
      const fallback = getNestedValue(translations[DEFAULT_LANGUAGE], key);
      return fallback !== undefined ? fallback : key;
    };

    return {
      language,
      setLanguage,
      t,
      languages: translations.meta.languages,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
