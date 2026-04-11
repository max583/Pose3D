// Связи между точками BODY_25 (кости)
// Цвета приведены к формату COCO/ControlNet OpenPose
// https://github.com/lllyasviel/ControlNet/discussions/266
import { Body25Index, BoneConnection, BoneGroup } from './body25-types';

/** Все связи (кости) скелета BODY_25 */
export const BODY25_CONNECTIONS: BoneConnection[] = [
  // Шея → Плечи
  { from: Body25Index.NECK, to: Body25Index.RIGHT_SHOULDER, color: '#ff0000', group: BoneGroup.TORSO },
  { from: Body25Index.NECK, to: Body25Index.LEFT_SHOULDER, color: '#ff3300', group: BoneGroup.TORSO },

  // Правая рука
  { from: Body25Index.RIGHT_SHOULDER, to: Body25Index.RIGHT_ELBOW, color: '#ff6600', group: BoneGroup.ARMS },
  { from: Body25Index.RIGHT_ELBOW, to: Body25Index.RIGHT_WRIST, color: '#ff9900', group: BoneGroup.ARMS },

  // Левая рука
  { from: Body25Index.LEFT_SHOULDER, to: Body25Index.LEFT_ELBOW, color: '#ffcc00', group: BoneGroup.ARMS },
  { from: Body25Index.LEFT_ELBOW, to: Body25Index.LEFT_WRIST, color: '#ffff00', group: BoneGroup.ARMS },

  // Торс
  { from: Body25Index.NECK, to: Body25Index.MID_HIP, color: '#ccff00', group: BoneGroup.TORSO },
  { from: Body25Index.MID_HIP, to: Body25Index.RIGHT_HIP, color: '#99ff00', group: BoneGroup.TORSO },
  { from: Body25Index.MID_HIP, to: Body25Index.LEFT_HIP, color: '#00ff00', group: BoneGroup.TORSO },

  // Правая нога
  { from: Body25Index.RIGHT_HIP, to: Body25Index.RIGHT_KNEE, color: '#66ff00', group: BoneGroup.LEGS },
  { from: Body25Index.RIGHT_KNEE, to: Body25Index.RIGHT_ANKLE, color: '#33ff00', group: BoneGroup.LEGS },

  // Левая нога
  { from: Body25Index.LEFT_HIP, to: Body25Index.LEFT_KNEE, color: '#00ff33', group: BoneGroup.LEGS },
  { from: Body25Index.LEFT_KNEE, to: Body25Index.LEFT_ANKLE, color: '#00ff66', group: BoneGroup.LEGS },

  // Голова
  { from: Body25Index.NECK, to: Body25Index.NOSE, color: '#00ff99', group: BoneGroup.HEAD },
  { from: Body25Index.NOSE, to: Body25Index.RIGHT_EYE, color: '#00ffcc', group: BoneGroup.HEAD },
  { from: Body25Index.RIGHT_EYE, to: Body25Index.RIGHT_EAR, color: '#00ffff', group: BoneGroup.HEAD },
  { from: Body25Index.NOSE, to: Body25Index.LEFT_EYE, color: '#00ccff', group: BoneGroup.HEAD },
  { from: Body25Index.LEFT_EYE, to: Body25Index.LEFT_EAR, color: '#0099ff', group: BoneGroup.HEAD },

  // Левая стопа
  { from: Body25Index.LEFT_ANKLE, to: Body25Index.LEFT_BIG_TOE, color: '#0066ff', group: BoneGroup.FEET },
  { from: Body25Index.LEFT_BIG_TOE, to: Body25Index.LEFT_SMALL_TOE, color: '#0033ff', group: BoneGroup.FEET },
  { from: Body25Index.LEFT_ANKLE, to: Body25Index.LEFT_HEEL, color: '#0000ff', group: BoneGroup.FEET },

  // Правая стопа
  { from: Body25Index.RIGHT_ANKLE, to: Body25Index.RIGHT_BIG_TOE, color: '#3300ff', group: BoneGroup.FEET },
  { from: Body25Index.RIGHT_BIG_TOE, to: Body25Index.RIGHT_SMALL_TOE, color: '#6600ff', group: BoneGroup.FEET },
  { from: Body25Index.RIGHT_ANKLE, to: Body25Index.RIGHT_HEEL, color: '#9900ff', group: BoneGroup.FEET },
];

/** Получить связи по группе */
export function getConnectionsByGroup(group: BoneGroup): BoneConnection[] {
  return BODY25_CONNECTIONS.filter(conn => conn.group === group);
}
