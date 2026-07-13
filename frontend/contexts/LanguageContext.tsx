'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { allTranslations, Language } from '@/lib/i18n/translations';
import apiClient from '@/lib/api/client';

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
    // 1) Peinture immédiate : localStorage puis langue du navigateur.
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

    // 2) Source de vérité côté compte : `preferredLocale` (utilisé par les emails/PDF backend).
    // Pour un utilisateur connecté, la préférence du compte prime (persistance cross-device).
    // Best-effort : ignoré silencieusement pour un visiteur non authentifié (401).
    apiClient
      .get('/i18n/user/locale')
      .then((res) => {
        const serverLocale = (
          typeof res.data === 'string' ? res.data : res.data?.locale
        ) as Language;
        if (serverLocale && SUPPORTED_LANGUAGES.includes(serverLocale)) {
          setLanguageState(serverLocale);
          localStorage.setItem('language', serverLocale);
        }
      })
      .catch(() => {
        /* non connecté ou endpoint indisponible : on garde la préférence locale */
      });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // Persiste le choix sur le compte afin que les emails/documents générés côté backend
    // (via preferredLocale) suivent la langue de l'interface, et que la préférence soit
    // conservée entre appareils/sessions. Best-effort pour un visiteur non authentifié.
    apiClient.put('/i18n/user/locale', { locale: lang }).catch(() => {
      /* non connecté : la préférence reste locale (localStorage) */
    });
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

    // Fallback lisible si la clé est absente du dictionnaire : on humanise le dernier
    // segment (ex: "workingHours" → "Working Hours") au lieu d'afficher la clé brute pointée.
    const humanize = (s: string): string => {
      const seg = (s.includes('.') ? s.split('.').pop()! : s) || s;
      return seg
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    };

    // Recherche la clé dans le dictionnaire d'une langue donnée. Renvoie undefined si absente.
    const lookup = (lang: Language): string | undefined => {
      let result: any = allTranslations[lang];
      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k];
        } else {
          return undefined;
        }
      }
      return typeof result === 'string' ? result : undefined;
    };

    // Chaîne de repli i18n : langue courante → français (langue de base) → humanisation.
    // Ainsi une clé absente d'une traduction (de/nl/es/it/pt) retombe sur le FR au lieu d'afficher
    // une clé « humanisée » ; l'humanisation ne sert que de dernier recours (clé absente partout).
    const found = lookup(language);
    if (found !== undefined) return found;
    if (language !== 'fr') {
      const base = lookup('fr');
      if (base !== undefined) return base;
    }
    return humanize(key !== undefined ? key : keyOrCategory);
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
