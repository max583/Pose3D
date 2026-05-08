import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../../body25/body25-types';
import { createDefaultRig } from '../SkeletonRig';
import {
  buildLegFrame,
  getKneeAnteriorDirection,
  isKneeAnteriorValid,
  isKneeFlexionWithinLimits,
  isKneeSwivelWithinLimits,
  isTibiaAxialTwistWithinLimits,
  LEG_ANATOMY_LIMITS,
  measureKneeAnteriorAlignment,
  measureKneeFlexion,
  measureTrueKneeFlexion,
  measureTibiaAxialTwist,
} from '../legAnatomy';

describe('legAnatomy', () => {
  const bodyForward = new Vector3(0, 0, 1);
  const bodyUp = new Vector3(0, 1, 0);

  it('builds mannequin-relative leg axes for both sides', () => {
    const right = buildLegFrame(bodyForward, bodyUp, 'r');
    const left = buildLegFrame(bodyForward, bodyUp, 'l');

    expect(right.forward.equals(bodyForward)).toBe(true);
    expect(right.outward.dot(new Vector3(1, 0, 0))).toBeCloseTo(1, 5);
    expect(left.outward.dot(new Vector3(-1, 0, 0))).toBeCloseTo(1, 5);
  });

  it('measures zero knee flexion in the straight rest-like leg', () => {
    const points = {
      hip: new Vector3(0, 0.85, 0),
      knee: new Vector3(0, 0.42, 0),
      ankle: new Vector3(0, 0.05, 0),
    };

    expect(measureKneeFlexion(points, bodyForward)).toBeCloseTo(0, 5);
    expect(isKneeFlexionWithinLimits(measureKneeFlexion(points, bodyForward))).toBe(true);
    expect(getKneeAnteriorDirection(points, bodyForward).dot(bodyForward)).toBeCloseTo(1, 5);
  });

  it('measures true knee flexion as an unsigned thigh-tibia hinge angle', () => {
    const points = {
      hip: new Vector3(0, 0.85, 0),
      knee: new Vector3(0, 0.42, 0),
      ankle: new Vector3(0, 0.42 - Math.cos(120 * Math.PI / 180) * 0.37, -Math.sin(120 * Math.PI / 180) * 0.37),
    };

    expect(measureTrueKneeFlexion(points)).toBeCloseTo(120 * Math.PI / 180, 5);
  });

  it('treats heel-to-back folding as positive natural knee flexion', () => {
    const points = {
      hip: new Vector3(0, 0.85, 0),
      knee: new Vector3(0, 0.46, 0.16),
      ankle: new Vector3(0, 0.18, -0.12),
    };

    const flexion = measureKneeFlexion(points, bodyForward);

    expect(flexion).toBeGreaterThan(20 * Math.PI / 180);
    expect(flexion).toBeLessThan(LEG_ANATOMY_LIMITS.kneeFlexion.max);
    expect(measureKneeAnteriorAlignment(points, bodyForward)).toBeGreaterThan(0);
    expect(isKneeAnteriorValid(points, bodyForward)).toBe(true);
  });

  it('detects a knee plane with the patella rotated to the back side', () => {
    const points = {
      hip: new Vector3(0, 0.85, 0),
      knee: new Vector3(0, 0.46, -0.16),
      ankle: new Vector3(0, 0.18, 0.12),
    };

    expect(measureKneeAnteriorAlignment(points, bodyForward)).toBeLessThan(0);
    expect(isKneeAnteriorValid(points, bodyForward)).toBe(false);
  });

  it('treats forward lower-leg bend as hyperextension outside the first-pass range', () => {
    const points = {
      hip: new Vector3(0, 0.85, 0),
      knee: new Vector3(0, 0.46, 0.04),
      ankle: new Vector3(0, 0.2, 0.28),
    };

    const flexion = measureKneeFlexion(points, bodyForward);

    expect(flexion).toBeLessThan(0);
    expect(isKneeFlexionWithinLimits(flexion)).toBe(false);
  });

  it('measures tibia axial twist around the ankle rest axis', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.RIGHT_ANKLE)!;
    rig.localRotations.set(
      Body25Index.RIGHT_ANKLE,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), 10 * Math.PI / 180),
    );

    expect(measureTibiaAxialTwist(rig, 'r')).toBeCloseTo(10 * Math.PI / 180, 5);
    expect(isTibiaAxialTwistWithinLimits(rig, 'r')).toBe(true);
  });

  it('rejects excessive tibia axial twist', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.LEFT_ANKLE)!;
    rig.localRotations.set(
      Body25Index.LEFT_ANKLE,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), 30 * Math.PI / 180),
    );

    expect(measureTibiaAxialTwist(rig, 'l')).toBeCloseTo(30 * Math.PI / 180, 5);
    expect(isTibiaAxialTwistWithinLimits(rig, 'l')).toBe(false);
  });

  it('limits knee swivel as a small controlled knee-plane adjustment', () => {
    expect(isKneeSwivelWithinLimits(45 * Math.PI / 180)).toBe(true);
    expect(isKneeSwivelWithinLimits(75 * Math.PI / 180)).toBe(false);
  });
});
