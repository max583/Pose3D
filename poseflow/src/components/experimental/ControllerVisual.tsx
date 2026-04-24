// src/components/experimental/ControllerVisual.tsx
// Визуализация контроллеров DesignDoll

import React, { useRef } from 'react';
import { Mesh, Vector3, Quaternion, Euler } from 'three';
import { useFrame } from '@react-three/fiber';
import { ControllerType, ControllerState } from '../../lib/experimental/controllers/MainControllers';
import { useSettingsStore } from '../../lib/stores/settingsStore';

interface ControllerVisualProps {
  controller: ControllerState;
  onSelect?: (controllerId: string) => void;
  isInteractive?: boolean;
}

const ControllerVisual: React.FC<ControllerVisualProps> = ({
  controller,
  onSelect,
  isInteractive = true,
}) => {
  const meshRef = useRef<Mesh>(null);
  const controllerSize = useSettingsStore((state) => state.settings.controllerSize);
  
  // Анимация пульсации для активного контроллера
  useFrame((state) => {
    if (meshRef.current && controller.isActive) {
      const scale = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 3);
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Логирование активного состояния для отладки
  React.useEffect(() => {
    if (controller.isActive) {
      console.log('ControllerVisual: controller is active', controller.id);
    }
  }, [controller.isActive, controller.id]);

  const handleClick = () => {
    if (isInteractive && onSelect) {
      onSelect(controller.id);
    }
  };

  const handlePointerOver = () => {
    if (meshRef.current && isInteractive) {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    if (isInteractive) {
      document.body.style.cursor = 'auto';
    }
  };

  if (!controller.isVisible) {
    return null;
  }

  // Все контроллеры - полупрозрачные серые сферы одинакового размера
  const getGeometry = () => {
    return <sphereGeometry args={[controllerSize, 16, 16]} />;
  };

  // Конвертируем кватернион в эйлеровы углы
  const eulerRotation = new Euler().setFromQuaternion(controller.rotation);

  return (
    <mesh
      ref={meshRef}
      position={[controller.position.x, controller.position.y, controller.position.z]}
      rotation={eulerRotation}
      scale={controller.scale}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      castShadow
      receiveShadow
    >
      {getGeometry()}
      <meshStandardMaterial
        color={0x888888} // Серый цвет
        transparent
        opacity={0.6} // Полупрозрачность
        emissive={controller.isActive ? 0x888888 : 0x000000} // Используем тот же серый цвет
        emissiveIntensity={controller.isActive ? 0.2 : 0} // Уменьшенная интенсивность
        roughness={0.8}
        metalness={0.1}
      />
      
      {/* Контур для выделения активного контроллера */}
      {controller.isActive && (
        <mesh scale={1.2}>
          {getGeometry()}
          <meshBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}
    </mesh>
  );
};

export { ControllerVisual };