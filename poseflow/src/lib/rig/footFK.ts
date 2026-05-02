import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../body25/body25-types';
import { SkeletonRig } from './SkeletonRig';

export type FootAxis = 'pitch' | 'yaw' | 'roll';

export const FOOT_LIMITS: Record<FootAxis, { min: number; max: number }> = {
  pitch: { min: -50 * Math.PI / 180, max: 30 * Math.PI / 180 },
  yaw: { min: -35 * Math.PI / 180, max: 35 * Math.PI / 180 },
  roll: { min: -25 * Math.PI / 180, max: 25 * Math.PI / 180 },
};

export function buildFootRotation(
  rig: SkeletonRig,
  side: 'r' | 'l',
  angles: { pitch: number; yaw: number; roll: number },
): Quaternion {
  const { right, up, forward } = getFootRestAxes(rig, side);
  const yaw = new Quaternion().setFromAxisAngle(up, angles.yaw);
  const pitch = new Quaternion().setFromAxisAngle(right, angles.pitch);
  const roll = new Quaternion().setFromAxisAngle(forward, angles.roll);
  return yaw.multiply(pitch).multiply(roll);
}

export function applyFootRotationDelta(
  rig: SkeletonRig,
  side: 'r' | 'l',
  axis: FootAxis,
  delta: number,
): number {
  const angles = rig.footAngles[side];
  const before = angles[axis];
  const limits = FOOT_LIMITS[axis];
  const after = clamp(before + delta, limits.min, limits.max);
  if (after === before) return 0;

  const applied = after - before;
  const currentRotation = rig.footRotations[side];
  const axisVec = getCurrentFootAxis(rig, side, axis);
  const deltaRotation = new Quaternion().setFromAxisAngle(axisVec, applied);

  angles[axis] = after;
  rig.footRotations[side] = deltaRotation.multiply(currentRotation);
  return applied;
}

export function getFootRestAxes(rig: SkeletonRig, side: 'r' | 'l'): {
  shin: Vector3;
  right: Vector3;
  up: Vector3;
  forward: Vector3;
} {
  const joints = side === 'r'
    ? {
      ankle: Body25Index.RIGHT_ANKLE,
      bigToe: Body25Index.RIGHT_BIG_TOE,
      smallToe: Body25Index.RIGHT_SMALL_TOE,
      heel: Body25Index.RIGHT_HEEL,
    }
    : {
      ankle: Body25Index.LEFT_ANKLE,
      bigToe: Body25Index.LEFT_BIG_TOE,
      smallToe: Body25Index.LEFT_SMALL_TOE,
      heel: Body25Index.LEFT_HEEL,
    };

  const ankleOffset = rig.rest.localOffsets.get(joints.ankle)?.clone() ?? new Vector3(0, -1, 0);
  const bigToe = rig.rest.localOffsets.get(joints.bigToe)?.clone() ?? new Vector3(0, -0.05, 0.1);
  const smallToe = rig.rest.localOffsets.get(joints.smallToe)?.clone() ?? new Vector3(0.05, -0.05, 0.05);
  const heel = rig.rest.localOffsets.get(joints.heel)?.clone() ?? new Vector3(0, -0.05, -0.1);

  let shin = ankleOffset.clone();
  if (shin.lengthSq() < 1e-8) {
    shin = new Vector3(0, -1, 0);
  }
  shin.normalize();

  let forward = bigToe.clone().add(smallToe).multiplyScalar(0.5);
  if (forward.lengthSq() < 1e-8) {
    forward = heel.clone().negate();
  }
  if (forward.lengthSq() < 1e-8) {
    forward = new Vector3(0, 0, 1);
  }
  forward.normalize();

  let right = new Vector3().crossVectors(shin, forward);
  right.addScaledVector(forward, -right.dot(forward));
  if (right.lengthSq() < 1e-8) {
    right = smallToe.sub(bigToe);
  }
  right.addScaledVector(shin, -right.dot(shin));
  if (right.lengthSq() < 1e-8) {
    right = side === 'r' ? new Vector3(1, 0, 0) : new Vector3(-1, 0, 0);
  }
  right.normalize();

  let up = shin.clone();
  if (up.lengthSq() < 1e-8) {
    up = new Vector3(0, 1, 0);
  }
  up.normalize();

  return { shin, right, up, forward };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getCurrentFootAxis(rig: SkeletonRig, side: 'r' | 'l', axis: FootAxis): Vector3 {
  const restAxes = getFootRestAxes(rig, side);
  if (axis === 'yaw') {
    return restAxes.shin.clone().normalize();
  }

  const currentForward = restAxes.forward
    .clone()
    .applyQuaternion(rig.footRotations[side])
    .normalize();

  if (axis === 'pitch') {
    let pitchAxis = new Vector3().crossVectors(restAxes.shin, currentForward);
    if (pitchAxis.lengthSq() < 1e-8) {
      pitchAxis = restAxes.right.clone();
    }
    return pitchAxis.normalize();
  }

  return currentForward;
}
