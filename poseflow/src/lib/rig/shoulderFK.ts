// src/lib/rig/shoulderFK.ts
// Pure logic for shoulder-girdle FK: move shoulder points around NECK.

import { Quaternion, Vector3 } from 'three';
import { SkeletonRig } from './SkeletonRig';
import { Body25Index } from '../body25/body25-types';

export type ShoulderSide = 'r' | 'l';
export type ShoulderAxis = 'raise' | 'forward';

export interface ShoulderAngles {
  raise: number;
  forward: number;
}

export const SHOULDER_LIMITS: Record<ShoulderAxis, { min: number; max: number }> = {
  raise: {
    min: -75 * Math.PI / 180,
    max: 120 * Math.PI / 180,
  },
  forward: {
    min: -60 * Math.PI / 180,
    max: 90 * Math.PI / 180,
  },
};

export function clampShoulderAngles(angles: ShoulderAngles): ShoulderAngles {
  return {
    raise: clamp(angles.raise, SHOULDER_LIMITS.raise.min, SHOULDER_LIMITS.raise.max),
    forward: clamp(angles.forward, SHOULDER_LIMITS.forward.min, SHOULDER_LIMITS.forward.max),
  };
}

/**
 * Apply shoulder-girdle FK delta.
 *
 * BODY_25 shoulders are joints 2/5 and children of NECK (joint 1).
 * This rotates NECK -> SHOULDER, so the shoulder point itself moves up/down or
 * forward/back around the neck while the arm follows as a child chain.
 */
export function applyShoulderDelta(
  rig: SkeletonRig,
  side: ShoulderSide,
  axis: ShoulderAxis,
  delta: number,
): number {
  const angles = rig.shoulderAngles[side];
  const limit = SHOULDER_LIMITS[axis];
  const next = clamp(angles[axis] + delta, limit.min, limit.max);
  const appliedDelta = next - angles[axis];

  if (Math.abs(appliedDelta) < 1e-8) {
    angles[axis] = next;
    return 0;
  }

  angles[axis] = next;

  const shoulder = side === 'r'
    ? Body25Index.RIGHT_SHOULDER
    : Body25Index.LEFT_SHOULDER;
  const current = rig.localRotations.get(shoulder) ?? new Quaternion();
  const q = new Quaternion().setFromAxisAngle(
    getShoulderLocalAxis(side, axis),
    appliedDelta,
  );

  current.premultiply(q);
  rig.localRotations.set(shoulder, current.normalize());
  return appliedDelta;
}

export function getShoulderLocalAxis(
  side: ShoulderSide,
  axis: ShoulderAxis,
): Vector3 {
  if (axis === 'raise') {
    return new Vector3(0, 0, side === 'r' ? 1 : -1);
  }

  if (axis === 'forward') {
    return new Vector3(0, side === 'r' ? -1 : 1, 0);
  }

  return new Vector3(0, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
