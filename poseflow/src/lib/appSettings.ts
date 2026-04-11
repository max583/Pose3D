/** Настройки приложения: схема + persist в localStorage */

import type { CanvasColorSchemeId } from './canvasColorSchemes';

export type ThemeChoice = 'dark' | 'light' | 'system';
export type { CanvasColorSchemeId } from './canvasColorSchemes';

export type StoredResolution = '1K' | '2K' | '4K';

export type StoredAspect =
  | '1:1'
  | '3:4'
  | '4:3'
  | '9:16'
  | '16:9'
  | '3:2'
  | '2:3'
  | '4:5'
  | '5:4'
  | 'free';

export interface AppSettings {
  theme: ThemeChoice;
  /** Фон и сетка 3D viewport */
  canvasColorScheme: CanvasColorSchemeId;
  showGrid: boolean;
  showAxes: boolean;
  showViewportOverlay: boolean;
  cameraAnimationMs: number;
  orbitRotateSpeed: number;
  orbitPanSpeed: number;
  orbitZoomSpeed: number;
  defaultExportResolution: StoredResolution;
  defaultExportAspect: StoredAspect;
  confirmOnResetPose: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  canvasColorScheme: 'poseflow',
  showGrid: true,
  showAxes: true,
  showViewportOverlay: true,
  cameraAnimationMs: 500,
  orbitRotateSpeed: 0.5,
  orbitPanSpeed: 0.5,
  orbitZoomSpeed: 0.5,
  defaultExportResolution: '1K',
  defaultExportAspect: '1:1',
  confirmOnResetPose: false,
};

const STORAGE_KEY = 'poseflow-app-settings-v1';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      defaultExportResolution: isStoredResolution(parsed.defaultExportResolution)
        ? parsed.defaultExportResolution
        : DEFAULT_APP_SETTINGS.defaultExportResolution,
      defaultExportAspect: isStoredAspect(parsed.defaultExportAspect)
        ? parsed.defaultExportAspect
        : DEFAULT_APP_SETTINGS.defaultExportAspect,
      canvasColorScheme:
        parsed.canvasColorScheme === 'studio-neutral' || parsed.canvasColorScheme === 'poseflow'
          ? parsed.canvasColorScheme
          : DEFAULT_APP_SETTINGS.canvasColorScheme,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
        ? parsed.theme
        : DEFAULT_APP_SETTINGS.theme,
      cameraAnimationMs: clamp(
        Number(parsed.cameraAnimationMs) || DEFAULT_APP_SETTINGS.cameraAnimationMs,
        200,
        2000,
      ),
      orbitRotateSpeed: clamp(
        Number.isFinite(parsed.orbitRotateSpeed as number)
          ? (parsed.orbitRotateSpeed as number)
          : DEFAULT_APP_SETTINGS.orbitRotateSpeed,
        0.15,
        2,
      ),
      orbitPanSpeed: clamp(
        Number.isFinite(parsed.orbitPanSpeed as number)
          ? (parsed.orbitPanSpeed as number)
          : DEFAULT_APP_SETTINGS.orbitPanSpeed,
        0.15,
        2,
      ),
      orbitZoomSpeed: clamp(
        Number.isFinite(parsed.orbitZoomSpeed as number)
          ? (parsed.orbitZoomSpeed as number)
          : DEFAULT_APP_SETTINGS.orbitZoomSpeed,
        0.15,
        2,
      ),
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
}

const RES: StoredResolution[] = ['1K', '2K', '4K'];
const ASP: StoredAspect[] = [
  '1:1',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
  '3:2',
  '2:3',
  '4:5',
  '5:4',
  'free',
];

function isStoredResolution(v: unknown): v is StoredResolution {
  return typeof v === 'string' && (RES as readonly string[]).includes(v);
}

function isStoredAspect(v: unknown): v is StoredAspect {
  return typeof v === 'string' && (ASP as readonly string[]).includes(v);
}
