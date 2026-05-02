# Architecture Decision Records (ADR)

Здесь фиксируются значимые архитектурные решения по PoseFlow Editor. Формат упрощённый (контекст → решение → последствия).

## Как добавить запись

1. Создайте файл `NNNN-краткое-имя.md` (четыре цифры, kebab-case, английское имя файла для совместимости с инструментами).
2. Скопируйте шаблон ниже.
3. Добавьте строку в таблицу внизу этого README.

## Шаблон

```markdown
# ADR NNNN: Краткий заголовок

## Статус

Принято | Устарело | Заменено ADR-XXXX

## Контекст

Какая проблема, ограничения, альтернативы кратко рассмотрены.

## Решение

Что делаем и почему.

## Последствия

Плюсы, минусы, что нужно соблюдать в коде и тестах.
```

## Индекс

| № | Файл | Тема |
|---|------|------|
| 0001 | [0001-fabrik-ik-for-body25-chains.md](0001-fabrik-ik-for-body25-chains.md) | IK для цепей рук/ног: FABRIK |
| 0002 | [0002-png-export-viewport-projection.md](0002-png-export-viewport-projection.md) | PNG/JSON экспорт и согласование с камерой/viewport |
| 0003 | [0003-foot-rotation-layer.md](0003-foot-rotation-layer.md) | Отдельный слой вращения стопы вокруг ANKLE |
| 0004 | [0004-skeleton-local-coordinate-contract.md](0004-skeleton-local-coordinate-contract.md) | Поза в координатах манекена + root transform в workspace |
