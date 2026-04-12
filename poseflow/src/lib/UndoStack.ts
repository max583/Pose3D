// UndoStack.ts — Generic undo/redo стек
export class UndoStack<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private readonly maxDepth: number;

  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth;
  }

  push(state: T): void {
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    // Новое действие сбрасывает redo
    this.redoStack = [];
  }

  undo(currentState: T): T | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(currentState);
    return this.undoStack.pop()!;
  }

  redo(currentState: T): T | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(currentState);
    return this.redoStack.pop()!;
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
