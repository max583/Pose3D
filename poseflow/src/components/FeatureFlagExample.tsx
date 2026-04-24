// src/components/FeatureFlagExample.tsx

import React from 'react';
import { useFeatureFlag, FeatureFlag, FeatureFlagSwitch } from '../context/FeatureFlagContext';
import './FeatureFlagExample.css';

/**
 * Пример компонента, демонстрирующего использование feature flags
 */
export const FeatureFlagExample: React.FC = () => {
  const isFixedLengthsEnabled = useFeatureFlag('USE_FIXED_LENGTHS');
  const isDiContainerEnabled = useFeatureFlag('USE_DI_CONTAINER');
  const isMiniViewEnabled = useFeatureFlag('USE_MINI_VIEW');

  return (
    <div className="feature-flag-example">
      <h3>Feature Flags Demo</h3>
      
      <div className="example-section">
        <h4>1. Использование хука useFeatureFlag</h4>
        <div className="flag-status-list">
          <div className={`flag-status ${isFixedLengthsEnabled ? 'enabled' : 'disabled'}`}>
            <span className="flag-name">USE_FIXED_LENGTHS</span>
            <span className="flag-value">{isFixedLengthsEnabled ? '✅ Включен' : '❌ Выключен'}</span>
          </div>
          
          <div className={`flag-status ${isDiContainerEnabled ? 'enabled' : 'disabled'}`}>
            <span className="flag-name">USE_DI_CONTAINER</span>
            <span className="flag-value">{isDiContainerEnabled ? '✅ Включен' : '❌ Выключен'}</span>
          </div>
          
          <div className={`flag-status ${isMiniViewEnabled ? 'enabled' : 'disabled'}`}>
            <span className="flag-name">USE_MINI_VIEW</span>
            <span className="flag-value">{isMiniViewEnabled ? '✅ Включен' : '❌ Выключен'}</span>
          </div>
        </div>
      </div>

      <div className="example-section">
        <h4>2. Использование компонента FeatureFlag</h4>
        
        <FeatureFlag flag="USE_FIXED_LENGTHS">
          <div className="conditional-content enabled">
            <p>Этот контент виден только когда USE_FIXED_LENGTHS включен.</p>
            <p>Фиксированные длины костей активированы!</p>
          </div>
        </FeatureFlag>
        
        <FeatureFlag flag="USE_FIXED_LENGTHS" fallback={
          <div className="conditional-content disabled">
            <p>USE_FIXED_LENGTHS выключен. Используется обычная система drag.</p>
          </div>
        }>
          <div className="conditional-content enabled">
            <p>USE_FIXED_LENGTHS включен с fallback контентом.</p>
          </div>
        </FeatureFlag>
      </div>

      <div className="example-section">
        <h4>3. Использование компонента FeatureFlagSwitch</h4>
        
        <FeatureFlagSwitch
          flag="USE_DI_CONTAINER"
          enabled={
            <div className="switch-content enabled">
              <p>DI контейнер активирован! Зависимости управляются через контейнер.</p>
            </div>
          }
          disabled={
            <div className="switch-content disabled">
              <p>DI контейнер выключен. Используются синглтоны.</p>
            </div>
          }
        />
      </div>

      <div className="example-section">
        <h4>4. Комбинирование флагов</h4>
        
        {isFixedLengthsEnabled && isDiContainerEnabled ? (
          <div className="combined-flags enabled">
            <p>✅ Оба флага включены: USE_FIXED_LENGTHS и USE_DI_CONTAINER</p>
            <p>Можно использовать расширенные функции архитектуры.</p>
          </div>
        ) : (
          <div className="combined-flags disabled">
            <p>⚠️ Не все архитектурные флаги включены.</p>
            <p>Включите USE_FIXED_LENGTHS и USE_DI_CONTAINER для доступа ко всем функциям.</p>
          </div>
        )}
      </div>

      <div className="instructions">
        <h4>Как тестировать:</h4>
        <ol>
          <li>Нажмите на кнопку 🚩 в правом верхнем углу</li>
          <li>Включите флаги USE_FIXED_LENGTHS и USE_DI_CONTAINER</li>
          <li>Наблюдайте изменения в этом компоненте</li>
          <li>Попробуйте включить USE_MINI_VIEW (10% пользователей)</li>
        </ol>
        
        <p className="note">
          Примечание: В production режиме флаги управляются через процентное распределение
          и canary пользователей. В dev режиме можно включать/выключать вручную.
        </p>
      </div>
    </div>
  );
};