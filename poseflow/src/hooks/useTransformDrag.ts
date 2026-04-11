// useTransformDrag.ts - Хук для drag-and-drop с использованием TransformControls
import { useState, useCallback, useRef } from 'react';
import { Body25Index, JointPosition } from '../lib/body25/body25-types';
import { skeletonLogger, errorLogger } from '../lib/logger';

interface UseTransformDragProps {
  index: Body25Index;
  onPositionChange: (index: Body25Index, position: JointPosition) => void;
}

/**
 * Хук для drag-and-drop суставов
 * Использует простой подход с pointer events вместо сложного raycasting
 */
export function useTransformDrag({
  index,
  onPositionChange,
}: UseTransformDragProps): {
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  handlePointerDown: (e: any) => void;
} {
  const [isDragging, setIsDraggingInternal] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const startJointPosRef = useRef<JointPosition | null>(null);

  // Внутренний setter для состояния
  const setIsDragging = useCallback((dragging: boolean) => {
    setIsDraggingInternal(dragging);
    if (dragging) {
      skeletonLogger.debug(`Joint ${index} drag started`);
    } else {
      skeletonLogger.debug(`Joint ${index} drag ended`);
    }
  }, [index]);

  // Обработчик нажатия - начинаем drag
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    
    // Получаем текущую позицию сустава
    const currentPos: JointPosition = {
      x: e.object.position.x,
      y: e.object.position.y,
      z: e.object.position.z,
    };

    startJointPosRef.current = currentPos;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
    };

    setIsDraggingInternal(true);

    // Добавляем глобальные обработчики
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, []);

  // Обработчик движения - используем движение мыши для смещения
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !startPosRef.current || !startJointPosRef.current) {
      return;
    }

    try {
      // Вычисляем смещение мыши
      const dx = (e.clientX - startPosRef.current.x) * 0.01; // Масштабируем для чувствительности
      const dy = (e.clientY - startPosRef.current.y) * 0.01;

      // Новая позиция сустава
      const newPosition: JointPosition = {
        x: startJointPosRef.current.x + dx,
        y: startJointPosRef.current.y - dy, // Инвертируем Y
        z: startJointPosRef.current.z, // Z не меняем при простом drag
        confidence: 1.0,
      };

      // Обновляем позицию
      onPositionChange(index, newPosition);

      // Обновляем начальную позицию для следующего движения
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
      startJointPosRef.current = newPosition;
    } catch (error) {
      errorLogger.error('Error during joint drag move', {
        index,
        error: error instanceof Error ? error.message : String(error),
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }
  }, [isDragging, index, onPositionChange]);

  // Обработчик отпускания
  const handlePointerUp = useCallback((e: PointerEvent) => {
    setIsDraggingInternal(false);
    startPosRef.current = null;
    startJointPosRef.current = null;

    // Удаляем глобальные обработчики
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  return {
    isDragging,
    setIsDragging,
    handlePointerDown,
  };
}
