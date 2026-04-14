import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadAppSettings,
  saveAppSettings,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
} from '../appSettings';

describe('appSettings', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
      } as Storage,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('при отсутствии ключа возвращает DEFAULT_APP_SETTINGS', () => {
    expect(loadAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('save + load сохраняет и восстанавливает настройки', () => {
    const custom: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      theme: 'light',
      showGrid: false,
      cameraAnimationMs: 800,
    };
    saveAppSettings(custom);
    expect(loadAppSettings()).toEqual(custom);
  });

  it('некорректный JSON откатывается к дефолту', () => {
    store['poseflow-app-settings-v1'] = '{not json';
    expect(loadAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('частичный JSON мержится с дефолтом; невалидные enum поля подменяются', () => {
    store['poseflow-app-settings-v1'] = JSON.stringify({
      theme: 'invalid-theme',
      defaultExportResolution: '8K',
      defaultExportAspect: '1:2',
      cameraAnimationMs: 50,
      orbitRotateSpeed: 999,
    });
    const s = loadAppSettings();
    expect(s.theme).toBe(DEFAULT_APP_SETTINGS.theme);
    expect(s.defaultExportResolution).toBe(DEFAULT_APP_SETTINGS.defaultExportResolution);
    expect(s.defaultExportAspect).toBe(DEFAULT_APP_SETTINGS.defaultExportAspect);
    expect(s.cameraAnimationMs).toBe(200);
    expect(s.orbitRotateSpeed).toBe(2);
  });
});
