import 'expo-sqlite/localStorage/install';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, View } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './palette';

export type ThemeMode = 'light' | 'dark';
const storageKey = 'mydays.appearance';
type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  saveError: string | null;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, updateMode] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const colors = mode === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    try {
      // Restore external storage after hydration so static web HTML matches the first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(storageKey) === 'dark') updateMode('dark');
    } catch {
      // Storage may be unavailable in a restricted browser; light remains usable.
    }
    setReady(true);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    updateMode(next);
    try {
      localStorage.setItem(storageKey, next);
      setSaveError(null);
    } catch {
      setSaveError('Your appearance changed, but could not be saved for next time.');
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (Platform.OS !== 'web') Appearance.setColorScheme(mode);
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = mode;
    }
  }, [mode, colors.background, ready]);

  const value = useMemo(() => ({ mode, colors, setMode, saveError }), [mode, colors, setMode, saveError]);
  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        {ready ? children : null}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}

export function useThemedStyles<T>(createStyles: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
