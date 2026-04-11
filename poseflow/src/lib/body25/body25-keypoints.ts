// Константы ключевых точек BODY_25
import { Body25Index, JointMetadata } from './body25-types';

/** Массив всех 25 точек BODY_25 */
export const BODY25_KEYPOINTS: JointMetadata[] = [
  { index: Body25Index.NOSE, name: 'nose', displayName: 'Нос', color: '#ff0055' },
  { index: Body25Index.NECK, name: 'neck', displayName: 'Шея', color: '#ff0000' },
  { index: Body25Index.RIGHT_SHOULDER, name: 'right_shoulder', displayName: 'Правое плечо', color: '#ff5500' },
  { index: Body25Index.RIGHT_ELBOW, name: 'right_elbow', displayName: 'Правый локоть', color: '#ffaa00' },
  { index: Body25Index.RIGHT_WRIST, name: 'right_wrist', displayName: 'Правое запястье', color: '#ffff00' },
  { index: Body25Index.LEFT_SHOULDER, name: 'left_shoulder', displayName: 'Левое плечо', color: '#aaff00' },
  { index: Body25Index.LEFT_ELBOW, name: 'left_elbow', displayName: 'Левый локоть', color: '#55ff00' },
  { index: Body25Index.LEFT_WRIST, name: 'left_wrist', displayName: 'Левое запястье', color: '#00ff00' },
  { index: Body25Index.MID_HIP, name: 'mid_hip', displayName: 'Центр бёдер', color: '#00ff55' },
  { index: Body25Index.RIGHT_HIP, name: 'right_hip', displayName: 'Правое бедро', color: '#00ffaa' },
  { index: Body25Index.RIGHT_KNEE, name: 'right_knee', displayName: 'Правое колено', color: '#00ffff' },
  { index: Body25Index.RIGHT_ANKLE, name: 'right_ankle', displayName: 'Правая лодыжка', color: '#00aaff' },
  { index: Body25Index.LEFT_HIP, name: 'left_hip', displayName: 'Левое бедро', color: '#0055ff' },
  { index: Body25Index.LEFT_KNEE, name: 'left_knee', displayName: 'Левое колено', color: '#0000ff' },
  { index: Body25Index.LEFT_ANKLE, name: 'left_ankle', displayName: 'Левая лодыжка', color: '#5500ff' },
  { index: Body25Index.RIGHT_EYE, name: 'right_eye', displayName: 'Правый глаз', color: '#aa00ff' },
  { index: Body25Index.LEFT_EYE, name: 'left_eye', displayName: 'Левый глаз', color: '#ff00ff' },
  { index: Body25Index.RIGHT_EAR, name: 'right_ear', displayName: 'Правое ухо', color: '#ff00aa' },
  { index: Body25Index.LEFT_EAR, name: 'left_ear', displayName: 'Левое ухо', color: '#ff0055' },
  { index: Body25Index.LEFT_BIG_TOE, name: 'left_big_toe', displayName: 'Левый большой палец ноги', color: '#00ffff' },
  { index: Body25Index.LEFT_SMALL_TOE, name: 'left_small_toe', displayName: 'Левый мизинец ноги', color: '#00ffff' },
  { index: Body25Index.LEFT_HEEL, name: 'left_heel', displayName: 'Левая пятка', color: '#00ffff' },
  { index: Body25Index.RIGHT_BIG_TOE, name: 'right_big_toe', displayName: 'Правый большой палец ноги', color: '#00ffff' },
  { index: Body25Index.RIGHT_SMALL_TOE, name: 'right_small_toe', displayName: 'Правый мизинец ноги', color: '#00ffff' },
  { index: Body25Index.RIGHT_HEEL, name: 'right_heel', displayName: 'Правая пятка', color: '#00ffff' },
];

/** Карта для быстрого поиска по индексу */
export const KEYPOINT_MAP = new Map<Body25Index, JointMetadata>(
  BODY25_KEYPOINTS.map(kp => [kp.index, kp])
);

/** Получить метаданные точки по индексу */
export function getJointMetadata(index: Body25Index): JointMetadata {
  return KEYPOINT_MAP.get(index)!;
}
