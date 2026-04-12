// useTransformDrag.ts - Drag суставов в плоскости камеры через raycasting
import { useState, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector2, Vector3, Plane, Raycaster } from 'three';
import { Body25Index, JointPosition } from '../lib/body25/body25-types';
import { skeletonLogger, errorLogger } from '../lib/logger';

interface UseTransformDragProps {
  index: Body25Index;
  onPositionChange: (index: Body25Index, position: JointPosition) => void;
}

/**
 * Drag суставов в плоскости, перпендикулярной направлению камеры.
 * Работает корректно с любого ракурса (front, side, top, 3/4).
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
  const { camera, gl } = useThree();

  // Refs для drag-состояния (не вызывают re-render)
  const dragPlaneRef = useRef<Plane>(new Plane());
  const offsetRef = useRef<Vector3>(new Vector3());
  const raycasterRef = useRef<Raycaster>(new Raycaster());
  const ndcRef = useRef<Vector2>(new Vector2());

  const setIsDragging = useCallback((dragging: boolean) => {
    setIsDraggingInternal(dragging);
  }, []);

  // Конвертация mouse event -> NDC координаты (-1..1)
  const updateNDC = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }, [gl]);

  // Пересечение луча с drag-плоскостью
  const intersectDragPlane = useCallback((clientX: number, clientY: number): Vector3 | null => {
    updateNDC(clientX, clientY);
    raycasterRef.current.setFromCamera(ndcRef.current, camera);
    const target = new Vector3();
    const hit = raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, target);
    return hit ? target : null;
  }, [camera, updateNDC]);

  // Обработчик движения мыши
  const handlePointerMove = useCallback((e: PointerEvent) => {
    try {
      const intersection = intersectDragPlane(e.clientX, e.clientY);
      if (!intersection) return;

      const newPosition: JointPosition = {
        x: intersection.x - offsetRef.current.x,
        y: intersection.y - offsetRef.current.y,
        z: intersection.z - offsetRef.current.z,
        confidence: 1.0,
      };

      onPositionChange(index, newPosition);
    } catch (error) {
      errorLogger.error('Error during joint drag move', {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [index, onPositionChange, intersectDragPlane]);

  // Обработчик отпускания
  const handlePointerUp = useCallback(() => {
    setIsDraggingInternal(false);
    skeletonLogger.debug(`Joint ${index} drag ended`);

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [index, handlePointerMove]);

  // Обработчик нажатия — начало drag
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();

    // Позиция сустава в мировых координатах
    const jointWorldPos = new Vector3(
      e.object.position.x,
      e.object.position.y,
      e.object.position.z,
    );

    // Создаём плоскость перпендикулярно камере, проходящую через сустав
    const cameraDir = new Vector3();
    camera.getWorldDirection(cameraDir);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, jointWorldPos);

    // Находим точку пересечения луча с плоскостью в момент нажатия
    const intersection = intersectDragPlane(e.clientX ?? e.nativeEvent?.clientX ?? 0, e.clientY ?? e.nativeEvent?.clientY ?? 0);
    if (intersection) {
      // Offset = разница между точкой пересечения и позицией сустава
      // Это предотвращает "прыжок" сустава к курсору
      offsetRef.current.copy(intersection).sub(jointWorldPos);
    } else {
      offsetRef.current.set(0, 0, 0);
    }

    setIsDraggingInternal(true);
    skeletonLogger.debug(`Joint ${index} drag started`);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [camera, index, intersectDragPlane, handlePointerMove, handlePointerUp]);

  return {
    isDragging,
    setIsDragging,
    handlePointerDown,
  };
}
