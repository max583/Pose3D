// Skeleton3D.tsx - Полный скелет BODY_25
import React, { useMemo, useState, useCallback } from 'react';
import { PoseData, Body25Index, JointPosition } from '../../lib/body25/body25-types';
import { BODY25_CONNECTIONS } from '../../lib/body25/body25-connections';
import { KEYPOINT_MAP } from '../../lib/body25/body25-keypoints';
import { Joint } from './Joint';
import { Bone } from './Bone';
import { skeletonLogger } from '../../lib/logger';

interface Skeleton3DProps {
  poseData: PoseData;
  onJointPositionChange: (index: Body25Index, position: JointPosition) => void;
}

export const Skeleton3D: React.FC<Skeleton3DProps> = ({
  poseData,
  onJointPositionChange,
}) => {
  const [isAnyJointDragging, setIsAnyJointDragging] = useState(false);

  // Callback для начала drag
  const handleDragStart = useCallback(() => {
    setIsAnyJointDragging(true);
    skeletonLogger.debug('Joint drag started');
  }, []);

  // Callback для окончания drag
  const handleDragEnd = useCallback(() => {
    setIsAnyJointDragging(false);
    skeletonLogger.debug('Joint drag ended');
  }, []);

  // Мемоизируем суставы
  const joints = useMemo(() => {
    return Object.entries(poseData).map(([indexStr, position]) => {
      const index = parseInt(indexStr) as Body25Index;
      const metadata = KEYPOINT_MAP.get(index)!;

      return (
        <Joint
          key={index}
          index={index}
          position={position}
          color={metadata.color}
          onPositionChange={onJointPositionChange}
          isGlobalDragging={isAnyJointDragging}
          onGlobalDragStart={handleDragStart}
          onGlobalDragEnd={handleDragEnd}
        />
      );
    });
  }, [poseData, onJointPositionChange, isAnyJointDragging, handleDragStart, handleDragEnd]);

  // Мемоизируем кости
  const bones = useMemo(() => {
    return BODY25_CONNECTIONS.map((connection, idx) => {
      const from = poseData[connection.from];
      const to = poseData[connection.to];

      // Не рисуем кость, если одна из точек отсутствует
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
