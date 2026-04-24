// src/components/experimental/ControllerVisual.tsx
// Визуализация контроллеров DesignDoll с поддержкой camera-plane drag

import React, { useRef } from 'react';
import { Mesh, Euler } from 'three';
import { useFrame } from '@react-three/fiber';
import { ControllerState } from '../../lib/experimental/controllers/MainControllers';
import { useSettingsStore } from '../../lib/stores/settingsStore';
import { useControllerDrag } from '../../hooks/useControllerDrag';

interface ControllerVisualProps {
  controller: ControllerState;
  onSelect?: (controllerId: string) => void;
  onPositionChange?: (controllerId: string, pos: { x: number; y: number; z: number }) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isInteractive?: boolean;
}

const ControllerVisual: React.FC<ControllerVisualProps> = ({
  controller,
  onSelect,
  onPositionChange,
  onDragStart,
  onDragEnd,
  isInteractive = true,
}) => {
  const meshRef = useRef<Mesh>(null);
  const controllerSize = useSettingsStore((state) => state.settings.controllerSize);

  const { isDragging, handlePointerDown } = useControllerDrag({
    controllerId: controller.id,
    onPositionChange: onPositionChange ?? (() => {}),
    onDragStart,
    onDragEnd,
  });

  // Пульсация для активного контроллера
  useFrame((state) => {
    if (meshRef.current && controller.isActive) {
      const scale = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 3);
      meshRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = (e: any) => {
    if (isDragging) return; // не выбирать при окончании drag
    if (isInteractive && onSelect) {
      onSelect(controller.id);
    }
  };

  const handlePointerOver = () => {
    if (isInteractive) {
      document.body.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
  };

  const handlePointerOut = () => {
    if (isInteractive && !isDragging) {
      document.body.style.cursor = 'auto';
    }
  };

  const handlePointerDownWithSelect = (e: any) => {
    if (!isInteractive || !onPositionChange) return;
    // Активировать контроллер при начале drag
    onSelect?.(controller.id);
    handlePointerDown(e);
  };

  if (!controller.isVisible) return null;

  const eulerRotation = new Euler().setFromQuaternion(controller.rotation);

  return (
    <mesh
      ref={meshRef}
      position={[controller.position.x, controller.position.y, controller.position.z]}
      rotation={eulerRotation}
      scale={controller.scale}
      onClick={handleClick}
      onPointerDown={isInteractive && onPositionChange ? handlePointerDownWithSelect : undefined}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[controllerSize, 16, 16]} />
      <meshStandardMaterial
        color={0x888888}
        transparent
        opacity={isDragging ? 0.9 : 0.6}
        emissive={controller.isActive || isDragging ? 0x888888 : 0x000000}
        emissiveIntensity={controller.isActive || isDragging ? 0.3 : 0}
        roughness={0.8}
        metalness={0.1}
      />

      {(controller.isActive || isDragging) && (
        <mesh scale={1.2}>
          <sphereGeometry args={[controllerSize, 16, 16]} />
          <meshBasicMaterial color={0xffffff} transparent opacity={0.3} wireframe />
        </mesh>
      )}
    </mesh>
  );
};

export { ControllerVisual };
