import { beforeEach, describe, expect, it } from 'vitest';
import { Body25Index } from '../../lib/body25/body25-types';
import { RigService } from '../RigService';

describe('RigService — Stage 6.1 leg IK', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  it('applyLegIK двигает лодыжку к цели, но не двигает бедро', () => {
    const before = svc.getPoseData();
    const hipBefore = before[Body25Index.RIGHT_HIP]!;

    svc.beginDrag();
    svc.applyLegIK('r', 0.24, 0.15, 0.08);

    const after = svc.getPoseData();
    const hipAfter = after[Body25Index.RIGHT_HIP]!;
    const ankleAfter = after[Body25Index.RIGHT_ANKLE]!;

    expect(distance(hipAfter, hipBefore)).toBeCloseTo(0, 5);
    expect(ankleAfter.x).toBeCloseTo(0.24, 2);
    expect(ankleAfter.y).toBeCloseTo(0.15, 2);
    expect(ankleAfter.z).toBeCloseTo(0.08, 2);
  });

  it('applyLegIK сохраняет длины бедро-колено и колено-лодыжка', () => {
    const before = svc.getPoseData();
    const lenHK = distance(
      before[Body25Index.LEFT_HIP]!,
      before[Body25Index.LEFT_KNEE]!,
    );
    const lenKA = distance(
      before[Body25Index.LEFT_KNEE]!,
      before[Body25Index.LEFT_ANKLE]!,
    );

    svc.beginDrag();
    svc.applyLegIK('l', -0.26, 0.16, 0.08);

    const after = svc.getPoseData();
    expect(distance(
      after[Body25Index.LEFT_HIP]!,
      after[Body25Index.LEFT_KNEE]!,
    )).toBeCloseTo(lenHK, 4);
    expect(distance(
      after[Body25Index.LEFT_KNEE]!,
      after[Body25Index.LEFT_ANKLE]!,
    )).toBeCloseTo(lenKA, 4);
  });

  it('правая нога не двигает левое бедро, колено и лодыжку', () => {
    const before = svc.getPoseData();
    const leftHipBefore = before[Body25Index.LEFT_HIP]!;
    const leftKneeBefore = before[Body25Index.LEFT_KNEE]!;
    const leftAnkleBefore = before[Body25Index.LEFT_ANKLE]!;

    svc.beginDrag();
    svc.applyLegIK('r', 0.25, 0.2, 0.1);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.LEFT_HIP]!, leftHipBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.LEFT_KNEE]!, leftKneeBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.LEFT_ANKLE]!, leftAnkleBefore)).toBeCloseTo(0, 5);
  });

  it('beginDrag + applyLegIK → undo возвращает исходную позицию лодыжки', () => {
    const ankleBefore = svc.getPoseData()[Body25Index.RIGHT_ANKLE]!;

    svc.beginDrag();
    svc.applyLegIK('r', 0.26, 0.18, 0.08);
    svc.undo();

    const ankleAfter = svc.getPoseData()[Body25Index.RIGHT_ANKLE]!;
    expect(distance(ankleAfter, ankleBefore)).toBeCloseTo(0, 5);
  });

  it('applyLegIK не даёт колену уйти в обратный сгиб', () => {
    svc.beginDrag();
    svc.applyLegIK('r', 0.15, 0.72, -0.35);

    const pose = svc.getPoseData();
    const flexion = signedKneeFlexion(
      pose[Body25Index.RIGHT_HIP]!,
      pose[Body25Index.RIGHT_KNEE]!,
      pose[Body25Index.RIGHT_ANKLE]!,
      { x: 0, y: 0, z: 1 },
    );

    expect(flexion).toBeGreaterThanOrEqual(-1 * Math.PI / 180 - 1e-4);
  });

  it('applyKneeTwist вращает колено, не двигая бедро и лодыжку', () => {
    svc.beginDrag();
    svc.applyLegIK('r', 0.2, 0.2, 0.25);

    const before = svc.getPoseData();
    const hipBefore = before[Body25Index.RIGHT_HIP]!;
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;

    svc.beginDrag();
    svc.applyKneeTwist('r', Math.PI / 6);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.RIGHT_HIP]!, hipBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_ANKLE]!, ankleBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_KNEE]!, kneeBefore)).toBeGreaterThan(0.01);
  });

  it('applyKneeTwist сохраняет длины бедро-колено и колено-лодыжка', () => {
    svc.beginDrag();
    svc.applyLegIK('l', -0.2, 0.2, 0.25);

    const before = svc.getPoseData();
    const lenHK = distance(
      before[Body25Index.LEFT_HIP]!,
      before[Body25Index.LEFT_KNEE]!,
    );
    const lenKA = distance(
      before[Body25Index.LEFT_KNEE]!,
      before[Body25Index.LEFT_ANKLE]!,
    );

    svc.beginDrag();
    svc.applyKneeTwist('l', -Math.PI / 6);

    const after = svc.getPoseData();
    expect(distance(
      after[Body25Index.LEFT_HIP]!,
      after[Body25Index.LEFT_KNEE]!,
    )).toBeCloseTo(lenHK, 4);
    expect(distance(
      after[Body25Index.LEFT_KNEE]!,
      after[Body25Index.LEFT_ANKLE]!,
    )).toBeCloseTo(lenKA, 4);
  });

  it('applyLegIK останавливает движение, если цель нарушает лимит бедра', () => {
    const before = svc.getPoseData();
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;

    svc.beginDrag();
    svc.applyLegIK('r', 0.15, 0.35, -1.2);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.RIGHT_KNEE]!, kneeBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_ANKLE]!, ankleBefore)).toBeCloseTo(0, 5);
  });

  it('applyLegIK снова двигает лодыжку после возврата цели в допустимую область', () => {
    const before = svc.getPoseData();
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;

    svc.beginDrag();
    svc.applyLegIK('r', 0.15, 0.35, -1.2);
    svc.applyLegIK('r', 0.24, 0.15, 0.08);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.RIGHT_ANKLE]!, ankleBefore)).toBeGreaterThan(0.01);
    expect(after[Body25Index.RIGHT_ANKLE]!.x).toBeCloseTo(0.24, 2);
    expect(after[Body25Index.RIGHT_ANKLE]!.y).toBeCloseTo(0.15, 2);
    expect(after[Body25Index.RIGHT_ANKLE]!.z).toBeCloseTo(0.08, 2);
  });

  it('applyLegIK сохраняет выставленную twist-плоскость колена после knee gizmo', () => {
    svc.beginDrag();
    svc.applyLegIK('r', 0.2, 0.2, 0.25);
    svc.beginDrag();
    svc.applyKneeTwist('r', Math.PI / 4);

    const before = svc.getPoseData();
    const hipBefore = before[Body25Index.RIGHT_HIP]!;
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;

    svc.beginDrag();
    svc.applyLegIK('r', 0.22, 0.18, 0.22);

    const after = svc.getPoseData();
    const beforeRadial = radialDirection(
      hipBefore,
      kneeBefore,
      after[Body25Index.RIGHT_ANKLE]!,
    );
    const afterRadial = radialDirection(
      after[Body25Index.RIGHT_HIP]!,
      after[Body25Index.RIGHT_KNEE]!,
      after[Body25Index.RIGHT_ANKLE]!,
    );

    expect(afterRadial.dot(beforeRadial)).toBeGreaterThan(0.8);
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

function signedKneeFlexion(
  hip: { x: number; y: number; z: number },
  knee: { x: number; y: number; z: number },
  ankle: { x: number; y: number; z: number },
  bodyForward: { x: number; y: number; z: number },
): number {
  const upper = {
    x: hip.x - knee.x,
    y: hip.y - knee.y,
    z: hip.z - knee.z,
  };
  const lower = {
    x: ankle.x - knee.x,
    y: ankle.y - knee.y,
    z: ankle.z - knee.z,
  };
  const upperLen = Math.sqrt(upper.x ** 2 + upper.y ** 2 + upper.z ** 2);
  const lowerLen = Math.sqrt(lower.x ** 2 + lower.y ** 2 + lower.z ** 2);
  const dot = upper.x * lower.x + upper.y * lower.y + upper.z * lower.z;
  const angle = Math.acos(Math.min(1, Math.max(-1, dot / (upperLen * lowerLen))));
  const flexion = Math.PI - angle;

  const axis = {
    x: ankle.x - hip.x,
    y: ankle.y - hip.y,
    z: ankle.z - hip.z,
  };
  const axisLen = Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2);
  const ax = { x: axis.x / axisLen, y: axis.y / axisLen, z: axis.z / axisLen };
  const hk = { x: knee.x - hip.x, y: knee.y - hip.y, z: knee.z - hip.z };
  const proj = hk.x * ax.x + hk.y * ax.y + hk.z * ax.z;
  const radial = {
    x: hk.x - ax.x * proj,
    y: hk.y - ax.y * proj,
    z: hk.z - ax.z * proj,
  };
  const forwardProj = bodyForward.x * ax.x + bodyForward.y * ax.y + bodyForward.z * ax.z;
  const forward = {
    x: bodyForward.x - ax.x * forwardProj,
    y: bodyForward.y - ax.y * forwardProj,
    z: bodyForward.z - ax.z * forwardProj,
  };
  const sign = radial.x * forward.x + radial.y * forward.y + radial.z * forward.z < 0 ? -1 : 1;
  return flexion * sign;
}

function radialDirection(
  hip: { x: number; y: number; z: number },
  knee: { x: number; y: number; z: number },
  ankle: { x: number; y: number; z: number },
): { x: number; y: number; z: number; dot: (other: { x: number; y: number; z: number }) => number } {
  const axis = {
    x: ankle.x - hip.x,
    y: ankle.y - hip.y,
    z: ankle.z - hip.z,
  };
  const axisLen = Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2);
  const ax = { x: axis.x / axisLen, y: axis.y / axisLen, z: axis.z / axisLen };
  const hk = { x: knee.x - hip.x, y: knee.y - hip.y, z: knee.z - hip.z };
  const proj = hk.x * ax.x + hk.y * ax.y + hk.z * ax.z;
  const radial = {
    x: hk.x - ax.x * proj,
    y: hk.y - ax.y * proj,
    z: hk.z - ax.z * proj,
  };
  const len = Math.sqrt(radial.x ** 2 + radial.y ** 2 + radial.z ** 2);
  const result = {
    x: radial.x / len,
    y: radial.y / len,
    z: radial.z / len,
    dot(other: { x: number; y: number; z: number }) {
      return result.x * other.x + result.y * other.y + result.z * other.z;
    },
  };
  return result;
}
