'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { allTranslations, Language } from '@/lib/i18n/translations';

const SUPPORTED_LANGUAGES: Language[] = ['fr', 'en', 'de', 'es', 'it', 'nl', 'pt'];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyOrCategory: string, key?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    // Load language from localStorage or browser
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    } else {
      // Detect browser language
      const browserLang = navigator.language.split('-')[0] as Language;
      if (SUPPORTED_LANGUAGES.includes(browserLang)) {
        setLanguageState(browserLang);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (keyOrCategory: string, key?: string): string => {
    // Support both formats:
    // 1. Dot notation: t('nav.login') - new format
    // 2. Two arguments: t('nav', 'login') - legacy format
    let keys: string[];

    if (key !== undefined) {
      // Two-argument format: t('category', 'key')
      keys = [keyOrCategory, key];
    } else {
      // Dot notation: t('category.key')
      keys = keyOrCategory.split('.');
    }

    let result: any = allTranslations[language];

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key !== undefined ? `${keyOrCategory}.${key}` : keyOrCategory;
      }
    }

    return typeof result === 'string' ? result : (key !== undefined ? `${keyOrCategory}.${key}` : keyOrCategory);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
