# Work State Log — PoseFlow Editor

---

## 📖 Описание проекта

### PoseFlow Editor
**3D редактор поз человека для ControlNet / Stable Diffusion**

Локальное десктопное приложение для создания, редактирования и экспорта поз в формате OpenPose BODY_25. Аналог posemy.art, но работающий оффлайн.

**Назначение**: Создание pose-изображений для ControlNet OpenPose в Stable Diffusion. Пользователь размещает 3D скелет из 25 точек, настраивает позу, экспортирует в формате, совместимом с ControlNet.

**Целевая аудитория**: Художники, дизайнеры, пользователи Stable Diffusion, которым нужен точный контроль над позами генерируемых персонажей.

### Ключевой функционал
- 🦴 3D скелет BODY_25 (25 точек, 24 кости)
- 🎨 Цвета узлов и костей по спецификации OpenPose
- 🖱️ Drag-and-drop редактирование поз
- 📐 Экспорт с рамкой (crop) — выбор области, aspect ratio, разрешение
- 🎥 9 видов камеры (Front, Back, Side, 3/4 × 4 направления, Top)
- 📦 10 пресетов базовых поз
- 💾 Экспорт в OpenPose JSON и PNG

### Технический стек
- **Frontend**: React 18 + TypeScript + Vite
- **3D**: Three.js + @react-three/fiber + @react-three/drei
- **Desktop**: Electron (опционально)
- **Backend**: Python FastAPI (опционально, для серверного экспорта)

---

## ✅ Завершенные этапы

### Этап 1: Базовая структура (ЗАВЕРШЁН ✅)
**Цель**: Инициализация проекта и базовая инфраструктура

**Реализовано**:
- ✅ Electron + TypeScript проект с Vite
- ✅ FastAPI backend (`/backend`) с эндпоинтами:
  - `GET /health` — проверка связи
  - `POST /pose/export` — экспорт скелета
- ✅ React интерфейс:
  - 3D Canvas (пустой)
  - Боковая панель с кнопками
- ✅ Двусторонняя связь: React ↔ Electron IPC ↔ Python
- ✅ Модульная архитектура: PoseService, ExportService, ComfyUIConnector
- ✅ Логирование: клик по кнопке → сообщение в Python-лог

**Структура**:
```
poseflow/
├── electron/     # main.ts, preload.ts, IPC handlers
├── backend/      # FastAPI: main.py, services/
├── src/          # React: components/, hooks/, lib/
├── package.json
├── requirements.txt
└── README.md
```

---

### Этап 2: 3D редактор поз + экспорт OpenPose (ЗАВЕРШЁН ✅)
**Цель**: Полноценный 3D редактор с экспортом

**Реализовано**:
- ✅ **3D скелет BODY_25**:
  - 25 точек (сферы) с цветовой кодировкой
  - 24 связи (кости) с группировкой по цветам:
    - Торс (красный #ff4444) — 5 связей
    - Руки (синий #4488ff) — 4 связи
    - Ноги (зелёный #44cc44) — 4 связи
    - Голова (жёлтый #ffcc00) — 5 связей
    - Стопы (оранжевый #ff8800) — 6 связей

- ✅ **Drag-and-Drop**:
  - Перетаскивание точек мышью в 3D
  - Обновление позиции в реальном времени (60 FPS)
  - Визуальная обратная связь (hover, cursor)
  - Отключение OrbitControls во время drag
  - Хук `useTransformDrag` (простой pointer-events подход)

- ✅ **Управление камерой**:
  - Front View, Side View, Top View, Reset
  - Плавная анимация переходов (ease-in-out)
  - Компонент `CameraControls`

- ✅ **Пресеты поз** (10 штук):
  - T-Pose, A-Pose, Standing, Sitting, Walking
  - Running, Jumping, Dancing, Waving, Arms Crossed

- ✅ **Экспорт OpenPose**:
  - TypeScript: `ExportService.exportToOpenPoseJSON()`, `exportToPNG()`
  - Python: `export_to_openpose_json()`, `export_to_openpose_png()`
  - Формат JSON: `{"version":1.3,"people":[{"pose_keypoints_2d":[x0,y0,c0,...]}]}`
  - PNG: чёрный фон, цветные линии, белые точки

- ✅ **UI**:
  - Sidebar: Quick Poses, All Presets, Export buttons
  - Canvas3D: 3D Viewport, CameraControls, Grid + Axes

**Версия**: v0.2.0

---

### Этап 2.5: Исправления и улучшения (ЗАВЕРШЁН ✅)
**Цель**: Исправление багов и улучшение UX

**Реализовано**:
- ✅ **Исправлен экспорт PNG** — `point.project(camera)` вместо ручного расчёта матриц
- ✅ **Bounding box масштабирование** — скелет центрируется и масштабируется
- ✅ **Система логирования** — многоуровневая (global, React Error Boundary, сервисы, хуки)
- ✅ **Защита от рекурсии** в logger (`isInErrorHandling` флаг)
- ✅ **Camera ref** — `CameraRefSetter` вместо state (избежание re-render loop)

---

### Этап 3: Новый UI экспорта (ЗАВЕРШЁН ✅)
**Цель**: Замена кнопок экспорта на интерактивную рамку

**Реализовано**:
- ✅ **Компонент ExportFrame**:
  - Рамка с drag (перемещение) и resize (8 handles)
  - Верхняя панель: Aspect Ratio, Resolution, Export, Cancel
  - Затемнение за пределами рамки
  - Отображение текущих настроек на рамке

- ✅ **Aspect Ratio**:
  - 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 4:5, 5:4, free
  - Сохранение пропорций при resize (только угловые handles)
  - Боковые handles свободные

- ✅ **Resolution**: 1K (1024), 2K (2048), 4K (4096)

- ✅ **Camera Controls — Compass UI**:
  - 9 видов камеры (вид сверху):
    ```
    ↙  ↑  ↘
    ← [Top] →
    ↖  ↓  ↗
    [  ↺ Reset  ]
    ```
  - Позиции: Front, Back, Side R/L, 3/4 F/B × R/L, Top, Reset

- ✅ **Цвета OpenPose Body_25** — все 49 цветов проверены:
  - 25 узлов: от `#ff0055` (Nose) через градиент к `#00ffff` (Toes/Heels)
  - 24 кости: от `#ff0000` через жёлтый, зелёный, голубой, синий к `#9900ff`

- ✅ **Sidebar** — удалена секция экспорта (только через viewport)

---

### Этап 3.5: Выравнивание PNG-экспорта с рамкой (ЗАВЕРШЁН ✅)
**Цель**: Экспорт по Export Frame совпадает с тем, что видно под синей рамкой; нет «ломаного» скелета.

**Проблема (устранена)**:
- Квадратный offscreen-canvas при камере с `aspect ≠ 1` — NDC → пиксели искажались относительно экрана.
- Для точек вне квадрата срабатывал bbox-fallback в мировых XY — смешивались две системы координат (рваные кости, ноги «отдельно»).
- Виртуальная камера + crop центра квадрата не совпадала с нормализованной рамкой viewport.

**Реализовано**:
- ✅ **`projectTo2D(joint, camera, canvasWidth, canvasHeight)`** — отдельные ширина/высота холста = тот же aspect, что у WebGL viewport.
- ✅ **`exportToPNG(poseData, size, camera)`** — `size` число (квадрат, как раньше) или `{ width, height }`.
- ✅ **С камерой**: только перспективная проекция; обрезка сегментов костей по границе canvas (Liang–Barsky); узлы только внутри холста.
- ✅ **`downloadPNGWithCrop`**: та же камера; высокоразмерный рендер `renderW × renderH` с **aspect = viewportWidth/viewportHeight**; **2D `drawImage`** по `frame.x/y/width/height`; масштаб до целевого `resolution × pixelAR`; загрузка итогового Image через **Promise** (корректный `await`).
- ✅ **`ExportFrameData`**: обязательные `viewportWidth`, `viewportHeight`, `viewportAspectRatio` при экспорте.

**Файлы**: `poseflow/src/services/ExportService.ts`, `poseflow/src/components/ExportFrame.tsx`

**Статус**: проверено пользователем — crop и выравнивание работают.

---

## Session Info
- **Project**: PoseFlow Editor — 3D Pose Editor for ControlNet (OpenPose BODY_25)
- **Stack**: React + TypeScript + Three.js (@react-three/fiber) + Electron + Python FastAPI
- **Working Dir**: D:\ai\QwenCoder\poseflow
- **Last Updated**: 2026-04-11 (Export Frame resize, maximize/restore fix, pose editing outside frame)
- **Vite**: при разработке — `http://127.0.0.1:5173/` (при занятом порте возможен другой, см. консоль)

---

## ✅ РЕАЛИЗОВАННЫЙ ФУНКЦИОНАЛ

### 1. BODY_25 Скелет
- **25 узлов** с цветами OpenPose Body_25 (проверены все 25)
- **24 кости** с цветами OpenPose Body_25 (проверены все 24)
- Drag-and-drop редактирование (useTransformDrag)
- 10 пресетов поз (T-Pose, A-Pose, Standing, Sitting, Walking, Running, Jumping, Dancing, Waving, Arms Crossed)

**Цвета узлов** (`src/lib/body25/body25-keypoints.ts`):
```
0:Nose=#ff0055, 1:Neck=#ff0000, 2:RShoulder=#ff5500, 3:RElbow=#ffaa00, 4:RWrist=#ffff00
5:LShoulder=#aaff00, 6:LElbow=#55ff00, 7:LWrist=#00ff00, 8:MidHip=#00ff55
9:RHip=#00ffaa, 10:RKnee=#00ffff, 11:RAnkle=#00aaff, 12:LHip=#0055ff
13:LKnee=#0000ff, 14:LAnkle=#5500ff, 15:REye=#aa00ff, 16:LEye=#ff00ff
17:REar=#ff00aa, 18:LEar=#ff0055, 19-24:Toes/Heels=#00ffff
```

**Цвета костей** (`src/lib/body25/body25-connections.ts`) — 24 связи, градиент от #ff0000 через #ffff00, #00ff00, #00ffff, #0000ff к #9900ff.

### 2. Экспорт OpenPose
**Полный экспорт** (без crop, `downloadPNG`) — РАБОТАЕТ:
- `ExportService.exportToPNG(poseData, resolution, camera)` — квадратный canvas; с камерой — перспективная проекция и обрезка линий; без камеры — bbox.

**Crop экспорт** (`downloadPNGWithCrop`) — **РАБОТАЕТ**:
- Ренер viewport-aspect → вырезка по рамке → целевое разрешение (1K/2K/4K и aspect рамки).

**JSON**:
- `ExportService.exportToOpenPoseJSON()` — OpenPose JSON; проекция на квадрат `resolution × resolution` (упрощение для ControlNet).

### 3. Export Frame UI
**Компонент**: `src/components/ExportFrame.tsx`
- Drag & resize рамки (8 handles: nw, ne, sw, se, n, s, e, w)
- Боковые handles (n,s,e,w) — свободные (без aspect ratio)
- Угловые handles — сохраняют aspect ratio
- **Aspect ratio**: 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 4:5, 5:4, free
- **Resolution**: 1K (1024), 2K (2048), 4K (4096)
- Верхняя панель управления (Aspect, Resolution, Export, Cancel)
- В `ExportFrameData`: `pixelAspectRatio`, `viewportWidth`, `viewportHeight`, `viewportAspectRatio`

**Исправления (Resize)**:
- ✅ `pixelSizeRef` — хранение размеров рамки в пикселях (не в процентах)
- ✅ `ResizeObserver` + `window.resize` listener для обработки maximize/restore окна
- ✅ Debounce 50ms для избежания частых обновий
- ✅ При resize viewport — пересчёт процентов из пиксельных размеров (`newWidth = pixelWidth / viewportWidth`)
- ✅ Сохранение пропорций рамки при изменении размера окна браузера
- ✅ Угловые handles используют `currentPixelRatio` из `pixelSizeRef` (не preset из `ASPECT_RATIO_MAP`)
- ✅ При resize через боковые handles — пропорция сохраняется, нет скачка к preset при захвате уголка
- ✅ Pointer events пропускаются через backdrop — drag скелета работает вне рамки
- ✅ `isPointerInsideFrame` — OrbitControls отключается только когда pointer внутри рамки
- ✅ Top-bar изменён на `position: fixed` (без padding-top на overlay) — рамка не сдвигается при resize
- ✅ Индикаторы режима: `🎯 Edit pose outside frame` / `📐 Frame edit mode`

### 3.5. Экспорт с рамкой (Crop) — Выравнивание
**Цель**: Экспорт по Export Frame совпадает с тем, что видно под синей рамкой; нет «ломаного» скелета.

**Проблема (устранена)**:
- Квадратный offscreen-canvas при камере с `aspect ≠ 1` — NDC → пиксели искажались относительно экрана.
- Для точек вне квадрата срабатывал bbox-fallback в мировых XY — смешивались две системы координат (рваные кости, ноги «отдельно»).
- Виртуальная камера + crop центра квадрата не совпадала с нормализованной рамкой viewport.

**Реализовано**:
- ✅ **`projectTo2D(joint, camera, canvasWidth, canvasHeight)`** — отдельные ширина/высота холста = тот же aspect, что у WebGL viewport.
- ✅ **`exportToPNG(poseData, size, camera)`** — `size` число (квадрат, как раньше) или `{ width, height }`.
- ✅ **С камерой**: только перспективная проекция; обрезка сегментов костей по границе canvas (Liang–Barsky); узлы только внутри холста.
- ✅ **`downloadPNGWithCrop`**: та же камера; высокоразмерный рендер `renderW × renderH` с **aspect = viewportWidth/viewportHeight**; **2D `drawImage`** по `frame.x/y/width/height`; масштаб до целевого `resolution × pixelAR`; загрузка итогового Image через **Promise** (корректный `await`).
- ✅ **`ExportFrameData`**: обязательные `viewportWidth`, `viewportHeight`, `viewportAspectRatio` при экспорте.

**Файлы**: `poseflow/src/services/ExportService.ts`, `poseflow/src/components/ExportFrame.tsx`

**Статус**: проверено пользователем — crop и выравнивание работают.

### 4. Camera Controls
**Компонент**: `src/components/controls/CameraControls.tsx`
- Compass grid (вид сверху, 3×3 + reset)
- **9 видов**:
  ```
  ↙(3/4 B-L)  ↑(Back)  ↘(3/4 B-R)
  ←(Left)     [Top]     →(Right)
  ↖(3/4 F-L)  ↓(Front)  ↗(3/4 F-R)
  [  ↺ Reset  ]
  ```
- Позиции камер (`src/services/cameraService.ts`):
  ```
  Front: (0, 1.5, 5), Back: (0, 1.5, -5), Side: (5, 1.5, 0)
  3/4 F-R: (3.5, 2.5, 3.5), 3/4 F-L: (-3.5, 2.5, 3.5)
  3/4 B-R: (3.5, 2.5, -3.5), 3/4 B-L: (-3.5, 2.5, -3.5)
  ```
- Анимация переходов (ease-in-out, 500ms)

### 5. Camera Ref
**Проблема**: камера не передавалась из Canvas в App (state re-render loop)
**Решение**: `CameraRefSetter` компонент + `useRef<THREE.Camera>` вместо `useState`

### 6. Логирование
- Множество модулей: `uiLogger`, `canvasLogger`, `skeletonLogger`, `exportLogger`, `errorLogger`
- localStorage (1000 записей)
- Глобальный перехват ошибок с защитой от рекурсии (`isInErrorHandling` флаг)

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
poseflow/
├── src/
│   ├── App.tsx                    # Главный компонент, handleExportFrame
│   ├── components/
│   │   ├── Canvas3D.tsx/.css      # 3D viewport, ExportFrame overlay, CameraRefSetter
│   │   ├── Sidebar.tsx/.css       # Боковая панель (poses, presets, actions)
│   │   ├── StatusBar.tsx          # Статус-бар
│   │   ├── ExportFrame.tsx/.css   # Рамка экспорта (drag, resize, aspect, resolution)
│   │   ├── controls/
│   │   │   └── CameraControls.tsx/.css  # Compass grid, 9 видов камеры
│   │   └── skeleton/
│   │       ├── Skeleton3D.tsx     # Полный скелет
│   │       ├── Joint.tsx          # Интерактивная сфера
│   │       └── Bone.tsx           # Линия между точками
│   ├── services/
│   │   ├── ExportService.ts       # exportToPNG, downloadPNGWithCrop (viewport-aligned crop)
│   │   ├── PoseService.ts         # Управление позой (singleton)
│   │   └── cameraService.ts       # 9 видов камеры, анимация
│   ├── hooks/
│   │   ├── useTransformDrag.ts    # Drag-and-drop скелета
│   │   └── useIPC.ts              # Electron IPC (fallback для браузера)
│   ├── lib/
│   │   ├── body25/
│   │   │   ├── body25-types.ts    # Типы: Body25Index, JointPosition, PoseData
│   │   │   ├── body25-keypoints.ts # 25 узлов с цветами ✅
│   │   │   └── body25-connections.ts # 24 кости с цветами ✅
│   │   ├── presets/
│   │   │   └── body25-presets.ts  # 10 пресетов поз
│   │   └── logger.ts              # Логирование + защита от рекурсии
│   └── main.tsx                   # Точка входа, setupErrorHandling()
├── electron/
│   ├── main.ts                    # Electron main process
│   ├── preload.ts                 # Preload script
│   └── logger.ts                  # Electron логирование
├── backend/
│   ├── main.py                    # FastAPI server
│   └── services/
│       ├── export_service.py      # Python экспорт
│       └── pose_service.py        # Python поза
└── README.md
```

*Лог работы (этот файл):* `D:\ai\QwenCoder\work-state.md` — в корне репозитория QwenCoder, не внутри `poseflow/`.

---

## 🔧 КЛЮЧЕВЫЕ ТЕХНИЧЕСКИЕ ДЕТАЛИ

### ExportService.exportToPNG()
- Аргумент `size`: число → квадрат `size × size`; иначе `{ width, height }` (для совпадения с aspect камеры / viewport).
- **С камерой**: только `projectTo2D`; сегменты костей обрезаются по прямоугольнику холста (Liang–Barsky).
- **Без камеры**: bbox всех точек + 10% отступы, `scale = min(W/rangeX, H/rangeY) * 0.9`.
- Цвета линий из `BODY25_CONNECTIONS`, цвета точек из `KEYPOINT_MAP`.

### ExportService.projectTo2D()
```typescript
camera.updateMatrixWorld();
camera.updateProjectionMatrix();
point.project(camera);  // → NDC (-1..1)
x = (ndcX + 1) / 2 * canvasWidth;
y = (1 - ndcY) / 2 * canvasHeight;
```

### ExportService.downloadPNGWithCrop()
- `upscale = max(targetW/(frameW·vw), targetH/(frameH·vh), 1)`; `renderW = ceil(vw·upscale)`, `renderH = ceil(vh·upscale)`.
- `exportToPNG(..., { width: renderW, height: renderH }, camera)` — та же камера, что в viewport.
- `drawImage(full, sx, sy, sw, sh, 0, 0, targetW, targetH)` где `sx = frame.x * renderW`, и т.д.

### Export Frame координаты
- Нормализованные (0-1) относительно viewport (DOM-контейнер `canvas3d-container`)
- `pixelAspectRatio = (frame.width * viewportWidth) / (frame.height * viewportHeight)`
- `viewportAspectRatio = viewportWidth / viewportHeight`

### Aspect Ratio сохранение при resize
- Только для угловых handles (nw, ne, sw, se)
- Боковые handles (n, s, e, w) — свободные
- Формула: `newHeight = (newWidth * viewportAR) / targetRatio`

---

## ⚠️ ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ / МЕЛКИЕ ЗАМЕЧАНИЯ

1. **JSON при crop** — отдельного экспорта keypoints только по области рамки нет; PNG crop выровнен, JSON остаётся квадратной проекцией при необходимости доработки.
2. **Логирование** — при экстремальных NDC возможны предупреждения `Point out of NDC view`.
3. **Z-coordinate** — drag суставов только в плоскости XY (осознанный дизайн).
4. **devicePixelRatio** — выравнивание завязано на CSS-размеры viewport; при нетипичном масштабировании canvas стоит перепроверить визуально.
5. **Пропорции рамки при resize** — при изменении aspect ratio viewport (например, высота окна меняется) пропорции рамки сохраняются через `pixelSizeRef`, но точное позиционирование может требовать дополнительной калибровки.

---

## 📋 СЛЕДУЮЩИЕ ШАГИ (по желанию)

### Приоритет 1: Качество и сопутствующий экспорт
- OpenPose JSON в координатах финального crop (если нужен паритет с PNG рамки).
- Рендер через WebGL (readPixels) как опция для пиксель-идентичности с viewport при DPR ≠ 1.
- Точное совпадение пропорций рамки при изменении aspect ratio viewport (в процессе).

### Приоритет 2: Очистка
- Удалить неиспользуемый код
- Свести предупреждения `tsc` (electron include / composite)
- Актуализировать внутренние md-отчёты в `poseflow/`, если используются

---

## 🚀 ЗАПУСК

```bash
# Vite (React frontend)
cd D:\ai\QwenCoder\poseflow && npx vite --port 5173

# Python backend (опционально)
cd D:\ai\QwenCoder\poseflow\backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000

# TypeScript проверка
npx tsc --noEmit
```

Открыть: http://localhost:5173

---

## 📝 ЗАМЕТКИ

- Все 49 цветов (25 узлов + 24 кости) проверены и соответствуют OpenPose Body_25
- Camera ref работает через `CameraRefSetter` (не state)
- Logger имеет защиту от рекурсии (`isInErrorHandling`)
- Export Frame: вместе с рамкой в `ExportService` уходят `viewportWidth` / `viewportHeight` для выравнивания PNG
- Sidebar: секция экспорта удалена, только кнопка «Export Frame» на viewport
- Виртуальная камера для crop **снята**; актуальный путь — viewport-aspect ренер + 2D crop
- **Export Frame resize**: 
  - `pixelSizeRef` хранит размеры в пикселях, при resize пересчитываются в проценты
  - Угловые handles используют текущий ratio из `pixelSizeRef` (не preset)
  - Top-bar: `position: fixed` (без padding-top на overlay)
  - Drag скелета работает вне рамки (`pointer-events: none` на backdrop)
  - OrbitControls отключается только когда pointer внутри рамки
