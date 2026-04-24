// useControllerDrag.ts - Camera-plane drag для контроллеров DesignDoll
// Адаптация useTransformDrag: вместо Body25Index использует controllerId string
import { useState, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector2, Vector3, Plane, Raycaster } from 'three';
import { skeletonLogger, errorLogger } from '../lib/logger';

interface UseControllerDragProps {
  controllerId: string;
  onPositionChange: (id: string, pos: { x: number; y: number; z: number }) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * Drag контроллеров в плоскости, перпендикулярной камере.
 * Идентичная логика проекции как у useTransformDrag (camera-plane).
 */
export function useControllerDrag({
  controllerId,
  onPositionChange,
  onDragStart,
  onDragEnd,
}: UseControllerDragProps): {
  isDragging: boolean;
  handlePointerDown: (e: any) => void;
} {
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const dragPlaneRef = useRef<Plane>(new Plane());
  const offsetRef = useRef<Vector3>(new Vector3());
  const raycasterRef = useRef<Raycaster>(new Raycaster());
  const ndcRef = useRef<Vector2>(new Vector2());

  const updateNDC = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }, [gl]);

  const intersectDragPlane = useCallback((clientX: number, clientY: number): Vector3 | null => {
    updateNDC(clientX, clientY);
    raycasterRef.current.setFromCamera(ndcRef.current, camera);
    const target = new Vector3();
    const hit = raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, target);
    return hit ? target : null;
  }, [camera, updateNDC]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    try {
      const intersection = intersectDragPlane(e.clientX, e.clientY);
      if (!intersection) return;
      onPositionChange(controllerId, {
        x: intersection.x - offsetRef.current.x,
        y: intersection.y - offsetRef.current.y,
        z: intersection.z - offsetRef.current.z,
      });
    } catch (error) {
      errorLogger.error('Error during controller drag', {
        controllerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [controllerId, onPositionChange, intersectDragPlane]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.();
    skeletonLogger.debug(`Controller ${controllerId} drag ended`);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [controllerId, onDragEnd, handlePointerMove]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();

    const worldPos = new Vector3(
      e.object.position.x,
      e.object.position.y,
      e.object.position.z,
    );

    const cameraDir = new Vector3();
    camera.getWorldDirection(cameraDir);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, worldPos);

    const clientX = e.clientX ?? e.nativeEvent?.clientX ?? 0;
    const clientY = e.clientY ?? e.nativeEvent?.clientY ?? 0;
    const intersection = intersectDragPlane(clientX, clientY);
    if (intersection) {
      offsetRef.current.copy(intersection).sub(worldPos);
    } else {
      offsetRef.current.set(0, 0, 0);
    }

    setIsDragging(true);
    onDragStart?.();
    skeletonLogger.debug(`Controller ${controllerId} drag started`);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [camera, controllerId, intersectDragPlane, onDragStart, handlePointerMove, handlePointerUp]);

  return { isDragging, handlePointerDown };
}
