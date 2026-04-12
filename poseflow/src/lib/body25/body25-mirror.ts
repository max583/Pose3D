import { Body25Index } from './body25-types';

/** Симметричные пары суставов [Right, Left] */
export const MIRROR_PAIRS: [Body25Index, Body25Index][] = [
  [Body25Index.RIGHT_SHOULDER,  Body25Index.LEFT_SHOULDER],
  [Body25Index.RIGHT_ELBOW,     Body25Index.LEFT_ELBOW],
  [Body25Index.RIGHT_WRIST,     Body25Index.LEFT_WRIST],
  [Body25Index.RIGHT_HIP,       Body25Index.LEFT_HIP],
  [Body25Index.RIGHT_KNEE,      Body25Index.LEFT_KNEE],
  [Body25Index.RIGHT_ANKLE,     Body25Index.LEFT_ANKLE],
  [Body25Index.RIGHT_EYE,       Body25Index.LEFT_EYE],
  [Body25Index.RIGHT_EAR,       Body25Index.LEFT_EAR],
  [Body25Index.RIGHT_BIG_TOE,   Body25Index.LEFT_BIG_TOE],
  [Body25Index.RIGHT_SMALL_TOE, Body25Index.LEFT_SMALL_TOE],
  [Body25Index.RIGHT_HEEL,      Body25Index.LEFT_HEEL],
];
