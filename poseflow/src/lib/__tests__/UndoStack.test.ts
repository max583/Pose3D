import { describe, it, expect } from 'vitest';
import { UndoStack } from '../UndoStack';

describe('UndoStack', () => {
  it('пустой стек: canUndo=false, canRedo=false', () => {
    const stack = new UndoStack<number>();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it('после push: canUndo=true, canRedo=false', () => {
    const stack = new UndoStack<number>();
    stack.push(1);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it('undo возвращает сохранённое состояние и даёт canRedo=true', () => {
    const stack = new UndoStack<string>();
    stack.push('a');
    const prev = stack.undo('b');
    expect(prev).toBe('a');
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  it('redo возвращает текущее состояние на момент undo', () => {
    const stack = new UndoStack<string>();
    stack.push('a');
    stack.undo('b');      // сохраняет 'b' в redo
    const next = stack.redo('a');
    expect(next).toBe('b');
    expect(stack.canRedo).toBe(false);
    expect(stack.canUndo).toBe(true);
  });

  it('push после undo сбрасывает redo-стек', () => {
    const stack = new UndoStack<number>();
    stack.push(1);
    stack.undo(2);        // теперь redo=[2]
    stack.push(3);        // должен очистить redo
    expect(stack.canRedo).toBe(false);
    expect(stack.canUndo).toBe(true);
  });

  it('undo на пустом стеке возвращает null', () => {
    const stack = new UndoStack<number>();
    expect(stack.undo(42)).toBeNull();
  });

  it('redo на пустом redo-стеке возвращает null', () => {
    const stack = new UndoStack<number>();
    stack.push(1);
    expect(stack.redo(2)).toBeNull();
  });

  it('maxDepth: старые состояния вытесняются', () => {
    const stack = new UndoStack<number>(3);
    stack.push(1);
    stack.push(2);
    stack.push(3);
    stack.push(4); // вытесняет 1; стек = [2, 3, 4]
    // Три undo вернут 4, 3, 2 — а не 1
    const r4 = stack.undo(99);
    const r3 = stack.undo(r4!);
    const r2 = stack.undo(r3!);
    const r1 = stack.undo(r2!); // стек пуст — null
    expect(r4).toBe(4);
    expect(r3).toBe(3);
    expect(r2).toBe(2);
    expect(r1).toBeNull(); // 1 вытеснен
  });

  it('несколько циклов undo/redo сохраняют порядок', () => {
    const stack = new UndoStack<number>();
    stack.push(10);
    stack.push(20);
    stack.push(30);

    expect(stack.undo(40)).toBe(30);
    expect(stack.undo(30)).toBe(20);
    expect(stack.redo(20)).toBe(30);
    expect(stack.undo(30)).toBe(20);
    expect(stack.undo(20)).toBe(10);
    expect(stack.canUndo).toBe(false);
  });
});
