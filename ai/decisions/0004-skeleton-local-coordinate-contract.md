# ADR 0004: Skeleton-local coordinate contract

## Статус

Принято

## Контекст

Управление гизмо стало нестабильным после поворота или переворота манекена. Симптомы: направления mouse drag для головы, шеи и других гизмо зависят от того, как повернут весь манекен в рабочем пространстве. Точечные правки знаков частично помогают в отдельных видах камеры, но плохо масштабируются.

В текущей архитектуре уже есть нужная основа:

- `SkeletonRig.rootPosition` задает позицию манекена в workspace.
- `SkeletonRig.rootRotation` задает ориентацию манекена в workspace.
- `SkeletonRig.localRotations`, virtual chains и локальные углы головы/шеи/стоп описывают позу относительно манекена и родительских звеньев.
- `resolveSkeleton()` строит world `PoseData` из rig state.

Проблема не в хранении позы, а в том, что часть controller/input кода смешивает screen/world drag с локальными rig delta через ручные таблицы знаков.

## Решение

Поза хранится в системе координат манекена. Рабочее пространство видит манекен только через root transform:

```text
skeleton/local pose + rootPosition/rootRotation -> world PoseData
world/screen input -> local frame delta -> SkeletonRig mutation
```

`rootPosition` и `rootRotation` являются единственным transform из skeleton space в workspace для всего манекена. Узел `MID_HIP` / 8 управляет именно этим root transform.

Все локальные сгибы и вращения отдельных элементов должны применяться в подходящем локальном frame:

- torso frame для spine/neck;
- head frame для head pitch/yaw/roll;
- limb-chain frame для elbow/knee twist;
- foot frame для foot pitch/yaw/roll;
- root frame для pelvis/root controls.

Controller/input слой обязан переводить mouse/screen/world input в соответствующий local frame до вызова `RigService` mutation. Ручные таблицы инверсий допустимы только как временная диагностика, но не как целевая архитектура.

## Последствия

Плюсы:

- Поворот или переворот манекена не должен менять смысл локальных гизмо.
- Меньше ручных знаков и разрозненных view-dependent условий.
- Появляется единый критерий для новых контроллеров: input сначала пересчитывается в local frame.

Минусы:

- Нужен небольшой слой helper-функций для преобразований координат и screen drag.
- Часть существующих controllers придется мигрировать постепенно.

Что соблюдать в коде:

- `SkeletonRig` остается source of truth.
- `PoseData` остается производным world-представлением.
- Новая pure-логика преобразований должна лежать в `poseflow/src/lib/rig/` или рядом с controller math и иметь unit-тесты.
- Миграцию делать маленькими шагами: сначала helpers, затем один проблемный controller, затем остальные.
