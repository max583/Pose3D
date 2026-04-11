// Типы для скелета BODY_25

/** Индексы ключевых точек BODY_25 */
export enum Body25Index {
  NOSE = 0,
  NECK = 1,
  RIGHT_SHOULDER = 2,
  RIGHT_ELBOW = 3,
  RIGHT_WRIST = 4,
  LEFT_SHOULDER = 5,
  LEFT_ELBOW = 6,
  LEFT_WRIST = 7,
  MID_HIP = 8,
  RIGHT_HIP = 9,
  RIGHT_KNEE = 10,
  RIGHT_ANKLE = 11,
  LEFT_HIP = 12,
  LEFT_KNEE = 13,
  LEFT_ANKLE = 14,
  RIGHT_EYE = 15,
  LEFT_EYE = 16,
  RIGHT_EAR = 17,
  LEFT_EAR = 18,
  LEFT_BIG_TOE = 19,
  LEFT_SMALL_TOE = 20,
  LEFT_HEEL = 21,
  RIGHT_BIG_TOE = 22,
  RIGHT_SMALL_TOE = 23,
  RIGHT_HEEL = 24,
}

/** 3D позиция точки */
export interface JointPosition {
  x: number;
  y: number;
  z: number;
  confidence?: number; // 0-1, уверенность (для OpenPose)
}

/** Полные данные позы */
export type PoseData = Record<Body25Index, JointPosition>;

/** Связь между двумя точками (кость) */
export interface BoneConnection {
  from: Body25Index;
  to: Body25Index;
  color: string;
  group: BoneGroup;
}

/** Группы костей */
export enum BoneGroup {
  TORSO = 'torso',
  ARMS = 'arms',
  LEGS = 'legs',
  HEAD = 'head',
  FEET = 'feet',
}

/** Метаданные точки */
export interface JointMetadata {
  index: Body25Index;
  name: string;
  displayName: string;
  color: string;
}

/** Пресет позы */
export interface PosePreset {
  id: string;
  name: string;
  icon?: string;
  poseData: PoseData;
}

/** Формат экспорта */
export enum ExportFormat {
  JSON = 'json',
  PNG = 'png',
  OBJ = 'obj',
}

/** OpenPose JSON формат */
export interface OpenPoseJSON {
  version: number;
  people: Array<{
    pose_keypoints_2d: number[]; // [x0, y0, c0, x1, y1, c1, ...]
  }>;
}
