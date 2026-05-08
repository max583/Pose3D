import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../body25/body25-types';
import { SkeletonRig } from './SkeletonRig';
import { isAxialTwistWithinLimits, measureLocalAxialTwist } from './armLimits';

const EPS = 1e-8;

export const LEG_ANATOMY_LIMITS = {
  kneeFlexion: {
    min: 0,
    max: 130 * Math.PI / 180,
  },
  tibiaAxialTwist: {
    min: -15 * Math.PI / 180,
    max: 15 * Math.PI / 180,
  },
  kneeSwivel: {
    min: -60 * Math.PI / 180,
    max: 60 * Math.PI / 180,
  },
} as const;

export interface LegPosePoints {
  hip: Vector3;
  knee: Vector3;
  ankle: Vector3;
}

export interface LegFrame {
  forward: Vector3;
  up: Vector3;
  right: Vector3;
  down: Vector3;
  outward: Vector3;
}

export function buildLegFrame(
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): LegFrame {
  let forward = bodyForward.clone();
  if (forward.lengthSq() < EPS) forward = new Vector3(0, 0, 1);
  forward.normalize();

  let up = bodyUp.clone().addScaledVector(forward, -bodyUp.dot(forward));
  if (up.lengthSq() < EPS) up = new Vector3(0, 1, 0);
  up.normalize();

  let right = new Vector3().crossVectors(up, forward);
  if (right.lengthSq() < EPS) right = new Vector3(1, 0, 0);
  right.normalize();

  return {
    forward,
    up,
    right,
    down: up.clone().negate(),
    outward: side === 'r' ? right.clone() : right.clone().negate(),
  };
}

export function measureKneeFlexion(
  { hip, knee, ankle }: LegPosePoints,
  bodyForward: Vector3,
): number {
  const thigh = knee.clone().sub(hip);
  const tibia = ankle.clone().sub(knee);
  if (thigh.lengthSq() < EPS || tibia.lengthSq() < EPS) return 0;

  const straight = thigh.normalize();
  const lower = tibia.normalize();
  const anterior = projectOntoPlane(bodyForward, straight);
  if (anterior.lengthSq() < EPS) return straight.angleTo(lower);
  anterior.normalize();

  return Math.atan2(-lower.dot(anterior), lower.dot(straight));
}

export function measureTrueKneeFlexion(
  { hip, knee, ankle }: LegPosePoints,
): number {
  const thigh = knee.clone().sub(hip);
  const tibia = ankle.clone().sub(knee);
  if (thigh.lengthSq() < EPS || tibia.lengthSq() < EPS) return 0;

  return thigh.normalize().angleTo(tibia.normalize());
}

export function isKneeFlexionWithinLimits(
  flexion: number,
  limits: { min: number; max: number } = LEG_ANATOMY_LIMITS.kneeFlexion,
): boolean {
  return flexion >= limits.min - EPS && flexion <= limits.max + EPS;
}

export function getKneeAnteriorDirection(
  { hip, knee, ankle }: LegPosePoints,
  bodyForward: Vector3,
): Vector3 {
  let axis = ankle.clone().sub(hip);
  if (axis.lengthSq() < EPS) axis = knee.clone().sub(hip);
  if (axis.lengthSq() < EPS) axis = new Vector3(0, -1, 0);
  axis.normalize();

  let anterior = knee.clone().sub(hip);
  anterior.addScaledVector(axis, -anterior.dot(axis));
  if (anterior.lengthSq() < EPS) {
    anterior = projectOntoPlane(bodyForward, axis);
  }
  if (anterior.lengthSq() < EPS) {
    anterior = getPerpendicularAxis(axis);
  }
  return anterior.normalize();
}

export function measureKneeAnteriorAlignment(
  points: LegPosePoints,
  bodyForward: Vector3,
): number {
  const anterior = getKneeAnteriorDirection(points, bodyForward);
  const axis = points.ankle.clone().sub(points.hip);
  if (axis.lengthSq() < EPS) return 1;
  axis.normalize();

  const reference = projectOntoPlane(bodyForward, axis);
  if (reference.lengthSq() < EPS) return 1;
  return anterior.dot(reference.normalize());
}

export function isKneeAnteriorValid(
  points: LegPosePoints,
  bodyForward: Vector3,
): boolean {
  return measureKneeAnteriorAlignment(points, bodyForward) >= -EPS;
}

export function measureTibiaAxialTwist(
  rig: SkeletonRig,
  side: 'r' | 'l',
): number {
  const joint = side === 'r'
    ? Body25Index.RIGHT_ANKLE
    : Body25Index.LEFT_ANKLE;
  const localRotation = rig.localRotations.get(joint) ?? new Quaternion();
  const restOffset = rig.rest.localOffsets.get(joint) ?? new Vector3();
  return measureLocalAxialTwist(localRotation, restOffset);
}

export function isTibiaAxialTwistWithinLimits(
  rig: SkeletonRig,
  side: 'r' | 'l',
): boolean {
  return isAxialTwistWithinLimits(
    measureTibiaAxialTwist(rig, side),
    LEG_ANATOMY_LIMITS.tibiaAxialTwist,
  );
}

export function isKneeSwivelWithinLimits(
  swivel: number,
  limits: { min: number; max: number } = LEG_ANATOMY_LIMITS.kneeSwivel,
): boolean {
  return swivel >= limits.min - EPS && swivel <= limits.max + EPS;
}

function projectOntoPlane(vector: Vector3, planeNormal: Vector3): Vector3 {
  const normal = planeNormal.clone();
  if (normal.lengthSq() < EPS) return vector.clone();
  normal.normalize();
  return vector.clone().addScaledVector(normal, -vector.dot(normal));
}

function getPerpendicularAxis(axis: Vector3): Vector3 {
  const base = Math.abs(axis.y) < 0.9
    ? new Vector3(0, 1, 0)
    : new Vector3(1, 0, 0);
  return base.cross(axis).normalize();
}
