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

type Pt = { x: number; y: number; z: number };

interface Skeleton3DProps {
  poseData: PoseData;
  /** ID выделенного элемента (null — ничего не выделено). */
  selectedElement?: ElementId | null;
  /** Клик по суставу — выбрать элемент. */
  onElementSelect?: (element: ElementId | null) => void;
  /**
   * Промежуточные позиции сегментов позвоночника (MID_HIP → NECK).
   * Если передано — кость NECK→MID_HIP заменяется дугой из сегментов.
   */
  spineSegmentPositions?: Pt[];
}

const Skeleton3DComponent: React.FC<Skeleton3DProps> = ({
  poseData,
  selectedElement = null,
  onElementSelect,
  spineSegmentPositions,
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
    const result: (React.ReactElement | null)[] = [];

    for (let idx = 0; idx < BODY25_CONNECTIONS.length; idx++) {
      const connection = BODY25_CONNECTIONS[idx];

      // Кость NECK→MID_HIP заменяем сегментированной дугой, если есть позиции сегментов
      const isSpineBone =
        connection.from === Body25Index.NECK &&
        connection.to === Body25Index.MID_HIP;

      if (isSpineBone && spineSegmentPositions && spineSegmentPositions.length > 0) {
        const midHip = poseData[Body25Index.MID_HIP];
        if (midHip) {
          // Точки дуги: MID_HIP → seg[0] → seg[1] → ... → seg[n-1] (= NECK)
          const points: Pt[] = [midHip, ...spineSegmentPositions];
          for (let i = 0; i < points.length - 1; i++) {
            result.push(
              <Bone
                key={`spine-seg-${i}`}
                from={points[i]}
                to={points[i + 1]}
                color={connection.color}
              />,
            );
          }
        }
        continue;
      }

      const from = poseData[connection.from];
      const to = poseData[connection.to];
      if (!from || !to) { result.push(null); continue; }

      result.push(
        <Bone
          key={`${connection.from}-${connection.to}-${idx}`}
          from={from}
          to={to}
          color={connection.color}
        />,
      );
    }

    return result;
  }, [poseData, spineSegmentPositions]);

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
