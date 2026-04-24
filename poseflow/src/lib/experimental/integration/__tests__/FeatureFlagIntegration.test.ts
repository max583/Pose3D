// src/lib/experimental/integration/__tests__/FeatureFlagIntegration.test.ts
// Тесты для FeatureFlagIntegration

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FeatureFlagIntegration } from '../FeatureFlagIntegration';
import { FeatureFlagService } from '../../../feature-flags/FeatureFlagService';
import { MainControllers } from '../../controllers/MainControllers';
import { DragAdapter } from '../../controllers/DragAdapter';
import { SkullGroup } from '../../rigid/SkullGroup';
import { SpineChain } from '../../spine/SpineChain';
import { usePoseStore } from '../../../stores/poseStore';
import { PoseData } from '../../../body25/body25-types';

// Mock the dependencies
vi.mock('../../../feature-flags/FeatureFlagService');
vi.mock('../../controllers/MainControllers');
vi.mock('../../controllers/DragAdapter');
vi.mock('../../rigid/SkullGroup');
vi.mock('../../spine/SpineChain');
vi.mock('../../../stores/poseStore');

const createMockFeatureFlagService = (flags: Record<string, boolean> = {}) => {
  const mockService = {
    isEnabled: vi.fn((flagName: string) => flags[flagName] || false),
    enable: vi.fn(),
    disable: vi.fn(),
    getAllFlags: vi.fn(() => flags),
  };
  return mockService as unknown as FeatureFlagService;
};

const createTestPose = (): PoseData => {
  const pose: any = {};
  pose[0] = { x: 0, y: 1.7, z: 0, confidence: 1 }; // NOSE
  pose[1] = { x: 0, y: 1.6, z: 0, confidence: 1 }; // NECK
  pose[8] = { x: 0, y: 0.9, z: 0, confidence: 1 }; // MID_HIP
  return pose;
};

describe('FeatureFlagIntegration', () => {
  let mockFeatureFlagService: FeatureFlagService;
  let mockPoseStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks
    mockFeatureFlagService = createMockFeatureFlagService();
    mockPoseStore = {
      getState: vi.fn(() => ({
        setUseExtendedModel: vi.fn(),
        setLegacyPose: vi.fn(),
      })),
    };
    
    // Setup default mock implementations
    (usePoseStore as any).getState = mockPoseStore.getState;
    (MainControllers as any).mockImplementation(() => ({
      getAllControllers: vi.fn(() => []),
      getActiveController: vi.fn(() => null),
      resetToDefault: vi.fn(),
      exportState: vi.fn(() => ({})),
      importState: vi.fn(),
    }));
    (DragAdapter as any).mockImplementation(() => ({
      handleDragEvent: vi.fn(() => false),
      reset: vi.fn(),
    }));
    (SkullGroup as any).mockImplementation(() => ({
      initializeFromPose: vi.fn(),
      updatePose: vi.fn((pose) => pose),
      isReady: vi.fn(() => false),
      reset: vi.fn(),
      getPivotPosition: vi.fn(() => ({ toArray: () => [0, 0, 0] })),
      getRotation: vi.fn(() => ({ toArray: () => [0, 0, 0, 1] })),
    }));
    (SpineChain as any).mockImplementation(() => ({
      initializeFromPose: vi.fn(),
      isReady: vi.fn(() => false),
      reset: vi.fn(),
      getState: vi.fn(() => ({ length: 0.7, curvature: 0, twist: 0 })),
    }));
  });

  describe('initialization', () => {
    it('should create FeatureFlagIntegration with feature flag service', () => {
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      expect(integration).toBeDefined();
      expect(integration).toBeInstanceOf(FeatureFlagIntegration);
    });

    it('should initialize with all feature flags disabled', () => {
      // All flags disabled by default
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // No components should be created
      expect(MainControllers).not.toHaveBeenCalled();
      expect(DragAdapter).not.toHaveBeenCalled();
      expect(SkullGroup).not.toHaveBeenCalled();
      expect(SpineChain).not.toHaveBeenCalled();
    });

    it('should initialize DesignDoll controllers when flag is enabled', () => {
      // Set up mock to return true for USE_DESIGNDOLL_CONTROLLERS
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_DESIGNDOLL_CONTROLLERS';
      });
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // MainControllers and DragAdapter should be created
      expect(MainControllers).toHaveBeenCalledTimes(1);
      expect(DragAdapter).toHaveBeenCalledTimes(1);
      
      // Other components should not be created
      expect(SkullGroup).not.toHaveBeenCalled();
      expect(SpineChain).not.toHaveBeenCalled();
    });

    it('should initialize rigid skull when flag is enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_RIGID_SKULL';
      });
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // SkullGroup should be created
      expect(SkullGroup).toHaveBeenCalledTimes(1);
      
      // Other components should not be created
      expect(MainControllers).not.toHaveBeenCalled();
      expect(DragAdapter).not.toHaveBeenCalled();
      expect(SpineChain).not.toHaveBeenCalled();
    });

    it('should initialize spine chain when flag is enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_SPINE_CHAIN';
      });
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // SpineChain should be created
      expect(SpineChain).toHaveBeenCalledTimes(1);
      
      // Other components should not be created
      expect(MainControllers).not.toHaveBeenCalled();
      expect(DragAdapter).not.toHaveBeenCalled();
      expect(SkullGroup).not.toHaveBeenCalled();
    });

    it('should enable extended model in pose store when flag is enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_ZUSTAND_STORE';
      });
      
      const mockSetUseExtendedModel = vi.fn();
      mockPoseStore.getState.mockReturnValue({
        setUseExtendedModel: mockSetUseExtendedModel,
      });
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // Should enable extended model in pose store
      expect(mockPoseStore.getState).toHaveBeenCalled();
      expect(mockSetUseExtendedModel).toHaveBeenCalledWith(true);
    });

    it('should initialize all components when all flags are enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation(() => true);
      
      const mockSetUseExtendedModel = vi.fn();
      mockPoseStore.getState.mockReturnValue({
        setUseExtendedModel: mockSetUseExtendedModel,
      });
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // All components should be created
      expect(MainControllers).toHaveBeenCalledTimes(1);
      expect(DragAdapter).toHaveBeenCalledTimes(1);
      expect(SkullGroup).toHaveBeenCalledTimes(1);
      expect(SpineChain).toHaveBeenCalledTimes(1);
      
      // Extended model should be enabled
      expect(mockSetUseExtendedModel).toHaveBeenCalledWith(true);
    });
  });

  describe('pose updates', () => {
    it('should update pose with Phase 2 features when flags are enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_RIGID_SKULL' ||
               flagName === 'USE_SPINE_CHAIN' ||
               flagName === 'USE_ZUSTAND_STORE';
      });
      
      // Mock component methods
      const mockSkullGroup = {
        initializeFromPose: vi.fn(),
        updatePose: vi.fn((pose) => ({ ...pose, [0]: { x: 0, y: 1.8, z: 0, confidence: 1 } })), // Modified pose
        isReady: vi.fn(() => false),
      };
      const mockSpineChain = {
        initializeFromPose: vi.fn(),
        isReady: vi.fn(() => false),
        generatePose: vi.fn(() => createTestPose()), // Return test pose instead of empty object
      };
      
      (SkullGroup as any).mockImplementation(() => mockSkullGroup);
      (SpineChain as any).mockImplementation(() => mockSpineChain);
      
      const mockSetLegacyPose = vi.fn();
      const mockSetUseExtendedModel = vi.fn();
      mockPoseStore.getState.mockReturnValue({
        setLegacyPose: mockSetLegacyPose,
        setUseExtendedModel: mockSetUseExtendedModel,
      });
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const testPose = createTestPose();
      const updatedPose = integration.updatePoseWithPhase2Features(testPose);
      
      // Should initialize skull group if not ready
      expect(mockSkullGroup.isReady).toHaveBeenCalled();
      expect(mockSkullGroup.initializeFromPose).toHaveBeenCalledWith(testPose);
      
      // Should update pose with skull group
      expect(mockSkullGroup.updatePose).toHaveBeenCalledWith(testPose);
      
      // Should update pose store
      expect(mockSetLegacyPose).toHaveBeenCalled();
      
      // Should return updated pose
      expect(updatedPose).toBeDefined();
      expect(updatedPose[0].y).toBe(1.8); // Check modified value
    });

    it('should return original pose when no Phase 2 features are enabled', () => {
      // All flags disabled
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const testPose = createTestPose();
      const updatedPose = integration.updatePoseWithPhase2Features(testPose);
      
      // Should return original pose unchanged
      expect(updatedPose).toStrictEqual(testPose);
    });

    it('should handle pose update with only rigid skull enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_RIGID_SKULL';
      });
      
      const mockSkullGroup = {
        initializeFromPose: vi.fn(),
        updatePose: vi.fn((pose) => pose),
        isReady: vi.fn(() => true), // Already ready
      };
      
      (SkullGroup as any).mockImplementation(() => mockSkullGroup);
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const testPose = createTestPose();
      const updatedPose = integration.updatePoseWithPhase2Features(testPose);
      
      // Should not initialize if already ready
      expect(mockSkullGroup.isReady).toHaveBeenCalled();
      expect(mockSkullGroup.initializeFromPose).not.toHaveBeenCalled();
      
      // Should update pose with skull group
      expect(mockSkullGroup.updatePose).toHaveBeenCalledWith(testPose);
      
      // Should return a pose
      expect(updatedPose).toBeDefined();
    });
  });

  describe('drag event handling', () => {
    it('should handle drag events when DesignDoll controllers are enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_DESIGNDOLL_CONTROLLERS';
      });
      
      const mockDragAdapter = {
        handleDragEvent: vi.fn(() => true),
      };
      
      (DragAdapter as any).mockImplementation(() => mockDragAdapter);
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const mockDragEvent = { type: 'start', screenPosition: { x: 100, y: 100 }, controllerId: 'head' };
      const mockCamera = {};
      const canvasSize = { width: 800, height: 600 };
      
      const result = integration.handleDragEvent(mockDragEvent as any, mockCamera as any, canvasSize);
      
      // Should delegate to drag adapter
      expect(mockDragAdapter.handleDragEvent).toHaveBeenCalledWith(mockDragEvent, mockCamera, canvasSize);
      expect(result).toBe(true);
    });

    it('should return false for drag events when DesignDoll controllers are disabled', () => {
      // All flags disabled
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const mockDragEvent = { type: 'start', screenPosition: { x: 100, y: 100 }, controllerId: 'head' };
      const mockCamera = {};
      const canvasSize = { width: 800, height: 600 };
      
      const result = integration.handleDragEvent(mockDragEvent as any, mockCamera as any, canvasSize);
      
      // Should return false when no drag adapter
      expect(result).toBe(false);
    });
  });

  describe('component accessors', () => {
    it('should get controllers for display when DesignDoll controllers are enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_DESIGNDOLL_CONTROLLERS';
      });
      
      const mockControllers = [{ id: 'head', type: 'head' }];
      const mockMainControllers = {
        getAllControllers: vi.fn(() => mockControllers),
      };
      
      (MainControllers as any).mockImplementation(() => mockMainControllers);
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const controllers = integration.getControllersForDisplay();
      
      // Should return controllers
      expect(controllers).toBe(mockControllers);
      expect(mockMainControllers.getAllControllers).toHaveBeenCalled();
    });

    it('should return empty array for controllers when DesignDoll controllers are disabled', () => {
      // All flags disabled
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const controllers = integration.getControllersForDisplay();
      
      // Should return empty array
      expect(controllers).toEqual([]);
    });

    it('should get active controller when DesignDoll controllers are enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation((flagName: string) => {
        return flagName === 'USE_DESIGNDOLL_CONTROLLERS';
      });
      
      const mockController = { id: 'head', type: 'head', isActive: true };
      const mockMainControllers = {
        getActiveController: vi.fn(() => mockController),
      };
      
      (MainControllers as any).mockImplementation(() => mockMainControllers);
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const activeController = integration.getActiveController();
      
      // Should return active controller
      expect(activeController).toBe(mockController);
      expect(mockMainControllers.getActiveController).toHaveBeenCalled();
    });

    it('should return null for active controller when DesignDoll controllers are disabled', () => {
      // All flags disabled
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const activeController = integration.getActiveController();
      
      // Should return null
      expect(activeController).toBeNull();
    });

    it('should get component instances when flags are enabled', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation(() => true);
      
      const mockMainControllers = {};
      const mockDragAdapter = {};
      const mockSkullGroup = {};
      const mockSpineChain = {};
      
      (MainControllers as any).mockImplementation(() => mockMainControllers);
      (DragAdapter as any).mockImplementation(() => mockDragAdapter);
      (SkullGroup as any).mockImplementation(() => mockSkullGroup);
      (SpineChain as any).mockImplementation(() => mockSpineChain);
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // Should return component instances
      expect(integration.getMainControllers()).toBe(mockMainControllers);
      expect(integration.getDragAdapter()).toBe(mockDragAdapter);
      expect(integration.getSkullGroup()).toBe(mockSkullGroup);
      expect(integration.getSpineChain()).toBe(mockSpineChain);
    });

    it('should return null for component instances when flags are disabled', () => {
      // All flags disabled
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // Should return null for all components
      expect(integration.getMainControllers()).toBeNull();
      expect(integration.getDragAdapter()).toBeNull();
      expect(integration.getSkullGroup()).toBeNull();
      expect(integration.getSpineChain()).toBeNull();
    });
  });

  describe('feature flag checks', () => {
    it('should check if DesignDoll controllers are enabled', () => {
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      
      // Mock feature flag check
      (mockFeatureFlagService.isEnabled as Mock).mockReturnValueOnce(true);
      const isEnabled = integration.isDesignDollControllersEnabled();
      
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('USE_DESIGNDOLL_CONTROLLERS');
      expect(isEnabled).toBe(true);
    });

    it('should check if rigid skull is enabled', () => {
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      
      (mockFeatureFlagService.isEnabled as Mock).mockReturnValueOnce(false);
      const isEnabled = integration.isRigidSkullEnabled();
      
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('USE_RIGID_SKULL');
      expect(isEnabled).toBe(false);
    });

    it('should check if spine chain is enabled', () => {
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      
      (mockFeatureFlagService.isEnabled as Mock).mockReturnValueOnce(true);
      const isEnabled = integration.isSpineChainEnabled();
      
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('USE_SPINE_CHAIN');
      expect(isEnabled).toBe(true);
    });

    it('should check if extended model is enabled', () => {
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      
      (mockFeatureFlagService.isEnabled as Mock).mockReturnValueOnce(false);
      const isEnabled = integration.isExtendedModelEnabled();
      
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('USE_ZUSTAND_STORE');
      expect(isEnabled).toBe(false);
    });

    it('should check if fixed lengths are enabled', () => {
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      
      (mockFeatureFlagService.isEnabled as Mock).mockReturnValueOnce(true);
      const isEnabled = integration.isFixedLengthsEnabled();
      
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('USE_FIXED_LENGTHS');
      expect(isEnabled).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all initialized components', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation(() => true);
      
      // Mock component reset methods
      const mockMainControllers = {
        resetToDefault: vi.fn(),
      };
      const mockDragAdapter = {
        reset: vi.fn(),
      };
      const mockSkullGroup = {
        reset: vi.fn(),
      };
      const mockSpineChain = {
        reset: vi.fn(),
      };
      
      (MainControllers as any).mockImplementation(() => mockMainControllers);
      (DragAdapter as any).mockImplementation(() => mockDragAdapter);
      (SkullGroup as any).mockImplementation(() => mockSkullGroup);
      (SpineChain as any).mockImplementation(() => mockSpineChain);
      
      const mockSetUseExtendedModel = vi.fn();
      mockPoseStore.getState.mockReturnValue({
        setUseExtendedModel: mockSetUseExtendedModel,
      });
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      integration.reset();
      
      // Should call reset methods on components
      expect(mockMainControllers.resetToDefault).toHaveBeenCalled();
      expect(mockDragAdapter.reset).toHaveBeenCalled();
      expect(mockSkullGroup.reset).toHaveBeenCalled();
      expect(mockSpineChain.reset).toHaveBeenCalled();
      
      // Should disable extended model in pose store
      expect(mockSetUseExtendedModel).toHaveBeenCalledWith(false);
    });

    it('should handle reset when no components are initialized', () => {
      // All flags disabled
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      // Should not throw error
      expect(() => integration.reset()).not.toThrow();
    });
  });

  describe('state export/import', () => {
    it('should export state of all components', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation(() => true);
      
      const mockMainControllers = {
        exportState: vi.fn(() => ({ head: { position: [0, 1.7, 0] } })),
      };
      const mockSkullGroup = {
        getPivotPosition: vi.fn(() => ({ toArray: () => [0, 1.6, 0] })),
        getRotation: vi.fn(() => ({ toArray: () => [0, 0, 0, 1] })),
      };
      const mockSpineChain = {
        getState: vi.fn(() => ({ length: 0.7, curvature: 0.1, twist: 0.05 })),
      };
      
      (MainControllers as any).mockImplementation(() => mockMainControllers);
      (SkullGroup as any).mockImplementation(() => mockSkullGroup);
      (SpineChain as any).mockImplementation(() => mockSpineChain);
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const state = integration.exportState();
      
      // Should include feature flags
      expect(state.featureFlags).toBeDefined();
      expect(state.featureFlags.designDollControllers).toBe(true);
      expect(state.featureFlags.rigidSkull).toBe(true);
      expect(state.featureFlags.spineChain).toBe(true);
      expect(state.featureFlags.extendedModel).toBe(true);
      expect(state.featureFlags.fixedLengths).toBe(true);
      
      // Should include component states
      expect(state.controllers).toBeDefined();
      expect(state.skullGroup).toBeDefined();
      expect(state.spineChain).toBeDefined();
      
      // Should call component export methods
      expect(mockMainControllers.exportState).toHaveBeenCalled();
      expect(mockSkullGroup.getPivotPosition).toHaveBeenCalled();
      expect(mockSkullGroup.getRotation).toHaveBeenCalled();
      expect(mockSpineChain.getState).toHaveBeenCalled();
    });

    it('should import state into components', () => {
      (mockFeatureFlagService.isEnabled as Mock).mockImplementation(() => true);
      
      const mockMainControllers = {
        importState: vi.fn(),
      };
      
      (MainControllers as any).mockImplementation(() => mockMainControllers);
      
      const integration = new FeatureFlagIntegration(mockFeatureFlagService);
      integration.initialize();
      
      const state = {
        featureFlags: {
          designDollControllers: true,
          rigidSkull: true,
          spineChain: true,
          extendedModel: true,
          fixedLengths: true,
        },
        controllers: { head: { position: [0, 1.7, 0] } },
        skullGroup: {
          pivotPosition: [0, 1.6, 0],
          rotation: [0, 0, 0, 1],
        },
        spineChain: {
          length: 0.7,
          curvature: 0.1,
          twist: 0.05,
        },
      };
      
      integration.importState(state);
      
      // Should import controller state
      expect(mockMainControllers.importState).toHaveBeenCalledWith(state.controllers);
      
      // Note: skullGroup and spineChain import not implemented yet
      // This test verifies the current implementation
    });
  });
});