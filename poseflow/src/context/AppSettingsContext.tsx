import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  ThemeChoice,
} from '../lib/appSettings';
import { cameraService } from '../services/cameraService';

type AppSettingsContextValue = {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  effectiveTheme: 'dark' | 'light';
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());

  const [systemLight, setSystemLight] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
      : false,
  );

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemLight(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  useEffect(() => {
    cameraService.setAnimationDurationMs(settings.cameraAnimationMs);
  }, [settings.cameraAnimationMs]);

  const effectiveTheme = useMemo(() => {
    if (settings.theme === 'system') {
      return systemLight ? 'light' : 'dark';
    }
    return settings.theme;
  }, [settings.theme, systemLight]);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
  }, [effectiveTheme]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_APP_SETTINGS });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      updateSettings,
      resetSettings,
      effectiveTheme,
    }),
    [settings, updateSettings, resetSettings, effectiveTheme],
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
};

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return ctx;
}

export function useThemeChoice(): ThemeChoice {
  return useAppSettings().settings.theme;
}
