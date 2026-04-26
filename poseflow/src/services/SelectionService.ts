// src/services/SelectionService.ts
// Сервис выбора элемента скелета. Хранит выбранный ElementId.
// Элемент выбирается кликом по суставу или кости в 3D-вьюпорте.

import { ElementId } from '../lib/rig/elements';

type Listener = (selected: ElementId | null) => void;

export class SelectionService {
  private _selected: ElementId | null = null;
  private _listeners: Set<Listener> = new Set();

  /** Получить текущий выбранный элемент. */
  getSelected(): ElementId | null {
    return this._selected;
  }

  /** Установить выбранный элемент (null — снять выделение). */
  setSelected(element: ElementId | null): void {
    if (this._selected === element) return; // нет изменений
    this._selected = element;
    this._notify();
  }

  /** Подписаться на изменения выбора. Возвращает функцию отписки. */
  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener(this._selected);
    }
  }

  dispose(): void {
    this._listeners.clear();
  }
}
