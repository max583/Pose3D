// Skeleton3D.tsx - Полный скелет BODY_25
// Stage 0: только визуализация + клик по суставу/кости → выделение элемента.
// Drag-манипуляции добавляются в Stage 1+ через гизмо.

import React, { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { PoseData, Body25Index } from '../../lib/body25/body25-types';
import { BODY25_CONNECTIONS } from '../../lib/body25/body25-connections';
import { KEYPOINT_MAP } from '../../lib/body25/body25-keypoints';
import { Joint } from './Joint';
import { Bone } from './Bone';
import { HandPrimitive } from './HandPrimitive';
import { JointAnatomyMarker } from './JointAnatomyMarker';
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
  /**
   * Промежуточные позиции сегментов шеи (NECK → NOSE).
   * Если передано — кость NECK→NOSE заменяется дугой из сегментов.
   */
  neckSegmentPositions?: Pt[];
}

const Skeleton3DComponent: React.FC<Skeleton3DProps> = ({
  poseData,
  selectedElement = null,
  onElementSelect,
  spineSegmentPositions,
  neckSegmentPositions,
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

      // Кость NECK→NOSE заменяем сегментированной дугой шеи
      const isNeckBone =
        connection.from === Body25Index.NECK &&
        connection.to === Body25Index.NOSE;

      if (isNeckBone && neckSegmentPositions && neckSegmentPositions.length > 0) {
        const neckJoint = poseData[Body25Index.NECK];
        if (neckJoint) {
          const points: Pt[] = [neckJoint, ...neckSegmentPositions];
          for (let i = 0; i < points.length - 1; i++) {
            result.push(
              <Bone
                key={`neck-seg-${i}`}
                from={points[i]}
                to={points[i + 1]}
                color={connection.color}
              />,
            );
          }
        }
        continue;
      }

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
  }, [poseData, spineSegmentPositions, neckSegmentPositions]);

  const handPrimitives = useMemo(() => {
    const rightElbow = poseData[Body25Index.RIGHT_ELBOW];
    const rightWrist = poseData[Body25Index.RIGHT_WRIST];
    const leftElbow = poseData[Body25Index.LEFT_ELBOW];
    const leftWrist = poseData[Body25Index.LEFT_WRIST];

    return (
      <>
        {rightElbow && rightWrist && (
          <HandPrimitive
            key="hand-r"
            side="r"
            elbow={rightElbow}
            wrist={rightWrist}
          />
        )}
        {leftElbow && leftWrist && (
          <HandPrimitive
            key="hand-l"
            side="l"
            elbow={leftElbow}
            wrist={leftWrist}
          />
        )}
      </>
    );
  }, [poseData]);

  const jointAnatomyMarkers = useMemo(() => {
    const bodyForward = getPoseBodyForward(poseData);
    const elbowFallback = bodyForward.clone().negate();
    const kneeFallback = bodyForward;

    const rightShoulder = poseData[Body25Index.RIGHT_SHOULDER];
    const rightElbow = poseData[Body25Index.RIGHT_ELBOW];
    const rightWrist = poseData[Body25Index.RIGHT_WRIST];
    const leftShoulder = poseData[Body25Index.LEFT_SHOULDER];
    const leftElbow = poseData[Body25Index.LEFT_ELBOW];
    const leftWrist = poseData[Body25Index.LEFT_WRIST];
    const rightHip = poseData[Body25Index.RIGHT_HIP];
    const rightKnee = poseData[Body25Index.RIGHT_KNEE];
    const rightAnkle = poseData[Body25Index.RIGHT_ANKLE];
    const leftHip = poseData[Body25Index.LEFT_HIP];
    const leftKnee = poseData[Body25Index.LEFT_KNEE];
    const leftAnkle = poseData[Body25Index.LEFT_ANKLE];

    return (
      <>
        {rightShoulder && rightElbow && rightWrist && (
          <JointAnatomyMarker
            key="elbow-r-marker"
            parent={rightShoulder}
            joint={rightElbow}
            child={rightWrist}
            fallbackDirection={elbowFallback}
          />
        )}
        {leftShoulder && leftElbow && leftWrist && (
          <JointAnatomyMarker
            key="elbow-l-marker"
            parent={leftShoulder}
            joint={leftElbow}
            child={leftWrist}
            fallbackDirection={elbowFallback}
          />
        )}
        {rightHip && rightKnee && rightAnkle && (
          <JointAnatomyMarker
            key="knee-r-marker"
            parent={rightHip}
            joint={rightKnee}
            child={rightAnkle}
            fallbackDirection={kneeFallback}
          />
        )}
        {leftHip && leftKnee && leftAnkle && (
          <JointAnatomyMarker
            key="knee-l-marker"
            parent={leftHip}
            joint={leftKnee}
            child={leftAnkle}
            fallbackDirection={kneeFallback}
          />
        )}
      </>
    );
  }, [poseData]);

  return (
    <group name="skeleton">
      {/* Кости (линии) */}
      {bones}

      {/* Visual-only hand primitives; BODY_25 export remains unchanged. */}
      {handPrimitives}

      {/* Visual-only elbow and kneecap markers; BODY_25 export remains unchanged. */}
      {jointAnatomyMarkers}

      {/* Суставы (точки) */}
      {joints}
    </group>
  );
};

function getPoseBodyForward(poseData: PoseData): THREE.Vector3 {
  const rightHip = poseData[Body25Index.RIGHT_HIP];
  const leftHip = poseData[Body25Index.LEFT_HIP];
  const midHip = poseData[Body25Index.MID_HIP];
  const neck = poseData[Body25Index.NECK];
  if (!rightHip || !leftHip || !midHip || !neck) {
    return new THREE.Vector3(0, 0, 1);
  }

  const xAxis = new THREE.Vector3(
    rightHip.x - leftHip.x,
    rightHip.y - leftHip.y,
    rightHip.z - leftHip.z,
  );
  const yAxis = new THREE.Vector3(
    neck.x - midHip.x,
    neck.y - midHip.y,
    neck.z - midHip.z,
  );
  if (xAxis.lengthSq() < 1e-8 || yAxis.lengthSq() < 1e-8) {
    return new THREE.Vector3(0, 0, 1);
  }

  const forward = xAxis.normalize().cross(yAxis.normalize());
  if (forward.lengthSq() < 1e-8) {
    return new THREE.Vector3(0, 0, 1);
  }

  return forward.normalize();
}

export const Skeleton3D = React.memo(Skeleton3DComponent, (prev, next) => {
  if (prev.poseData !== next.poseData) return false;
  if (prev.selectedElement !== next.selectedElement) return false;
  return true;
});
