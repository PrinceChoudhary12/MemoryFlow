import { createContext } from 'react';

export type Theme = 'midnight' | 'light' | 'graphite' | 'aurora';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeNames: { id: Theme; label: string; accentColor: string; description: string }[];
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
