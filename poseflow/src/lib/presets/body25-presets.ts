// Пресеты поз BODY_25
import { Euler, Vector3 } from 'three';
import { Body25Index, PoseData, PosePreset } from '../../lib/body25/body25-types';
import { applyArmChainToRig } from '../rig/armIK';
import { createDefaultRig } from '../rig/SkeletonRig';
import type { SkeletonRig } from '../rig/SkeletonRig';
import { applyLegChainToRig } from '../rig/legIK';
import { resolveSkeleton } from '../rig/resolveSkeleton';
import { setBend } from '../rig/VirtualChain';

/**
 * T-Pose - руки в стороны
 */
export function createTPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0, y: 1.6, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.183,  y: 1.35, z: 0 },
    [Body25Index.RIGHT_ELBOW]:    { x: 0.47,   y: 1.35, z: 0 },
    [Body25Index.RIGHT_WRIST]:    { x: 0.71,   y: 1.35, z: 0 },
    [Body25Index.LEFT_SHOULDER]:  { x: -0.183, y: 1.35, z: 0 },
    [Body25Index.LEFT_ELBOW]:     { x: -0.47,  y: 1.35, z: 0 },
    [Body25Index.LEFT_WRIST]:     { x: -0.71,  y: 1.35, z: 0 },
    [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0 },
    [Body25Index.RIGHT_HIP]:   { x: 0.15,  y: 0.85, z: 0 },
    [Body25Index.RIGHT_KNEE]:  { x: 0.15,  y: 0.42, z: 0 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.15,  y: 0.05, z: 0 },
    [Body25Index.LEFT_HIP]:    { x: -0.15, y: 0.85, z: 0 },
    [Body25Index.LEFT_KNEE]:   { x: -0.15, y: 0.42, z: 0 },
    [Body25Index.LEFT_ANKLE]:  { x: -0.15, y: 0.05, z: 0 },
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
  // Руки опущены ~25° от вертикали наружу.
  // Верхняя рука ≈0.287, предплечье ≈0.242 — длины сохранены от T-позы.
  const pose = createTPose();
  pose[Body25Index.RIGHT_ELBOW] = { x: 0.30, y: 1.09, z: 0 };
  pose[Body25Index.RIGHT_WRIST] = { x: 0.41, y: 0.87, z: 0 };
  pose[Body25Index.LEFT_ELBOW]  = { x: -0.30, y: 1.09, z: 0 };
  pose[Body25Index.LEFT_WRIST]  = { x: -0.41, y: 0.87, z: 0 };
  return pose;
}

/**
 * Standing - руки по швам (~5° от вертикали)
 */
function createStandingPose(): PoseData {
  // Верхняя рука ≈0.291, предплечье ≈0.241 — длины сохранены.
  const pose = createTPose();
  pose[Body25Index.RIGHT_ELBOW] = { x: 0.21, y: 1.06, z: 0 };
  pose[Body25Index.RIGHT_WRIST] = { x: 0.23, y: 0.82, z: 0 };
  pose[Body25Index.LEFT_ELBOW]  = { x: -0.21, y: 1.06, z: 0 };
  pose[Body25Index.LEFT_WRIST]  = { x: -0.23, y: 0.82, z: 0 };
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
/**
 * Arabesque - reference-pose likeness pass.
 *
 * Side-view oriented variant based on arabesque1/arabesque3:
 * right leg supports, left leg extends backward near hip height, torso inclines
 * forward, arms counterbalance along the forward/back axis.
 */
function createArabesquePose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0.02, y: 1.58, z: -0.34 },
    [Body25Index.NECK]: { x: 0.00, y: 1.39, z: -0.18 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.18, y: 1.35, z: -0.16 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.19, y: 1.36, z: -0.44 },
    [Body25Index.RIGHT_WRIST]: { x: 0.19, y: 1.35, z: -0.70 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.18, y: 1.35, z: -0.14 },
    [Body25Index.LEFT_ELBOW]: { x: -0.21, y: 1.32, z: 0.10 },
    [Body25Index.LEFT_WRIST]: { x: -0.23, y: 1.28, z: 0.34 },
    [Body25Index.MID_HIP]: { x: 0.00, y: 0.90, z: 0.00 },
    [Body25Index.RIGHT_HIP]: { x: 0.12, y: 0.86, z: -0.01 },
    [Body25Index.RIGHT_KNEE]: { x: 0.10, y: 0.46, z: 0.02 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.08, y: 0.07, z: 0.04 },
    [Body25Index.LEFT_HIP]: { x: -0.12, y: 0.86, z: 0.02 },
    [Body25Index.LEFT_KNEE]: { x: -0.13, y: 0.90, z: 0.43 },
    [Body25Index.LEFT_ANKLE]: { x: -0.14, y: 0.91, z: 0.84 },
    [Body25Index.RIGHT_EYE]: { x: 0.07, y: 1.63, z: -0.38 },
    [Body25Index.LEFT_EYE]: { x: -0.03, y: 1.63, z: -0.38 },
    [Body25Index.RIGHT_EAR]: { x: 0.10, y: 1.57, z: -0.26 },
    [Body25Index.LEFT_EAR]: { x: -0.10, y: 1.57, z: -0.25 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.13, y: 0.91, z: 1.00 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.20, y: 0.90, z: 0.99 },
    [Body25Index.LEFT_HEEL]: { x: -0.16, y: 0.88, z: 0.74 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.09, y: 0.00, z: -0.08 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.16, y: 0.00, z: -0.07 },
    [Body25Index.RIGHT_HEEL]: { x: 0.08, y: 0.00, z: 0.12 },
  };
}

/**
 * Forward fold - reference-pose likeness pass.
 *
 * Side-view standing fold based on "наклон вперед.png": straight-ish support
 * legs, high pelvis, torso folded forward/down, hands reaching to the floor in
 * front of the feet, head lowered with the spine line.
 */
function createForwardFoldPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0.02, y: 0.58, z: -0.67 },
    [Body25Index.NECK]: { x: 0.00, y: 0.76, z: -0.50 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.17, y: 0.74, z: -0.47 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.16, y: 0.38, z: -0.52 },
    [Body25Index.RIGHT_WRIST]: { x: 0.15, y: 0.07, z: -0.57 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.17, y: 0.74, z: -0.47 },
    [Body25Index.LEFT_ELBOW]: { x: -0.16, y: 0.38, z: -0.52 },
    [Body25Index.LEFT_WRIST]: { x: -0.15, y: 0.07, z: -0.57 },
    [Body25Index.MID_HIP]: { x: 0.00, y: 0.94, z: 0.00 },
    [Body25Index.RIGHT_HIP]: { x: 0.13, y: 0.90, z: 0.02 },
    [Body25Index.RIGHT_KNEE]: { x: 0.12, y: 0.48, z: 0.03 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.11, y: 0.06, z: 0.02 },
    [Body25Index.LEFT_HIP]: { x: -0.13, y: 0.90, z: 0.02 },
    [Body25Index.LEFT_KNEE]: { x: -0.12, y: 0.48, z: 0.03 },
    [Body25Index.LEFT_ANKLE]: { x: -0.11, y: 0.06, z: 0.02 },
    [Body25Index.RIGHT_EYE]: { x: 0.06, y: 0.61, z: -0.72 },
    [Body25Index.LEFT_EYE]: { x: -0.03, y: 0.61, z: -0.72 },
    [Body25Index.RIGHT_EAR]: { x: 0.10, y: 0.62, z: -0.58 },
    [Body25Index.LEFT_EAR]: { x: -0.10, y: 0.62, z: -0.58 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.10, y: 0.00, z: -0.13 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.18, y: 0.00, z: -0.12 },
    [Body25Index.LEFT_HEEL]: { x: -0.11, y: 0.00, z: 0.13 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.10, y: 0.00, z: -0.13 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.18, y: 0.00, z: -0.12 },
    [Body25Index.RIGHT_HEEL]: { x: 0.11, y: 0.00, z: 0.13 },
  };
}

/**
 * Forward fold through hip hinge.
 *
 * This variant intentionally bypasses PoseData -> inverseFK because inverseFK
 * stores MID_HIP->NECK direction as spine bend. The photo pose is different:
 * pelvis/torso rotate as one block at the hip joints, while the spine stays
 * nearly straight and the neck extends back relative to the torso.
 */
function createForwardFoldHipHingeRig(): SkeletonRig {
  const rig = createDefaultRig();

  rig.rootPosition.set(0, 0.82, 0);
  rig.rootRotation.setFromEuler(new Euler(-1.75, 0, 0, 'YXZ')).normalize();
  rig.spine = setBend(rig.spine, 0, 0, 0);
  rig.spineAngles = { bendX: 0, bendZ: 0, twistY: 0 };
  rig.neck = setBend(rig.neck, 0.45, 0, 0);
  rig.neckAngles = { bendX: 0.45, bendZ: 0, twistY: 0 };

  let pose = resolveSkeleton(rig).pose;

  for (const side of ['r', 'l'] as const) {
    const hipIndex = side === 'r' ? Body25Index.RIGHT_HIP : Body25Index.LEFT_HIP;
    const hip = new Vector3(
      pose[hipIndex].x,
      pose[hipIndex].y,
      pose[hipIndex].z,
    );
    applyLegChainToRig(
      rig,
      side,
      hip,
      new Vector3(hip.x, 0.44, 0.03),
      new Vector3(hip.x, 0.06, 0.02),
    );
  }

  pose = resolveSkeleton(rig).pose;

  for (const side of ['r', 'l'] as const) {
    const shoulderIndex = side === 'r' ? Body25Index.RIGHT_SHOULDER : Body25Index.LEFT_SHOULDER;
    const shoulder = new Vector3(
      pose[shoulderIndex].x,
      pose[shoulderIndex].y,
      pose[shoulderIndex].z,
    );
    applyArmChainToRig(
      rig,
      side,
      shoulder,
      new Vector3(shoulder.x, 0.42, -0.50),
      new Vector3(shoulder.x, 0.08, -0.58),
    );
  }

  return rig;
}

function createForwardFoldHipHingePose(): PoseData {
  return resolveSkeleton(createForwardFoldHipHingeRig()).pose;
}

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
  { id: 'arabesque', name: 'Arabesque', icon: 'A', poseData: createArabesquePose() },
  { id: 'forward-fold', name: 'Наклон вперед', icon: 'F', poseData: createForwardFoldPose() },
  {
    id: 'forward-fold-hip-hinge',
    name: 'Наклон от тазобедренных',
    icon: 'H',
    poseData: createForwardFoldHipHingePose(),
    createRig: createForwardFoldHipHingeRig,
  },
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
