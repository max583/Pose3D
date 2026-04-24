// src/lib/experimental/rigid/__tests__/SkullGroup.test.ts
// Тесты для SkullGroup

import { describe, it, expect, beforeEach } from 'vitest';
import { SkullGroup, SkullTransform } from '../SkullGroup';
import { Body25Index, PoseData } from '../../../body25/body25-types';
import { Vector3, Quaternion } from 'three';

const createTestPose = (): PoseData => {
  const pose: any = {};
  pose[Body25Index.NOSE] = { x: 0, y: 1.7, z: 0, confidence: 1 };
  pose[Body25Index.LEFT_EYE] = { x: -0.05, y: 1.72, z: 0.1, confidence: 1 };
  pose[Body25Index.RIGHT_EYE] = { x: 0.05, y: 1.72, z: 0.1, confidence: 1 };
  pose[Body25Index.LEFT_EAR] = { x: -0.1, y: 1.7, z: 0, confidence: 1 };
  pose[Body25Index.RIGHT_EAR] = { x: 0.1, y: 1.7, z: 0, confidence: 1 };
  return pose;
};

describe('SkullGroup', () => {
  let skullGroup: SkullGroup;
  let testPose: PoseData;

  beforeEach(() => {
    skullGroup = new SkullGroup();
    testPose = createTestPose();
  });

  describe('initialization', () => {
    it('should initialize from pose', () => {
      skullGroup.initializeFromPose(testPose);
      
      // Should be ready
      expect(skullGroup.isReady()).toBe(true);
    });

    it('should store all skull joints', () => {
      skullGroup.initializeFromPose(testPose);
      
      const joints = skullGroup.getJointPositions();
      expect(joints.size).toBe(5); // NOSE, LEFT_EYE, RIGHT_EYE, LEFT_EAR, RIGHT_EAR
      
      expect(joints.has(Body25Index.NOSE)).toBe(true);
      expect(joints.has(Body25Index.LEFT_EYE)).toBe(true);
      expect(joints.has(Body25Index.RIGHT_EYE)).toBe(true);
      expect(joints.has(Body25Index.LEFT_EAR)).toBe(true);
      expect(joints.has(Body25Index.RIGHT_EAR)).toBe(true);
    });

    it('should get pivot position', () => {
      skullGroup.initializeFromPose(testPose);
      
      const pivotPos = skullGroup.getPivotPosition();
      expect(pivotPos.x).toBeCloseTo(0); // Nose x
      expect(pivotPos.y).toBeCloseTo(1.7); // Nose y
      expect(pivotPos.z).toBeCloseTo(0); // Nose z
    });

    it('should get rotation', () => {
      skullGroup.initializeFromPose(testPose);
      
      const rotation = skullGroup.getRotation();
      expect(rotation).toBeInstanceOf(Quaternion);
    });
  });

  describe('transform application', () => {
    beforeEach(() => {
      skullGroup.initializeFromPose(testPose);
    });

    it('should apply translation transform', () => {
      const transform: Partial<SkullTransform> = {
        position: new Vector3(1, 0, 0), // Move 1 unit right
      };

      const updatedJoints = skullGroup.applyTransform(transform);
      
      // Nose should be moved
      const nosePos = updatedJoints.get(Body25Index.NOSE);
      expect(nosePos).toBeDefined();
      expect(nosePos!.x).toBeCloseTo(1); // Original 0 + 1
      expect(nosePos!.y).toBeCloseTo(1.7); // Unchanged
      expect(nosePos!.z).toBeCloseTo(0); // Unchanged
      
      // Left eye should maintain relative position
      const leftEyePos = updatedJoints.get(Body25Index.LEFT_EYE);
      expect(leftEyePos).toBeDefined();
      expect(leftEyePos!.x).toBeCloseTo(-0.05 + 1); // Original -0.05 + 1
    });

    it('should apply rotation transform', () => {
      // Create a 90-degree rotation around Y axis
      const transform: Partial<SkullTransform> = {
        rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
      };

      const updatedJoints = skullGroup.applyTransform(transform);
      
      // Positions should be rotated
      const nosePos = updatedJoints.get(Body25Index.NOSE);
      expect(nosePos).toBeDefined();
      
      // With 90-degree rotation around Y, left eye should move in Z direction
      const leftEyePos = updatedJoints.get(Body25Index.LEFT_EYE);
      expect(leftEyePos).toBeDefined();
      // Original left eye: (-0.05, 1.72, 0.1)
      // After 90-degree rotation around Y: (0.1, 1.72, 0.05)
      expect(leftEyePos!.x).toBeCloseTo(0.1, 1);
      expect(leftEyePos!.z).toBeCloseTo(0.05, 1);
    });

    it('should apply scale transform', () => {
      const transform: Partial<SkullTransform> = {
        scale: new Vector3(2, 2, 2), // Double scale
      };

      const updatedJoints = skullGroup.applyTransform(transform);
      
      // Relative positions should be scaled
      const leftEyePos = updatedJoints.get(Body25Index.LEFT_EYE);
      expect(leftEyePos).toBeDefined();
      
      // Original left eye relative to nose: (-0.05, 0.02, 0.1)
      // After 2x scale: (-0.1, 0.04, 0.2)
      // Nose position remains at (0, 1.7, 0)
      // So left eye should be at: (-0.1, 1.74, 0.2)
      expect(leftEyePos!.x).toBeCloseTo(-0.1, 1);
      expect(leftEyePos!.y).toBeCloseTo(1.74, 1);
      expect(leftEyePos!.z).toBeCloseTo(0.2, 1);
    });

    it('should apply combined transform', () => {
      const transform: Partial<SkullTransform> = {
        position: new Vector3(1, 0, 0), // Move right
        rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4), // 45-degree rotation
        scale: new Vector3(1.5, 1.5, 1.5), // 1.5x scale
      };

      const updatedJoints = skullGroup.applyTransform(transform);
      
      // Should apply all transformations
      expect(updatedJoints.get(Body25Index.NOSE)).toBeDefined();
      expect(updatedJoints.get(Body25Index.LEFT_EYE)).toBeDefined();
      expect(updatedJoints.get(Body25Index.RIGHT_EYE)).toBeDefined();
    });

    it('should preserve joint relationships after transform', () => {
      const transform: Partial<SkullTransform> = {
        position: new Vector3(2, 0, 0),
        rotation: new Quaternion(),
        scale: new Vector3(1, 1, 1),
      };
      
      const updatedJoints = skullGroup.applyTransform(transform);
      
      // Distance between left eye and nose should be preserved
      const nosePos = updatedJoints.get(Body25Index.NOSE)!;
      const leftEyePos = updatedJoints.get(Body25Index.LEFT_EYE)!;
      
      const dx = leftEyePos.x - nosePos.x;
      const dy = leftEyePos.y - nosePos.y;
      const dz = leftEyePos.z - nosePos.z;
      
      // Should match original relative position
      const originalNose = testPose[Body25Index.NOSE]!;
      const originalLeftEye = testPose[Body25Index.LEFT_EYE]!;
      
      const originalDx = originalLeftEye.x - originalNose.x;
      const originalDy = originalLeftEye.y - originalNose.y;
      const originalDz = originalLeftEye.z - originalNose.z;
      
      expect(dx).toBeCloseTo(originalDx);
      expect(dy).toBeCloseTo(originalDy);
      expect(dz).toBeCloseTo(originalDz);
    });
  });

  describe('pose update', () => {
    it('should update pose with skull joints', () => {
      skullGroup.initializeFromPose(testPose);
      
      const transform: Partial<SkullTransform> = {
        position: new Vector3(0.5, 0, 0),
      };
      
      skullGroup.applyTransform(transform);
      const updatedPose = skullGroup.updatePose(testPose);
      
      // Should contain updated skull joints
      expect(updatedPose[Body25Index.NOSE]?.x).toBeCloseTo(0.5);
      expect(updatedPose[Body25Index.LEFT_EYE]?.x).toBeCloseTo(-0.05 + 0.5);
      
      // Non-skull joints should remain unchanged
      // (testPose doesn't have non-skull joints, but method should handle it)
    });
  });

  describe('static methods', () => {
    it('should check if joint is in skull group', () => {
      expect(SkullGroup.isSkullJoint(Body25Index.NOSE)).toBe(true);
      expect(SkullGroup.isSkullJoint(Body25Index.LEFT_EYE)).toBe(true);
      expect(SkullGroup.isSkullJoint(Body25Index.NECK)).toBe(false); // Not in skull
      expect(SkullGroup.isSkullJoint(Body25Index.RIGHT_SHOULDER)).toBe(false); // Not in skull
    });

    it('should get skull joints list', () => {
      const joints = SkullGroup.getSkullJoints();
      expect(joints).toHaveLength(5);
      expect(joints).toContain(Body25Index.NOSE);
      expect(joints).toContain(Body25Index.LEFT_EYE);
      expect(joints).toContain(Body25Index.RIGHT_EYE);
      expect(joints).toContain(Body25Index.LEFT_EAR);
      expect(joints).toContain(Body25Index.RIGHT_EAR);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      skullGroup.initializeFromPose(testPose);
    });

    it('should compute center of mass', () => {
      const center = skullGroup.computeCenterOfMass();
      expect(center).toBeInstanceOf(Vector3);
      
      // Center should be roughly at nose height
      expect(center.y).toBeCloseTo(1.7, 0.1);
    });

    it('should reset to uninitialized state', () => {
      skullGroup.reset();
      
      expect(skullGroup.isReady()).toBe(false);
      expect(skullGroup.getJointPositions().size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle missing joints in pose', () => {
      const incompletePose: any = {
        [Body25Index.NOSE]: { x: 0, y: 1.7, z: 0, confidence: 1 },
        // Missing other joints
      };
      
      skullGroup.initializeFromPose(incompletePose);
      
      // Should still be ready with available joints
      expect(skullGroup.isReady()).toBe(true);
      expect(skullGroup.getJointPositions().size).toBe(1); // Only nose
    });

    it('should handle empty pose', () => {
      const emptyPose: any = {};
      
      skullGroup.initializeFromPose(emptyPose);
      
      // Should not be ready (no pivot joint)
      expect(skullGroup.isReady()).toBe(false);
    });

    it('should throw error when applying transform without initialization', () => {
      const transform: Partial<SkullTransform> = {
        position: new Vector3(1, 0, 0),
      };
      
      expect(() => {
        skullGroup.applyTransform(transform);
      }).toThrow('SkullGroup not initialized. Call initializeFromPose first.');
    });
  });
});