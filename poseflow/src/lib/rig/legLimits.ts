import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../body25/body25-types';
import { SkeletonRig } from './SkeletonRig';
import { isAxialTwistWithinLimits, measureLocalAxialTwist } from './armLimits';
import { isKneeSwivelWithinLimits } from './legAnatomy';

export const LEG_LIMITS = {
  upperLegAxialTwist: {
    min: -90 * Math.PI / 180,
    max: 90 * Math.PI / 180,
  },
} as const;
const EPS = 1e-8;

export function measureUpperLegAxialTwist(
  rig: SkeletonRig,
  side: 'r' | 'l',
): number {
  const joint = side === 'r'
    ? Body25Index.RIGHT_KNEE
    : Body25Index.LEFT_KNEE;
  const localRotation = rig.localRotations.get(joint) ?? new Quaternion();
  const restOffset = rig.rest.localOffsets.get(joint) ?? new Vector3();
  return measureLocalAxialTwist(localRotation, restOffset);
}

export function isUpperLegAxialTwistWithinLimits(
  rig: SkeletonRig,
  side: 'r' | 'l',
): boolean {
  return isAxialTwistWithinLimits(
    measureUpperLegAxialTwist(rig, side),
    LEG_LIMITS.upperLegAxialTwist,
  );
}

export function measureUpperLegKneePlaneTwist(
  hip: Vector3,
  knee: Vector3,
  ankle: Vector3,
  bodyForward: Vector3,
): number {
  const axis = ankle.clone().sub(hip);
  if (axis.lengthSq() < EPS) return 0;
  axis.normalize();

  const radial = knee.clone().sub(hip);
  radial.addScaledVector(axis, -radial.dot(axis));
  if (radial.lengthSq() < EPS) return 0;
  radial.normalize();

  let reference = bodyForward.clone();
  reference.addScaledVector(axis, -reference.dot(axis));
  if (reference.lengthSq() < EPS) {
    reference = Math.abs(axis.y) < 0.9
      ? new Vector3(0, 1, 0)
      : new Vector3(1, 0, 0);
    reference.addScaledVector(axis, -reference.dot(axis));
  }
  reference.normalize();

  return Math.atan2(
    axis.dot(reference.clone().cross(radial)),
    reference.dot(radial),
  );
}

export function isUpperLegKneePlaneTwistWithinLimits(
  hip: Vector3,
  knee: Vector3,
  ankle: Vector3,
  bodyForward: Vector3,
): boolean {
  return isAxialTwistWithinLimits(
    measureUpperLegKneePlaneTwist(hip, knee, ankle, bodyForward),
    LEG_LIMITS.upperLegAxialTwist,
  );
}

export function measureKneePlaneTwistDelta(
  hip: Vector3,
  startKnee: Vector3,
  candidateKnee: Vector3,
  ankle: Vector3,
): number {
  const axis = ankle.clone().sub(hip);
  if (axis.lengthSq() < EPS) return 0;
  axis.normalize();

  const startRadial = projectRadial(startKnee, hip, axis);
  const candidateRadial = projectRadial(candidateKnee, hip, axis);
  if (startRadial.lengthSq() < EPS || candidateRadial.lengthSq() < EPS) return 0;
  startRadial.normalize();
  candidateRadial.normalize();

  return Math.atan2(
    axis.dot(startRadial.clone().cross(candidateRadial)),
    startRadial.dot(candidateRadial),
  );
}

export function isKneePlaneTwistDeltaWithinLimits(
  hip: Vector3,
  startKnee: Vector3,
  candidateKnee: Vector3,
  ankle: Vector3,
): boolean {
  return isKneeSwivelWithinLimits(
    measureKneePlaneTwistDelta(hip, startKnee, candidateKnee, ankle),
  );
}

function projectRadial(point: Vector3, origin: Vector3, axis: Vector3): Vector3 {
  const radial = point.clone().sub(origin);
  radial.addScaledVector(axis, -radial.dot(axis));
  return radial;
}
