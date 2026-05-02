import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Body25Index } from '../../body25/body25-types';
import { resolveSkeleton } from '../resolveSkeleton';
import { createDefaultRig } from '../SkeletonRig';
import {
  applyLegChainToRig,
  constrainKneeBendPreserveTwist,
  getSignedHipAngles,
  getSignedKneeFlexion,
  getLegBoneLengths,
  solveLegFABRIK,
  solveLegIKWithinLimits,
  twistKnee,
} from '../legIK';

describe('legIK', () => {
  it('getLegBoneLengths возвращает длины бедра и голени из rest pose', () => {
    const rig = createDefaultRig();
    const [hipToKnee, kneeToAnkle] = getLegBoneLengths(rig, 'r');

    expect(hipToKnee).toBeGreaterThan(0);
    expect(kneeToAnkle).toBeGreaterThan(0);
  });

  it('solveLegFABRIK сохраняет бедро как фиксированный корень цепочки', () => {
    const hip = new Vector3(0, 1, 0);
    const knee = new Vector3(0, 0.55, 0);
    const ankle = new Vector3(0, 0.15, 0);
    const target = new Vector3(0.1, 0.2, 0.05);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.45, 0.4]);

    expect(chain[0].distanceTo(hip)).toBeCloseTo(0, 5);
    expect(chain[2].distanceTo(target)).toBeLessThan(0.01);
  });

  it('applyLegChainToRig меняет колено и лодыжку, не двигая бедро', () => {
    const rig = createDefaultRig();
    const before = resolveSkeleton(rig).pose;
    const hipBefore = before[Body25Index.RIGHT_HIP]!;
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;

    const hip = toVector(hipBefore);
    const knee = toVector(kneeBefore).add(new Vector3(0.05, 0, 0.1));
    const ankle = toVector(ankleBefore).add(new Vector3(0.08, 0.04, 0.12));

    applyLegChainToRig(rig, 'r', hip, knee, ankle);

    const after = resolveSkeleton(rig).pose;
    expect(distance(after[Body25Index.RIGHT_HIP]!, hipBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_KNEE]!, kneeBefore)).toBeGreaterThan(0.01);
    expect(distance(after[Body25Index.RIGHT_ANKLE]!, ankleBefore)).toBeGreaterThan(0.01);
  });

  it('ограничивает сгиб колена вперёд максимум 85 градусами', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.7, 0.35);
    const bodyForward = new Vector3(0, 0, 1);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward);
    const flexion = getSignedKneeFlexion(chain[0], chain[1], chain[2], bodyForward);

    expect(Math.abs(flexion)).toBeLessThanOrEqual(85 * Math.PI / 180 + 1e-4);
    expect(chain[2].z).toBeGreaterThan(0);
  });

  it('не допускает обратный сгиб колена', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, -0.08);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.7, -0.35);
    const bodyForward = new Vector3(0, 0, 1);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward);
    const flexion = getSignedKneeFlexion(chain[0], chain[1], chain[2], bodyForward);

    expect(Math.abs(flexion)).toBeLessThanOrEqual(1e-4);
    expect(chain[2].z).toBeLessThan(0);
  });

  it('ограничивает разгибание бедра назад 20 градусами', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.35, -1.2);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeGreaterThanOrEqual(-20 * Math.PI / 180 - 1e-4);
  });

  it('ограничивает отведение правого бедра наружу 50 градусами', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(1.2, 0.35, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.lateral).toBeLessThanOrEqual(50 * Math.PI / 180 + 1e-4);
  });

  it('ограничивает приведение левого бедра внутрь 30 градусами', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(1.2, 0.35, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'l');
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'l');

    expect(angles.lateral).toBeGreaterThanOrEqual(-30 * Math.PI / 180 - 1e-4);
  });

  it('twistKnee вращает колено вокруг оси бедро-лодыжка', () => {
    const hip = new Vector3(0, 0, 0);
    const knee = new Vector3(0.2, -0.5, 0);
    const ankle = new Vector3(0, -1, 0);

    const twisted = twistKnee(hip, knee, ankle, Math.PI / 2);

    expect(twisted.distanceTo(knee)).toBeGreaterThan(0.1);
    expect(twisted.distanceTo(hip)).toBeCloseTo(knee.distanceTo(hip), 5);
    expect(twisted.distanceTo(ankle)).toBeCloseTo(knee.distanceTo(ankle), 5);
  });

  it('twistKnee не двигает колено, если оно лежит на оси бедро-лодыжка', () => {
    const hip = new Vector3(0, 0, 0);
    const knee = new Vector3(0, -0.5, 0);
    const ankle = new Vector3(0, -1, 0);

    const twisted = twistKnee(hip, knee, ankle, Math.PI / 2);

    expect(twisted.distanceTo(knee)).toBeCloseTo(0, 5);
  });

  it('solveLegIKWithinLimits возвращает null, если цель требует выхода бедра за лимит', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.35, -1.2);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegIKWithinLimits(
      hip,
      knee,
      ankle,
      target,
      [0.43, 0.37],
      bodyForward,
      bodyUp,
      'r',
    );

    expect(chain).toBeNull();
  });

  it('constrainKneeBendPreserveTwist сохраняет радиальную сторону текущего колена', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0.16, 0.45, 0.18);
    const target = new Vector3(0.08, 0.12, 0.24);
    const bodyForward = new Vector3(0, 0, 1);

    const chain = constrainKneeBendPreserveTwist(
      hip,
      knee,
      target,
      bodyForward,
      [0.43, 0.37],
    );

    const beforeRadial = radialDirection(hip, knee, target);
    const afterRadial = radialDirection(chain[0], chain[1], chain[2]);
    expect(afterRadial.dot(beforeRadial)).toBeGreaterThan(0.85);
  });
});

function toVector(p: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

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

function radialDirection(hip: Vector3, knee: Vector3, ankle: Vector3): Vector3 {
  const axis = ankle.clone().sub(hip).normalize();
  const radial = knee.clone().sub(hip);
  radial.addScaledVector(axis, -radial.dot(axis));
  return radial.normalize();
}
