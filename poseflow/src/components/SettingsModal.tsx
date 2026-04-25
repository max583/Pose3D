import React, { useEffect, useRef } from 'react';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  ThemeChoice,
  StoredAspect,
  StoredResolution,
  CanvasColorSchemeId,
} from '../lib/appSettings';
import { CANVAS_SCHEME_LABELS } from '../lib/canvasColorSchemes';
import './SettingsModal.css';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const ASPECT_OPTIONS: StoredAspect[] = [
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '3:2',
  '2:3',
  '4:5',
  '5:4',
  'free',
];

const RES_OPTIONS: StoredResolution[] = ['1K', '2K', '4K'];

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      className="settings-toggle"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-toggle-thumb" />
    </button>
  );
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => panelRef.current?.querySelector('button, select')?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const onBackdropPointerDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="settings-modal-backdrop"
      role="presentation"
      onMouseDown={onBackdropPointerDown}
    >
      <div
        ref={panelRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <h2 id="settings-modal-title">Настройки</h2>
          <button
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="settings-modal-body">
          <section className="settings-section">
            <h3 className="settings-section-title">Внешний вид</h3>
            <div className="settings-row">
              <label htmlFor="set-theme">Тема</label>
              <select
                id="set-theme"
                className="settings-select"
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as ThemeChoice })}
              >
                <option value="dark">Тёмная</option>
                <option value="light">Светлая</option>
                <option value="system">Как в системе</option>
              </select>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Редактор</h3>
            <div className="settings-row">
              <label htmlFor="set-canvas-scheme">Цветовая схема canvas</label>
              <select
                id="set-canvas-scheme"
                className="settings-select"
                value={settings.canvasColorScheme}
                onChange={(e) =>
                  updateSettings({ canvasColorScheme: e.target.value as CanvasColorSchemeId })
                }
              >
                {(Object.keys(CANVAS_SCHEME_LABELS) as CanvasColorSchemeId[]).map((id) => (
                  <option key={id} value={id}>
                    {CANVAS_SCHEME_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <label htmlFor="set-grid">Показывать сетку</label>
              <Toggle
                id="set-grid"
                checked={settings.showGrid}
                onChange={(v) => updateSettings({ showGrid: v })}
              />
            </div>
            <div className="settings-row">
              <label htmlFor="set-axes">Показывать оси координат</label>
              <Toggle
                id="set-axes"
                checked={settings.showAxes}
                onChange={(v) => updateSettings({ showAxes: v })}
              />
            </div>
            <div className="settings-row">
              <label htmlFor="set-overlay">Подсказки в углу viewport</label>
              <Toggle
                id="set-overlay"
                checked={settings.showViewportOverlay}
                onChange={(v) => updateSettings({ showViewportOverlay: v })}
              />
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Камера</h3>
            <div className="settings-row">
              <label htmlFor="set-cam-ms">Длительность анимации вида, мс</label>
              <div className="settings-range-wrap">
                <input
                  id="set-cam-ms"
                  type="range"
                  min={200}
                  max={1500}
                  step={50}
                  value={settings.cameraAnimationMs}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateSettings({ cameraAnimationMs: v });
                    cameraService.setAnimationDurationMs(v);
                  }}
                />
                <span className="settings-range-value">{settings.cameraAnimationMs}</span>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Управление (Orbit)</h3>
            <div className="settings-row">
              <label htmlFor="set-rot">Чувствительность вращения</label>
              <div className="settings-range-wrap">
                <input
                  id="set-rot"
                  type="range"
                  min={15}
                  max={200}
                  value={Math.round(settings.orbitRotateSpeed * 100)}
                  onChange={(e) =>
                    updateSettings({ orbitRotateSpeed: Number(e.target.value) / 100 })
                  }
                />
                <span className="settings-range-value">
                  {settings.orbitRotateSpeed.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="settings-row">
              <label htmlFor="set-pan">Чувствительность панорамы</label>
              <div className="settings-range-wrap">
                <input
                  id="set-pan"
                  type="range"
                  min={15}
                  max={200}
                  value={Math.round(settings.orbitPanSpeed * 100)}
                  onChange={(e) =>
                    updateSettings({ orbitPanSpeed: Number(e.target.value) / 100 })
                  }
                />
                <span className="settings-range-value">
                  {settings.orbitPanSpeed.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="settings-row">
              <label htmlFor="set-zoom">Чувствительность зума</label>
              <div className="settings-range-wrap">
                <input
                  id="set-zoom"
                  type="range"
                  min={15}
                  max={200}
                  value={Math.round(settings.orbitZoomSpeed * 100)}
                  onChange={(e) =>
                    updateSettings({ orbitZoomSpeed: Number(e.target.value) / 100 })
                  }
                />
                <span className="settings-range-value">
                  {settings.orbitZoomSpeed.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Контроллеры</h3>
            <div className="settings-row">
              <label htmlFor="set-controller-size">Размер контроллеров</label>
              <div className="settings-range-wrap">
                <input
                  id="set-controller-size"
                  type="range"
                  min={4}
                  max={50}
                  step={1}
                  value={Math.round(settings.controllerSize * 100)}
                  onChange={(e) =>
                    updateSettings({ controllerSize: Number(e.target.value) / 100 })
                  }
                />
                <span className="settings-range-value">
                  {settings.controllerSize.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Экспорт по умолчанию</h3>
            <div className="settings-row">
              <label htmlFor="set-def-res">Разрешение</label>
              <select
                id="set-def-res"
                className="settings-select"
                value={settings.defaultExportResolution}
                onChange={(e) =>
                  updateSettings({ defaultExportResolution: e.target.value as StoredResolution })
                }
              >
                {RES_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <label htmlFor="set-def-aspect">Соотношение сторон рамки</label>
              <select
                id="set-def-aspect"
                className="settings-select"
                value={settings.defaultExportAspect}
                onChange={(e) =>
                  updateSettings({ defaultExportAspect: e.target.value as StoredAspect })
                }
              >
                {ASPECT_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">Прочее</h3>
            <div className="settings-row">
              <label htmlFor="set-confirm">Подтверждать сброс позы</label>
              <Toggle
                id="set-confirm"
                checked={settings.confirmOnResetPose}
                onChange={(v) => updateSettings({ confirmOnResetPose: v })}
              />
            </div>
          </section>
        </div>

        <div className="settings-modal-footer">
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={() => {
              if (window.confirm('Сбросить все настройки к значениям по умолчанию?')) {
                resetSettings();
              }
            }}
          >
            Сбросить всё
          </button>
          <button type="button" className="settings-btn settings-btn-primary" onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
