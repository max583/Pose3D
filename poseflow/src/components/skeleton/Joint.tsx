// Joint.tsx - Интерактивная сфера (точка скелета).
// Stage 0: клик → выделение элемента через SelectionService.
// Drag-манипуляции добавляются в Stage 1+ через гизмо.

import React, { useRef, useState, useCallback, memo } from 'react';
import { Body25Index } from '../../lib/body25/body25-types';
import { JointPosition } from '../../lib/body25/body25-types';
import { skeletonLogger } from '../../lib/logger';

interface JointProps {
  index: Body25Index;
  position: JointPosition;
  color: string;
  radius?: number;
  /** Сустав принадлежит выделенному элементу — подсвечиваем ярче. */
  isSelected?: boolean;
  /** Клик по суставу — выбрать элемент. */
  onClick?: (index: Body25Index) => void;
}

const JointComponent: React.FC<JointProps> = ({
  index,
  position,
  color,
  radius = 0.02,
  isSelected = false,
  onClick,
}) => {
  const meshRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    skeletonLogger.debug(`Joint ${index} clicked`);
    onClick?.(index);
  }, [index, onClick]);

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback((e: any) => {
    e.stopPropagation();
    setIsHovered(false);
    document.body.style.cursor = 'default';
  }, []);

  React.useEffect(() => {
    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);

  const effectiveRadius = isSelected ? radius * 1.4 : radius;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[effectiveRadius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : isHovered ? color : 'transparent'}
        emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.3 : 0}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
};

export const Joint = memo(JointComponent);
