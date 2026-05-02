import { beforeEach, describe, expect, it } from 'vitest';
import { Body25Index } from '../../lib/body25/body25-types';
import { RigService } from '../RigService';

describe('RigService — Stage 7 foot controller', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  it('applyFootRotation вращает точки стопы, не двигая ногу выше лодыжки', () => {
    const before = svc.getPoseData();
    const hipBefore = before[Body25Index.RIGHT_HIP]!;
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;
    const toeBefore = before[Body25Index.RIGHT_BIG_TOE]!;

    svc.beginDrag();
    svc.applyFootRotation('r', 'pitch', 25 * Math.PI / 180);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.RIGHT_HIP]!, hipBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_KNEE]!, kneeBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_ANKLE]!, ankleBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.RIGHT_BIG_TOE]!, toeBefore)).toBeGreaterThan(0.01);
  });

  it('undo после foot rotation возвращает стопу в исходную позицию', () => {
    const toeBefore = svc.getPoseData()[Body25Index.LEFT_BIG_TOE]!;

    svc.beginDrag();
    svc.applyFootRotation('l', 'yaw', 20 * Math.PI / 180);
    svc.undo();

    const toeAfter = svc.getPoseData()[Body25Index.LEFT_BIG_TOE]!;
    expect(distance(toeAfter, toeBefore)).toBeCloseTo(0, 5);
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
