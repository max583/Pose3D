// Skeleton3D.tsx - Полный скелет BODY_25
// Stage 0: только визуализация + клик по суставу/кости → выделение элемента.
// Drag-манипуляции добавляются в Stage 1+ через гизмо.

import React, { useMemo, useCallback } from 'react';
import { PoseData, Body25Index } from '../../lib/body25/body25-types';
import { BODY25_CONNECTIONS } from '../../lib/body25/body25-connections';
import { KEYPOINT_MAP } from '../../lib/body25/body25-keypoints';
import { Joint } from './Joint';
import { Bone } from './Bone';
import { ElementId, getElementForJoint, ELEMENT_TO_JOINTS } from '../../lib/rig/elements';

interface Skeleton3DProps {
  poseData: PoseData;
  /** ID выделенного элемента (null — ничего не выделено). */
  selectedElement?: ElementId | null;
  /** Клик по суставу — выбрать элемент. */
  onElementSelect?: (element: ElementId | null) => void;
}

const Skeleton3DComponent: React.FC<Skeleton3DProps> = ({
  poseData,
  selectedElement = null,
  onElementSelect,
}) => {
  // Набор суставов выделенного элемента для подсветки
  const selectedJoints = useMemo<Set<Body25Index>>(() => {
    if (!selectedElement) return new Set();
    return new Set(ELEMENT_TO_JOINTS.get(selectedElement) ?? []);
  }, [selectedElement]);

  const handleJointClick = useCallback((index: Body25Index) => {
    const element = getElementForJoint(index);
    onElementSelect?.(element);
  }, [onElementSelect]);

  // Мемоизируем суставы
  const joints = useMemo(() => {
    return Object.entries(poseData).map(([indexStr, position]) => {
      const index = parseInt(indexStr) as Body25Index;
      const metadata = KEYPOINT_MAP.get(index)!;
      if (!metadata) return null;

      return (
        <Joint
          key={index}
          index={index}
          position={position}
          color={metadata.color}
          isSelected={selectedJoints.has(index)}
          onClick={handleJointClick}
        />
      );
    });
  }, [poseData, selectedJoints, handleJointClick]);

  // Мемоизируем кости
  const bones = useMemo(() => {
    return BODY25_CONNECTIONS.map((connection, idx) => {
      const from = poseData[connection.from];
      const to = poseData[connection.to];

      if (!from || !to) return null;

      return (
        <Bone
          key={`${connection.from}-${connection.to}-${idx}`}
          from={from}
          to={to}
          color={connection.color}
        />
      );
    });
  }, [poseData]);

  return (
    <group name="skeleton">
      {/* Кости (линии) */}
      {bones}

      {/* Суставы (точки) */}
      {joints}
    </group>
  );
};

export const Skeleton3D = React.memo(Skeleton3DComponent, (prev, next) => {
  if (prev.poseData !== next.poseData) return false;
  if (prev.selectedElement !== next.selectedElement) return false;
  return true;
});
