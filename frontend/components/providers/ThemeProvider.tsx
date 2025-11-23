/**
 * Theme Provider Component
 *
 * Provides theme context to the entire application
 */

'use client';

import React, { createContext, useContext } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';

interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const darkMode = useDarkMode();

  return (
    <ThemeContext.Provider value={darkMode}>
      {children}
    </ThemeContext.Provider>
  );
};
