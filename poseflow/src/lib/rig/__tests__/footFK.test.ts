import { describe, expect, it } from 'vitest';
import { Body25Index } from '../../body25/body25-types';
import { createDefaultRig } from '../SkeletonRig';
import { resolveSkeletonPose } from '../resolveSkeleton';
import { applyFootRotationDelta, FOOT_LIMITS } from '../footFK';

describe('footFK', () => {
  it('вращает toe/heel вокруг ankle, не двигая ankle', () => {
    const rig = createDefaultRig();
    const before = resolveSkeletonPose(rig);
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;
    const toeBefore = before[Body25Index.RIGHT_BIG_TOE]!;
    const smallToeBefore = before[Body25Index.RIGHT_SMALL_TOE]!;
    const heelBefore = before[Body25Index.RIGHT_HEEL]!;

    applyFootRotationDelta(rig, 'r', 'pitch', 20 * Math.PI / 180);

    const after = resolveSkeletonPose(rig);
    const ankleAfter = after[Body25Index.RIGHT_ANKLE]!;

    expect(distance(ankleAfter, ankleBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_BIG_TOE]!, toeBefore)).toBeGreaterThan(0.01);
    expect(distance(after[Body25Index.RIGHT_SMALL_TOE]!, smallToeBefore)).toBeGreaterThan(0.01);
    expect(distance(after[Body25Index.RIGHT_HEEL]!, heelBefore)).toBeGreaterThan(0.01);
    expect(distance(after[Body25Index.RIGHT_ANKLE]!, after[Body25Index.RIGHT_BIG_TOE]!))
      .toBeCloseTo(distance(ankleBefore, toeBefore), 5);
  });

  it('ограничивает pitch естественными лимитами', () => {
    const rig = createDefaultRig();

    const applied = applyFootRotationDelta(rig, 'l', 'pitch', Math.PI);

    expect(applied).toBeCloseTo(FOOT_LIMITS.pitch.max, 5);
    expect(rig.footAngles.l.pitch).toBeCloseTo(FOOT_LIMITS.pitch.max, 5);
  });

  it('pitch вращает стопу в плоскости голень-середина пальцев', () => {
    const rig = createDefaultRig();
    const before = resolveSkeletonPose(rig);
    const shin = normalizedVector(
      before[Body25Index.RIGHT_KNEE]!,
      before[Body25Index.RIGHT_ANKLE]!,
    );
    const toeCenterBefore = midpoint(
      before[Body25Index.RIGHT_BIG_TOE]!,
      before[Body25Index.RIGHT_SMALL_TOE]!,
    );
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;
    const toeVectorBefore = vectorFromTo(ankleBefore, toeCenterBefore);
    const pitchPlaneNormal = cross(shin, toeVectorBefore);

    applyFootRotationDelta(rig, 'r', 'pitch', 20 * Math.PI / 180);

    const after = resolveSkeletonPose(rig);
    const toeCenterAfter = midpoint(
      after[Body25Index.RIGHT_BIG_TOE]!,
      after[Body25Index.RIGHT_SMALL_TOE]!,
    );
    const toeVectorAfter = vectorFromTo(after[Body25Index.RIGHT_ANKLE]!, toeCenterAfter);

    expect(Math.abs(dot(normalize(pitchPlaneNormal), normalize(toeVectorAfter)))).toBeLessThan(0.001);
  });

  it('pitch после yaw остаётся в текущей плоскости голень-середина пальцев', () => {
    const rig = createDefaultRig();

    applyFootRotationDelta(rig, 'r', 'yaw', 20 * Math.PI / 180);
    const beforePitch = resolveSkeletonPose(rig);
    const shin = normalizedVector(
      beforePitch[Body25Index.RIGHT_KNEE]!,
      beforePitch[Body25Index.RIGHT_ANKLE]!,
    );
    const toeCenterBefore = midpoint(
      beforePitch[Body25Index.RIGHT_BIG_TOE]!,
      beforePitch[Body25Index.RIGHT_SMALL_TOE]!,
    );
    const toeVectorBefore = vectorFromTo(beforePitch[Body25Index.RIGHT_ANKLE]!, toeCenterBefore);
    const pitchPlaneNormal = cross(shin, toeVectorBefore);

    applyFootRotationDelta(rig, 'r', 'pitch', 20 * Math.PI / 180);

    const afterPitch = resolveSkeletonPose(rig);
    const toeCenterAfter = midpoint(
      afterPitch[Body25Index.RIGHT_BIG_TOE]!,
      afterPitch[Body25Index.RIGHT_SMALL_TOE]!,
    );
    const toeVectorAfter = vectorFromTo(afterPitch[Body25Index.RIGHT_ANKLE]!, toeCenterAfter);

    expect(Math.abs(dot(normalize(pitchPlaneNormal), normalize(toeVectorAfter)))).toBeLessThan(0.001);
  });

  it('yaw вращает стопу в плоскости, перпендикулярной голени', () => {
    const rig = createDefaultRig();
    const before = resolveSkeletonPose(rig);
    const shin = normalizedVector(
      before[Body25Index.LEFT_KNEE]!,
      before[Body25Index.LEFT_ANKLE]!,
    );
    const ankleBefore = before[Body25Index.LEFT_ANKLE]!;
    const toeCenterBefore = midpoint(
      before[Body25Index.LEFT_BIG_TOE]!,
      before[Body25Index.LEFT_SMALL_TOE]!,
    );
    const beforeAlongShin = dot(vectorFromTo(ankleBefore, toeCenterBefore), shin);

    applyFootRotationDelta(rig, 'l', 'yaw', 20 * Math.PI / 180);

    const after = resolveSkeletonPose(rig);
    const toeCenterAfter = midpoint(
      after[Body25Index.LEFT_BIG_TOE]!,
      after[Body25Index.LEFT_SMALL_TOE]!,
    );
    const afterAlongShin = dot(vectorFromTo(after[Body25Index.LEFT_ANKLE]!, toeCenterAfter), shin);

    expect(afterAlongShin).toBeCloseTo(beforeAlongShin, 5);
  });
});

function distance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2,
  );
}

function normalizedVector(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  const v = {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vectorFromTo(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
}

function midpoint(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function cross(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
