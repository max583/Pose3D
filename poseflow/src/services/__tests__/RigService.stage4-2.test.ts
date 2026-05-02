import { describe, it, expect, beforeEach } from 'vitest';
import { RigService } from '../RigService';
import { Body25Index } from '../../lib/body25/body25-types';

describe('RigService — Stage 4.2 shoulder FK', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  it('applyShoulderRaise двигает плечевую точку, но не двигает NECK', () => {
    const before = svc.getPoseData();
    const neckBefore = before[Body25Index.NECK]!;
    const shoulderBefore = before[Body25Index.RIGHT_SHOULDER]!;
    const elbowBefore = before[Body25Index.RIGHT_ELBOW]!;
    const wristBefore = before[Body25Index.RIGHT_WRIST]!;

    svc.beginDrag();
    svc.applyShoulderRaise('r', Math.PI / 5);

    const after = svc.getPoseData();
    const neckAfter = after[Body25Index.NECK]!;
    const shoulderAfter = after[Body25Index.RIGHT_SHOULDER]!;
    const elbowAfter = after[Body25Index.RIGHT_ELBOW]!;
    const wristAfter = after[Body25Index.RIGHT_WRIST]!;

    expect(distance(neckAfter, neckBefore)).toBeCloseTo(0, 5);
    expect(shoulderAfter.y).toBeGreaterThan(shoulderBefore.y);
    expect(distance(shoulderAfter, shoulderBefore)).toBeGreaterThan(0.01);
    expect(distance(elbowAfter, elbowBefore)).toBeGreaterThan(0.01);
    expect(distance(wristAfter, wristBefore)).toBeGreaterThan(0.01);
  });

  it('applyShoulderRaise сохраняет длины 1-2, плечо-локоть и локоть-запястье', () => {
    const before = svc.getPoseData();
    const lenNS = distance(
      before[Body25Index.NECK]!,
      before[Body25Index.RIGHT_SHOULDER]!,
    );
    const lenSE = distance(
      before[Body25Index.RIGHT_SHOULDER]!,
      before[Body25Index.RIGHT_ELBOW]!,
    );
    const lenEW = distance(
      before[Body25Index.RIGHT_ELBOW]!,
      before[Body25Index.RIGHT_WRIST]!,
    );

    svc.beginDrag();
    svc.applyShoulderRaise('r', Math.PI / 4);

    const after = svc.getPoseData();
    expect(distance(
      after[Body25Index.NECK]!,
      after[Body25Index.RIGHT_SHOULDER]!,
    )).toBeCloseTo(lenNS, 4);
    expect(distance(
      after[Body25Index.RIGHT_SHOULDER]!,
      after[Body25Index.RIGHT_ELBOW]!,
    )).toBeCloseTo(lenSE, 4);
    expect(distance(
      after[Body25Index.RIGHT_ELBOW]!,
      after[Body25Index.RIGHT_WRIST]!,
    )).toBeCloseTo(lenEW, 4);
  });

  it('правая сторона не двигает левую руку', () => {
    const leftBefore = svc.getPoseData()[Body25Index.LEFT_WRIST]!;

    svc.beginDrag();
    svc.applyShoulderForward('r', Math.PI / 4);

    const leftAfter = svc.getPoseData()[Body25Index.LEFT_WRIST]!;
    expect(distance(leftAfter, leftBefore)).toBeCloseTo(0, 5);
  });

  it('beginDrag + shoulder FK → undo возвращает исходную позу', () => {
    const wristBefore = svc.getPoseData()[Body25Index.RIGHT_WRIST]!;

    svc.beginDrag();
    svc.applyShoulderRaise('r', Math.PI / 4);
    svc.undo();

    const wristAfter = svc.getPoseData()[Body25Index.RIGHT_WRIST]!;
    expect(distance(wristAfter, wristBefore)).toBeCloseTo(0, 5);
  });

  it('после shoulder FK wrist IK остаётся рабочим', () => {
    svc.beginDrag();
    svc.applyShoulderRaise('r', Math.PI / 6);

    svc.beginDrag();
    svc.applyArmIK('r', 0.45, 1.15, 0.1);

    const wrist = svc.getPoseData()[Body25Index.RIGHT_WRIST]!;
    expect(wrist.x).toBeCloseTo(0.45, 2);
    expect(wrist.y).toBeCloseTo(1.15, 2);
    expect(wrist.z).toBeCloseTo(0.1, 2);
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
