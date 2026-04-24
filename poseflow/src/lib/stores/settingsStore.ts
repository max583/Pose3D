// src/lib/stores/settingsStore.ts
// Zustand store для управления настройками приложения

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, DEFAULT_APP_SETTINGS, loadAppSettings, saveAppSettings } from '../appSettings';

export interface SettingsState {
  // Настройки приложения
  settings: AppSettings;
  
  // Системная тема (для определения 'system')
  systemLight: boolean;
  
  // Эффективная тема (вычисленная)
  effectiveTheme: 'dark' | 'light';
  
  // Действия
  setSettings: (settings: AppSettings) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  setSystemLight: (isLight: boolean) => void;
  updateEffectiveTheme: () => void;
}

// Вспомогательная функция для вычисления эффективной темы
function computeEffectiveTheme(theme: AppSettings['theme'], systemLight: boolean): 'dark' | 'light' {
  if (theme === 'system') {
    return systemLight ? 'light' : 'dark';
  }
  return theme;
}

// Инициализация системной темы
const initialSystemLight = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-color-scheme: light)').matches
  : false;

// Создание store с persistence
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      settings: loadAppSettings(),
      systemLight: initialSystemLight,
      effectiveTheme: computeEffectiveTheme(loadAppSettings().theme, initialSystemLight),
      
      // Действия
      setSettings: (settings) => {
        // Сохраняем в localStorage
        saveAppSettings(settings);
        
        // Вычисляем эффективную тему
        const effectiveTheme = computeEffectiveTheme(settings.theme, get().systemLight);
        
        // Обновляем состояние
        set({
          settings,
          effectiveTheme
        });
        
        // Обновляем data-theme атрибут
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = effectiveTheme;
        }
      },
      
      updateSettings: (patch) => {
        const newSettings = { ...get().settings, ...patch };
        get().setSettings(newSettings);
      },
      
      resetSettings: () => {
        get().setSettings({ ...DEFAULT_APP_SETTINGS });
      },
      
      setSystemLight: (isLight) => {
        const { settings } = get();
        const effectiveTheme = computeEffectiveTheme(settings.theme, isLight);
        
        set({ 
          systemLight: isLight,
          effectiveTheme 
        });
        
        // Обновляем data-theme атрибут если тема 'system'
        if (settings.theme === 'system' && typeof document !== 'undefined') {
          document.documentElement.dataset.theme = effectiveTheme;
        }
      },
      
      updateEffectiveTheme: () => {
        const { settings, systemLight } = get();
        const effectiveTheme = computeEffectiveTheme(settings.theme, systemLight);
        set({ effectiveTheme });
        
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = effectiveTheme;
        }
      },
    }),
    {
      name: 'poseflow-settings-storage',
      // Сохраняем только settings, остальное вычисляемое
      partialize: (state) => ({
        settings: state.settings,
      }),
      // При загрузке из localStorage обновляем вычисляемые поля
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Вычисляем эффективную тему
          const effectiveTheme = computeEffectiveTheme(state.settings.theme, state.systemLight);
          state.effectiveTheme = effectiveTheme;
          
          // Устанавливаем data-theme атрибут
          if (typeof document !== 'undefined') {
            document.documentElement.dataset.theme = effectiveTheme;
          }
        }
      },
    }
  )
);

// Инициализация слушателя системной темы
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    useSettingsStore.getState().setSystemLight(e.matches);
  };
  
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  
  // Очистка при демонтировании (в реальном приложении нужно вызывать при unmount)
  // Но для store это не критично
}