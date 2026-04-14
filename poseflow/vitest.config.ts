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
    pool: 'forks',
  },
});
