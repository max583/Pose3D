import React, { useState, useEffect, useCallback } from 'react';
import { getAllPosePresets } from '../lib/presets/body25-presets';
import { logUtils, uiLogger } from '../lib/logger';
import { useAppSettings } from '../context/AppSettingsContext';
import { usePoseService } from '../context/ServiceContext';
import { getService } from '../lib/di/setup';
import { ServiceKeys } from '../lib/di/types';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';
import './Sidebar.css';

/** Универсальный хук для debug-кнопок — подписывается на DI FeatureFlagService. */
function useFlagToggle(flagKey: string): [boolean, () => void] {
  const service = getService<FeatureFlagService>(ServiceKeys.FeatureFlagService);
  const [enabled, setEnabled] = useState(() => service.isEnabled(flagKey));

  useEffect(() => {
    const unsubscribe = service.subscribe(flagKey, (state) => {
      setEnabled(state.enabled || state.activatedForUser);
    });
    return unsubscribe;
  }, [service, flagKey]);

  const toggle = useCallback(() => {
    service.toggleFlag(flagKey);
    const nowOn = service.isEnabled(flagKey);
    console.log(`[Flag:${flagKey}] ${nowOn ? 'ON' : 'OFF'}`);
  }, [service, flagKey]);

  return [enabled, toggle];
}

interface SidebarProps {
  onOpenSettings: () => void;
  onShowExportFrame: () => void;
  onCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenSettings,
  onShowExportFrame,
  onCollapse,
}) => {
  const { settings } = useAppSettings();
  const poseService = usePoseService();
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [legIKTraceEnabled, handleToggleLegIKTrace] = useFlagToggle('ENABLE_LEG_IK_TRACE');
  const [perfTraceEnabled, handleTogglePerfTrace] = useFlagToggle('ENABLE_PERFORMANCE_LOGGING');
  const presets = getAllPosePresets();

  // Обновляем состояние кнопок при изменении позы
  useEffect(() => {
    const update = () => {
      setCanUndo(poseService.canUndo);
      setCanRedo(poseService.canRedo);
    };
    update();
    return poseService.subscribe(update);
  }, [poseService]);

  const handleResetPose = () => {
    if (
      settings.confirmOnResetPose &&
      !window.confirm('Сбросить позу к состоянию по умолчанию?')
    ) {
      return;
    }
    uiLogger.info('Reset pose clicked');
    poseService.reset();
    setSelectedPreset('');
  };

  const handlePresetChange = (presetId: string) => {
    uiLogger.info(`Preset selected: ${presetId}`);
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      poseService.setPoseData(preset.poseData);
    }
  };

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="sidebar-collapse"
        onClick={onCollapse}
        title="Скрыть панель инструментов"
        aria-label="Скрыть панель инструментов"
      >
        ←
      </button>
      <div className="sidebar-section">
        <h3>Инструменты</h3>
        <button
          type="button"
          className="btn btn-secondary btn-settings"
          onClick={onOpenSettings}
        >
          ⚙ Настройки
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-export-frame"
          onClick={onShowExportFrame}
        >
          📐 Export Frame
        </button>
      </div>

      <div className="sidebar-section">
        <h3>POSE PRESETS</h3>
        <select
          className="preset-select"
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
        >
          <option value="">Select a preset...</option>
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.icon} {preset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <h3>Actions</h3>
        <div className="btn-row">
          <button
            className="btn btn-secondary"
            onClick={() => poseService.undo()}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => poseService.redo()}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪ Redo
          </button>
        </div>
        <button className="btn btn-secondary" onClick={handleResetPose}>
          Reset Pose
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => poseService.mirrorPose()}
          title="Mirror pose L↔R (M)"
        >
          ⇄ Mirror L↔R
        </button>
      </div>

      {settings.showDebugTools && (
        <div className="sidebar-section sidebar-debug-section">
          <h3>Debug</h3>
          <button
            type="button"
            className={`btn ${legIKTraceEnabled ? 'btn-debug-active' : 'btn-secondary'}`}
            onClick={handleToggleLegIKTrace}
            title="LegIKTrace writes leg IK diagnostics to console and PoseFlow logs"
          >
            Leg IK Trace: {legIKTraceEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`btn ${perfTraceEnabled ? 'btn-debug-active' : 'btn-secondary'}`}
            onClick={handleTogglePerfTrace}
            title="Perf Trace выводит время каждой секции applyLegIK в console.debug"
          >
            Perf Trace: {perfTraceEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              logUtils.exportLogs();
              uiLogger.info('PoseFlow logs exported');
            }}
          >
            Export Logs
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              logUtils.clearLogs();
              uiLogger.info('PoseFlow logs cleared');
            }}
          >
            Clear Logs
          </button>
        </div>
      )}

      <div className="sidebar-section sidebar-footer">
        <div className="sidebar-info">
          <span>PoseFlow v0.2.0</span>
        </div>
        <div className="sidebar-info">
          <span>BODY_25 • 25 joints</span>
        </div>
      </div>
    </aside>
  );
};
