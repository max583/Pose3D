# PoseFlow Editor

3D редактор поз для ControlNet Stable_diffusion, аналог posemy.art

## Технологии

- **Electron** - кроссплатформенное десктопное приложение
- **React + TypeScript** - фронтенд
- **Three.js** - 3D рендеринг через @react-three/fiber
- **Python FastAPI** - бэкенд для экспорта и обработки поз

## Структура проекта

```
poseflow/
├── electron/           # Electron main процесс
│   ├── main.ts        # Точка входа
│   └── preload.ts     # Preload скрипт
├── backend/           # Python FastAPI
│   ├── main.py        # Приложение FastAPI
│   └── services/      # Сервисы (pose, export)
├── src/               # React фронтенд
│   ├── components/    # React компоненты
│   ├── hooks/         # Кастомные хуки
│   └── lib/          # Утилиты и типы
├── index.html
├── package.json
└── requirements.txt   # Python зависимости
```

## Установка

### 1. Node.js зависимости

```bash
npm install
```

### 2. Python зависимости

```bash
cd backend
pip install -r requirements.txt
```

## Запуск

### Режим разработки

```bash
npm run dev
```

Эта команда запустит:
- Vite dev server (http://localhost:5173)
- Electron приложение
- Python backend (http://127.0.0.1:8000)

### Сборка

```bash
npm run build
```

## Функционал Этапа 1

✅ Базовая структура Electron + React + Python  
✅ 3D Viewport с Three.js  
✅ Боковая панель с кнопками  
✅ IPC связь React ↔ Electron ↔ Python  
✅ Health check Python backend  
✅ Тестовое логирование  

## Архитектура

### IPC Связь

```
React Components
      ↓
  useIPC Hook
      ↓
window.electronAPI (preload)
      ↓
Electron IPC Handlers
      ↓
Python FastAPI (HTTP)
```

### Сервисы (планируется)

- **PoseService**: работа со скелетом BODY_25
- **ExportService**: экспорт PNG/JSON/OBJ
- **ComfyUIConnector**: API клиент для ComfyUI

## Лицензия

MIT
