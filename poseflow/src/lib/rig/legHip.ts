import { Vector3 } from 'three';

const EPS = 1e-8;

export type LegSide = 'r' | 'l';

export interface PelvisLegFrame {
  forward: Vector3;
  up: Vector3;
  right: Vector3;
  outward: Vector3;
  down: Vector3;
}

export interface HipPose {
  direction: Vector3;
  flexion: number;
  abduction: number;
}

export interface HipLimits {
  flexionMax: number;
  extensionMax: number;
  abductionMax: number;
  adductionMax: number;
  highFlexionStart: number;
  highFlexionAbductionMax: number;
  highFlexionAdductionMax: number;
}

export interface LimitedHipPose {
  pose: HipPose;
  clamped: boolean;
  reasons: HipLimitReason[];
}

export type HipLimitReason =
  | 'flexion'
  | 'extension'
  | 'abduction'
  | 'adduction';

export const DEFAULT_HIP_LIMITS: HipLimits = {
  flexionMax: 150 * Math.PI / 180,
  extensionMax: 25 * Math.PI / 180,
  abductionMax: 55 * Math.PI / 180,
  adductionMax: 30 * Math.PI / 180,
  highFlexionStart: 120 * Math.PI / 180,
  highFlexionAbductionMax: 50 * Math.PI / 180,
  highFlexionAdductionMax: 30 * Math.PI / 180,
};

export function buildPelvisLegFrame(
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: LegSide,
): PelvisLegFrame {
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
    outward: side === 'r' ? right.clone() : right.clone().negate(),
    down: up.clone().negate(),
  };
}

export function measureHipPose(direction: Vector3, frame: PelvisLegFrame): HipPose {
  let dir = direction.clone();
  if (dir.lengthSq() < EPS) dir = frame.down.clone();
  dir.normalize();

  const abduction = Math.asin(clamp(dir.dot(frame.outward), -1, 1));
  const sagittal = dir.clone().addScaledVector(frame.outward, -dir.dot(frame.outward));
  if (sagittal.lengthSq() < EPS) {
    return {
      direction: dir,
      flexion: 0,
      abduction,
    };
  }
  sagittal.normalize();

  const flexion = Math.atan2(sagittal.dot(frame.forward), sagittal.dot(frame.down));

  return {
    direction: dir,
    flexion,
    abduction,
  };
}

export function directionFromHipPose(
  pose: Pick<HipPose, 'flexion' | 'abduction'>,
  frame: PelvisLegFrame,
): Vector3 {
  const sagittalDir = frame.down.clone()
    .multiplyScalar(Math.cos(pose.flexion))
    .addScaledVector(frame.forward, Math.sin(pose.flexion));

  return sagittalDir
    .multiplyScalar(Math.cos(pose.abduction))
    .addScaledVector(frame.outward, Math.sin(pose.abduction))
    .normalize();
}

export function limitHipPose(
  requestedPose: HipPose,
  frame: PelvisLegFrame,
  limits: HipLimits = DEFAULT_HIP_LIMITS,
): LimitedHipPose {
  const reasons: HipLimitReason[] = [];

  let flexion = requestedPose.flexion;
  if (flexion > limits.flexionMax) {
    flexion = limits.flexionMax;
    reasons.push('flexion');
  } else if (flexion < -limits.extensionMax) {
    flexion = -limits.extensionMax;
    reasons.push('extension');
  }

  const lateralLimits = getHipLateralLimits(flexion, limits);
  let abduction = requestedPose.abduction;
  if (abduction > lateralLimits.abductionMax) {
    abduction = lateralLimits.abductionMax;
    reasons.push('abduction');
  } else if (abduction < -lateralLimits.adductionMax) {
    abduction = -lateralLimits.adductionMax;
    reasons.push('adduction');
  }

  const direction = directionFromHipPose({ flexion, abduction }, frame);

  return {
    pose: {
      direction,
      flexion,
      abduction,
    },
    clamped: reasons.length > 0,
    reasons,
  };
}

export function solveHipDirection(
  hipPos: Vector3,
  requestedKneePos: Vector3,
  thighLength: number,
  frame: PelvisLegFrame,
  limits: HipLimits = DEFAULT_HIP_LIMITS,
): { knee: Vector3; limited: LimitedHipPose } {
  const requestedDirection = requestedKneePos.clone().sub(hipPos);
  const measured = measureHipPose(requestedDirection, frame);
  const limited = limitHipPose(measured, frame, limits);
  const length = Math.max(0, thighLength);
  const knee = hipPos.clone().addScaledVector(limited.pose.direction, length);

  return { knee, limited };
}

export function getHipLateralLimits(
  flexion: number,
  limits: HipLimits = DEFAULT_HIP_LIMITS,
): { abductionMax: number; adductionMax: number } {
  const highRange = limits.flexionMax - limits.highFlexionStart;
  if (highRange <= EPS || flexion <= limits.highFlexionStart) {
    return {
      abductionMax: limits.abductionMax,
      adductionMax: limits.adductionMax,
    };
  }

  const t = clamp((flexion - limits.highFlexionStart) / highRange, 0, 1);
  return {
    abductionMax: lerp(limits.abductionMax, limits.highFlexionAbductionMax, t),
    adductionMax: lerp(limits.adductionMax, limits.highFlexionAdductionMax, t),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
