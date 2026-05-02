import React, { memo, useMemo } from 'react';
import * as THREE from 'three';
import { JointPosition } from '../../lib/body25/body25-types';
import { getJointOutsideBendDirection } from '../../lib/rig/jointMarkers';

interface JointAnatomyMarkerProps {
  parent: JointPosition;
  joint: JointPosition;
  child: JointPosition;
  fallbackDirection: THREE.Vector3;
  color?: string;
  offset?: number;
  radius?: number;
}

const JointAnatomyMarkerComponent: React.FC<JointAnatomyMarkerProps> = ({
  parent,
  joint,
  child,
  fallbackDirection,
  color = '#b7d7e8',
  offset = 0.026,
  radius = 0.017,
}) => {
  const { position, quaternion } = useMemo(() => {
    const parentVec = toVector(parent);
    const jointVec = toVector(joint);
    const childVec = toVector(child);
    const direction = getJointOutsideBendDirection({
      parent: parentVec,
      joint: jointVec,
      child: childVec,
      fallbackDirection,
    });

    return {
      position: jointVec.clone().add(direction.clone().multiplyScalar(offset)),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction),
    };
  }, [parent, joint, child, fallbackDirection, offset]);

  return (
    <mesh
      position={position}
      quaternion={quaternion}
      scale={[radius * 1.15, radius * 0.85, radius * 0.4]}
      raycast={() => undefined}
    >
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.12}
        roughness={0.35}
        metalness={0.1}
      />
    </mesh>
  );
};

function toVector(point: JointPosition): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.y, point.z);
}

export const JointAnatomyMarker = memo(JointAnatomyMarkerComponent);
