import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ColorPalette } from './colors';
import { getAppSettings, saveAppSettings } from '../services/SettingsService';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getAppSettings().then(settings => {
      if (settings.theme) {
        setModeState(settings.theme);
      }
      setIsLoaded(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    saveAppSettings({ theme: newMode });
  };

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(() => ({ mode, isDark, colors, setMode }), [mode, isDark, colors]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
