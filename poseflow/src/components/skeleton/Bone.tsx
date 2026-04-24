// Bone.tsx - Линия между двумя точками скелета
import React, { useMemo, memo } from 'react';
import * as THREE from 'three';
import { JointPosition } from '../../lib/body25/body25-types';

interface BoneProps {
  from: JointPosition;
  to: JointPosition;
  color: string;
  thickness?: number;
}

const BoneComponent: React.FC<BoneProps> = ({
  from,
  to,
  color,
  thickness = 0.01,
}) => {
  // Создаём кость как цилиндр с правильной ориентацией
  const { position, length, quaternion } = useMemo(() => {
    const fromVec = new THREE.Vector3(from.x, from.y, from.z);
    const toVec = new THREE.Vector3(to.x, to.y, to.z);

    // Направление кости
    const direction = new THREE.Vector3().subVectors(toVec, fromVec);
    const length = direction.length();

    // Средняя точка (позиция цилиндра)
    const position = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5);

    // CylinderGeometry по умолчанию ориентирован по оси Y
    // Вычисляем кватернион для поворота от Y к направлению кости
    const yAxis = new THREE.Vector3(0, 1, 0);
    const dir = direction.clone().normalize();

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(yAxis, dir);

    return { position, length, quaternion };
  }, [from, to]);

  return (
    <mesh
      position={position}
      quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
    >
      <cylinderGeometry args={[thickness, thickness, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
};

export const Bone = memo(BoneComponent);
