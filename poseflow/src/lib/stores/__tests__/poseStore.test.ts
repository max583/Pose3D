// src/lib/stores/__tests__/poseStore.test.ts
// Тесты для poseStore

import { describe, it, expect, beforeEach } from 'vitest';
import { usePoseStore, getCurrentPose, isUsingExtendedModel, getActiveController } from '../poseStore';
import { Body25Index, PoseData } from '../../body25/body25-types';
import { Vector3, Quaternion } from 'three';

// Helper to get fresh store state for each test
const getFreshStore = () => {
  usePoseStore.setState(usePoseStore.getInitialState());
  return usePoseStore;
};

const createTestLegacyPose = (): PoseData => {
  const pose: any = {};
  pose[Body25Index.NOSE] = { x: 0, y: 1.7, z: 0, confidence: 1 };
  pose[Body25Index.NECK] = { x: 0, y: 1.6, z: 0, confidence: 1 };
  pose[Body25Index.MID_HIP] = { x: 0, y: 0.9, z: 0, confidence: 1 };
  pose[Body25Index.RIGHT_SHOULDER] = { x: 0.3, y: 1.6, z: 0, confidence: 1 };
  pose[Body25Index.LEFT_SHOULDER] = { x: -0.3, y: 1.6, z: 0, confidence: 1 };
  return pose;
};

const createTestExtendedPose = () => {
  return {
    legacyPose: createTestLegacyPose(),
    spineState: {
      segments: [
        new Vector3(0, 0.9, 0),  // pelvis
        new Vector3(0, 1.1, 0),  // spine_1
        new Vector3(0, 1.3, 0),  // spine_2
        new Vector3(0, 1.5, 0),  // neck
        new Vector3(0, 1.7, 0),  // head
      ],
      curvature: 0.1,
      twist: 0.05,
    },
    skullRotation: new Quaternion(),
    controllerStates: new Map([
      ['head', { id: 'head', position: new Vector3(0, 1.7, 0), rotation: new Quaternion(), isActive: true }],
      ['chest', { id: 'chest', position: new Vector3(0, 1.5, 0), rotation: new Quaternion(), isActive: false }],
    ]),
    version: 1,
    timestamp: Date.now(),
  };
};

describe('poseStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    getFreshStore();
  });

  describe('initial state', () => {
    it('should initialize with legacy model by default', () => {
      const store = getFreshStore();
      const state = store.getState();
      
      expect(state.useExtendedModel).toBe(false);
      expect(state.legacyPose).toBeNull();
      expect(state.extendedPose).toBeNull();
      expect(state.activeControllerId).toBeNull();
    });

    it('should have all action functions', () => {
      const store = getFreshStore();
      const state = store.getState();
      
      expect(typeof state.setUseExtendedModel).toBe('function');
      expect(typeof state.setLegacyPose).toBe('function');
      expect(typeof state.setExtendedPose).toBe('function');
      expect(typeof state.setActiveController).toBe('function');
      expect(typeof state.updateControllerState).toBe('function');
      expect(typeof state.convertToExtended).toBe('function');
      expect(typeof state.convertToLegacy).toBe('function');
      expect(typeof state.syncPoses).toBe('function');
    });
  });

  describe('model switching', () => {
    it('should switch to extended model', () => {
      const store = getFreshStore();
      
      store.getState().setUseExtendedModel(true);
      
      expect(store.getState().useExtendedModel).toBe(true);
    });

    it('should switch back to legacy model', () => {
      const store = getFreshStore();
      
      // Switch to extended
      store.getState().setUseExtendedModel(true);
      expect(store.getState().useExtendedModel).toBe(true);
      
      // Switch back to legacy
      store.getState().setUseExtendedModel(false);
      expect(store.getState().useExtendedModel).toBe(false);
    });
  });

  describe('legacy pose operations', () => {
    it('should set legacy pose', () => {
      const store = getFreshStore();
      const testPose = createTestLegacyPose();
      
      store.getState().setLegacyPose(testPose);
      
      const state = store.getState();
      expect(state.legacyPose).toBeDefined();
      expect(state.legacyPose).toEqual(testPose);
    });

    it('should update legacy pose', () => {
      const store = getFreshStore();
      const testPose1 = createTestLegacyPose();
      const testPose2 = { ...testPose1, [Body25Index.NOSE]: { x: 1, y: 1.8, z: 0, confidence: 1 } };
      
      store.getState().setLegacyPose(testPose1);
      store.getState().setLegacyPose(testPose2);
      
      const state = store.getState();
      expect(state.legacyPose?.[Body25Index.NOSE]?.x).toBe(1);
      expect(state.legacyPose?.[Body25Index.NOSE]?.y).toBe(1.8);
    });
  });

  describe('extended pose operations', () => {
    it('should set extended pose', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      store.getState().setExtendedPose(testExtendedPose);
      
      const state = store.getState();
      expect(state.extendedPose).toBeDefined();
      expect(state.extendedPose?.version).toBe(1);
      expect(state.extendedPose?.spineState.segments).toHaveLength(5);
      expect(state.extendedPose?.controllerStates.size).toBe(2);
    });

    it('should update controller state in extended pose', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      store.getState().setExtendedPose(testExtendedPose);
      
      // Update controller state
      store.getState().updateControllerState('head', {
        position: new Vector3(1, 2, 3),
        rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4),
        isActive: false,
      });
      
      const state = store.getState();
      const headController = state.extendedPose?.controllerStates.get('head');
      expect(headController?.position.x).toBe(1);
      expect(headController?.position.y).toBe(2);
      expect(headController?.position.z).toBe(3);
      expect(headController?.isActive).toBe(false);
    });

    it('should add new controller state', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      store.getState().setExtendedPose(testExtendedPose);
      
      // Add new controller
      store.getState().updateControllerState('pelvis', {
        position: new Vector3(0, 0.9, 0),
        rotation: new Quaternion(),
        isActive: true,
      });
      
      const state = store.getState();
      expect(state.extendedPose?.controllerStates.size).toBe(3);
      expect(state.extendedPose?.controllerStates.has('pelvis')).toBe(true);
    });
  });

  describe('active controller management', () => {
    it('should set active controller', () => {
      const store = getFreshStore();
      
      store.getState().setActiveController('head');
      
      expect(store.getState().activeControllerId).toBe('head');
    });

    it('should clear active controller', () => {
      const store = getFreshStore();
      
      store.getState().setActiveController('head');
      expect(store.getState().activeControllerId).toBe('head');
      
      store.getState().setActiveController(null);
      expect(store.getState().activeControllerId).toBeNull();
    });

    it('should update controller active state when setting active controller', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      store.getState().setExtendedPose(testExtendedPose);
      
      // Initially chest is inactive, head is active
      let headController = store.getState().extendedPose?.controllerStates.get('head');
      let chestController = store.getState().extendedPose?.controllerStates.get('chest');
      expect(headController?.isActive).toBe(true);
      expect(chestController?.isActive).toBe(false);
      
      // Set chest as active
      store.getState().setActiveController('chest');
      
      // Head should be deactivated, chest activated
      headController = store.getState().extendedPose?.controllerStates.get('head');
      chestController = store.getState().extendedPose?.controllerStates.get('chest');
      expect(headController?.isActive).toBe(false);
      expect(chestController?.isActive).toBe(true);
    });
  });

  describe('data model conversion', () => {
    it('should convert legacy pose to extended', () => {
      const store = getFreshStore();
      const testPose = createTestLegacyPose();
      
      store.getState().setLegacyPose(testPose);
      const extendedPose = store.getState().convertToExtended(testPose);
      
      expect(extendedPose).toBeDefined();
      expect(extendedPose.legacyPose).toEqual(testPose);
      expect(extendedPose.spineState.segments).toBeDefined();
      expect(extendedPose.controllerStates).toBeDefined();
    });

    it('should convert extended pose to legacy', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      const legacyPose = store.getState().convertToLegacy(testExtendedPose);
      
      expect(legacyPose).toBeDefined();
      // Legacy pose should be extracted from extended pose
      expect(legacyPose).toEqual(testExtendedPose.legacyPose);
    });
  });

  describe('pose synchronization', () => {
    it('should sync poses when using extended model with legacy pose', () => {
      const store = getFreshStore();
      const testPose = createTestLegacyPose();
      
      store.getState().setLegacyPose(testPose);
      store.getState().setUseExtendedModel(true);
      store.getState().syncPoses();
      
      const state = store.getState();
      expect(state.extendedPose).toBeDefined();
      expect(state.extendedPose?.legacyPose).toEqual(testPose);
    });

    it('should sync poses when using legacy model with extended pose', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      store.getState().setExtendedPose(testExtendedPose);
      store.getState().setUseExtendedModel(false);
      store.getState().syncPoses();
      
      const state = store.getState();
      expect(state.legacyPose).toBeDefined();
      expect(state.legacyPose).toEqual(testExtendedPose.legacyPose);
    });
  });

  describe('exported helper functions', () => {
    it('should get current pose using exported function', () => {
      const store = getFreshStore();
      const testPose = createTestLegacyPose();
      
      store.getState().setLegacyPose(testPose);
      
      const currentPose = getCurrentPose();
      expect(currentPose).toEqual(testPose);
    });

    it('should check if using extended model', () => {
      const store = getFreshStore();
      
      expect(isUsingExtendedModel()).toBe(false);
      
      store.getState().setUseExtendedModel(true);
      expect(isUsingExtendedModel()).toBe(true);
    });

    it('should get active controller', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      store.getState().setExtendedPose(testExtendedPose);
      store.getState().setActiveController('head');
      
      const activeController = getActiveController();
      expect(activeController).toBeDefined();
      expect(activeController?.id).toBe('head');
    });

    it('should return null for active controller when none set', () => {
      const store = getFreshStore();
      
      const activeController = getActiveController();
      expect(activeController).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle setting extended pose when using legacy model', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      // Store should still accept extended pose even when using legacy model
      store.getState().setExtendedPose(testExtendedPose);
      
      expect(store.getState().extendedPose).toBeDefined();
      // Model should not automatically switch
      expect(store.getState().useExtendedModel).toBe(false);
    });

    it('should handle setting legacy pose when using extended model', () => {
      const store = getFreshStore();
      
      // Switch to extended model first
      store.getState().setUseExtendedModel(true);
      
      // Set legacy pose
      const testPose = createTestLegacyPose();
      store.getState().setLegacyPose(testPose);
      
      // Legacy pose should be set, but we're still using extended model
      expect(store.getState().legacyPose).toBeDefined();
      expect(store.getState().useExtendedModel).toBe(true);
    });

    it('should handle updating non-existent controller', () => {
      const store = getFreshStore();
      const testExtendedPose = createTestExtendedPose();
      
      store.getState().setExtendedPose(testExtendedPose);
      
      // Try to update non-existent controller
      store.getState().updateControllerState('non-existent', {
        position: new Vector3(1, 2, 3),
        rotation: new Quaternion(),
        isActive: true,
      });
      
      // Controller should be added
      expect(store.getState().extendedPose?.controllerStates.has('non-existent')).toBe(true);
    });

    it('should handle sync when no pose data exists', () => {
      const store = getFreshStore();
      
      // Should not throw error
      store.getState().syncPoses();
      
      // State should remain unchanged
      expect(store.getState().legacyPose).toBeNull();
      expect(store.getState().extendedPose).toBeNull();
    });
  });
});