Этап 2. 3D-редактор поз + экспорт OpenPose

Добавь функционал 3D-редактирования поз в формате OpenPose BODY_25.

## Контекст
Проект: poseflow (Electron + Python + React). На этапе 1 создана базовая структура.

## Задачи
### 1. 3D-сцена (Three.js)
- Отобразить скелет из 25 точек BODY_25:

0:Nose, 1:Neck, 2:RShoulder, 3:RElbow, 4:RWrist,
5:LShoulder, 6:LElbow, 7:LWrist, 8:MidHip,
9:RHip, 10:RKnee, 11:RAnkle, 12:LHip, 13:LKnee, 14:LAnkle,
15:REye, 16:LEye, 17:REar, 18:LEar,
19:LBigToe, 20:LSmallToe, 21:LHeel,
22:RBigToe, 23:RSmallToe, 24:RHeel

- Точки: сферы 8px, линии между ними (цвет: красный=торс, синий=руки, зелёный=ноги)
- Поддержка drag-and-drop: перетаскивание точки мышью обновляет позицию

### 2. Управление
Аналогично управлению приложения posemy.art https://posemy.art/blog/ultimate-posemyart-toolkit/


### 3. Экспорт для ControlNet
- Python-сервис `ExportService`:
- `export_to_openpose_json(pose_data)` → BODY_25 формат [[5]]:
  ```json
  {"version":1.3,"people":[{"pose_keypoints_2d":[x0,y0,c0,...]}]}
  ```
- `export_to_openpose_png(pose_data, resolution=512)` → чёрный фон, цветные точки/линии
- Кнопка "Экспорт" в UI: выбор формата → сохранение файла через Electron dialog

### 4. Пресеты
- Массив из 10 базовых поз (стоя, сидя, бег) в `src/lib/presets/body25-presets.ts`
- Кнопка "Загрузить пресет" → замена текущего скелета

## Критерии приёмки
- Перетаскивание точки плавно обновляет 3D-сцену (60 FPS)
- Экспортированный PNG открывается в ControlNet как valid pose [[6]][[7]]
- JSON соответствует спецификации OpenPose BODY_25
- Код типизирован (TypeScript), с комментариями

Начни с `PoseService` и отрисовки скелета, затем добавь интерактивность и экспорт. Запрашивай подтверждение перед изменениями.