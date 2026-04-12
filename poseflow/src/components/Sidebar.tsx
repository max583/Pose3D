import React, { useState, useEffect } from 'react';
import { poseService } from '../services/PoseService';
import { getAllPosePresets } from '../lib/presets/body25-presets';
import { ManipulationMode } from '../lib/body25/body25-types';
import { uiLogger } from '../lib/logger';
import { useAppSettings } from '../context/AppSettingsContext';
import './Sidebar.css';

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenSettings,
}) => {
  const { settings } = useAppSettings();
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [mode, setMode] = useState<ManipulationMode>(poseService.manipulationMode);
  const presets = getAllPosePresets();

  // Обновляем состояние кнопок при изменении позы
  useEffect(() => {
    const update = () => {
      setCanUndo(poseService.canUndo);
      setCanRedo(poseService.canRedo);
    };
    update();
    return poseService.subscribe(update);
  }, []);

  const handleModeChange = (newMode: ManipulationMode) => {
    poseService.manipulationMode = newMode;
    setMode(newMode);
    uiLogger.info(`Manipulation mode: ${newMode}`);
  };

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
      <div className="sidebar-section">
        <h3>Инструменты</h3>
        <button
          type="button"
          className="btn btn-secondary btn-settings"
          onClick={onOpenSettings}
        >
          ⚙ Настройки
        </button>
      </div>

      <div className="sidebar-section">
        <h3>Mode</h3>
        <div className="btn-row">
          <button
            className={`btn btn-mode ${mode === 'fk' ? 'btn-mode-active' : 'btn-secondary'}`}
            onClick={() => handleModeChange('fk')}
            title="FK: двигает сустав со всеми потомками"
          >
            FK
          </button>
          <button
            className={`btn btn-mode ${mode === 'ik' ? 'btn-mode-active' : 'btn-secondary'}`}
            onClick={() => handleModeChange('ik')}
            title="IK: решает цепочку от конечной точки"
          >
            IK
          </button>
        </div>
        <div className="mode-hint">
          {mode === 'fk'
            ? 'FK: сустав двигает всех потомков'
            : 'IK: drag кисти/стопы решает цепочку'}
        </div>
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
      </div>

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
