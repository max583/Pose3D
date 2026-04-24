// src/components/skeleton/JointGizmo.tsx
// Кольцевые гизмо для вращения суставов

import React, { useRef, useState, useCallback } from 'react';
import { Torus, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Vector3 } from 'three';
import { Body25Index, JointPosition } from '../../lib/body25/body25-types';
import { rotateAround, getGizmoAxis } from '../../lib/solvers/RotationSolver';
import { useIsDesignDollControllersEnabled } from '../../hooks/useFeatureFlagIntegration';
import { skeletonLogger } from '../../lib/logger';

interface JointGizmoProps {
  /** Индекс сустава, вокруг которого показывается гизмо */
  jointIndex: Body25Index;
  /** Позиция сустава */
  position: Vector3;
  /** Callback при вращении */
  onRotate: (axis: 'x' | 'y' | 'z', angle: number) => void;
  /** Callback при начале вращения */
  onRotationStart?: () => void;
  /** Callback при окончании вращения */
  onRotationEnd?: () => void;
  /** Радиус гизмо */
  radius?: number;
  /** Толщина кольца */
  tubeSize?: number;
}

export const JointGizmo: React.FC<JointGizmoProps> = ({
  jointIndex,
  position,
  onRotate,
  onRotationStart,
  onRotationEnd,
  radius = 0.3,
  tubeSize = 0.01,
}) => {
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePosition = useRef<{ x: number; y: number } | null>(null);
  const isDesignDollControllersEnabled = useIsDesignDollControllersEnabled();
  
  // Цвета для осей
  const axisColors = {
    x: '#ff0000', // Красный для X
    y: '#00ff00', // Зеленый для Y
    z: '#0000ff', // Синий для Z
  };
  
  // Обработчик начала перетаскивания
  const handlePointerDown = useCallback((axis: 'x' | 'y' | 'z', event: any) => {
    if (isDesignDollControllersEnabled) {
      // Если включены DesignDoll контроллеры, игнорируем взаимодействие с гизмо
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    skeletonLogger.debug(`Gizmo drag started on axis ${axis} for joint ${jointIndex}`);
    
    setActiveAxis(axis);
    setIsDragging(true);
    lastMousePosition.current = { x: event.clientX, y: event.clientY };
    
    if (onRotationStart) {
      onRotationStart();
    }
  }, [jointIndex, onRotationStart, isDesignDollControllersEnabled]);
  
  // Обработчик движения мыши (глобальный)
  const handlePointerMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !activeAxis || !lastMousePosition.current) return;
    
    const deltaX = event.clientX - lastMousePosition.current.x;
    const deltaY = event.clientY - lastMousePosition.current.y;
    
    // Вычисляем угол вращения на основе движения мыши
    const sensitivity = 0.01;
    const angle = Math.sqrt(deltaX * deltaX + deltaY * deltaY) * sensitivity;
    
    if (angle > 0.001) {
      // Определяем направление вращения
      const direction = Math.sign(deltaX + deltaY);
      const finalAngle = angle * direction;
      
      // Вызываем callback с углом вращения
      onRotate(activeAxis, finalAngle);
      
      // Обновляем позицию мыши
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    }
  }, [isDragging, activeAxis, onRotate]);
  
  // Обработчик отпускания мыши
  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    
    skeletonLogger.debug(`Gizmo drag ended for joint ${jointIndex}`);
    setIsDragging(false);
    setActiveAxis(null);
    lastMousePosition.current = null;
    
    if (onRotationEnd) {
      onRotationEnd();
    }
  }, [isDragging, jointIndex, onRotationEnd]);
  
  // Регистрируем глобальные обработчики событий
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      
      return () => {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);
  
  // Параметры для каждого кольца
  const rings = [
    { axis: 'x' as const, rotation: [0, 0, Math.PI / 2] as [number, number, number], color: axisColors.x },
    { axis: 'y' as const, rotation: [0, 0, 0] as [number, number, number], color: axisColors.y },
    { axis: 'z' as const, rotation: [Math.PI / 2, 0, 0] as [number, number, number], color: axisColors.z },
  ];
  
  return (
    <group position={position}>
      {rings.map((ring) => (
        <Torus
          key={ring.axis}
          args={[radius, tubeSize, 16, 32]}
          rotation={ring.rotation}
          onPointerDown={(e) => handlePointerDown(ring.axis, e)}
        >
          <meshStandardMaterial
            color={ring.color}
            emissive={ring.color}
            emissiveIntensity={activeAxis === ring.axis ? 0.5 : 0.2}
            transparent
            opacity={activeAxis === ring.axis ? 0.9 : 0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </Torus>
      ))}
      
      {/* Центральная сфера для визуального акцента */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[tubeSize * 1.5, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Подсказки осей */}
      <group>
        <Text
          position={[radius + 0.1, 0, 0]}
          fontSize={0.1}
          color={axisColors.x}
          anchorX="center"
          anchorY="middle"
        >
          X
        </Text>
        <Text
          position={[0, radius + 0.1, 0]}
          fontSize={0.1}
          color={axisColors.y}
          anchorX="center"
          anchorY="middle"
        >
          Y
        </Text>
        <Text
          position={[0, 0, radius + 0.1]}
          fontSize={0.1}
          color={axisColors.z}
          anchorX="center"
          anchorY="middle"
        >
          Z
        </Text>
      </group>
    </group>
  );
};

/**
 * Хук для управления состоянием гизмо
 */
export function useJointGizmo(jointIndex: Body25Index, position: Vector3) {
  const [showGizmo, setShowGizmo] = useState(false);
  
  const toggleGizmo = useCallback(() => {
    setShowGizmo(prev => !prev);
    skeletonLogger.debug(`Toggled gizmo for joint ${jointIndex}: ${!showGizmo ? 'show' : 'hide'}`);
  }, [jointIndex, showGizmo]);
  
  const hideGizmo = useCallback(() => {
    setShowGizmo(false);
  }, []);
  
  const handleRotate = useCallback((axis: 'x' | 'y' | 'z', angle: number) => {
    skeletonLogger.debug(`Rotating joint ${jointIndex} around ${axis} axis by ${angle.toFixed(4)} rad`);
    // Здесь будет логика вращения дочерних суставов
    // Пока просто логируем
  }, [jointIndex]);
  
  return {
    showGizmo,
    toggleGizmo,
    hideGizmo,
    handleRotate,
  };
}