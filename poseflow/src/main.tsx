import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { setupErrorHandling } from './lib/logger';
import './index.css';

// Инициализация глобальной обработки ошибок
setupErrorHandling();

console.log('[App] Starting PoseFlow Editor...');
console.log('[App] Error handling initialized');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppSettingsProvider>
        <App />
      </AppSettingsProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
