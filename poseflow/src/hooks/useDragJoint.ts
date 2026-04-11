// useDragJoint.ts - Хук для drag-and-drop суставов
import { useState, useCallback, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Body25Index, JointPosition } from '../lib/body25/body25-types';

interface UseDragJointProps {
  index: Body25Index;
  initialPosition: JointPosition;
  onPositionChange: (index: Body25Index, position: JointPosition) => void;
}

interface DragHandlers {
  onPointerDown: (e: any) => void;
  onPointerUp: (e: any) => void;
}

export function useDragJoint({
  index,
  initialPosition,
  onPositionChange,
}: UseDragJointProps): {
  isDragging: boolean;
  handlers: DragHandlers;
} {
  const [isDragging, setIsDragging] = useState(false);
  const dragPlaneRef = useRef<Vector3 | null>(null);
  const offsetRef = useRef<Vector3>(new Vector3());
  
  const { camera, gl } = useThree();
  const mouseRef = useRef(new Vector2());

  // Обновляем позицию при drag
  useFrame(() => {
    if (!isDragging || !dragPlaneRef.current) return;

    // Получаем позицию мыши в 3D пространстве
    const raycaster = new (require('three').Raycaster)();
    raycaster.setFromCamera(mouseRef.current, camera);
    
    const intersection = new Vector3();
    const plane = new (require('three').Plane)(dragPlaneRef.current, 0);
    raycaster.ray.intersectPlane(plane, intersection);
    
    if (intersection) {
      const newPosition: JointPosition = {
        x: intersection.x - offsetRef.current.x,
        y: intersection.y - offsetRef.current.y,
        z: intersection.z - offsetRef.current.z,
        confidence: 1.0,
      };
      
      onPositionChange(index, newPosition);
    }
  });

  // Обработчик нажатия
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    
    // Отключаем OrbitControls во время drag
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation();
    }
    
    // Создаём плоскость для drag (параллельно камере)
    const worldPos = new Vector3(
      initialPosition.x,
      initialPosition.y,
      initialPosition.z,
    );
    
    // Направление к камере
    const cameraDir = new Vector3();
    camera.getWorldDirection(cameraDir);
    
    dragPlaneRef.current = new Vector3().copy(cameraDir).normalize();
    
    // Вычисляем смещение
    const raycaster = new (require('three').Raycaster)();
    raycaster.setFromCamera(mouseRef.current, camera);
    
    const intersection = new Vector3();
    const plane = new (require('three').Plane)(dragPlaneRef.current, 0);
    raycaster.ray.intersectPlane(plane, intersection);
    
    if (intersection) {
      offsetRef.current.set(
        intersection.x - worldPos.x,
        intersection.y - worldPos.y,
        intersection.z - worldPos.z,
      );
    }
  }, [initialPosition, camera]);

  // Обработчик отпускания
  const handlePointerUp = useCallback((e: any) => {
    e.stopPropagation();
    setIsDragging(false);
    dragPlaneRef.current = null;
  }, []);

  // Обновляем позицию мыши
  const handlePointerMove = useCallback((e: any) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }, [gl]);

  // Добавляем глобальный слушатель движения
  useEffect(() => {
    if (isDragging) {
      gl.domElement.addEventListener('pointermove', handlePointerMove);
      return () => {
        gl.domElement.removeEventListener('pointermove', handlePointerMove);
      };
    }
  }, [isDragging, gl, handlePointerMove]);

  return {
    isDragging,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
    },
  };
}
