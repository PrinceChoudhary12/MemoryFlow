
import React, { useEffect, useState } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

const themeOptions: {
  id: Theme;
  label: string;
  accentColor: string;
  description: string;
}[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    accentColor: '#06b6d4',
    description: 'Deep Obsidian & Cyan Cyberpunk Lab',
  },
  {
    id: 'light',
    label: 'Light Paper',
    accentColor: '#0369a1',
    description: 'Crisp High-Contrast Academic Paper',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    accentColor: '#f59e0b',
    description: 'Matte Industrial Slate & Pure Amber',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    accentColor: '#10b981',
    description: 'Neon Emerald & Vivid Violet Gradient',
  },
];

const STORAGE_KEY = 'memoryflow_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme;

      if (
        saved &&
        ['midnight', 'light', 'graphite', 'aurora'].includes(saved)
      ) {
        return saved;
      }
    } catch {
      // Fallback if localStorage is restricted.
    }

    return 'midnight';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors.
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, themeNames: themeOptions }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
