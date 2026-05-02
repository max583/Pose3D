// src/services/__tests__/RigService.stage1.test.ts
// Тесты для Stage 1: beginDrag, applyPelvis*, applySpine* методов.

import { describe, it, expect, beforeEach } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { RigService } from '../RigService';
import { Body25Index } from '../../lib/body25/body25-types';

describe('RigService — Stage 1 gizmo operations', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  // ─── beginDrag ───────────────────────────────────────────────────────────────

  it('beginDrag сохраняет undo-снимок: после него undo возвращает исходный rig', () => {
    const initialX = svc.getRig().rootPosition.x;

    svc.beginDrag();
    svc.applyPelvisTranslate(1, 0, 0);

    expect(svc.getRig().rootPosition.x).toBeCloseTo(initialX + 1, 4);

    svc.undo();
    expect(svc.getRig().rootPosition.x).toBeCloseTo(initialX, 4);
  });

  // ─── applyPelvisTranslate ─────────────────────────────────────────────────────

  it('applyPelvisTranslate перемещает rootPosition', () => {
    const before = svc.getRig().rootPosition.clone();

    svc.beginDrag();
    svc.applyPelvisTranslate(0.5, -0.2, 0.3);

    const after = svc.getRig().rootPosition;
    expect(after.x).toBeCloseTo(before.x + 0.5, 5);
    expect(after.y).toBeCloseTo(before.y - 0.2, 5);
    expect(after.z).toBeCloseTo(before.z + 0.3, 5);
  });

  it('applyPelvisTranslate не меняет rootRotation', () => {
    svc.beginDrag();
    svc.applyPelvisTranslate(1, 1, 1);

    const rot = svc.getRig().rootRotation;
    expect(rot.x).toBeCloseTo(0, 6);
    expect(rot.y).toBeCloseTo(0, 6);
    expect(rot.z).toBeCloseTo(0, 6);
    expect(rot.w).toBeCloseTo(1, 6);
  });

  it('applyPelvisTranslate уведомляет подписчиков', () => {
    let callCount = 0;
    svc.subscribe(() => { callCount++; });

    svc.beginDrag();
    svc.applyPelvisTranslate(0.1, 0, 0);

    expect(callCount).toBeGreaterThan(0);
  });

  // ─── applyPelvisRotate ────────────────────────────────────────────────────────

  it('applyPelvisRotate(y, π/2) поворачивает всё тело на 90° вокруг Y', () => {
    svc.beginDrag();
    svc.applyPelvisRotate('y', Math.PI / 2);

    // Quaternion для 90° вокруг Y: w=cos(45°), y=sin(45°), x=z=0
    const rot = svc.getRig().rootRotation;
    expect(rot.y).toBeCloseTo(Math.sin(Math.PI / 4), 4);
    expect(rot.w).toBeCloseTo(Math.cos(Math.PI / 4), 4);
    expect(rot.x).toBeCloseTo(0, 4);
    expect(rot.z).toBeCloseTo(0, 4);
  });

  it('applyPelvisRotate накапливается: 2× 45° = 90°', () => {
    svc.beginDrag();
    svc.applyPelvisRotate('y', Math.PI / 4);
    svc.applyPelvisRotate('y', Math.PI / 4);

    const rot = svc.getRig().rootRotation;
    expect(rot.y).toBeCloseTo(Math.sin(Math.PI / 4), 3);
    expect(rot.w).toBeCloseTo(Math.cos(Math.PI / 4), 3);
  });

  it('applyPelvisRotateLocal вращает вокруг текущей локальной оси скелета', () => {
    svc.beginDrag();
    svc.applyPelvisRotate('y', Math.PI / 2);
    const before = svc.getRig().rootRotation.clone();

    svc.applyPelvisRotateLocal('x', Math.PI / 2);

    const expected = before.clone().multiply(
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
    );
    const actual = svc.getRig().rootRotation;
    expect(Math.abs(actual.dot(expected))).toBeCloseTo(1, 5);
  });

  // ─── applySpineBend ───────────────────────────────────────────────────────────

  it('applySpineBend изменяет spineAngles.bendX и bendZ', () => {
    svc.beginDrag();
    svc.applySpineBend(0.3, 0.1);

    expect(svc.getRig().spineAngles.bendX).toBeCloseTo(0.3, 5);
    expect(svc.getRig().spineAngles.bendZ).toBeCloseTo(0.1, 5);
  });

  it('applySpineBend ограничивает bendX до ±45° и bendZ до ±15°', () => {
    svc.beginDrag();
    svc.applySpineBend(5, -5);

    const { bendX, bendZ } = svc.getRig().spineAngles;
    expect(bendX).toBeCloseTo(Math.PI / 4, 5);           // ±45°
    expect(bendZ).toBeCloseTo(-15 * Math.PI / 180, 5);   // ±15°
  });

  it('applySpineBend сдвигает позицию NECK', () => {
    const neckBefore = svc.getPoseData()[Body25Index.NECK]!;

    svc.beginDrag();
    svc.applySpineBend(0.4, 0);

    const neckAfter = svc.getPoseData()[Body25Index.NECK]!;
    const moved = Math.abs(neckAfter.x - neckBefore.x) + Math.abs(neckAfter.z - neckBefore.z);
    expect(moved).toBeGreaterThan(0.01);
  });

  it('applySpineBend: эвклидово расстояние HIP→NECK не превышает длину позвоночника', () => {
    const rig = svc.getRig();
    const spineLength = rig.spine.segmentLength * rig.spine.segments;

    svc.beginDrag();
    svc.applySpineBend(0.5, 0.3);

    const pose = svc.getPoseData();
    const hip  = pose[Body25Index.MID_HIP]!;
    const neck = pose[Body25Index.NECK]!;
    const dist = Math.sqrt(
      (neck.x - hip.x) ** 2 +
      (neck.y - hip.y) ** 2 +
      (neck.z - hip.z) ** 2,
    );

    expect(dist).toBeGreaterThan(0.1);
    expect(dist).toBeLessThanOrEqual(spineLength + 0.001);
  });

  // ─── applySpineTwist ──────────────────────────────────────────────────────────

  it('applySpineTwist изменяет spineAngles.twistY', () => {
    svc.beginDrag();
    svc.applySpineTwist(0.3);

    expect(svc.getRig().spineAngles.twistY).toBeCloseTo(0.3, 5);
  });

  it('applySpineTwist ограничивает до ±π/4 (±45°)', () => {
    svc.beginDrag();
    svc.applySpineTwist(10);
    expect(svc.getRig().spineAngles.twistY).toBeCloseTo(Math.PI / 4, 5);

    svc.applySpineTwist(-20);
    expect(svc.getRig().spineAngles.twistY).toBeCloseTo(-Math.PI / 4, 5);
  });

  it('applySpineTwist накапливается при нескольких вызовах', () => {
    svc.beginDrag();
    svc.applySpineTwist(0.1);
    svc.applySpineTwist(0.1);
    svc.applySpineTwist(0.1);

    expect(svc.getRig().spineAngles.twistY).toBeCloseTo(0.3, 5);
  });
});
