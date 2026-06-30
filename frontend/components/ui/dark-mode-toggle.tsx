/**
 * Dark Mode Toggle Component
 *
 * Button to toggle between light and dark modes
 */

'use client';

import React from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './button';

interface DarkModeToggleProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  variant = 'ghost',
  size = 'sm',
  className = '',
  showLabel = false,
}) => {
  const { isDark, toggle, mounted } = useTheme();
  const { t } = useLanguage();

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <span className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggle}
      className={className}
      aria-label={isDark ? t('darkModeToggle', 'activateLight') : t('darkModeToggle', 'activateDark')}
      title={isDark ? t('darkModeToggle', 'activateLight') : t('darkModeToggle', 'activateDark')}
    >
      {isDark ? (
        <>
          {/* Sun icon for light mode */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rotate-0 scale-100 transition-all"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
          {showLabel && <span className="ml-2">{t('darkModeToggle', 'lightMode')}</span>}
        </>
      ) : (
        <>
          {/* Moon icon for dark mode */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rotate-0 scale-100 transition-all"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          {showLabel && <span className="ml-2">{t('darkModeToggle', 'darkMode')}</span>}
        </>
      )}
    </Button>
  );
};
