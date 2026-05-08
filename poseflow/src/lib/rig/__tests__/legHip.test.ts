import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import {
  buildPelvisLegFrame,
  DEFAULT_HIP_LIMITS,
  directionFromHipPose,
  limitHipPose,
  measureHipPose,
  solveHipDirection,
} from '../legHip';

const DEG = Math.PI / 180;
const TOL = 1 * DEG;

describe('legHip', () => {
  const bodyForward = new Vector3(0, 0, 1);
  const bodyUp = new Vector3(0, 1, 0);

  it('H1 keeps a neutral standing thigh unchanged', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const pose = measureHipPose(frame.down, frame);
    const limited = limitHipPose(pose, frame);

    expect(limited.clamped).toBe(false);
    expect(limited.pose.flexion).toBeCloseTo(0, 5);
    expect(limited.pose.abduction).toBeCloseTo(0, 5);
    expect(limited.pose.direction.distanceTo(frame.down)).toBeLessThan(1e-6);
  });

  it('H2 allows deep front flexion needed for knees-to-belly poses', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: 135 * DEG,
      abduction: 0,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(false);
    expect(limited.pose.flexion).toBeCloseTo(135 * DEG, 5);
  });

  it('H3 clamps impossible front flexion smoothly', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: 175 * DEG,
      abduction: 0,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(true);
    expect(limited.reasons).toContain('flexion');
    expect(limited.pose.flexion).toBeCloseTo(DEFAULT_HIP_LIMITS.flexionMax, 5);
  });

  it('H4 allows happy-baby front flexion plus outward opening', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: 130 * DEG,
      abduction: 45 * DEG,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(false);
    expect(limited.pose.flexion).toBeCloseTo(130 * DEG, 5);
    expect(limited.pose.abduction).toBeCloseTo(45 * DEG, 5);
  });

  it('H5 clamps impossible high-side escape', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: 145 * DEG,
      abduction: 85 * DEG,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(true);
    expect(limited.reasons).toContain('abduction');
    expect(limited.pose.flexion).toBeCloseTo(145 * DEG, 5);
    expect(limited.pose.abduction).toBeLessThan(55 * DEG + TOL);
  });

  it('H6 allows useful hip extension for arabesque and attitude baselines', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: -20 * DEG,
      abduction: 0,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(false);
    expect(limited.pose.flexion).toBeCloseTo(-20 * DEG, 5);
  });

  it('H7 clamps extreme backward extension', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: -60 * DEG,
      abduction: 0,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(true);
    expect(limited.reasons).toContain('extension');
    expect(limited.pose.flexion).toBeCloseTo(-DEFAULT_HIP_LIMITS.extensionMax, 5);
  });

  it('H8 allows outward abduction near the first-pass side range', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: 0,
      abduction: 50 * DEG,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(false);
    expect(limited.pose.abduction).toBeCloseTo(50 * DEG, 5);
  });

  it('H9 clamps extreme outward abduction', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: 0,
      abduction: 90 * DEG,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(true);
    expect(limited.reasons).toContain('abduction');
    expect(limited.pose.abduction).toBeCloseTo(DEFAULT_HIP_LIMITS.abductionMax, 5);
  });

  it('H10 allows inward adduction near the first-pass inward range', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const requested = measureHipPose(directionFromHipPose({
      flexion: 0,
      abduction: -30 * DEG,
    }, frame), frame);
    const limited = limitHipPose(requested, frame);

    expect(limited.clamped).toBe(false);
    expect(limited.pose.abduction).toBeCloseTo(-30 * DEG, 5);
  });

  it('H11 mirrors right and left hip directions across the pelvis midline', () => {
    const rightFrame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const leftFrame = buildPelvisLegFrame(bodyForward, bodyUp, 'l');
    const rightDir = directionFromHipPose({ flexion: 35 * DEG, abduction: 25 * DEG }, rightFrame);
    const leftDir = directionFromHipPose({ flexion: 35 * DEG, abduction: 25 * DEG }, leftFrame);
    const rightPose = measureHipPose(rightDir, rightFrame);
    const leftPose = measureHipPose(leftDir, leftFrame);

    expect(rightPose.flexion).toBeCloseTo(leftPose.flexion, 5);
    expect(rightPose.abduction).toBeCloseTo(leftPose.abduction, 5);
    expect(rightDir.x).toBeCloseTo(-leftDir.x, 5);
    expect(rightDir.y).toBeCloseTo(leftDir.y, 5);
    expect(rightDir.z).toBeCloseTo(leftDir.z, 5);
  });

  it('H12 measures the same pelvis-frame pose after root rotation', () => {
    const q = new Quaternion()
      .setFromAxisAngle(new Vector3(0.3, 1, 0.2).normalize(), 67 * DEG);
    const rotatedForward = bodyForward.clone().applyQuaternion(q);
    const rotatedUp = bodyUp.clone().applyQuaternion(q);
    const baseFrame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const rotatedFrame = buildPelvisLegFrame(rotatedForward, rotatedUp, 'r');
    const baseDir = directionFromHipPose({ flexion: 125 * DEG, abduction: 35 * DEG }, baseFrame);
    const rotatedDir = baseDir.clone().applyQuaternion(q);
    const measured = measureHipPose(rotatedDir, rotatedFrame);

    expect(measured.flexion).toBeCloseTo(125 * DEG, 5);
    expect(measured.abduction).toBeCloseTo(35 * DEG, 5);
  });

  it('solves a knee point from a hip-limited direction without using ankle data', () => {
    const frame = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
    const hip = new Vector3(0.1, 0.8, -0.2);
    const requestedKnee = hip.clone().add(directionFromHipPose({
      flexion: 175 * DEG,
      abduction: 0,
    }, frame));
    const result = solveHipDirection(hip, requestedKnee, 0.43, frame);
    const measured = measureHipPose(result.knee.clone().sub(hip), frame);

    expect(result.knee.distanceTo(hip)).toBeCloseTo(0.43, 5);
    expect(result.limited.clamped).toBe(true);
    expect(measured.flexion).toBeCloseTo(DEFAULT_HIP_LIMITS.flexionMax, 5);
  });
});
