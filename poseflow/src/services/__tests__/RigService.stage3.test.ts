// src/services/__tests__/RigService.stage3.test.ts
// Тесты для Stage 3: applyHeadPitch, applyHeadYaw, applyHeadRoll.

import { describe, it, expect, beforeEach } from 'vitest';
import { RigService } from '../RigService';
import { Body25Index } from '../../lib/body25/body25-types';

describe('RigService — Stage 3 head operations', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  // ─── applyHeadYaw ─────────────────────────────────────────────────────────────

  it('applyHeadYaw изменяет headAngles.yaw', () => {
    svc.beginDrag();
    svc.applyHeadYaw(0.5);
    expect(svc.getRig().headAngles.yaw).toBeCloseTo(0.5, 5);
  });

  it('applyHeadYaw ограничивает до ±80°', () => {
    const limit = 80 * Math.PI / 180;

    svc.beginDrag();
    svc.applyHeadYaw(10);
    expect(svc.getRig().headAngles.yaw).toBeCloseTo(limit, 5);

    svc.applyHeadYaw(-20);
    expect(svc.getRig().headAngles.yaw).toBeCloseTo(-limit, 5);
  });

  // ─── applyHeadPitch ───────────────────────────────────────────────────────────

  it('applyHeadPitch изменяет headAngles.pitch', () => {
    svc.beginDrag();
    svc.applyHeadPitch(0.3);
    expect(svc.getRig().headAngles.pitch).toBeCloseTo(0.3, 5);
  });

  it('applyHeadPitch ограничивает: вперёд +45°, назад −30°', () => {
    const maxForward = 45 * Math.PI / 180;
    const maxBack    = 30 * Math.PI / 180;

    svc.beginDrag();
    svc.applyHeadPitch(10);
    expect(svc.getRig().headAngles.pitch).toBeCloseTo(maxForward, 5);

    svc.applyHeadPitch(-20);
    expect(svc.getRig().headAngles.pitch).toBeCloseTo(-maxBack, 5);
  });

  // ─── applyHeadRoll ────────────────────────────────────────────────────────────

  it('applyHeadRoll изменяет headAngles.roll', () => {
    svc.beginDrag();
    svc.applyHeadRoll(0.2);
    expect(svc.getRig().headAngles.roll).toBeCloseTo(0.2, 5);
  });

  it('applyHeadRoll ограничивает до ±30°', () => {
    const limit = 30 * Math.PI / 180;

    svc.beginDrag();
    svc.applyHeadRoll(10);
    expect(svc.getRig().headAngles.roll).toBeCloseTo(limit, 5);

    svc.applyHeadRoll(-10);
    expect(svc.getRig().headAngles.roll).toBeCloseTo(-limit, 5);
  });

  // ─── Позиция NOSE движется при pitch ─────────────────────────────────────────
  // В T-позе NOSE находится точно над NECK (0, 0.20, 0). Поворот yaw вокруг Y
  // не меняет вертикальный вектор, поэтому NOSE не двигается при yaw.
  // Pitch (поворот вокруг X) наклоняет вектор вперёд/назад — NOSE двигается в Z.

  it('applyHeadPitch сдвигает позицию NOSE вперёд/назад (по Z)', () => {
    const noseBefore = svc.getPoseData()[Body25Index.NOSE]!;

    svc.beginDrag();
    svc.applyHeadPitch(0.3);

    const noseAfter = svc.getPoseData()[Body25Index.NOSE]!;
    expect(Math.abs(noseAfter.z - noseBefore.z)).toBeGreaterThan(0.005);
  });

  it('applyHeadYaw двигает уши (rigid block): расстояние NOSE→EAR сохраняется', () => {
    // В T-позе RIGHT_EAR имеет горизонтальное смещение от NOSE → yaw его двигает.
    const noseBefore = svc.getPoseData()[Body25Index.NOSE]!;
    const earBefore  = svc.getPoseData()[Body25Index.RIGHT_EAR]!;
    const distBefore = Math.sqrt(
      (earBefore.x - noseBefore.x) ** 2 +
      (earBefore.y - noseBefore.y) ** 2 +
      (earBefore.z - noseBefore.z) ** 2,
    );

    svc.beginDrag();
    svc.applyHeadYaw(0.8);

    const noseAfter = svc.getPoseData()[Body25Index.NOSE]!;
    const earAfter  = svc.getPoseData()[Body25Index.RIGHT_EAR]!;
    const distAfter = Math.sqrt(
      (earAfter.x - noseAfter.x) ** 2 +
      (earAfter.y - noseAfter.y) ** 2 +
      (earAfter.z - noseAfter.z) ** 2,
    );

    // Расстояние NOSE→EAR сохраняется (жёсткий блок)
    expect(distAfter).toBeCloseTo(distBefore, 3);
    // Ухо переместилось (yaw вращает горизонтальное смещение)
    expect(Math.abs(earAfter.z - earBefore.z)).toBeGreaterThan(0.005);
  });

  it('applyHeadYaw не двигает MID_HIP', () => {
    const hipBefore = svc.getPoseData()[Body25Index.MID_HIP]!;

    svc.beginDrag();
    svc.applyHeadYaw(0.8);

    const hipAfter = svc.getPoseData()[Body25Index.MID_HIP]!;
    expect(hipAfter.x).toBeCloseTo(hipBefore.x, 5);
    expect(hipAfter.y).toBeCloseTo(hipBefore.y, 5);
  });

  it('beginDrag + applyHeadYaw → undo возвращает исходное состояние', () => {
    const noseBefore = svc.getPoseData()[Body25Index.NOSE]!;

    svc.beginDrag();
    svc.applyHeadYaw(0.8);

    svc.undo();
    const noseAfter = svc.getPoseData()[Body25Index.NOSE]!;
    expect(noseAfter.x).toBeCloseTo(noseBefore.x, 4);
    expect(noseAfter.y).toBeCloseTo(noseBefore.y, 4);
  });
});
