// src/lib/stores/poseStore.ts
// Zustand store для управления состоянием позы с поддержкой двойной модели данных

import { create } from 'zustand';
import { PoseData } from '../body25/body25-types';
import { Vector3, Quaternion } from 'three';

// Типы для расширенной модели данных (DesignDoll-style)
export interface SpineState {
  segments: Vector3[];
  curvature: number;
  twist: number;
}

export interface ControllerState {
  id: string;
  position: Vector3;
  rotation: Quaternion;
  isActive: boolean;
}

export interface ExtendedPoseData {
  // Старые данные для обратной совместимости
  legacyPose: PoseData;
  
  // Новые данные
  spineState: SpineState;
  skullRotation: Quaternion;
  controllerStates: Map<string, ControllerState>;
  
  // Метаданные
  version: number;
  timestamp: number;
}

// Состояние store
interface PoseStoreState {
  // Текущая активная модель данных
  useExtendedModel: boolean;
  
  // Данные позы (в зависимости от useExtendedModel)
  legacyPose: PoseData | null;
  extendedPose: ExtendedPoseData | null;
  
  // Активные контроллеры
  activeControllerId: string | null;
  
  // Действия
  setUseExtendedModel: (useExtended: boolean) => void;
  setLegacyPose: (pose: PoseData) => void;
  setExtendedPose: (pose: ExtendedPoseData) => void;
  updateControllerState: (controllerId: string, state: Partial<ControllerState>) => void;
  setActiveController: (controllerId: string | null) => void;
  convertToExtended: (legacyPose: PoseData) => ExtendedPoseData;
  convertToLegacy: (extendedPose: ExtendedPoseData) => PoseData;
  syncPoses: () => void; // Синхронизация между моделями
}

// Хелперы для конвертации
const defaultSpineState = (): SpineState => ({
  segments: [
    new Vector3(0, 1.0, 0),   // Таз
    new Vector3(0, 1.2, 0),   // Поясница
    new Vector3(0, 1.4, 0),   // Грудь
    new Vector3(0, 1.6, 0),   // Шея
    new Vector3(0, 1.7, 0),   // Голова
  ],
  curvature: 0,
  twist: 0,
});

const defaultControllerStates = (): Map<string, ControllerState> => {
  const map = new Map<string, ControllerState>();
  
  // Семь основных контроллеров DesignDoll
  const controllers = [
    { id: 'head', position: new Vector3(0, 1.7, 0) },
    { id: 'chest', position: new Vector3(0, 1.4, 0) },
    { id: 'pelvis', position: new Vector3(0, 1.0, 0) },
    { id: 'left_hand', position: new Vector3(-0.5, 1.5, 0) },
    { id: 'right_hand', position: new Vector3(0.5, 1.5, 0) },
    { id: 'left_foot', position: new Vector3(-0.2, 0, 0) },
    { id: 'right_foot', position: new Vector3(0.2, 0, 0) },
  ];
  
  controllers.forEach(ctrl => {
    map.set(ctrl.id, {
      id: ctrl.id,
      position: ctrl.position,
      rotation: new Quaternion(),
      isActive: false,
    });
  });
  
  return map;
};

// Создание store
export const usePoseStore = create<PoseStoreState>((set, get) => ({
  // Начальное состояние
  useExtendedModel: false,
  legacyPose: null,
  extendedPose: null,
  activeControllerId: null,
  
  // Действия
  setUseExtendedModel: (useExtended) => {
    set({ useExtendedModel: useExtended });
    
    // При переключении модели синхронизируем данные
    if (useExtended && get().legacyPose && !get().extendedPose) {
      const extended = get().convertToExtended(get().legacyPose!);
      set({ extendedPose: extended });
    } else if (!useExtended && get().extendedPose && !get().legacyPose) {
      const legacy = get().convertToLegacy(get().extendedPose!);
      set({ legacyPose: legacy });
    }
  },
  
  setLegacyPose: (pose) => {
    set({ legacyPose: pose });
    
    // Если используется расширенная модель, синхронизируем
    if (get().useExtendedModel) {
      const extended = get().convertToExtended(pose);
      set({ extendedPose: extended });
    }
  },
  
  setExtendedPose: (pose) => {
    set({ extendedPose: pose });
    
    // Если используется legacy модель, синхронизируем
    if (!get().useExtendedModel) {
      const legacy = get().convertToLegacy(pose);
      set({ legacyPose: legacy });
    }
  },
  
  updateControllerState: (controllerId, state) => {
    const { extendedPose } = get();
    if (!extendedPose) return;
    
    const updatedStates = new Map(extendedPose.controllerStates);
    const existing = updatedStates.get(controllerId);
    
    if (existing) {
      updatedStates.set(controllerId, {
        ...existing,
        ...state,
      });
      
      set({
        extendedPose: {
          ...extendedPose,
          controllerStates: updatedStates,
          timestamp: Date.now(),
        },
      });
    }
  },
  
  setActiveController: (controllerId) => {
    set({ activeControllerId: controllerId });
    
    // Сбрасываем активность у всех контроллеров
    const { extendedPose } = get();
    if (extendedPose) {
      const updatedStates = new Map(extendedPose.controllerStates);
      updatedStates.forEach((state, id) => {
        if (id !== controllerId) {
          updatedStates.set(id, { ...state, isActive: false });
        } else {
          updatedStates.set(id, { ...state, isActive: true });
        }
      });
      
      set({
        extendedPose: {
          ...extendedPose,
          controllerStates: updatedStates,
        },
      });
    }
  },
  
  convertToExtended: (legacyPose) => {
    return {
      legacyPose,
      spineState: defaultSpineState(),
      skullRotation: new Quaternion(),
      controllerStates: defaultControllerStates(),
      version: 1,
      timestamp: Date.now(),
    };
  },
  
  convertToLegacy: (extendedPose) => {
    // Возвращаем legacy позу (пока просто возвращаем сохраненную)
    return extendedPose.legacyPose;
  },
  
  syncPoses: () => {
    const { useExtendedModel, legacyPose, extendedPose } = get();
    
    if (useExtendedModel && legacyPose && extendedPose) {
      // Синхронизируем extendedPose с legacyPose
      const updatedExtended = get().convertToExtended(legacyPose);
      set({ extendedPose: updatedExtended });
    } else if (!useExtendedModel && extendedPose && legacyPose) {
      // Синхронизируем legacyPose с extendedPose
      const updatedLegacy = get().convertToLegacy(extendedPose);
      set({ legacyPose: updatedLegacy });
    }
  },
}));

// Хелперы для использования store
export const getCurrentPose = (): PoseData | ExtendedPoseData | null => {
  const { useExtendedModel, legacyPose, extendedPose } = usePoseStore.getState();
  return useExtendedModel ? extendedPose : legacyPose;
};

export const isUsingExtendedModel = (): boolean => {
  return usePoseStore.getState().useExtendedModel;
};

export const getActiveController = (): ControllerState | null => {
  const { activeControllerId, extendedPose } = usePoseStore.getState();
  if (!activeControllerId || !extendedPose) return null;
  return extendedPose.controllerStates.get(activeControllerId) || null;
};