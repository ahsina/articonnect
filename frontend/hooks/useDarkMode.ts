/**
 * Dark Mode Hook
 *
 * Manages dark mode state with localStorage persistence
 */

import { useEffect, useState } from 'react';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setMounted(true);

    // Check localStorage or system preference
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      setIsDark(stored === 'true');
    } else {
      // Use system preference if no stored value
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemPrefersDark);
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (!mounted) return;

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark, mounted]);

  const toggle = () => {
    setIsDark((prev) => {
      const newValue = !prev;
      localStorage.setItem('darkMode', String(newValue));
      return newValue;
    });
  };

  const enable = () => {
    setIsDark(true);
    localStorage.setItem('darkMode', 'true');
  };

  const disable = () => {
    setIsDark(false);
    localStorage.setItem('darkMode', 'false');
  };

  return {
    isDark,
    toggle,
    enable,
    disable,
    mounted // Useful for preventing hydration mismatch
  };
};
