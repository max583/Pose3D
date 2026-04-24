// src/lib/experimental/spine/__tests__/SpineChain.test.ts
// Тесты для SpineChain

import { describe, it, expect, beforeEach } from 'vitest';
import { SpineChain, SpineSegment } from '../SpineChain';
import { Body25Index, PoseData } from '../../../body25/body25-types';
import { Vector3, Quaternion } from 'three';

const createTestPose = (): PoseData => {
  const pose: any = {};
  // Spine-related joints
  pose[Body25Index.MID_HIP] = { x: 0, y: 0.9, z: 0, confidence: 1 };
  pose[Body25Index.NECK] = { x: 0, y: 1.6, z: 0, confidence: 1 };
  pose[Body25Index.NOSE] = { x: 0, y: 1.7, z: 0, confidence: 1 };
  pose[Body25Index.LEFT_EYE] = { x: -0.05, y: 1.72, z: 0.1, confidence: 1 };
  pose[Body25Index.RIGHT_EYE] = { x: 0.05, y: 1.72, z: 0.1, confidence: 1 };
  
  // Additional joints for context
  pose[Body25Index.RIGHT_SHOULDER] = { x: 0.3, y: 1.6, z: 0, confidence: 1 };
  pose[Body25Index.LEFT_SHOULDER] = { x: -0.3, y: 1.6, z: 0, confidence: 1 };
  pose[Body25Index.RIGHT_HIP] = { x: 0.2, y: 0.9, z: 0, confidence: 1 };
  pose[Body25Index.LEFT_HIP] = { x: -0.2, y: 0.9, z: 0, confidence: 1 };
  
  return pose;
};

describe('SpineChain', () => {
  let spineChain: SpineChain;
  let testPose: PoseData;

  beforeEach(() => {
    spineChain = new SpineChain();
    testPose = createTestPose();
  });

  describe('initialization', () => {
    it('should initialize from pose', () => {
      spineChain.initializeFromPose(testPose);
      
      // Should be ready
      expect(spineChain.isReady()).toBe(true);
    });

    it('should create all spine segments in state', () => {
      spineChain.initializeFromPose(testPose);
      
      const state = spineChain.getState();
      expect(state.segments.size).toBe(5); // PELVIS, SPINE_1, SPINE_2, NECK, HEAD
      
      expect(state.segments.has(SpineSegment.PELVIS)).toBe(true);
      expect(state.segments.has(SpineSegment.SPINE_1)).toBe(true);
      expect(state.segments.has(SpineSegment.SPINE_2)).toBe(true);
      expect(state.segments.has(SpineSegment.NECK)).toBe(true);
      expect(state.segments.has(SpineSegment.HEAD)).toBe(true);
    });

    it('should map joints to correct segments in state', () => {
      spineChain.initializeFromPose(testPose);
      
      // Check segment positions in state
      const state = spineChain.getState();
      
      // PELVIS should be at MID_HIP position
      const pelvisPos = state.segments.get(SpineSegment.PELVIS);
      expect(pelvisPos?.x).toBeCloseTo(0); // MID_HIP x
      expect(pelvisPos?.y).toBeCloseTo(0.9); // MID_HIP y
      expect(pelvisPos?.z).toBeCloseTo(0); // MID_HIP z
      
      // HEAD should be at average head joints position
      const headPos = state.segments.get(SpineSegment.HEAD);
      expect(headPos?.y).toBeGreaterThan(1.6); // Higher than neck
    });

    it('should calculate spine length in state', () => {
      spineChain.initializeFromPose(testPose);
      
      const state = spineChain.getState();
      expect(state.length).toBeGreaterThan(0);
      
      // Distance from pelvis (y=0.9) to head (y~1.7) should be ~0.8
      expect(state.length).toBeCloseTo(0.8, 0.1);
    });

    it('should calculate curvature and twist', () => {
      spineChain.initializeFromPose(testPose);
      
      const state = spineChain.getState();
      expect(state.curvature).toBeDefined();
      expect(state.twist).toBeDefined();
      
      // For a straight T-pose, curvature should be close to 0
      expect(state.curvature).toBeCloseTo(0, 0.1);
    });
  });

  describe('static methods', () => {
    it('should map joint to segment', () => {
      // MID_HIP should map to PELVIS
      const pelvisSegment = SpineChain.getSegmentForJoint(Body25Index.MID_HIP);
      expect(pelvisSegment).toBe(SpineSegment.PELVIS);
      
      // NECK should map to NECK
      const neckSegment = SpineChain.getSegmentForJoint(Body25Index.NECK);
      expect(neckSegment).toBe(SpineSegment.NECK);
      
      // NOSE should map to HEAD
      const headSegment = SpineChain.getSegmentForJoint(Body25Index.NOSE);
      expect(headSegment).toBe(SpineSegment.HEAD);
    });

    it('should return null for non-spine joint', () => {
      const segment = SpineChain.getSegmentForJoint(Body25Index.RIGHT_WRIST);
      expect(segment).toBeNull();
    });

    it('should get joints for segment', () => {
      // HEAD segment should include NOSE, LEFT_EYE, RIGHT_EYE
      const headJoints = SpineChain.getJointsForSegment(SpineSegment.HEAD);
      expect(headJoints).toContain(Body25Index.NOSE);
      expect(headJoints).toContain(Body25Index.LEFT_EYE);
      expect(headJoints).toContain(Body25Index.RIGHT_EYE);
      
      // PELVIS segment should include MID_HIP
      const pelvisJoints = SpineChain.getJointsForSegment(SpineSegment.PELVIS);
      expect(pelvisJoints).toContain(Body25Index.MID_HIP);
    });
  });

  describe('pose generation', () => {
    it('should generate pose from spine', () => {
      spineChain.initializeFromPose(testPose);
      
      const generatedPose = spineChain.generatePose();
      
      // Should contain spine-related joints
      expect(generatedPose[Body25Index.MID_HIP]).toBeDefined();
      expect(generatedPose[Body25Index.NECK]).toBeDefined();
      expect(generatedPose[Body25Index.NOSE]).toBeDefined();
    });

    it('should generate pose with correct positions', () => {
      spineChain.initializeFromPose(testPose);
      
      const generatedPose = spineChain.generatePose();
      
      // MID_HIP position should match pelvis segment
      const state = spineChain.getState();
      const pelvisPos = state.segments.get(SpineSegment.PELVIS);
      const midHipPos = generatedPose[Body25Index.MID_HIP];
      
      expect(midHipPos?.x).toBeCloseTo(pelvisPos?.x || 0);
      expect(midHipPos?.y).toBeCloseTo(pelvisPos?.y || 0);
      expect(midHipPos?.z).toBeCloseTo(pelvisPos?.z || 0);
    });
  });

  describe('segment updates', () => {
    beforeEach(() => {
      spineChain.initializeFromPose(testPose);
    });

    it('should update segment position', () => {
      const newPosition = new Vector3(1, 2, 3);
      spineChain.updateSegmentPosition(SpineSegment.PELVIS, newPosition);
      
      const state = spineChain.getState();
      const updatedPelvisPos = state.segments.get(SpineSegment.PELVIS);
      
      expect(updatedPelvisPos?.x).toBeCloseTo(1);
      expect(updatedPelvisPos?.y).toBeCloseTo(2);
      expect(updatedPelvisPos?.z).toBeCloseTo(3);
    });

    it('should update segment rotation', () => {
      const newRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
      spineChain.updateSegmentRotation(SpineSegment.NECK, newRotation);
      
      const state = spineChain.getState();
      const updatedNeckRotation = state.rotations.get(SpineSegment.NECK);
      
      expect(updatedNeckRotation).toBeDefined();
      // Quaternion equality check
      expect(updatedNeckRotation?.x).toBeCloseTo(newRotation.x);
      expect(updatedNeckRotation?.y).toBeCloseTo(newRotation.y);
      expect(updatedNeckRotation?.z).toBeCloseTo(newRotation.z);
      expect(updatedNeckRotation?.w).toBeCloseTo(newRotation.w);
    });

    it('should throw error when updating uninitialized spine', () => {
      const uninitializedSpine = new SpineChain();
      
      expect(() => {
        uninitializedSpine.updateSegmentPosition(SpineSegment.PELVIS, new Vector3(1, 2, 3));
      }).toThrow('SpineChain not initialized. Call initializeFromPose first.');
      
      expect(() => {
        uninitializedSpine.updateSegmentRotation(SpineSegment.NECK, new Quaternion());
      }).toThrow('SpineChain not initialized. Call initializeFromPose first.');
    });

    it('should propagate rotation to child segments', () => {
      // Get original head position
      const originalState = spineChain.getState();
      const originalHeadPos = originalState.segments.get(SpineSegment.HEAD);
      
      // Rotate neck
      const neckRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
      spineChain.updateSegmentRotation(SpineSegment.NECK, neckRotation);
      
      // Head position should change due to rotation propagation
      const newState = spineChain.getState();
      const newHeadPos = newState.segments.get(SpineSegment.HEAD);
      
      expect(newHeadPos).not.toEqual(originalHeadPos);
    });
  });

  describe('state management', () => {
    it('should reset to uninitialized state', () => {
      spineChain.initializeFromPose(testPose);
      expect(spineChain.isReady()).toBe(true);
      
      spineChain.reset();
      expect(spineChain.isReady()).toBe(false);
    });

    it('should have empty state after reset', () => {
      spineChain.initializeFromPose(testPose);
      spineChain.reset();
      
      const state = spineChain.getState();
      expect(state.segments.size).toBe(0);
      expect(state.rotations.size).toBe(0);
      expect(state.length).toBe(0);
      expect(state.curvature).toBe(0);
      expect(state.twist).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle pose with missing spine joints', () => {
      const incompletePose: any = {
        [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0, confidence: 1 },
        // Missing NECK and head joints
      };
      
      spineChain.initializeFromPose(incompletePose);
      
      // Should still be ready
      expect(spineChain.isReady()).toBe(true);
      
      // State should have segments (with default positions for missing ones)
      const state = spineChain.getState();
      expect(state.segments.size).toBe(5); // All segments should exist
    });

    it('should handle empty pose', () => {
      const emptyPose: any = {};
      
      spineChain.initializeFromPose(emptyPose);
      
      // Should be ready (uses default positions)
      expect(spineChain.isReady()).toBe(true);
      
      // Should have default segment positions
      const state = spineChain.getState();
      expect(state.segments.size).toBe(5);
    });

    it('should generate pose even with missing joints', () => {
      const incompletePose: any = {
        [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0, confidence: 1 },
      };
      
      spineChain.initializeFromPose(incompletePose);
      const generatedPose = spineChain.generatePose();
      
      // Should generate pose with available joints
      expect(generatedPose[Body25Index.MID_HIP]).toBeDefined();
    });
  });
});