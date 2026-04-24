// src/components/FeatureFlagPanel.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useFeatureFlagService, useEnabledFeatureFlags } from '../context/FeatureFlagContext';
import { FeatureFlagUtils } from '../lib/feature-flags';
import { getAllFlagDefinitions } from '../lib/feature-flags/registry';
import './FeatureFlagPanel.css';

interface FeatureFlagPanelProps {
  /** Показывать ли панель (обычно только в dev режиме) */
  visible?: boolean;
  /** Позиция панели */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Панель для управления feature flags (только в dev режиме)
 */
export const FeatureFlagPanel: React.FC<FeatureFlagPanelProps> = ({
  visible = import.meta.env.DEV,
  position = 'top-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const featureFlagService = useFeatureFlagService();
  const enabledFlags = useEnabledFeatureFlags();
  const flags = useMemo(() => getAllFlagDefinitions(), []);

  if (!visible) {
    return null;
  }

  // Фильтрация флагов
  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flag.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || flag.type === filterType;
    return matchesSearch && matchesType;
  });

  // Группировка по типу
  const groupedFlags = FeatureFlagUtils.groupFlagsByType(filteredFlags);

  const toggleFlag = (key: string) => {
    const currentState = featureFlagService.getFlagState(key);
    if (currentState?.enabled) {
      featureFlagService.disableFlag(key);
    } else {
      featureFlagService.enableFlag(key);
    }
  };

  const resetAllFlags = () => {
    if (window.confirm('Сбросить все флаги к значениям по умолчанию?')) {
      featureFlagService.resetToDefaults();
    }
  };

  const exportFlags = () => {
    const json = featureFlagService.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-flags-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`feature-flag-panel-container ${position} ${positionClasses[position]}`}>
      {/* Кнопка открытия/закрытия */}
      <button
        className="feature-flag-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Feature Flags"
        aria-label={isOpen ? 'Close feature flags panel' : 'Open feature flags panel'}
      >
        <span className="flag-icon">🚩</span>
        {enabledFlags.length > 0 && (
          <span className="enabled-count">{enabledFlags.length}</span>
        )}
      </button>

      {/* Панель */}
      {isOpen && (
        <div className="feature-flag-panel">
          <div className="panel-header">
            <h3>Feature Flags</h3>
            <button
              className="close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close panel"
            >
              ×
            </button>
          </div>

          <div className="panel-stats">
            <div className="stat">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{flags.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Enabled:</span>
              <span className="stat-value enabled">{enabledFlags.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">User:</span>
              <span className="stat-value">
                {featureFlagService.getFlagState('USE_FIXED_LENGTHS')?.activatedForUser ? '✓' : '✗'}
              </span>
            </div>
          </div>

          <div className="panel-controls">
            <input
              type="text"
              placeholder="Search flags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="type-filter"
            >
              <option value="all">All Types</option>
              <option value="release">Release</option>
              <option value="experiment">Experiment</option>
              <option value="operational">Operational</option>
              <option value="permission">Permission</option>
            </select>

            <div className="action-buttons">
              <button onClick={resetAllFlags} className="action-button reset">
                Reset All
              </button>
              <button onClick={exportFlags} className="action-button export">
                Export
              </button>
            </div>
          </div>

          <div className="flags-list">
            {Object.entries(groupedFlags).map(([type, typeFlags]) => (
              <div key={type} className="flag-type-group">
                <h4 className="type-header">
                  {type.charAt(0).toUpperCase() + type.slice(1)} ({typeFlags.length})
                </h4>
                
                {typeFlags.map((flag) => {
                  const state = featureFlagService.getFlagState(flag.key);
                  const isEnabled = state?.enabled || false;
                  const isActive = state?.activatedForUser || false;
                  const { canEnable, missingDependencies } = FeatureFlagUtils.canEnableFlag(
                    flag.key,
                    (key) => featureFlagService.getFlagState(key),
                    (key) => flags.find(f => f.key === key)
                  );

                  return (
                    <div
                      key={flag.key}
                      className={`flag-item ${isEnabled ? 'enabled' : 'disabled'} ${!canEnable ? 'blocked' : ''}`}
                    >
                      <div className="flag-header">
                        <div className="flag-toggle">
                          <input
                            type="checkbox"
                            id={`flag-${flag.key}`}
                            checked={isEnabled}
                            onChange={() => toggleFlag(flag.key)}
                            disabled={!canEnable}
                            aria-label={`Toggle ${flag.key}`}
                          />
                          <label htmlFor={`flag-${flag.key}`} className="flag-key">
                            {flag.key}
                          </label>
                        </div>
                        
                        <div className="flag-status">
                          <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} />
                          <span className="status-text">
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="flag-description">
                        {flag.description}
                      </div>

                      <div className="flag-metadata">
                        {flag.rolloutPercentage !== undefined && (
                          <span className="metadata-item">
                            Rollout: {flag.rolloutPercentage}%
                          </span>
                        )}
                        
                        {flag.dependsOn && flag.dependsOn.length > 0 && (
                          <span className="metadata-item">
                            Depends on: {flag.dependsOn.join(', ')}
                          </span>
                        )}
                      </div>

                      {missingDependencies.length > 0 && (
                        <div className="flag-dependencies">
                          <span className="dependency-warning">
                            Missing: {missingDependencies.join(', ')}
                          </span>
                        </div>
                      )}

                      <div className="flag-actions">
                        <button
                          onClick={() => toggleFlag(flag.key)}
                          disabled={!canEnable}
                          className="toggle-button"
                        >
                          {isEnabled ? 'Disable' : 'Enable'}
                        </button>
                        
                        {flag.key === 'USE_FIXED_LENGTHS' && (
                          <button
                            onClick={() => {
                              // Включаем все зависимости для этого флага
                              flag.dependsOn?.forEach(dep => {
                                featureFlagService.enableFlag(dep);
                              });
                              featureFlagService.enableFlag(flag.key);
                            }}
                            className="enable-all-button"
                          >
                            Enable All Dependencies
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="panel-footer">
            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot active" /> Active for user
              </div>
              <div className="legend-item">
                <span className="legend-dot inactive" /> Inactive for user
              </div>
              <div className="legend-item">
                <span className="legend-dot blocked" /> Blocked (dependencies)
              </div>
            </div>
            
            <div className="environment-info">
              Environment: {import.meta.env.DEV ? 'Development' : 'Production'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};