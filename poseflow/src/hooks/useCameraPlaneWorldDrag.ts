// src/hooks/useCameraPlaneWorldDrag.ts
// Хук для перетаскивания объекта в плоскости камеры (как в DesignDoll).
//
// При нажатии создаётся плоскость, перпендикулярная направлению взгляда камеры
// и проходящая через текущую мировую позицию объекта.
// При движении мыши: raycast → пересечение с плоскостью → абсолютная мировая позиция.
//
// Использование:
//   const { handlePointerDown } = useCameraPlaneWorldDrag(
//     () => new Vector3(x, y, z),  // текущая позиция в moment нажатия
//     () => rigService.beginDrag(),
//     (newPos) => rigService.applyArmIK(side, newPos.x, newPos.y, newPos.z),
//   );

import { useCallback, useRef } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';

export interface CameraPlaneWorldDragHandlers {
  handlePointerDown: (e: {
    button?: number;
    clientX: number;
    clientY: number;
    stopPropagation: () => void;
  }) => void;
}

/**
 * Перетаскивание в плоскости камеры с raycast → абсолютная мировая позиция.
 *
 * @param getCurrentPos  Вызывается один раз при начале drag — возвращает текущую мировую позицию.
 * @param onDragStart    Вызывается один раз в начале drag (сохранить undo-снимок).
 * @param onDrag         Вызывается на каждый pointermove с новой абсолютной мировой позицией.
 * @param onDragEnd      Вызывается при pointerup.
 */
export function useCameraPlaneWorldDrag(
  getCurrentPos: () => Vector3,
  onDragStart:   () => void,
  onDrag:        (newWorldPos: Vector3) => void,
  onDragEnd?:    () => void,
  dragSensitivity = 1,
): CameraPlaneWorldDragHandlers {
  const { camera, gl, controls } = useThree();

  // Флаг активного drag (не state → нет лишних ре-рендеров)
  const activeRef = useRef(false);

  const handlePointerDown = useCallback(
    (e: { button?: number; clientX: number; clientY: number; stopPropagation: () => void }) => {
      if (e.button !== undefined && e.button !== 0) return;

      e.stopPropagation();
      if (controls) (controls as unknown as { enabled: boolean }).enabled = false;

      // Плоскость перпендикулярна камере и проходит через текущую позицию объекта
      const startPos = getCurrentPos();
      const camDir = new Vector3();
      camera.getWorldDirection(camDir);
      const plane = new Plane().setFromNormalAndCoplanarPoint(camDir, startPos);

      onDragStart();
      activeRef.current = true;

      const raycaster = new Raycaster();
      const mouse    = new Vector2();
      const hitPoint = new Vector3();
      const startHitPoint = startPos.clone();

      const readPointerOnPlane = (clientX: number, clientY: number, target: Vector3): boolean => {
        const rect = gl.domElement.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width)  *  2 - 1;
        mouse.y = ((clientY - rect.top)  / rect.height) * -2 + 1;
        raycaster.setFromCamera(mouse, camera);
        return raycaster.ray.intersectPlane(plane, target) !== null;
      };

      readPointerOnPlane(e.clientX, e.clientY, startHitPoint);

      const moveHandler = (ev: PointerEvent) => {
        if (!activeRef.current) return;

        if (readPointerOnPlane(ev.clientX, ev.clientY, hitPoint)) {
          const scaledPos = startPos
            .clone()
            .addScaledVector(hitPoint.clone().sub(startHitPoint), dragSensitivity);
          onDrag(scaledPos);
        }
      };

      const upHandler = () => {
        activeRef.current = false;
        if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
        onDragEnd?.();
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup',   upHandler);
      };

      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup',   upHandler);
    },
    [camera, gl, controls, getCurrentPos, onDragStart, onDrag, onDragEnd, dragSensitivity],
  );

  return { handlePointerDown };
}
