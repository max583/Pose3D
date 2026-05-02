import React, { memo, useMemo } from 'react';
import * as THREE from 'three';
import { JointPosition } from '../../lib/body25/body25-types';

interface HandPrimitiveProps {
  elbow: JointPosition;
  wrist: JointPosition;
  side: 'r' | 'l';
}

const HAND_COLOR = '#f2b35e';
const MIN_FOREARM_LENGTH = 0.001;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createPalmGeometry(length: number, width: number, depth: number, side: 'r' | 'l') {
  const nearY = 0;
  const farY = length;
  const nearW = width * 0.62;
  const farW = width;
  const z = depth * 0.5;
  const thumbSide = side === 'r' ? -1 : 1;

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -nearW * 0.5, nearY, -z,
     nearW * 0.5, nearY, -z,
     nearW * 0.5, nearY,  z,
    -nearW * 0.5, nearY,  z,
    -farW * 0.5, farY, -z,
     farW * 0.5, farY, -z,
     farW * 0.5, farY,  z,
    -farW * 0.5, farY,  z,
    thumbSide * nearW * 0.42, length * 0.22, 0,
    thumbSide * width * 0.92, length * 0.52, 0,
    thumbSide * farW * 0.36, length * 0.72, 0,
  ]);

  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    3, 2, 6, 3, 6, 7,
    1, 5, 6, 1, 6, 2,
    0, 3, 7, 0, 7, 4,
    8, 9, 10,
  ];

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

const HandPrimitiveComponent: React.FC<HandPrimitiveProps> = ({ elbow, wrist, side }) => {
  const transform = useMemo(() => {
    const elbowVec = new THREE.Vector3(elbow.x, elbow.y, elbow.z);
    const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z);
    const direction = new THREE.Vector3().subVectors(wristVec, elbowVec);
    const forearmLength = direction.length();

    if (forearmLength < MIN_FOREARM_LENGTH) return null;

    const dir = direction.normalize();
    const length = clamp(forearmLength * 0.24, 0.055, 0.105);
    const width = clamp(forearmLength * 0.13, 0.026, 0.052);
    const depth = width * 0.42;
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );

    return {
      position: wristVec,
      quaternion,
      length,
      width,
      depth,
    };
  }, [elbow, wrist]);

  const geometry = useMemo(() => {
    if (!transform) return null;
    return createPalmGeometry(transform.length, transform.width, transform.depth, side);
  }, [side, transform]);

  if (!transform || !geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={transform.position}
      quaternion={transform.quaternion}
      raycast={() => null}
    >
      <meshStandardMaterial
        color={HAND_COLOR}
        emissive={HAND_COLOR}
        emissiveIntensity={0.12}
        roughness={0.45}
        metalness={0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export const HandPrimitive = memo(HandPrimitiveComponent);
