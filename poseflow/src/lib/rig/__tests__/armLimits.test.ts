import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../../body25/body25-types';
import { createDefaultRig } from '../SkeletonRig';
import {
  ARM_LIMITS,
  decomposeSwingTwist,
  isArmAxialTwistWithinLimits,
  isAxialTwistWithinLimits,
  isElbowFlexionWithinLimits,
  isUpperArmDirectionWithinLimits,
  measureArmAxialTwist,
  measureElbowFlexion,
  measureLocalAxialTwist,
  measureUpperArmDirection,
  normalizeAngle,
  solveArmIKWithinLimits,
} from '../armLimits';

describe('measureElbowFlexion', () => {
  it('returns 0 for a straight arm', () => {
    const flexion = measureElbowFlexion({
      shoulder: new Vector3(0, 0, 0),
      elbow: new Vector3(1, 0, 0),
      wrist: new Vector3(2, 0, 0),
    });

    expect(flexion).toBeCloseTo(0, 5);
  });

  it('measures a right angle bend', () => {
    const flexion = measureElbowFlexion({
      shoulder: new Vector3(0, 0, 0),
      elbow: new Vector3(1, 0, 0),
      wrist: new Vector3(1, 1, 0),
    });

    expect(flexion).toBeCloseTo(Math.PI / 2, 5);
  });

  it('treats degenerate bones as zero flexion', () => {
    const flexion = measureElbowFlexion({
      shoulder: new Vector3(0, 0, 0),
      elbow: new Vector3(0, 0, 0),
      wrist: new Vector3(1, 0, 0),
    });

    expect(flexion).toBe(0);
  });
});

describe('isElbowFlexionWithinLimits', () => {
  it('accepts the configured max flexion and rejects larger bends', () => {
    expect(isElbowFlexionWithinLimits(ARM_LIMITS.elbowFlexion.max)).toBe(true);
    expect(isElbowFlexionWithinLimits(ARM_LIMITS.elbowFlexion.max + 0.01)).toBe(false);
  });
});

describe('solveArmIKWithinLimits', () => {
  it('returns an IK chain when the target keeps elbow flexion within limits', () => {
    const chain = solveArmIKWithinLimits(
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(2, 0, 0),
      new Vector3(1.4, 0.6, 0),
      [1, 1],
      'r',
    );

    expect(chain).not.toBeNull();
    expect(chain![2].distanceTo(new Vector3(1.4, 0.6, 0))).toBeLessThan(0.01);
  });

  it('returns null when the target would overfold the elbow', () => {
    const chain = solveArmIKWithinLimits(
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(2, 0, 0),
      new Vector3(0.15, 0.05, 0),
      [1, 1],
      'r',
    );

    expect(chain).toBeNull();
  });
});

describe('measureUpperArmDirection', () => {
  it('uses mannequin-relative side convention for mirrored arms', () => {
    const right = measureUpperArmDirection(
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      'r',
    );
    const left = measureUpperArmDirection(
      new Vector3(0, 0, 0),
      new Vector3(-1, 0, 0),
      'l',
    );

    expect(right.elevation).toBeCloseTo(0, 5);
    expect(right.forward).toBeCloseTo(0, 5);
    expect(left.elevation).toBeCloseTo(0, 5);
    expect(left.forward).toBeCloseTo(0, 5);
  });

  it('measures direction in the supplied shoulder frame', () => {
    const frame = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const angles = measureUpperArmDirection(
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1),
      'r',
      frame,
    );

    expect(angles.elevation).toBeCloseTo(0, 5);
    expect(angles.forward).toBeCloseTo(0, 5);
  });
});

describe('isUpperArmDirectionWithinLimits', () => {
  it('accepts configured bounds and rejects excessive backward direction', () => {
    expect(isUpperArmDirectionWithinLimits({
      elevation: 0,
      forward: ARM_LIMITS.upperArmForward.min,
    })).toBe(true);
    expect(isUpperArmDirectionWithinLimits({
      elevation: 0,
      forward: ARM_LIMITS.upperArmForward.min - 0.01,
    })).toBe(false);
  });
});

describe('decomposeSwingTwist', () => {
  it('extracts pure axial twist around the requested axis', () => {
    const axis = new Vector3(1, 0, 0);
    const rotation = new Quaternion().setFromAxisAngle(axis, Math.PI / 3);

    const { swing, twistAngle } = decomposeSwingTwist(rotation, axis);

    expect(twistAngle).toBeCloseTo(Math.PI / 3, 5);
    expect(swing.angleTo(new Quaternion())).toBeCloseTo(0, 5);
  });

  it('keeps pure swing out of the twist angle', () => {
    const axis = new Vector3(1, 0, 0);
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);

    const { twistAngle } = decomposeSwingTwist(rotation, axis);

    expect(twistAngle).toBeCloseTo(0, 5);
  });

  it('returns normalized rotation as swing when twist axis is degenerate', () => {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);

    const { swing, twist, twistAngle } = decomposeSwingTwist(rotation, new Vector3());

    expect(swing.angleTo(rotation)).toBeCloseTo(0, 5);
    expect(twist.angleTo(new Quaternion())).toBeCloseTo(0, 5);
    expect(twistAngle).toBe(0);
  });
});

describe('isAxialTwistWithinLimits', () => {
  it('checks normalized twist against limits', () => {
    expect(isAxialTwistWithinLimits(Math.PI / 4, ARM_LIMITS.upperArmAxialTwist)).toBe(true);
    expect(isAxialTwistWithinLimits(Math.PI, ARM_LIMITS.upperArmAxialTwist)).toBe(false);
  });
});

describe('arm axial twist checks', () => {
  it('measures local axial twist around the rest bone direction', () => {
    const restOffset = new Vector3(1, 0, 0);
    const rotation = new Quaternion().setFromAxisAngle(restOffset, Math.PI / 4);

    expect(measureLocalAxialTwist(rotation, restOffset)).toBeCloseTo(Math.PI / 4, 5);
  });

  it('checks upper-arm twist on mannequin-relative arm joints', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.RIGHT_ELBOW)!;
    rig.localRotations.set(
      Body25Index.RIGHT_ELBOW,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), Math.PI / 3),
    );

    expect(measureArmAxialTwist(rig, 'r', 'upper')).toBeCloseTo(Math.PI / 3, 5);
    expect(isArmAxialTwistWithinLimits(rig, 'r', 'upper')).toBe(true);
  });

  it('rejects excessive upper-arm axial twist', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.LEFT_ELBOW)!;
    rig.localRotations.set(
      Body25Index.LEFT_ELBOW,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), Math.PI),
    );

    expect(isArmAxialTwistWithinLimits(rig, 'l', 'upper')).toBe(false);
  });

  it('checks forearm twist on wrist local rotations', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.RIGHT_WRIST)!;
    rig.localRotations.set(
      Body25Index.RIGHT_WRIST,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), -Math.PI / 3),
    );

    expect(measureArmAxialTwist(rig, 'r', 'forearm')).toBeCloseTo(-Math.PI / 3, 5);
    expect(isArmAxialTwistWithinLimits(rig, 'r', 'forearm')).toBe(true);
  });

  it('rejects excessive forearm axial twist', () => {
    const rig = createDefaultRig();
    const restOffset = rig.rest.localOffsets.get(Body25Index.LEFT_WRIST)!;
    rig.localRotations.set(
      Body25Index.LEFT_WRIST,
      new Quaternion().setFromAxisAngle(restOffset.clone().normalize(), -Math.PI),
    );

    expect(isArmAxialTwistWithinLimits(rig, 'l', 'forearm')).toBe(false);
  });
});

describe('normalizeAngle', () => {
  it('wraps angles to -pi..pi', () => {
    expect(normalizeAngle(Math.PI * 3 / 2)).toBeCloseTo(-Math.PI / 2, 5);
    expect(normalizeAngle(-Math.PI * 3 / 2)).toBeCloseTo(Math.PI / 2, 5);
  });
});
