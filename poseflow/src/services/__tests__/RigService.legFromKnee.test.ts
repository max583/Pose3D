import { beforeEach, describe, expect, it } from 'vitest';
import { Body25Index, JointPosition } from '../../lib/body25/body25-types';
import { RigService } from '../RigService';

const DEG = Math.PI / 180;

function distance(a: JointPosition, b: JointPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe('RigService — applyLegFromKneeTarget (Slice 3, knee-node controller plumbing)', () => {
  let svc: RigService;

  beforeEach(() => {
    svc = new RigService();
  });

  it('moves the knee toward the requested target without moving the hip', () => {
    const before = svc.getPoseData();
    const hipBefore = before[Body25Index.RIGHT_HIP]!;
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;

    // Drag the knee 25° forward in the sagittal plane.
    const thigh = distance(hipBefore, kneeBefore);
    const target = {
      x: hipBefore.x,
      y: hipBefore.y - thigh * Math.cos(25 * DEG),
      z: hipBefore.z + thigh * Math.sin(25 * DEG),
    };

    svc.beginDrag();
    svc.applyLegFromKneeTarget('r', target.x, target.y, target.z);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.RIGHT_HIP]!, hipBefore)).toBeCloseTo(0, 5);
    // Knee moved at least most of the way to the target.
    expect(distance(after[Body25Index.RIGHT_KNEE]!, target)).toBeLessThan(0.02);
    // Knee actually moved (not a no-op).
    expect(distance(after[Body25Index.RIGHT_KNEE]!, kneeBefore)).toBeGreaterThan(0.05);
  });

  it('preserves thigh and shin bone lengths', () => {
    const before = svc.getPoseData();
    const lenHK = distance(before[Body25Index.LEFT_HIP]!, before[Body25Index.LEFT_KNEE]!);
    const lenKA = distance(before[Body25Index.LEFT_KNEE]!, before[Body25Index.LEFT_ANKLE]!);

    const hip = before[Body25Index.LEFT_HIP]!;
    // Drag left knee outward (mannequin's left = -x) and slightly forward.
    const target = { x: hip.x - 0.15, y: hip.y - 0.35, z: hip.z + 0.15 };

    svc.beginDrag();
    svc.applyLegFromKneeTarget('l', target.x, target.y, target.z);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.LEFT_HIP]!, after[Body25Index.LEFT_KNEE]!))
      .toBeCloseTo(lenHK, 4);
    expect(distance(after[Body25Index.LEFT_KNEE]!, after[Body25Index.LEFT_ANKLE]!))
      .toBeCloseTo(lenKA, 4);
  });

  it('does not move the opposite leg', () => {
    const before = svc.getPoseData();
    const leftHipBefore = before[Body25Index.LEFT_HIP]!;
    const leftKneeBefore = before[Body25Index.LEFT_KNEE]!;
    const leftAnkleBefore = before[Body25Index.LEFT_ANKLE]!;

    const rightHip = before[Body25Index.RIGHT_HIP]!;
    const target = { x: rightHip.x + 0.1, y: rightHip.y - 0.3, z: rightHip.z + 0.2 };

    svc.beginDrag();
    svc.applyLegFromKneeTarget('r', target.x, target.y, target.z);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.LEFT_HIP]!, leftHipBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.LEFT_KNEE]!, leftKneeBefore)).toBeCloseTo(0, 5);
    expect(distance(after[Body25Index.LEFT_ANKLE]!, leftAnkleBefore)).toBeCloseTo(0, 5);
  });

  it('clamps a knee target that violates hip flexion limits to the limit boundary', () => {
    const before = svc.getPoseData();
    const hip = before[Body25Index.RIGHT_HIP]!;

    // Request 175° hip flexion — past the 150° default. Knee target way up-forward.
    const flex = 175 * DEG;
    const thigh = 0.43;
    const target = {
      x: hip.x,
      y: hip.y - thigh * Math.cos(flex),
      z: hip.z + thigh * Math.sin(flex),
    };

    svc.beginDrag();
    svc.applyLegFromKneeTarget('r', target.x, target.y, target.z);

    const after = svc.getPoseData();
    const kneeAfter = after[Body25Index.RIGHT_KNEE]!;
    // Knee did not reach the target (it was clamped to 150° flexion).
    expect(distance(kneeAfter, target)).toBeGreaterThan(0.05);
    // Knee still at thigh distance from hip.
    expect(distance(kneeAfter, hip)).toBeCloseTo(thigh, 4);
    // The clamped knee is still in the sagittal plane (no x drift).
    expect(Math.abs(kneeAfter.x - hip.x)).toBeLessThan(1e-3);
    // The clamped knee is somewhere in the up-forward octant (forward of hip, above hip).
    expect(kneeAfter.z).toBeGreaterThan(hip.z);
    expect(kneeAfter.y).toBeGreaterThan(hip.y);
  });

  it('beginDrag + applyLegFromKneeTarget → undo restores the original knee position', () => {
    const before = svc.getPoseData();
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;
    const hip = before[Body25Index.RIGHT_HIP]!;

    svc.beginDrag();
    svc.applyLegFromKneeTarget('r', hip.x + 0.05, hip.y - 0.2, hip.z + 0.3);
    svc.undo();

    const kneeAfter = svc.getPoseData()[Body25Index.RIGHT_KNEE]!;
    expect(distance(kneeAfter, kneeBefore)).toBeCloseTo(0, 5);
  });

  it('with kneeTarget at current knee, the leg stays put', () => {
    const before = svc.getPoseData();
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;

    svc.beginDrag();
    svc.applyLegFromKneeTarget('r', kneeBefore.x, kneeBefore.y, kneeBefore.z);

    const after = svc.getPoseData();
    expect(distance(after[Body25Index.RIGHT_KNEE]!, kneeBefore)).toBeLessThan(1e-4);
    expect(distance(after[Body25Index.RIGHT_ANKLE]!, ankleBefore)).toBeLessThan(1e-4);
  });

  it('keeps the ankle on the new shin sphere (anatomically attached)', () => {
    const before = svc.getPoseData();
    const hip = before[Body25Index.RIGHT_HIP]!;
    const kneeBefore = before[Body25Index.RIGHT_KNEE]!;
    const ankleBefore = before[Body25Index.RIGHT_ANKLE]!;
    const shinLen = distance(kneeBefore, ankleBefore);

    // Drag knee to a different position.
    svc.beginDrag();
    svc.applyLegFromKneeTarget('r', hip.x + 0.1, hip.y - 0.35, hip.z + 0.2);

    const after = svc.getPoseData();
    const kneeAfter = after[Body25Index.RIGHT_KNEE]!;
    const ankleAfter = after[Body25Index.RIGHT_ANKLE]!;
    expect(distance(kneeAfter, ankleAfter)).toBeCloseTo(shinLen, 4);
  });
});
