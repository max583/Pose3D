// CenterOfGravity.tsx - Визуализация центра тяжести верхней и нижней частей тела
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PoseData, Body25Index } from '../../lib/body25/body25-types';

interface CenterOfGravityProps {
  poseData: PoseData;
  /** Радиус сферы центра тяжести */
  radius?: number;
  /** Цвет верхнего центра тяжести */
  upperColor?: string;
  /** Цвет нижнего центра тяжести */
  lowerColor?: string;
  /** Прозрачность сфер */
  opacity?: number;
}

// Верхние суставы: 0-7, 15-18 (нос, шея, плечи, локти, запястья, глаза, уши)
const UPPER_JOINTS: Body25Index[] = [
  Body25Index.NOSE,
  Body25Index.NECK,
  Body25Index.RIGHT_SHOULDER,
  Body25Index.RIGHT_ELBOW,
  Body25Index.RIGHT_WRIST,
  Body25Index.LEFT_SHOULDER,
  Body25Index.LEFT_ELBOW,
  Body25Index.LEFT_WRIST,
  Body25Index.RIGHT_EYE,
  Body25Index.LEFT_EYE,
  Body25Index.RIGHT_EAR,
  Body25Index.LEFT_EAR,
];

// Нижние суставы: 8-14, 19-24 (бёдра, колени, лодыжки, пальцы ног, пятки)
const LOWER_JOINTS: Body25Index[] = [
  Body25Index.MID_HIP,
  Body25Index.RIGHT_HIP,
  Body25Index.RIGHT_KNEE,
  Body25Index.RIGHT_ANKLE,
  Body25Index.LEFT_HIP,
  Body25Index.LEFT_KNEE,
  Body25Index.LEFT_ANKLE,
  Body25Index.LEFT_BIG_TOE,
  Body25Index.LEFT_SMALL_TOE,
  Body25Index.LEFT_HEEL,
  Body25Index.RIGHT_BIG_TOE,
  Body25Index.RIGHT_SMALL_TOE,
  Body25Index.RIGHT_HEEL,
];

/**
 * Вычисляет центр тяжести для заданного набора суставов
 */
function computeCenterOfGravity(poseData: PoseData, jointIndices: Body25Index[]): THREE.Vector3 {
  const sum = new THREE.Vector3(0, 0, 0);
  for (const idx of jointIndices) {
    const joint = poseData[idx];
    sum.add(new THREE.Vector3(joint.x, joint.y, joint.z));
  }
  return sum.divideScalar(jointIndices.length);
}

export const CenterOfGravity: React.FC<CenterOfGravityProps> = ({
  poseData,
  radius = 0.08,
  upperColor = '#ff3366',
  lowerColor = '#33ccff',
  opacity = 0.7,
}) => {
  const { upperCenter, lowerCenter } = useMemo(() => {
    const upperCenter = computeCenterOfGravity(poseData, UPPER_JOINTS);
    const lowerCenter = computeCenterOfGravity(poseData, LOWER_JOINTS);
    return { upperCenter, lowerCenter };
  }, [poseData]);

  // Линия, соединяющая центры
  const linePoints = useMemo(() => [upperCenter, lowerCenter], [upperCenter, lowerCenter]);

  return (
    <group>
      {/* Верхний центр тяжести */}
      <mesh position={upperCenter}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={upperColor}
          transparent
          opacity={opacity}
          emissive={upperColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Нижний центр тяжести */}
      <mesh position={lowerCenter}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={lowerColor}
          transparent
          opacity={opacity}
          emissive={lowerColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Линия между центрами */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePoints.length}
            array={new Float32Array(linePoints.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={2} transparent opacity={0.5} />
      </line>

      {/* Дебаг-текст (опционально) */}
      {/* Можно добавить позже, если понадобится */}
    </group>
  );
};