// Joint.tsx - Интерактивная сфера (точка скелета)
import React, { useRef, useState, useCallback } from 'react';
import { Body25Index, JointPosition } from '../../lib/body25/body25-types';
import { useTransformDrag } from '../../hooks/useTransformDrag';
import { skeletonLogger } from '../../lib/logger';

interface JointProps {
  index: Body25Index;
  position: JointPosition;
  color: string;
  onPositionChange: (index: Body25Index, position: JointPosition) => void;
  radius?: number;
  isGlobalDragging?: boolean;
  onGlobalDragStart?: () => void;
  onGlobalDragEnd?: () => void;
}

export const Joint: React.FC<JointProps> = ({
  index,
  position,
  color,
  onPositionChange,
  radius = 0.04,
  isGlobalDragging = false,
  onGlobalDragStart,
  onGlobalDragEnd,
}) => {
  const meshRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Хук для drag-and-drop
  const { isDragging, handlePointerDown } = useTransformDrag({
    index,
    onPositionChange,
  });

  // Обработчик начала перетаскивания
  const handleDragStart = useCallback((e: any) => {
    e.stopPropagation();
    skeletonLogger.debug(`Joint ${index} pointer down`);
    onGlobalDragStart?.();
    handlePointerDown(e);
  }, [index, handlePointerDown, onGlobalDragStart]);

  // Обработчик окончания перетаскивания
  const handleDragEnd = useCallback(() => {
    skeletonLogger.debug(`Joint ${index} pointer up`);
    onGlobalDragEnd?.();
  }, [onGlobalDragEnd]);

  // Слушаем окончание drag на window
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalPointerUp = () => {
        handleDragEnd();
      };
      window.addEventListener('pointerup', handleGlobalPointerUp);
      return () => {
        window.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
    return undefined;
  }, [isDragging, handleDragEnd]);

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setIsHovered(true);
    if (!isDragging) {
      document.body.style.cursor = 'grab';
    }
  }, [isDragging]);

  const handlePointerOut = useCallback((e: any) => {
    e.stopPropagation();
    setIsHovered(false);
    if (!isDragging) {
      document.body.style.cursor = 'default';
    }
  }, [isDragging]);

  // Обновляем курсор при drag
  React.useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
    } else if (isHovered) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [isDragging, isHovered]);

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handleDragStart}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={isDragging ? '#ffffff' : isHovered ? color : 'transparent'}
        emissiveIntensity={isDragging ? 0.8 : isHovered ? 0.3 : 0}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
};
