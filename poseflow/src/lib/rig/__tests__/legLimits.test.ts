import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../../body25/body25-types';
import { createDefaultRig } from '../SkeletonRig';
import {
  isUpperLegAxialTwistWithinLimits,
  isUpperLegKneePlaneTwistWithinLimits,
  isKneePlaneTwistDeltaWithinLimits,
  LEG_LIMITS,
  measureKneePlaneTwistDelta,
  measureUpperLegKneePlaneTwist,
  measureUpperLegAxialTwist,
} from '../legLimits';

describe('leg axial twist limits', () => {
  it('measures upper-leg twist around the rest thigh axis', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.RIGHT_KNEE)!;
    rig.localRotations.set(
      Body25Index.RIGHT_KNEE,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), Math.PI / 3),
    );

    expect(measureUpperLegAxialTwist(rig, 'r')).toBeCloseTo(Math.PI / 3, 5);
    expect(isUpperLegAxialTwistWithinLimits(rig, 'r')).toBe(true);
  });

  it('rejects excessive upper-leg axial twist', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.LEFT_KNEE)!;
    rig.localRotations.set(
      Body25Index.LEFT_KNEE,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), Math.PI),
    );

    expect(measureUpperLegAxialTwist(rig, 'l')).toBeCloseTo(Math.PI, 5);
    expect(isUpperLegAxialTwistWithinLimits(rig, 'l')).toBe(false);
  });

  it('accepts configured upper-leg twist bounds', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.RIGHT_KNEE)!;
    rig.localRotations.set(
      Body25Index.RIGHT_KNEE,
      new Quaternion().setFromAxisAngle(
        restOffset.clone().normalize(),
        LEG_LIMITS.upperLegAxialTwist.max,
      ),
    );

    expect(isUpperLegAxialTwistWithinLimits(rig, 'r')).toBe(true);
  });

  it('measures the knee-plane twist around the hip-ankle axis', () => {
    const hip = new Vector3(0, 0, 0);
    const ankle = new Vector3(0, -1, 0);
    const knee = new Vector3(1, -0.5, 0);
    const bodyForward = new Vector3(0, 0, 1);

    expect(measureUpperLegKneePlaneTwist(
      hip,
      knee,
      ankle,
      bodyForward,
    )).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('rejects a knee plane that has rotated past the upper-leg axial twist limit', () => {
    const hip = new Vector3(0, 0, 0);
    const ankle = new Vector3(0, -1, 0);
    const knee = new Vector3(0, -0.5, -0.2);
    const bodyForward = new Vector3(0, 0, 1);

    expect(isUpperLegKneePlaneTwistWithinLimits(
      hip,
      knee,
      ankle,
      bodyForward,
    )).toBe(false);
  });

  it('measures knee-plane twist delta from the drag-start knee plane', () => {
    const hip = new Vector3(0, 0, 0);
    const ankle = new Vector3(0, -1, 0);
    const startKnee = new Vector3(0, -0.5, 0.2);
    const candidateKnee = new Vector3(0.2, -0.5, 0);

    expect(measureKneePlaneTwistDelta(
      hip,
      startKnee,
      candidateKnee,
      ankle,
    )).toBeCloseTo(-Math.PI / 2, 5);
    expect(isKneePlaneTwistDeltaWithinLimits(
      hip,
      startKnee,
      candidateKnee,
      ankle,
    )).toBe(true);
  });

  it('rejects knee-plane twist delta beyond the configured limit', () => {
    const hip = new Vector3(0, 0, 0);
    const ankle = new Vector3(0, -1, 0);
    const startKnee = new Vector3(0, -0.5, 0.2);
    const candidateKnee = new Vector3(0, -0.5, -0.2);

    expect(isKneePlaneTwistDeltaWithinLimits(
      hip,
      startKnee,
      candidateKnee,
      ankle,
    )).toBe(false);
  });
});
