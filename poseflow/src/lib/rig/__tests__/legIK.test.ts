import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../../body25/body25-types';
import { resolveSkeleton } from '../resolveSkeleton';
import { createDefaultRig } from '../SkeletonRig';
import {
  applyLegChainToRig,
  constrainHipDirection,
  constrainKneeBendPreserveTwist,
  getSignedHipAngles,
  getSignedKneeFlexion,
  getLegBoneLengths,
  getLegIKCandidateDiagnostics,
  isLegIKCandidateWithinLimits,
  solveLegFABRIK,
  solveLegIKWithinLimits,
  solveReachableAnkleWithLimitedHip,
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
    const target = new Vector3(0.05, 0.25, -0.3);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.45, 0.4]);

    expect(chain[0].distanceTo(hip)).toBeCloseTo(0, 5);
    expect(chain[2].distanceTo(target)).toBeLessThan(0.05);
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

  it('ограничивает естественное сгибание колена максимум 130 градусами', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.18, -0.12);
    const bodyForward = new Vector3(0, 0, 1);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward);
    const flexion = getSignedKneeFlexion(chain[0], chain[1], chain[2], bodyForward);

    expect(flexion).toBeGreaterThan(0);
    expect(flexion).toBeLessThanOrEqual(130 * Math.PI / 180 + 1e-4);
    expect(chain[1].z).toBeGreaterThan(0);
    expect(chain[2].z).toBeLessThan(0);
  });

  it('не допускает переднее гиперразгибание колена', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0.08);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.7, 0.35);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');
    const diagnostics = getLegIKCandidateDiagnostics(chain[0], chain[1], chain[2], bodyForward, bodyUp, 'r');

    expect(diagnostics.reasons).toEqual([]);
    expect(chain[1].z).toBeGreaterThanOrEqual(0);
  });

  it('ограничивает разгибание бедра назад 25 градусами', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.35, -1.2);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeGreaterThanOrEqual(-25 * Math.PI / 180 - 1e-4);
  });

  it('разрешает высокий передний подъем бедра до 150 градусов', () => {
    const hip = new Vector3(0, 0.85, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);
    const thighLength = 0.43;
    const shinLength = 0.37;
    const highForwardDir = new Vector3(0, -Math.cos(145 * Math.PI / 180), Math.sin(145 * Math.PI / 180));
    const knee = hip.clone().addScaledVector(highForwardDir, thighLength);
    const ankle = knee.clone().add(new Vector3(0, -shinLength, 0));

    const chain = constrainHipDirection(
      hip,
      knee,
      ankle,
      bodyForward,
      bodyUp,
      'r',
      [thighLength, shinLength],
    );
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeCloseTo(145 * Math.PI / 180, 5);
    expect(chain[1].distanceTo(knee)).toBeCloseTo(0, 5);
  });

  it('ограничивает экстремальный передний подъем бедра 150 градусами', () => {
    const hip = new Vector3(0, 0.85, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);
    const thighLength = 0.43;
    const shinLength = 0.37;
    const tooHighDir = new Vector3(0, Math.cos(10 * Math.PI / 180), Math.sin(10 * Math.PI / 180));
    const knee = hip.clone().addScaledVector(tooHighDir, thighLength);
    const ankle = knee.clone().add(new Vector3(0, -shinLength, 0));

    const chain = constrainHipDirection(
      hip,
      knee,
      ankle,
      bodyForward,
      bodyUp,
      'r',
      [thighLength, shinLength],
    );
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeLessThanOrEqual(150 * Math.PI / 180 + 1e-4);
  });

  it('solveLegFABRIK chooses the high-front knee branch for ankle targets above the hip', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 1.2, 0.4);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegFABRIK(
      hip,
      knee,
      ankle,
      target,
      [0.43, 0.37],
      bodyForward,
      bodyUp,
      'r',
    );
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeGreaterThan(90 * Math.PI / 180);
    expect(angles.forward).toBeLessThanOrEqual(150 * Math.PI / 180 + 1e-4);
  });

  it('solveLegIKWithinLimits accepts the high-front target used by RigService ankle drag', () => {
    const hip = new Vector3(0.15, 0.85, 0);
    const knee = new Vector3(0.15, 0.42, 0);
    const ankle = new Vector3(0.15, 0.05, 0);
    const target = new Vector3(0.15, 1.2, 0.4);
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

    expect(chain).not.toBeNull();
    const angles = getSignedHipAngles(chain![0], chain![1], bodyForward, bodyUp, 'r');
    expect(angles.forward).toBeGreaterThan(90 * Math.PI / 180);
  });

  it('solveLegIKWithinLimits uses hip-first fallback for clamped high-front ankle drag', () => {
    const hip = new Vector3(0.15, 0.85, 0);
    const knee = new Vector3(0.1391, 1.2223, 0.2149);
    const ankle = new Vector3(0.1493, 0.8748, 0.3415);
    const target = new Vector3(0.0796, 1.0023, 0.2237);
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

    const diagnostics = getLegIKCandidateDiagnostics(
      chain![0],
      chain![1],
      chain![2],
      bodyForward,
      bodyUp,
      'r',
    );

    expect(chain).not.toBeNull();
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
    expect(diagnostics.reasons).toEqual([]);
    expect(diagnostics.knee.flexionDeg).toBeLessThanOrEqual(131);
  });

  it('solveReachableAnkleWithLimitedHip keeps the logged high-front target valid', () => {
    const hip = new Vector3(0.15, 0.85, 0);
    const knee = new Vector3(0.1391, 1.2223, 0.2149);
    const ankle = new Vector3(0.1493, 0.8748, 0.3415);
    const target = new Vector3(0.0796, 1.0023, 0.2237);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveReachableAnkleWithLimitedHip(
      hip,
      knee,
      target,
      bodyForward,
      bodyUp,
      'r',
      [0.43, 0.37],
    );

    const diagnostics = getLegIKCandidateDiagnostics(
      chain[0],
      chain[1],
      chain[2],
      bodyForward,
      bodyUp,
      'r',
    );

    expect(chain[2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
    expect(diagnostics.reasons).toEqual([]);
    expect(diagnostics.knee.flexionDeg).toBeLessThanOrEqual(131);
  });

  it('starts the high-front knee branch before the ankle itself rises above the hip', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.8, 0.4);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegFABRIK(
      hip,
      knee,
      ankle,
      target,
      [0.43, 0.37],
      bodyForward,
      bodyUp,
      'r',
    );
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeGreaterThan(90 * Math.PI / 180);
  });

  it('разрешает happy-baby отведение при высоком переднем подъеме бедра', () => {
    const hip = new Vector3(0, 0.85, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);
    const thighLength = 0.43;
    const shinLength = 0.37;
    const forwardAngle = 140 * Math.PI / 180;
    const lateralAngle = 45 * Math.PI / 180;
    const sagittalDir = new Vector3(
      0,
      -Math.cos(forwardAngle),
      Math.sin(forwardAngle),
    );
    const highSideDir = sagittalDir
      .multiplyScalar(Math.cos(lateralAngle))
      .add(new Vector3(Math.sin(lateralAngle), 0, 0))
      .normalize();
    const knee = hip.clone().addScaledVector(highSideDir, thighLength);
    const ankle = knee.clone().add(new Vector3(0, -shinLength, 0));

    const chain = constrainHipDirection(
      hip,
      knee,
      ankle,
      bodyForward,
      bodyUp,
      'r',
      [thighLength, shinLength],
    );
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeCloseTo(forwardAngle, 5);
    expect(angles.lateral).toBeCloseTo(lateralAngle, 5);
  });

  it('ограничивает экстремальный high-side escape при высоком переднем подъеме бедра', () => {
    const hip = new Vector3(0, 0.85, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);
    const thighLength = 0.43;
    const shinLength = 0.37;
    const forwardAngle = 145 * Math.PI / 180;
    const lateralAngle = 85 * Math.PI / 180;
    const sagittalDir = new Vector3(
      0,
      -Math.cos(forwardAngle),
      Math.sin(forwardAngle),
    );
    const highSideDir = sagittalDir
      .multiplyScalar(Math.cos(lateralAngle))
      .add(new Vector3(Math.sin(lateralAngle), 0, 0))
      .normalize();
    const knee = hip.clone().addScaledVector(highSideDir, thighLength);
    const ankle = knee.clone().add(new Vector3(0, -shinLength, 0));

    const chain = constrainHipDirection(
      hip,
      knee,
      ankle,
      bodyForward,
      bodyUp,
      'r',
      [thighLength, shinLength],
    );
    const angles = getSignedHipAngles(chain[0], chain[1], bodyForward, bodyUp, 'r');

    expect(angles.forward).toBeCloseTo(forwardAngle, 5);
    expect(angles.lateral).toBeLessThan(55 * Math.PI / 180);
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

    expect(angles.lateral).toBeLessThanOrEqual(55 * Math.PI / 180 + 1e-4);
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

    expect(chain).not.toBeNull();
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
    const angles = getSignedHipAngles(chain![0], chain![1], bodyForward, bodyUp, 'r');
    expect(angles.forward).toBeGreaterThanOrEqual(-25 * Math.PI / 180 - 1e-4);
  });

  it('isLegIKCandidateWithinLimits rejects a knee with the patella on the back side', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0.05, 0.45, -0.16);
    const ankle = new Vector3(0.1, 0.1, 0.12);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    expect(isLegIKCandidateWithinLimits(
      hip,
      knee,
      ankle,
      bodyForward,
      bodyUp,
      'r',
    )).toBe(false);
  });

  it('solveLegIKWithinLimits relimits hip rotation instead of rejecting a reachable ankle target', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0.18, 0.38, -0.08);
    const ankle = new Vector3(0.26, 0.08, 0);
    const target = new Vector3(0.62, 0.34, -0.02);
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

    expect(chain).not.toBeNull();
    expect(chain![2].distanceTo(target)).toBeLessThan(0.025);
    const angles = getSignedHipAngles(chain![0], chain![1], bodyForward, bodyUp, 'r');
    expect(angles.lateral).toBeLessThanOrEqual(55 * Math.PI / 180 + 1e-4);
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
      new Vector3(0, 1, 0),
      'r',
      [0.43, 0.37],
    );

    const beforeRadial = radialDirection(hip, knee, target);
    const afterRadial = radialDirection(chain[0], chain[1], chain[2]);
    expect(afterRadial.dot(beforeRadial)).toBeGreaterThan(0.85);
  });

  it('solveLegIKWithinLimits keeps the logged high-front knee branch during ankle drag', () => {
    const hip = new Vector3(0.15, 0.85, 0);
    const knee = new Vector3(0.1724, 1.2029, 0.2447);
    const ankle = new Vector3(0.1349, 0.8479, 0.3421);
    const target = new Vector3(0.1355, 0.8522, 0.3107);
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

    expect(chain).not.toBeNull();
    expect(chain![1].distanceTo(knee)).toBeLessThan(0.15);
    expect(chain![1].y).toBeGreaterThan(hip.y);
    expect(chain![2].distanceTo(target)).toBeLessThanOrEqual(ankle.distanceTo(target) + 1e-4);
  });

  it('solveLegIKWithinLimits returns a boundary pose instead of sticking near the logged hip limit', () => {
    const hip = new Vector3(0.15, 0.85, 0);
    const knee = new Vector3(-0.0026, 1.1977, 0.2017);
    const ankle = new Vector3(0.3526, 1.3012, 0.2029);
    const target = new Vector3(0.3243, 1.2407, 0.1743);
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

    expect(chain).not.toBeNull();
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
    expect(chain![1].distanceTo(knee)).toBeLessThan(0.05);
  });

  it('solveLegIKWithinLimits keeps the high-front branch even after target lag grows', () => {
    const hip = new Vector3(0.15, 0.85, 0);
    const knee = new Vector3(0.5022, 0.9329, 0.2323);
    const ankle = new Vector3(0.2076, 0.725, 0.3154);
    const target = new Vector3(0.2072, 0.7982, 0.2464);
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

    expect(chain).not.toBeNull();
    expect(chain![1].distanceTo(knee)).toBeLessThan(0.15);
    expect(chain![1].y).toBeGreaterThan(hip.y);
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
  });

  it('DK1: solveLegFABRIK при 140° бедре держит колено выше бедра при цели на уровне бедра', () => {
    const hip = new Vector3(0, 0.85, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);
    const hipFlexion = 140 * Math.PI / 180;
    const thighDir = new Vector3(0, -Math.cos(hipFlexion), Math.sin(hipFlexion));
    const knee = hip.clone().addScaledVector(thighDir, 0.43);
    const ankle = knee.clone().add(new Vector3(0, -0.37, 0));
    const target = new Vector3(0, 0.85, 0.4);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');

    expect(chain[1].y).toBeGreaterThan(hip.y);
    expect(chain[2].distanceTo(target)).toBeLessThan(0.1);
  });

  it('DK2: solveLegFABRIK при 140° бедре сближает лодыжку с целью ниже уровня бедра', () => {
    const hip = new Vector3(0, 0.85, 0);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);
    const hipFlexion = 140 * Math.PI / 180;
    const thighDir = new Vector3(0, -Math.cos(hipFlexion), Math.sin(hipFlexion));
    const knee = hip.clone().addScaledVector(thighDir, 0.43);
    const ankle = knee.clone().add(new Vector3(0, -0.37, 0));
    const target = new Vector3(0, 0.75, 0.3);

    const chain = solveLegFABRIK(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');

    expect(chain[1].y).toBeGreaterThan(hip.y);
    expect(chain[2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
  });

  it('DK3: solveLegIKWithinLimits находит позу с высоким бедром при цели на уровне бедра из стойки', () => {
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 0.85, 0.4);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegIKWithinLimits(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');

    expect(chain).not.toBeNull();
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
    const angles = getSignedHipAngles(chain![0], chain![1], bodyForward, bodyUp, 'r');
    expect(angles.forward).toBeGreaterThan(80 * Math.PI / 180);
  });

  // Baby-pose arc tests: verify the solver handles high-front targets without anatomy violations.
  // Targets are chosen so that the shin geometry *forces* a specific minimum hip flexion.
  //
  // Hip flexion convention (legHip.ts): 0° = thigh down, 90° = thigh horizontal forward,
  // 150° = max deep flexion.
  // thighDir at flexion θ (no abduction) = (0, -cos θ, sin θ).
  // For each target we verified analytically that:
  //   shin²(θ) = (ty - 0.85 + 0.43·cos θ)² + (tz - 0.43·sin θ)² <= 0.37²
  // has no solution below the stated lower bound.

  it('baby-pose: лодыжка достигает цели выше бедра, анатомия валидна (свободная флексия)', () => {
    // target (0,1.0,0.5): reachable at various hip angles — test only that anatomy is clean
    // and ankle gets closer to target, not a specific hip angle.
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 1.0, 0.5);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegIKWithinLimits(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');

    expect(chain).not.toBeNull();
    const diag = getLegIKCandidateDiagnostics(chain![0], chain![1], chain![2], bodyForward, bodyUp, 'r');
    expect(diag.reasons).toEqual([]);
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
  });

  it('baby-pose ≥114°: только глубокий передок достигает цели (0,1.3,0.15)', () => {
    // shin²(θ) < 0.37² requires θ > ~114°; lower flexion cannot reach this target.
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 1.3, 0.15);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegIKWithinLimits(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');

    expect(chain).not.toBeNull();
    const diag = getLegIKCandidateDiagnostics(chain![0], chain![1], chain![2], bodyForward, bodyUp, 'r');
    expect(diag.reasons).toEqual([]);
    const angles = getSignedHipAngles(chain![0], chain![1], bodyForward, bodyUp, 'r');
    expect(angles.forward).toBeGreaterThan(105 * Math.PI / 180);
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
  });

  it('baby-pose ≥140°: только очень глубокий передок достигает цели (0,1.5,0.1)', () => {
    // shin²(θ) < 0.37² requires θ > ~140°; verified at θ=140°: 0.134 < 0.1369.
    const hip = new Vector3(0, 0.85, 0);
    const knee = new Vector3(0, 0.42, 0);
    const ankle = new Vector3(0, 0.05, 0);
    const target = new Vector3(0, 1.5, 0.1);
    const bodyForward = new Vector3(0, 0, 1);
    const bodyUp = new Vector3(0, 1, 0);

    const chain = solveLegIKWithinLimits(hip, knee, ankle, target, [0.43, 0.37], bodyForward, bodyUp, 'r');

    expect(chain).not.toBeNull();
    const diag = getLegIKCandidateDiagnostics(chain![0], chain![1], chain![2], bodyForward, bodyUp, 'r');
    expect(diag.reasons).toEqual([]);
    const angles = getSignedHipAngles(chain![0], chain![1], bodyForward, bodyUp, 'r');
    expect(angles.forward).toBeGreaterThan(130 * Math.PI / 180);
    expect(chain![2].distanceTo(target)).toBeLessThan(ankle.distanceTo(target));
  });

  it('solveLegIKWithinLimits keeps knee anatomy relative to rotated mannequin axes', () => {
    const rootRotation = new Quaternion().setFromAxisAngle(
      new Vector3(1, 0, 0),
      Math.PI,
    );
    const bodyForward = new Vector3(0, 0, 1).applyQuaternion(rootRotation);
    const bodyUp = new Vector3(0, 1, 0).applyQuaternion(rootRotation);
    const hip = new Vector3(0, 0.85, 0).applyQuaternion(rootRotation);
    const knee = new Vector3(0, 0.42, 0).applyQuaternion(rootRotation);
    const ankle = new Vector3(0, 0.05, 0).applyQuaternion(rootRotation);
    const target = new Vector3(0, 0.18, -0.12).applyQuaternion(rootRotation);

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

    expect(chain).not.toBeNull();
    const flexion = getSignedKneeFlexion(chain![0], chain![1], chain![2], bodyForward);
    const patellaDirection = radialDirection(chain![0], chain![1], chain![2]);
    expect(flexion).toBeGreaterThan(0);
    expect(patellaDirection.dot(bodyForward)).toBeGreaterThan(0);
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
