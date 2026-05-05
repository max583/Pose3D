Этап 1.
Создай базовую структуру локального приложения для редактирования 3D-поз в формате OpenPose для ControlNet Stable Diffusion. 
Приложение должно работать оффлайн, без интернета, с функционалом и интерфейсом аналогичным posemy.art.
https://posemy.art/features/
https://posemy.art/blog/ultimate-posemyart-toolkit/

## Требования
- **Стек**: Electron (main/preload/renderer) + Python backend (FastAPI) + React/TypeScript фронтенд
- **Архитектура**: Модульная, как ComfyUI — отдельные сервисы для:
  - `PoseService`: работа со скелетом BODY_25
  - `ExportService`: PNG/JSON/OBJ экспорт
  - `ComfyUIConnector`: API-клиент для связи с внешним ComfyUI
- **3D**: Three.js через @react-three/fiber + @react-three/drei

## Задача этапа 1
1. Инициализировать Electron-проект с TypeScript
2. Настроить FastAPI сервер в `/backend` с эндпоинтами:
   - `GET /health` — проверка связи
   - `POST /pose/export` — экспорт скелета в PNG/JSON
3. Создать базовый React-интерфейс:
   - Окно с 3D-канвасом (пока пустой)
   - Боковая панель с кнопками "Добавить модель", "Экспорт"
4. Реализовать двустороннюю связь: React ↔ Electron IPC ↔ Python

## Ожидаемый результат
- Рабочий `npm run dev` и `python backend/main.py`
- Окно приложения с заголовком "PoseFlow Editor"
- Логирование: клик по кнопке → сообщение в Python-лог
- Структура папок:

poseflow/
├── electron/ # main.ts, preload.ts, IPC handlers
├── backend/ # FastAPI: main.py, services/
├── src/ # React: components/, hooks/, lib/
├── public/
├── package.json
├── requirements.txt
└── README.md

Начни с анализа структуры, предложи план файлов, затем реализуй по шагам. Запрашивай подтверждение перед созданием/изменением файлов. Используй `/language output Russian`.

