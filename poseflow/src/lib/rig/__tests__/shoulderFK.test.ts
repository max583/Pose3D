import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Body25Index } from '../../body25/body25-types';
import { createDefaultRig } from '../SkeletonRig';
import { resolveSkeleton } from '../resolveSkeleton';
import {
  applyShoulderDelta,
  clampShoulderAngles,
  SHOULDER_LIMITS,
} from '../shoulderFK';

describe('shoulderFK', () => {
  it('raise двигает плечевую точку вокруг NECK и сохраняет длину 1-2', () => {
    const rig = createDefaultRig();
    const before = resolveSkeleton(rig).pose;
    const neckBefore = before[Body25Index.NECK]!;
    const shoulderBefore = before[Body25Index.RIGHT_SHOULDER]!;
    const elbowBefore = before[Body25Index.RIGHT_ELBOW]!;
    const wristBefore = before[Body25Index.RIGHT_WRIST]!;
    const lenNS = distance(neckBefore, shoulderBefore);

    applyShoulderDelta(rig, 'r', 'raise', Math.PI / 6);

    const after = resolveSkeleton(rig).pose;
    const neckAfter = after[Body25Index.NECK]!;
    const shoulderAfter = after[Body25Index.RIGHT_SHOULDER]!;
    const elbowAfter = after[Body25Index.RIGHT_ELBOW]!;
    const wristAfter = after[Body25Index.RIGHT_WRIST]!;

    expect(distance(neckAfter, neckBefore)).toBeCloseTo(0, 5);
    expect(shoulderAfter.y).toBeGreaterThan(shoulderBefore.y);
    expect(distance(shoulderAfter, shoulderBefore)).toBeGreaterThan(0.01);
    expect(distance(elbowAfter, elbowBefore)).toBeGreaterThan(0.01);
    expect(distance(wristAfter, wristBefore)).toBeGreaterThan(0.01);
    expect(distance(neckAfter, shoulderAfter)).toBeCloseTo(lenNS, 4);
  });

  it('delta=0 не меняет позу', () => {
    const rig = createDefaultRig();
    const before = resolveSkeleton(rig).pose[Body25Index.RIGHT_SHOULDER]!;

    const applied = applyShoulderDelta(rig, 'r', 'raise', 0);

    const after = resolveSkeleton(rig).pose[Body25Index.RIGHT_SHOULDER]!;
    expect(applied).toBe(0);
    expect(distance(after, before)).toBeCloseTo(0, 5);
  });

  it('clampShoulderAngles ограничивает все оси заданными лимитами', () => {
    const clamped = clampShoulderAngles({
      raise: 999,
      forward: -999,
    });

    expect(clamped.raise).toBe(SHOULDER_LIMITS.raise.max);
    expect(clamped.forward).toBe(SHOULDER_LIMITS.forward.min);
  });

  it('левая и правая плечевые точки поднимаются симметрично вверх', () => {
    const rig = createDefaultRig();

    applyShoulderDelta(rig, 'r', 'raise', Math.PI / 6);
    applyShoulderDelta(rig, 'l', 'raise', Math.PI / 6);

    const pose = resolveSkeleton(rig).pose;
    const neck = toVec(pose[Body25Index.NECK]!);
    const rShoulder = toVec(pose[Body25Index.RIGHT_SHOULDER]!);
    const lShoulder = toVec(pose[Body25Index.LEFT_SHOULDER]!);

    expect(rShoulder.y).toBeGreaterThan(1.35);
    expect(lShoulder.y).toBeGreaterThan(1.35);
    expect(rShoulder.y - neck.y).toBeCloseTo(lShoulder.y - neck.y, 4);
  });

  it('forward двигает плечевую точку вперёд/назад относительно NECK', () => {
    const rig = createDefaultRig();
    const before = resolveSkeleton(rig).pose[Body25Index.RIGHT_SHOULDER]!;

    applyShoulderDelta(rig, 'r', 'forward', Math.PI / 6);

    const after = resolveSkeleton(rig).pose[Body25Index.RIGHT_SHOULDER]!;
    expect(after.z).toBeGreaterThan(before.z);
  });
});

function distance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return toVec(a).distanceTo(toVec(b));
}

function toVec(p: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}
