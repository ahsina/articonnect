'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Simple hook for translations
 * Wrapper around useLanguage that returns just the t function
 */
export function useTranslation() {
  const { t, language } = useLanguage();

  return {
    t,
    language,
  };
}
