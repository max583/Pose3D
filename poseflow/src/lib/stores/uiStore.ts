// src/lib/stores/uiStore.ts
// Zustand store для управления UI состоянием

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UIState {
  // Sidebar состояние
  sidebarCollapsed: boolean;
  
  // Модальные окна
  isSettingsModalOpen: boolean;
  isExportModalOpen: boolean;

  // Активные вкладки/панели
  activeSidebarTab: 'pose' | 'settings' | 'export';
  activeSettingsTab: 'general' | 'camera' | 'export' | 'advanced';
  
  // Уведомления
  notification: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    visible: boolean;
    id: string;
  } | null;
  
  // Загрузочные состояния
  isLoading: boolean;
  loadingMessage: string;
  
  // Действия
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  setActiveSidebarTab: (tab: 'pose' | 'settings' | 'export') => void;
  setActiveSettingsTab: (tab: 'general' | 'camera' | 'export' | 'advanced') => void;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  hideNotification: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

// Создание store с persistence для sidebar состояния
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      sidebarCollapsed: false,
      isSettingsModalOpen: false,
      isExportModalOpen: false,
      activeSidebarTab: 'pose',
      activeSettingsTab: 'general',
      notification: null,
      isLoading: false,
      loadingMessage: '',
      
      // Действия
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),
      
      openExportModal: () => set({ isExportModalOpen: true }),
      closeExportModal: () => set({ isExportModalOpen: false }),

      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
      setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
      
      showNotification: (message, type = 'info', duration = 3000) => {
        const id = Date.now().toString();
        set({ notification: { message, type, visible: true, id } });
        
        // Автоматическое скрытие через duration
        if (duration > 0) {
          setTimeout(() => {
            const currentNotification = get().notification;
            if (currentNotification?.id === id) {
              set({ notification: null });
            }
          }, duration);
        }
      },
      
      hideNotification: () => set({ notification: null }),
      
      setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
    }),
    {
      name: 'poseflow-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeSidebarTab: state.activeSidebarTab,
        activeSettingsTab: state.activeSettingsTab,
      }),
    }
  )
);