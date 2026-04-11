// Пресеты поз BODY_25
import { Body25Index, PoseData, PosePreset } from '../../lib/body25/body25-types';

/**
 * Создаём базовую структуру позы с нулевыми значениями
 */
function createEmptyPose(): PoseData {
  const pose: any = {};
  for (let i = 0; i < 25; i++) {
    pose[i] = { x: 0, y: 0, z: 0, confidence: 1 };
  }
  return pose;
}

/**
 * T-Pose - руки в стороны
 */
function createTPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0, y: 1.6, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.3, y: 1.35, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.6, y: 1.35, z: 0 },
    [Body25Index.RIGHT_WRIST]: { x: 0.9, y: 1.35, z: 0 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.3, y: 1.35, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.6, y: 1.35, z: 0 },
    [Body25Index.LEFT_WRIST]: { x: -0.9, y: 1.35, z: 0 },
    [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.15, y: 0.85, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.15, y: 0.45, z: 0 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.15, y: 0.05, z: 0 },
    [Body25Index.LEFT_HIP]: { x: -0.15, y: 0.85, z: 0 },
    [Body25Index.LEFT_KNEE]: { x: -0.15, y: 0.45, z: 0 },
    [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.05, z: 0 },
    [Body25Index.RIGHT_EYE]: { x: 0.05, y: 1.65, z: 0.1 },
    [Body25Index.LEFT_EYE]: { x: -0.05, y: 1.65, z: 0.1 },
    [Body25Index.RIGHT_EAR]: { x: 0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_EAR]: { x: -0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.0, z: 0.1 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.0, z: 0.05 },
    [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.0, z: -0.1 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.2, y: 0.0, z: 0.1 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25, y: 0.0, z: 0.05 },
    [Body25Index.RIGHT_HEEL]: { x: 0.15, y: 0.0, z: -0.1 },
  };
}

/**
 * A-Pose - руки вниз под углом
 */
function createAPose(): PoseData {
  const pose = createTPose();
  pose[Body25Index.RIGHT_ELBOW] = { x: 0.35, y: 0.9, z: 0 };
  pose[Body25Index.RIGHT_WRIST] = { x: 0.35, y: 0.5, z: 0 };
  pose[Body25Index.LEFT_ELBOW] = { x: -0.35, y: 0.9, z: 0 };
  pose[Body25Index.LEFT_WRIST] = { x: -0.35, y: 0.5, z: 0 };
  return pose;
}

/**
 * Standing - руки по швам
 */
function createStandingPose(): PoseData {
  const pose = createAPose();
  pose[Body25Index.RIGHT_SHOULDER] = { x: 0.2, y: 1.35, z: 0 };
  pose[Body25Index.LEFT_SHOULDER] = { x: -0.2, y: 1.35, z: 0 };
  return pose;
}

/**
 * Sitting - сидя на стуле
 */
function createSittingPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0, y: 1.2, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.0, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.25, y: 0.95, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.35, y: 0.6, z: 0.2 },
    [Body25Index.RIGHT_WRIST]: { x: 0.3, y: 0.5, z: 0.4 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.25, y: 0.95, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.35, y: 0.6, z: 0.2 },
    [Body25Index.LEFT_WRIST]: { x: -0.3, y: 0.5, z: 0.4 },
    [Body25Index.MID_HIP]: { x: 0, y: 0.5, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.15, y: 0.45, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.35, y: 0.45, z: 0.3 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.35, y: 0.05, z: 0.3 },
    [Body25Index.LEFT_HIP]: { x: -0.15, y: 0.45, z: 0 },
    [Body25Index.LEFT_KNEE]: { x: -0.35, y: 0.45, z: 0.3 },
    [Body25Index.LEFT_ANKLE]: { x: -0.35, y: 0.05, z: 0.3 },
    [Body25Index.RIGHT_EYE]: { x: 0.05, y: 1.25, z: 0.1 },
    [Body25Index.LEFT_EYE]: { x: -0.05, y: 1.25, z: 0.1 },
    [Body25Index.RIGHT_EAR]: { x: 0.1, y: 1.2, z: 0 },
    [Body25Index.LEFT_EAR]: { x: -0.1, y: 1.2, z: 0 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.4, y: 0.0, z: 0.4 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.45, y: 0.0, z: 0.35 },
    [Body25Index.LEFT_HEEL]: { x: -0.35, y: 0.0, z: 0.2 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.4, y: 0.0, z: 0.4 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.45, y: 0.0, z: 0.35 },
    [Body25Index.RIGHT_HEEL]: { x: 0.35, y: 0.0, z: 0.2 },
  };
}

/**
 * Walking - шаг правой ногой
 */
function createWalkingPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0.05, y: 1.6, z: 0.05 },
    [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.25, y: 1.35, z: -0.05 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.35, y: 1.1, z: -0.15 },
    [Body25Index.RIGHT_WRIST]: { x: 0.3, y: 0.9, z: -0.25 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.25, y: 1.35, z: 0.05 },
    [Body25Index.LEFT_ELBOW]: { x: -0.35, y: 1.1, z: 0.15 },
    [Body25Index.LEFT_WRIST]: { x: -0.3, y: 0.9, z: 0.25 },
    [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.1, y: 0.85, z: -0.1 },
    [Body25Index.RIGHT_KNEE]: { x: 0.2, y: 0.5, z: -0.2 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.15, y: 0.1, z: -0.1 },
    [Body25Index.LEFT_HIP]: { x: -0.1, y: 0.85, z: 0.1 },
    [Body25Index.LEFT_KNEE]: { x: -0.05, y: 0.45, z: 0.2 },
    [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.05, z: 0.3 },
    [Body25Index.RIGHT_EYE]: { x: 0.1, y: 1.65, z: 0.15 },
    [Body25Index.LEFT_EYE]: { x: 0, y: 1.65, z: 0.15 },
    [Body25Index.RIGHT_EAR]: { x: 0.15, y: 1.6, z: 0.05 },
    [Body25Index.LEFT_EAR]: { x: -0.05, y: 1.6, z: 0.05 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.0, z: 0.4 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.0, z: 0.35 },
    [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.0, z: 0.2 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.2, y: 0.0, z: 0 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25, y: 0.0, z: -0.05 },
    [Body25Index.RIGHT_HEEL]: { x: 0.15, y: 0.0, z: -0.2 },
  };
}

/**
 * Running - бег
 */
function createRunningPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0.1, y: 1.55, z: 0.1 },
    [Body25Index.NECK]: { x: 0.05, y: 1.35, z: 0.05 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.2, y: 1.3, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.1, y: 1.1, z: -0.2 },
    [Body25Index.RIGHT_WRIST]: { x: 0.15, y: 1.2, z: -0.35 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.2, y: 1.3, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.3, y: 1.1, z: 0.2 },
    [Body25Index.LEFT_WRIST]: { x: -0.25, y: 1.2, z: 0.35 },
    [Body25Index.MID_HIP]: { x: 0.05, y: 0.85, z: 0.05 },
    [Body25Index.RIGHT_HIP]: { x: 0.15, y: 0.8, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.05, y: 0.4, z: -0.15 },
    [Body25Index.RIGHT_ANKLE]: { x: -0.05, y: 0.1, z: -0.25 },
    [Body25Index.LEFT_HIP]: { x: -0.1, y: 0.8, z: 0.1 },
    [Body25Index.LEFT_KNEE]: { x: -0.2, y: 0.5, z: 0.25 },
    [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.1, z: 0.35 },
    [Body25Index.RIGHT_EYE]: { x: 0.15, y: 1.6, z: 0.2 },
    [Body25Index.LEFT_EYE]: { x: 0.05, y: 1.6, z: 0.2 },
    [Body25Index.RIGHT_EAR]: { x: 0.2, y: 1.55, z: 0.1 },
    [Body25Index.LEFT_EAR]: { x: 0, y: 1.55, z: 0.1 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.0, z: 0.45 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.0, z: 0.4 },
    [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.0, z: 0.25 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0, y: 0.0, z: -0.15 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.05, y: 0.0, z: -0.2 },
    [Body25Index.RIGHT_HEEL]: { x: -0.1, y: 0.0, z: -0.35 },
  };
}

/**
 * Jumping - прыжок, руки вверх
 */
function createJumpingPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0, y: 1.9, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.7, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.25, y: 1.65, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.35, y: 1.85, z: 0 },
    [Body25Index.RIGHT_WRIST]: { x: 0.3, y: 2.1, z: 0 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.25, y: 1.65, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.35, y: 1.85, z: 0 },
    [Body25Index.LEFT_WRIST]: { x: -0.3, y: 2.1, z: 0 },
    [Body25Index.MID_HIP]: { x: 0, y: 1.2, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.15, y: 1.15, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.2, y: 0.85, z: 0 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.15, y: 0.55, z: 0 },
    [Body25Index.LEFT_HIP]: { x: -0.15, y: 1.15, z: 0 },
    [Body25Index.LEFT_KNEE]: { x: -0.2, y: 0.85, z: 0 },
    [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.55, z: 0 },
    [Body25Index.RIGHT_EYE]: { x: 0.05, y: 1.95, z: 0.1 },
    [Body25Index.LEFT_EYE]: { x: -0.05, y: 1.95, z: 0.1 },
    [Body25Index.RIGHT_EAR]: { x: 0.1, y: 1.9, z: 0 },
    [Body25Index.LEFT_EAR]: { x: -0.1, y: 1.9, z: 0 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.5, z: 0.1 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.5, z: 0.05 },
    [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.5, z: -0.1 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.2, y: 0.5, z: 0.1 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25, y: 0.5, z: 0.05 },
    [Body25Index.RIGHT_HEEL]: { x: 0.15, y: 0.5, z: -0.1 },
  };
}

/**
 * Dancing - танцевальная поза
 */
function createDancingPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: -0.05, y: 1.6, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.3, y: 1.35, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.5, y: 1.55, z: 0 },
    [Body25Index.RIGHT_WRIST]: { x: 0.45, y: 1.75, z: 0 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.25, y: 1.4, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.45, y: 1.2, z: 0.1 },
    [Body25Index.LEFT_WRIST]: { x: -0.5, y: 1.0, z: 0.2 },
    [Body25Index.MID_HIP]: { x: -0.05, y: 0.9, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.1, y: 0.85, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.15, y: 0.5, z: 0 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.2, y: 0.1, z: 0 },
    [Body25Index.LEFT_HIP]: { x: -0.2, y: 0.85, z: 0 },
    [Body25Index.LEFT_KNEE]: { x: -0.25, y: 0.5, z: 0 },
    [Body25Index.LEFT_ANKLE]: { x: -0.2, y: 0.1, z: 0 },
    [Body25Index.RIGHT_EYE]: { x: 0, y: 1.65, z: 0.1 },
    [Body25Index.LEFT_EYE]: { x: -0.1, y: 1.65, z: 0.1 },
    [Body25Index.RIGHT_EAR]: { x: 0.05, y: 1.6, z: 0 },
    [Body25Index.LEFT_EAR]: { x: -0.15, y: 1.6, z: 0 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.25, y: 0.0, z: 0.1 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.3, y: 0.0, z: 0.05 },
    [Body25Index.LEFT_HEEL]: { x: -0.2, y: 0.0, z: -0.1 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.25, y: 0.0, z: 0.1 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.3, y: 0.0, z: 0.05 },
    [Body25Index.RIGHT_HEEL]: { x: 0.2, y: 0.0, z: -0.1 },
  };
}

/**
 * Waving - приветствие, правая рука машет
 */
function createWavingPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0, y: 1.6, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.3, y: 1.35, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.55, y: 1.55, z: 0 },
    [Body25Index.RIGHT_WRIST]: { x: 0.65, y: 1.75, z: 0 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.25, y: 1.35, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.35, y: 1.0, z: 0 },
    [Body25Index.LEFT_WRIST]: { x: -0.35, y: 0.7, z: 0 },
    [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.15, y: 0.85, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.15, y: 0.45, z: 0 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.15, y: 0.05, z: 0 },
    [Body25Index.LEFT_HIP]: { x: -0.15, y: 0.85, z: 0 },
    [Body25Index.LEFT_KNEE]: { x: -0.15, y: 0.45, z: 0 },
    [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.05, z: 0 },
    [Body25Index.RIGHT_EYE]: { x: 0.05, y: 1.65, z: 0.1 },
    [Body25Index.LEFT_EYE]: { x: -0.05, y: 1.65, z: 0.1 },
    [Body25Index.RIGHT_EAR]: { x: 0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_EAR]: { x: -0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.0, z: 0.1 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.0, z: 0.05 },
    [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.0, z: -0.1 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.2, y: 0.0, z: 0.1 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25, y: 0.0, z: 0.05 },
    [Body25Index.RIGHT_HEEL]: { x: 0.15, y: 0.0, z: -0.1 },
  };
}

/**
 * Arms Crossed - руки скрещены
 */
function createArmsCrossedPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0, y: 1.6, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.25, y: 1.35, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.3, y: 1.1, z: 0.1 },
    [Body25Index.RIGHT_WRIST]: { x: -0.15, y: 1.0, z: 0.2 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.25, y: 1.35, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.3, y: 1.1, z: 0.1 },
    [Body25Index.LEFT_WRIST]: { x: 0.15, y: 1.0, z: 0.2 },
    [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.15, y: 0.85, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.15, y: 0.45, z: 0 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.15, y: 0.05, z: 0 },
    [Body25Index.LEFT_HIP]: { x: -0.15, y: 0.85, z: 0 },
    [Body25Index.LEFT_KNEE]: { x: -0.15, y: 0.45, z: 0 },
    [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.05, z: 0 },
    [Body25Index.RIGHT_EYE]: { x: 0.05, y: 1.65, z: 0.1 },
    [Body25Index.LEFT_EYE]: { x: -0.05, y: 1.65, z: 0.1 },
    [Body25Index.RIGHT_EAR]: { x: 0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_EAR]: { x: -0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.0, z: 0.1 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.0, z: 0.05 },
    [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.0, z: -0.1 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.2, y: 0.0, z: 0.1 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25, y: 0.0, z: 0.05 },
    [Body25Index.RIGHT_HEEL]: { x: 0.15, y: 0.0, z: -0.1 },
  };
}

/**
 * Массив всех пресетов
 */
export const POSE_PRESETS: PosePreset[] = [
  { id: 't-pose', name: 'T-Pose', icon: '🙆', poseData: createTPose() },
  { id: 'a-pose', name: 'A-Pose', icon: '🧍', poseData: createAPose() },
  { id: 'standing', name: 'Standing', icon: '🚶', poseData: createStandingPose() },
  { id: 'sitting', name: 'Sitting', icon: '🪑', poseData: createSittingPose() },
  { id: 'walking', name: 'Walking', icon: '🚶‍♂️', poseData: createWalkingPose() },
  { id: 'running', name: 'Running', icon: '🏃', poseData: createRunningPose() },
  { id: 'jumping', name: 'Jumping', icon: '⬆️', poseData: createJumpingPose() },
  { id: 'dancing', name: 'Dancing', icon: '💃', poseData: createDancingPose() },
  { id: 'waving', name: 'Waving', icon: '👋', poseData: createWavingPose() },
  { id: 'arms-crossed', name: 'Arms Crossed', icon: '💪', poseData: createArmsCrossedPose() },
];

/**
 * Получить пресет по ID
 */
export function getPosePreset(id: string): PosePreset | undefined {
  return POSE_PRESETS.find(p => p.id === id);
}

/**
 * Получить все пресеты
 */
export function getAllPosePresets(): PosePreset[] {
  return POSE_PRESETS;
}
