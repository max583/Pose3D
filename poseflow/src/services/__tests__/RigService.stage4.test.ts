// src/services/__tests__/RigService.stage4.test.ts
// Тесты для Stage 4.1: applyArmIK, applyElbowTwist.

import { describe, it, expect, beforeEach } from 'vitest';
import { RigService } from '../RigService';
import { Body25Index } from '../../lib/body25/body25-types';

describe('RigService — Stage 4.1 arm IK', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  // ─── applyArmIK ───────────────────────────────────────────────────────────────

  it('applyArmIK перемещает запястье к цели (в зоне досягаемости)', () => {
    // Длина правой руки ≈ 0.527 (плечо→локоть 0.287 + локоть→запястье 0.24).
    // Плечо в T-позе: (0.183, 1.35, 0).
    // Цель (0.5, 1.1, 0.1) — расстояние ≈ 0.416, в зоне досягаемости.
    const tx = 0.5;
    const ty = 1.1;
    const tz = 0.1;

    svc.beginDrag();
    svc.applyArmIK('r', tx, ty, tz);

    const wrAfter = svc.getPoseData()[Body25Index.RIGHT_WRIST]!;
    expect(wrAfter.x).toBeCloseTo(tx, 2);
    expect(wrAfter.y).toBeCloseTo(ty, 2);
    expect(wrAfter.z).toBeCloseTo(tz, 2);
  });

  it('applyArmIK не перемещает плечо', () => {
    const shBefore = svc.getPoseData()[Body25Index.RIGHT_SHOULDER]!;

    svc.beginDrag();
    svc.applyArmIK('r', 1.0, 1.0, 0.3);

    const shAfter = svc.getPoseData()[Body25Index.RIGHT_SHOULDER]!;
    expect(shAfter.x).toBeCloseTo(shBefore.x, 4);
    expect(shAfter.y).toBeCloseTo(shBefore.y, 4);
    expect(shAfter.z).toBeCloseTo(shBefore.z, 4);
  });

  it('applyArmIK сохраняет длины костей плечо→локоть и локоть→запястье', () => {
    const rest = svc.getRig().rest;
    const joints = [
      Body25Index.RIGHT_SHOULDER,
      Body25Index.RIGHT_ELBOW,
      Body25Index.RIGHT_WRIST,
    ];
    const lenSE = rest.boneLengths.get(`${joints[0]}-${joints[1]}`)!;
    const lenEW = rest.boneLengths.get(`${joints[1]}-${joints[2]}`)!;

    svc.beginDrag();
    svc.applyArmIK('r', 0.5, 1.2, 0.2);

    const pose = svc.getPoseData();
    const sh = pose[joints[0]]!;
    const el = pose[joints[1]]!;
    const wr = pose[joints[2]]!;

    const actualSE = Math.sqrt((el.x - sh.x) ** 2 + (el.y - sh.y) ** 2 + (el.z - sh.z) ** 2);
    const actualEW = Math.sqrt((wr.x - el.x) ** 2 + (wr.y - el.y) ** 2 + (wr.z - el.z) ** 2);

    expect(actualSE).toBeCloseTo(lenSE, 3);
    expect(actualEW).toBeCloseTo(lenEW, 3);
  });

  it('applyArmIK не двигает левую руку при манипуляции с правой', () => {
    const lwBefore = svc.getPoseData()[Body25Index.LEFT_WRIST]!;

    svc.beginDrag();
    svc.applyArmIK('r', 0.8, 1.0, 0.2);

    const lwAfter = svc.getPoseData()[Body25Index.LEFT_WRIST]!;
    expect(lwAfter.x).toBeCloseTo(lwBefore.x, 4);
    expect(lwAfter.y).toBeCloseTo(lwBefore.y, 4);
  });

  it('beginDrag + applyArmIK → undo возвращает исходное состояние', () => {
    const wrBefore = svc.getPoseData()[Body25Index.RIGHT_WRIST]!;

    svc.beginDrag();
    svc.applyArmIK('r', 0.5, 1.0, 0.3);

    svc.undo();
    const wrAfter = svc.getPoseData()[Body25Index.RIGHT_WRIST]!;
    expect(wrAfter.x).toBeCloseTo(wrBefore.x, 3);
    expect(wrAfter.y).toBeCloseTo(wrBefore.y, 3);
  });

  // ─── applyElbowTwist ──────────────────────────────────────────────────────────

  it('applyElbowTwist перемещает локоть, плечо и запястье не двигаются', () => {
    // В T-позе рука горизонтальна: плечо-локоть-запястье коллинеарны → radius=0, twist не работает.
    // Сначала сгибаем руку IK, чтобы локоть вышел за ось плечо→запястье.
    svc.beginDrag();
    svc.applyArmIK('r', 0.5, 1.1, 0.1);   // согнуть руку

    const shBefore = svc.getPoseData()[Body25Index.RIGHT_SHOULDER]!;
    const elBefore = svc.getPoseData()[Body25Index.RIGHT_ELBOW]!;
    const wrBefore = svc.getPoseData()[Body25Index.RIGHT_WRIST]!;

    svc.beginDrag();
    svc.applyElbowTwist('r', Math.PI / 4);

    const pose = svc.getPoseData();
    const shAfter = pose[Body25Index.RIGHT_SHOULDER]!;
    const elAfter = pose[Body25Index.RIGHT_ELBOW]!;
    const wrAfter = pose[Body25Index.RIGHT_WRIST]!;

    // Плечо неподвижно
    expect(shAfter.x).toBeCloseTo(shBefore.x, 4);
    expect(shAfter.y).toBeCloseTo(shBefore.y, 4);

    // Запястье неподвижно
    expect(wrAfter.x).toBeCloseTo(wrBefore.x, 3);
    expect(wrAfter.y).toBeCloseTo(wrBefore.y, 3);
    expect(wrAfter.z).toBeCloseTo(wrBefore.z, 3);

    // Локоть переместился
    const elbowMoved = Math.sqrt(
      (elAfter.x - elBefore.x) ** 2 +
      (elAfter.y - elBefore.y) ** 2 +
      (elAfter.z - elBefore.z) ** 2,
    );
    expect(elbowMoved).toBeGreaterThan(0.01);
  });
});
