// src/hooks/useGizmoDrag.ts
// Хук для drag-взаимодействия с 3D-гизмо в R3F-сцене.
//
// Отключает OrbitControls во время drag, вызывает callbacks с экранными дельтами.
// Не использует state → нет лишних re-render.

import { useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export interface GizmoDragHandlers {
  /** Назначить на onPointerDown меша-гизмо. */
  handlePointerDown: (e: { button?: number; clientX: number; clientY: number; stopPropagation: () => void }) => void;
}

/**
 * Хук гизмо-drag.
 *
 * @param onDragStart  Вызывается один раз при начале drag (до первого onDrag).
 *                     Здесь нужно вызвать `rigService.beginDrag()`.
 * @param onDrag       Вызывается на каждый pointermove с экранными дельтами (px).
 * @param onDragEnd    Вызывается при pointerup.
 */
export function useGizmoDrag(
  onDragStart: () => void,
  onDrag: (screenDx: number, screenDy: number) => void,
  onDragEnd?: () => void,
): GizmoDragHandlers {
  const { controls } = useThree();

  // Используем ref для последней позиции, чтобы не пересоздавать обработчики
  const stateRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0, y: 0, active: false,
  });

  // moveHandler и upHandler создаются заново при каждом pointerDown,
  // чтобы capture-closure захватила актуальные onDrag/onDragEnd
  const handlePointerDown = useCallback(
    (e: { button?: number; clientX: number; clientY: number; stopPropagation: () => void }) => {
      if (e.button !== undefined && e.button !== 0) return;

      e.stopPropagation();

      stateRef.current = { x: e.clientX, y: e.clientY, active: true };

      // Отключаем OrbitControls на время drag
      if (controls) (controls as unknown as { enabled: boolean }).enabled = false;

      onDragStart();

      const moveHandler = (ev: PointerEvent) => {
        if (!stateRef.current.active) return;
        const dx = ev.clientX - stateRef.current.x;
        const dy = ev.clientY - stateRef.current.y;
        stateRef.current.x = ev.clientX;
        stateRef.current.y = ev.clientY;
        if (dx !== 0 || dy !== 0) onDrag(dx, dy);
      };

      const upHandler = () => {
        stateRef.current.active = false;
        if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
        onDragEnd?.();
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
      };

      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    },
    // onDragStart, onDrag, onDragEnd могут меняться при re-render,
    // поэтому перечисляем их как зависимости
    [controls, onDragStart, onDrag, onDragEnd],
  );

  return { handlePointerDown };
}
