import { Quaternion, Vector3 } from 'three';
import { solveFABRIK } from '../solvers/FABRIKSolver';
import { Body25Index } from '../body25/body25-types';
import { SkeletonRig } from './SkeletonRig';

const EPS = 1e-8;

export const ARM_LIMITS = {
  elbowFlexion: {
    min: 0,
    max: 150 * Math.PI / 180,
  },
  upperArmElevation: {
    min: -100 * Math.PI / 180,
    max: 135 * Math.PI / 180,
  },
  upperArmForward: {
    min: -70 * Math.PI / 180,
    max: 140 * Math.PI / 180,
  },
  upperArmAxialTwist: {
    min: -90 * Math.PI / 180,
    max: 90 * Math.PI / 180,
  },
  forearmAxialTwist: {
    min: -90 * Math.PI / 180,
    max: 90 * Math.PI / 180,
  },
} as const;

export interface SwingTwist {
  swing: Quaternion;
  twist: Quaternion;
  twistAngle: number;
}

export interface ArmPosePoints {
  shoulder: Vector3;
  elbow: Vector3;
  wrist: Vector3;
}

export interface UpperArmDirectionAngles {
  elevation: number;
  forward: number;
}

export type ArmAxialSegment = 'upper' | 'forearm';

export function measureElbowFlexion({
  shoulder,
  elbow,
  wrist,
}: ArmPosePoints): number {
  const upper = elbow.clone().sub(shoulder);
  const forearm = wrist.clone().sub(elbow);
  if (upper.lengthSq() < EPS || forearm.lengthSq() < EPS) return 0;
  return upper.angleTo(forearm);
}

export function isElbowFlexionWithinLimits(
  flexion: number,
  limits = ARM_LIMITS.elbowFlexion,
): boolean {
  return flexion >= limits.min - EPS && flexion <= limits.max + EPS;
}

export function measureUpperArmDirection(
  shoulder: Vector3,
  elbow: Vector3,
  side: 'r' | 'l',
  shoulderFrame = new Quaternion(),
): UpperArmDirectionAngles {
  const dir = elbow.clone().sub(shoulder);
  if (dir.lengthSq() < EPS) {
    return { elevation: 0, forward: 0 };
  }

  dir.normalize();
  dir.applyQuaternion(shoulderFrame.clone().invert());
  const sideSign = side === 'r' ? 1 : -1;
  const lateral = dir.x * sideSign;
  const horizontal = Math.hypot(lateral, dir.z);

  return {
    elevation: Math.atan2(dir.y, horizontal),
    forward: Math.atan2(dir.z, lateral),
  };
}

export function isUpperArmDirectionWithinLimits(
  angles: UpperArmDirectionAngles,
  limits = {
    elevation: ARM_LIMITS.upperArmElevation,
    forward: ARM_LIMITS.upperArmForward,
  },
): boolean {
  return angles.elevation >= limits.elevation.min - EPS
    && angles.elevation <= limits.elevation.max + EPS
    && angles.forward >= limits.forward.min - EPS
    && angles.forward <= limits.forward.max + EPS;
}

export function measureLocalAxialTwist(
  localRotation: Quaternion,
  restOffset: Vector3,
): number {
  return decomposeSwingTwist(localRotation, restOffset).twistAngle;
}

export function measureArmAxialTwist(
  rig: SkeletonRig,
  side: 'r' | 'l',
  segment: ArmAxialSegment,
): number {
  const joint = getArmAxialJoint(side, segment);
  const localRotation = rig.localRotations.get(joint) ?? new Quaternion();
  const restOffset = rig.rest.localOffsets.get(joint) ?? new Vector3();
  return measureLocalAxialTwist(localRotation, restOffset);
}

export function isArmAxialTwistWithinLimits(
  rig: SkeletonRig,
  side: 'r' | 'l',
  segment: ArmAxialSegment,
): boolean {
  const angle = measureArmAxialTwist(rig, side, segment);
  const limits = segment === 'upper'
    ? ARM_LIMITS.upperArmAxialTwist
    : ARM_LIMITS.forearmAxialTwist;
  return isAxialTwistWithinLimits(angle, limits);
}

export function solveArmIKWithinLimits(
  shoulderPos: Vector3,
  elbowPos: Vector3,
  wristPos: Vector3,
  target: Vector3,
  boneLengths: [number, number],
  side: 'r' | 'l',
  shoulderFrame = new Quaternion(),
  limits = ARM_LIMITS.elbowFlexion,
): Vector3[] | null {
  const result = solveFABRIK({
    chain: [shoulderPos.clone(), elbowPos.clone(), wristPos.clone()],
    target,
    boneLengths,
  });

  const flexion = measureElbowFlexion({
    shoulder: result.chain[0],
    elbow: result.chain[1],
    wrist: result.chain[2],
  });

  if (!isElbowFlexionWithinLimits(flexion, limits)) {
    return null;
  }

  const upperArmDirection = measureUpperArmDirection(
    result.chain[0],
    result.chain[1],
    side,
    shoulderFrame,
  );
  if (!isUpperArmDirectionWithinLimits(upperArmDirection)) {
    return null;
  }

  return result.chain;
}

export function decomposeSwingTwist(
  rotation: Quaternion,
  twistAxis: Vector3,
): SwingTwist {
  const axis = twistAxis.clone();
  if (axis.lengthSq() < EPS) {
    return {
      swing: rotation.clone().normalize(),
      twist: new Quaternion(),
      twistAngle: 0,
    };
  }
  axis.normalize();

  const vectorPart = new Vector3(rotation.x, rotation.y, rotation.z);
  const projected = axis.clone().multiplyScalar(vectorPart.dot(axis));
  const twist = new Quaternion(projected.x, projected.y, projected.z, rotation.w);

  if (twist.lengthSq() < EPS) {
    twist.identity();
  } else {
    twist.normalize();
  }

  const swing = rotation.clone().multiply(twist.clone().invert()).normalize();
  return {
    swing,
    twist,
    twistAngle: signedTwistAngle(twist, axis),
  };
}

export function isAxialTwistWithinLimits(
  twistAngle: number,
  limits: { min: number; max: number },
): boolean {
  const normalized = normalizeAngle(twistAngle);
  return normalized >= limits.min - EPS && normalized <= limits.max + EPS;
}

export function normalizeAngle(angle: number): number {
  let result = angle;
  while (result <= -Math.PI) result += Math.PI * 2;
  while (result > Math.PI) result -= Math.PI * 2;
  return result;
}

function signedTwistAngle(twist: Quaternion, axis: Vector3): number {
  const clampedW = Math.max(-1, Math.min(1, twist.w));
  const angle = 2 * Math.acos(clampedW);
  const sign = new Vector3(twist.x, twist.y, twist.z).dot(axis) >= 0 ? 1 : -1;
  return normalizeAngle(angle * sign);
}

function getArmAxialJoint(
  side: 'r' | 'l',
  segment: ArmAxialSegment,
): Body25Index {
  if (side === 'r') {
    return segment === 'upper'
      ? Body25Index.RIGHT_ELBOW
      : Body25Index.RIGHT_WRIST;
  }

  return segment === 'upper'
    ? Body25Index.LEFT_ELBOW
    : Body25Index.LEFT_WRIST;
}
