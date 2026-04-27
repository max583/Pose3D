// src/services/__tests__/RigService.stage2.test.ts
// Тесты для Stage 2: applyNeckBend, applyNeckTwist.

import { describe, it, expect, beforeEach } from 'vitest';
import { RigService } from '../RigService';
import { Body25Index } from '../../lib/body25/body25-types';

describe('RigService — Stage 2 neck operations', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  // ─── applyNeckBend ────────────────────────────────────────────────────────────

  it('applyNeckBend изменяет neckAngles.bendX и bendZ', () => {
    svc.beginDrag();
    svc.applyNeckBend(0.2, 0.1);

    expect(svc.getRig().neckAngles.bendX).toBeCloseTo(0.2, 5);
    expect(svc.getRig().neckAngles.bendZ).toBeCloseTo(0.1, 5);
  });

  it('applyNeckBend ограничивает bendX до ±45° и bendZ до ±30°', () => {
    svc.beginDrag();
    svc.applyNeckBend(10, -10);

    const { bendX, bendZ } = svc.getRig().neckAngles;
    expect(bendX).toBeCloseTo(Math.PI / 4, 5);          // ±45°
    expect(bendZ).toBeCloseTo(-30 * Math.PI / 180, 5);  // ±30°
  });

  it('applyNeckBend сдвигает позицию NOSE', () => {
    const noseBefore = svc.getPoseData()[Body25Index.NOSE]!;

    svc.beginDrag();
    svc.applyNeckBend(0.3, 0);

    const noseAfter = svc.getPoseData()[Body25Index.NOSE]!;
    const moved = Math.abs(noseAfter.x - noseBefore.x) + Math.abs(noseAfter.z - noseBefore.z);
    expect(moved).toBeGreaterThan(0.005);
  });

  it('applyNeckBend: эвклидово расстояние NECK→NOSE не превышает длину шеи', () => {
    const rig = svc.getRig();
    const neckLength = rig.neck.segmentLength * rig.neck.segments;

    svc.beginDrag();
    svc.applyNeckBend(0.4, 0.2);

    const pose = svc.getPoseData();
    const neck = pose[Body25Index.NECK]!;
    const nose = pose[Body25Index.NOSE]!;
    const dist = Math.sqrt(
      (nose.x - neck.x) ** 2 +
      (nose.y - neck.y) ** 2 +
      (nose.z - neck.z) ** 2,
    );

    expect(dist).toBeGreaterThan(0.01);
    expect(dist).toBeLessThanOrEqual(neckLength + 0.001);
  });

  it('applyNeckBend не двигает MID_HIP', () => {
    const hipBefore = svc.getPoseData()[Body25Index.MID_HIP]!;

    svc.beginDrag();
    svc.applyNeckBend(0.4, 0);

    const hipAfter = svc.getPoseData()[Body25Index.MID_HIP]!;
    expect(hipAfter.x).toBeCloseTo(hipBefore.x, 5);
    expect(hipAfter.y).toBeCloseTo(hipBefore.y, 5);
  });

  // ─── applyNeckTwist ───────────────────────────────────────────────────────────

  it('applyNeckTwist изменяет neckAngles.twistY', () => {
    svc.beginDrag();
    svc.applyNeckTwist(0.3);

    expect(svc.getRig().neckAngles.twistY).toBeCloseTo(0.3, 5);
  });

  it('applyNeckTwist ограничивает до ±π/4 (±45°)', () => {
    svc.beginDrag();
    svc.applyNeckTwist(10);
    expect(svc.getRig().neckAngles.twistY).toBeCloseTo(Math.PI / 4, 5);

    svc.applyNeckTwist(-20);
    expect(svc.getRig().neckAngles.twistY).toBeCloseTo(-Math.PI / 4, 5);
  });

  it('beginDrag + applyNeckBend → undo возвращает исходное состояние', () => {
    const noseBefore = svc.getPoseData()[Body25Index.NOSE]!;

    svc.beginDrag();
    svc.applyNeckBend(0.4, 0);

    svc.undo();
    const noseAfter = svc.getPoseData()[Body25Index.NOSE]!;
    expect(noseAfter.x).toBeCloseTo(noseBefore.x, 4);
    expect(noseAfter.y).toBeCloseTo(noseBefore.y, 4);
  });
});
