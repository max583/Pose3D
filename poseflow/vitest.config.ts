/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';

/** Отдельная конфигурация без electron-плагинов из vite.config.ts */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-electron/**', '**/e2e/**'],
    pool: 'forks',
  },
});
