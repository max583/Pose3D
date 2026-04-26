// Skeleton3D.tsx - Полный скелет BODY_25
import React, { useMemo, useState, useCallback } from 'react';
import { PoseData, Body25Index, JointPosition, ManipulationMode } from '../../lib/body25/body25-types';
import { BODY25_CONNECTIONS } from '../../lib/body25/body25-connections';
import { KEYPOINT_MAP } from '../../lib/body25/body25-keypoints';
import { IK_END_EFFECTORS } from '../../lib/body25/IKChains';
import { Joint } from './Joint';
import { Bone } from './Bone';
import { skeletonLogger } from '../../lib/logger';

interface Skeleton3DProps {
  poseData: PoseData;
  onJointPositionChange: (index: Body25Index, position: JointPosition) => void;
  onToggleJointLink?: (index: Body25Index) => void;
  manipulationMode?: ManipulationMode;
  unlinkedJoints?: Set<Body25Index>;
}

const Skeleton3DComponent: React.FC<Skeleton3DProps> = ({
  poseData,
  onJointPositionChange,
  onToggleJointLink,
  manipulationMode = 'fk',
  unlinkedJoints = new Set(),
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

      const isEndEffector = manipulationMode === 'ik' && IK_END_EFFECTORS.has(index);
      const isUnlinked = unlinkedJoints.has(index);
      return (
        <Joint
          key={index}
          index={index}
          position={position}
          color={metadata.color}
          onPositionChange={onJointPositionChange}
          onToggleLink={onToggleJointLink}
          isGlobalDragging={isAnyJointDragging}
          onGlobalDragStart={handleDragStart}
          onGlobalDragEnd={handleDragEnd}
          isEndEffector={isEndEffector}
          isUnlinked={isUnlinked}
        />
      );
    });
  }, [poseData, onJointPositionChange, onToggleJointLink, isAnyJointDragging, handleDragStart, handleDragEnd, manipulationMode, unlinkedJoints]);

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

// Оптимизированная версия с React.memo
export const Skeleton3D = React.memo(Skeleton3DComponent, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  // Сравниваем только необходимые пропсы
  
  // 1. Проверяем, изменились ли данные позы
  const poseDataChanged = prevProps.poseData !== nextProps.poseData;
  if (poseDataChanged) return false;
  
  // 2. Проверяем режим манипуляции
  if (prevProps.manipulationMode !== nextProps.manipulationMode) return false;
  
  // 3. Проверяем unlinkedJoints (сравниваем размер и содержимое)
  const prevUnlinked = prevProps.unlinkedJoints || new Set();
  const nextUnlinked = nextProps.unlinkedJoints || new Set();
  
  if (prevUnlinked.size !== nextUnlinked.size) return false;
  
  // Проверяем, есть ли различия в содержимом
  for (const joint of prevUnlinked) {
    if (!nextUnlinked.has(joint)) return false;
  }
  
  // 4. Функции обратного вызова - всегда считаем их неизменными
  // (они должны быть мемоизированы в родительском компоненте)
  
  return true;
});
