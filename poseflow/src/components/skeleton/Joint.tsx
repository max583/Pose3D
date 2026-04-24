// Joint.tsx - Интерактивная сфера (точка скелета)
import React, { useRef, useState, useCallback, memo } from 'react';
import { Body25Index, JointPosition } from '../../lib/body25/body25-types';
import { useTransformDrag } from '../../hooks/useTransformDrag';
import { useIsDesignDollControllersEnabled } from '../../hooks/useFeatureFlagIntegration';
import { skeletonLogger } from '../../lib/logger';

interface JointProps {
  index: Body25Index;
  position: JointPosition;
  color: string;
  onPositionChange: (index: Body25Index, position: JointPosition) => void;
  onToggleLink?: (index: Body25Index) => void;
  radius?: number;
  isGlobalDragging?: boolean;
  onGlobalDragStart?: () => void;
  onGlobalDragEnd?: () => void;
  /** В IK-режиме — конечная точка цепочки (кисть/стопа) */
  isEndEffector?: boolean;
  /** Сустав отключён от FK-пропагации */
  isUnlinked?: boolean;
}

const JointComponent: React.FC<JointProps> = ({
  index,
  position,
  color,
  onPositionChange,
  onToggleLink,
  radius = 0.02,
  isGlobalDragging = false,
  onGlobalDragStart,
  onGlobalDragEnd,
  isEndEffector = false,
  isUnlinked = false,
}) => {
  const meshRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isDesignDollControllersEnabled = useIsDesignDollControllersEnabled();

  // Хук для drag-and-drop (только если DesignDoll контроллеры не включены)
  const { isDragging, handlePointerDown } = useTransformDrag({
    index,
    onPositionChange,
  });

  // Обработчик начала перетаскивания
  const handleDragStart = useCallback((e: any) => {
    if (isDesignDollControllersEnabled) {
      // Если включены DesignDoll контроллеры, игнорируем drag на суставах
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    skeletonLogger.debug(`Joint ${index} pointer down`);
    onGlobalDragStart?.();
    handlePointerDown(e);
  }, [index, handlePointerDown, onGlobalDragStart, isDesignDollControllersEnabled]);

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

  // Правая кнопка мыши — переключить FK-связь
  const handleContextMenu = useCallback((e: any) => {
    if (isDesignDollControllersEnabled) {
      // Если включены DesignDoll контроллеры, игнорируем контекстное меню на суставах
      e.stopPropagation();
      e.nativeEvent?.preventDefault?.();
      return;
    }
    e.stopPropagation();
    e.nativeEvent?.preventDefault?.();
    onToggleLink?.(index);
  }, [index, onToggleLink, isDesignDollControllersEnabled]);

  const handlePointerOver = useCallback((e: any) => {
    if (isDesignDollControllersEnabled) {
      // Если включены DesignDoll контроллеры, игнорируем hover на суставах
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    setIsHovered(true);
    if (!isDragging) {
      document.body.style.cursor = 'grab';
    }
  }, [isDragging, isDesignDollControllersEnabled]);

  const handlePointerOut = useCallback((e: any) => {
    if (isDesignDollControllersEnabled) {
      // Если включены DesignDoll контроллеры, игнорируем hover на суставах
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    setIsHovered(false);
    if (!isDragging) {
      document.body.style.cursor = 'default';
    }
  }, [isDragging, isDesignDollControllersEnabled]);

  // Обновляем курсор при drag (только если DesignDoll контроллеры не включены)
  React.useEffect(() => {
    if (isDesignDollControllersEnabled) {
      // Если включены DesignDoll контроллеры, не меняем курсор при взаимодействии с суставами
      return;
    }
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
  }, [isDragging, isHovered, isDesignDollControllersEnabled]);

  // End-effectors в IK-режиме — чуть крупнее и ярче
  const effectiveRadius = isEndEffector ? radius * 1.5 : radius;
  // Unlinked-суставы — полупрозрачные
  const opacity = isUnlinked ? 0.45 : 1.0;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handleDragStart}
      onContextMenu={handleContextMenu}
    >
      <sphereGeometry args={[effectiveRadius, 16, 16]} />
      <meshStandardMaterial
        color={isUnlinked ? '#888888' : color}
        emissive={
          isDragging ? '#ffffff'
          : isEndEffector ? '#ffffff'
          : isHovered ? color
          : 'transparent'
        }
        emissiveIntensity={isDragging ? 0.8 : isEndEffector ? 0.25 : isHovered ? 0.3 : 0}
        roughness={0.3}
        metalness={0.2}
        transparent={isUnlinked}
        opacity={opacity}
      />
    </mesh>
  );
};

export const Joint = memo(JointComponent);
