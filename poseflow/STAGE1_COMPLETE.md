# PoseFlow Editor - Этап 1 completed ✅

## Структура проекта (без node_modules)

```
poseflow/
├── electron/
│   ├── main.ts              # Electron main процесс
│   └── preload.ts           # Preload скрипт для IPC
├── backend/
│   ├── main.py              # FastAPI приложение
│   ├── requirements.txt     # Python зависимости
│   ├── __init__.py
│   └── services/
│       ├── __init__.py
│       ├── pose_service.py      # Сервис скелета BODY_25
│       └── export_service.py    # Сервис экспорта
├── src/
│   ├── main.tsx             # Точка входа React
│   ├── App.tsx              # Главный компонент
│   ├── App.css
│   ├── index.css            # Глобальные стили
│   ├── vite-env.d.ts        # Vite типы
│   ├── components/
│   │   ├── Canvas3D.tsx         # 3D Viewport (Three.js)
│   │   ├── Canvas3D.css
│   │   ├── Sidebar.tsx          # Боковая панель
│   │   ├── Sidebar.css
│   │   ├── StatusBar.tsx        # Строка статуса
│   │   └── StatusBar.css
│   ├── hooks/
│   │   └── useIPC.ts        # Хук для IPC связи
│   └── lib/
│       └── ipc.ts           # Типы ElectronAPI
├── index.html               # HTML шаблон
├── package.json             # Node зависимости
├── tsconfig.json            # TypeScript конфиг
├── tsconfig.node.json
├── vite.config.ts           # Vite конфиг
├── .gitignore
├── install.bat              # Скрипт установки
└── README.md
```

## ✅ Реализовано в Этапе 1

### 1. Базовая структура
- [x] Electron проект с TypeScript
- [x] React фронтенд с Vite
- [x] Python FastAPI backend
- [x] Модульная архитектура

### 2. Electron
- [x] main.ts - создание окна, запуск Python процесса
- [x] preload.ts - безопасный IPC API
- [x] IPC обработчики (app:info, python:health, pose:export, log:test)

### 3. Python Backend
- [x] FastAPI приложение на порту 8000
- [x] GET /health - проверка работоспособности
- [x] POST /pose/export - экспорт поз
- [x] PoseService - сервис для BODY_25
- [x] ExportService - экспорт JSON/PNG/OBJ

### 4. React Frontend
- [x] Главный компонент App с header/content/footer
- [x] Canvas3D - 3D Viewport с Three.js:
  - OrbitControls для камеры
  - Grid и Axes для ориентации
  - Отображение моделей
- [x] Sidebar с секциями:
  - Models (Add Model кнопка)
  - Export (JSON/PNG/OBJ кнопки)
  - Debug (Test Log кнопка)
- [x] StatusBar с информацией о стеке

### 5. IPC Связь
- [x] React → Electron через window.electronAPI
- [x] Electron → Python через HTTP (FastAPI)
- [x] Автоматическая проверка здоровья backend
- [x] Тестовое логирование

### 6. UI/UX
- [x] Темная тема с CSS переменными
- [x] Адаптивный layout
- [x] Градиентный заголовок "PoseFlow Editor"
- [x] Индикатор статуса backend
- [x] Красивые кнопки с hover эффектами

## Запуск приложения

### Установка зависимостей
```bash
# Все зависимости
install.bat

# Или вручную
npm install
cd backend && pip install -r requirements.txt
```

### Запуск

**Вариант 1: Только Vite dev сервер (для отладки)**
```bash
npm run dev
```
Откроется http://localhost:5173

**Вариант 2: Полный Electron app**
```bash
npm run electron:dev
```
Откроется окно Electron с заголовком "PoseFlow Editor"

**Вариант 3: Только Python backend**
```bash
npm run backend
```
API доступно на http://127.0.0.1:8000

### Проверка работы

**Python backend:**
```bash
curl http://127.0.0.1:8000/health
# {"status":"healthy","service":"PoseFlow Backend"}
```

**Тест экспорта:**
```bash
curl -X POST http://127.0.0.1:8000/pose/export \
  -H "Content-Type: application/json" \
  -d '{"pose_data":{"keypoints":{},"format":"openpose"},"export_format":"json"}'
# {"status":"success","message":"Exported to json","data":{"format":"json","keypoints_count":0}}
```

## Тестирование функционала

1. **Add Model** - добавляет синий куб в 3D сцену
2. **Test Log to Python** - отправляет тестовое сообщение в Python лог
3. **Health Check** - автоматически проверяется каждые 5 секунд
4. **OrbitControls** - вращение/зум/пан в 3D viewport

## Архитектура IPC

```
┌─────────────────┐
│  React UI       │
│  (Port 5173)    │
└────────┬────────┘
         │ window.electronAPI
         ▼
┌─────────────────┐
│  Electron IPC   │
│  (preload.ts)   │
└────────┬────────┘
         │ HTTP fetch
         ▼
┌─────────────────┐
│  Python FastAPI │
│  (Port 8000)    │
└─────────────────┘
```

## Следующие шаги (Этап 2)

- [ ] Реализовать скелет BODY_25 в 3D
- [ ] Drag & Drop ключевых точек
- [ ] Предустановленные позы (T-pose, A-pose)
- [ ] Реальный экспорт PNG с рендером скелета
- [ ] Импорт OpenPose JSON
- [ ] Множественные модели с именами
- [ ] Сохранение/загрузка проектов

## Технологии

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| UI Framework | React | 18.3.1 |
| 3D Rendering | Three.js | 0.163.0 |
| 3D React | @react-three/fiber | 8.18.0 |
| 3D Helpers | @react-three/drei | 9.122.0 |
| Desktop | Electron | 28.3.3 |
| Backend | Python FastAPI | 0.109.0 |
| Build | Vite | 5.4.21 |
| Language | TypeScript | 5.3.3 |

## Лицензия
MIT
