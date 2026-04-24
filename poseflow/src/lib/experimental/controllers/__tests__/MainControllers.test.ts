// src/lib/experimental/controllers/__tests__/MainControllers.test.ts
// Тесты для MainControllers

import { describe, it, expect, beforeEach } from 'vitest';
import { MainControllers, ControllerType } from '../MainControllers';
import { Vector3, Quaternion, Color } from 'three';
import { Body25Index } from '../../../body25/body25-types';

describe('MainControllers', () => {
  let controllers: MainControllers;

  beforeEach(() => {
    controllers = new MainControllers();
  });

  describe('initialization', () => {
    it('should create all seven controllers', () => {
      const allControllers = controllers.getAllControllers();
      expect(allControllers).toHaveLength(7);
      
      const controllerTypes = allControllers.map(c => c.type);
      expect(controllerTypes).toContain(ControllerType.HEAD);
      expect(controllerTypes).toContain(ControllerType.CHEST);
      expect(controllerTypes).toContain(ControllerType.PELVIS);
      expect(controllerTypes).toContain(ControllerType.LEFT_HAND);
      expect(controllerTypes).toContain(ControllerType.RIGHT_HAND);
      expect(controllerTypes).toContain(ControllerType.LEFT_FOOT);
      expect(controllerTypes).toContain(ControllerType.RIGHT_FOOT);
    });

    it('should initialize controllers with correct properties', () => {
      const headController = controllers.getControllerByType(ControllerType.HEAD);
      expect(headController).toBeDefined();
      expect(headController?.id).toBe(ControllerType.HEAD);
      expect(headController?.type).toBe(ControllerType.HEAD);
      expect(headController?.position).toBeInstanceOf(Vector3);
      expect(headController?.rotation).toBeInstanceOf(Quaternion);
      expect(headController?.scale).toBeInstanceOf(Vector3);
      expect(headController?.color).toBeInstanceOf(Color);
      expect(headController?.isActive).toBe(false);
      expect(headController?.isVisible).toBe(true);
      expect(headController?.opacity).toBeGreaterThan(0);
      expect(headController?.opacity).toBeLessThanOrEqual(1);
    });

    it('should link correct joints to each controller', () => {
      const headController = controllers.getControllerByType(ControllerType.HEAD);
      expect(headController?.linkedJoints).toEqual([Body25Index.NOSE]);

      const chestController = controllers.getControllerByType(ControllerType.CHEST);
      expect(chestController?.linkedJoints).toEqual([Body25Index.NECK]);
      // CHEST controller is only linked to NECK, not shoulders (based on CONTROLLER_CONFIGS)
    });
  });

  describe('getController', () => {
    it('should return controller by ID', () => {
      const controller = controllers.getController(ControllerType.HEAD);
      expect(controller).toBeDefined();
      expect(controller?.type).toBe(ControllerType.HEAD);
    });

    it('should return null for non-existent controller', () => {
      const controller = controllers.getController('non-existent');
      expect(controller).toBeNull();
    });
  });

  describe('getControllerByType', () => {
    it('should return controller by type', () => {
      const controller = controllers.getControllerByType(ControllerType.HEAD);
      expect(controller).toBeDefined();
      expect(controller?.type).toBe(ControllerType.HEAD);
    });

    it('should return null for non-existent type', () => {
      // @ts-ignore - testing invalid input
      const controller = controllers.getControllerByType('non-existent');
      expect(controller).toBeNull();
    });
  });

  describe('updateController', () => {
    it('should update controller position', () => {
      const newPosition = new Vector3(1, 2, 3);
      const success = controllers.updateController(ControllerType.HEAD, {
        position: newPosition
      });

      expect(success).toBe(true);
      
      const updatedController = controllers.getController(ControllerType.HEAD);
      expect(updatedController?.position.x).toBeCloseTo(1);
      expect(updatedController?.position.y).toBeCloseTo(2);
      // constraints are removed, so z should stay 3
      expect(updatedController?.position.z).toBeCloseTo(3);
    });

    it('should update controller rotation', () => {
      const newRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
      const success = controllers.updateController(ControllerType.HEAD, {
        rotation: newRotation
      });

      expect(success).toBe(true);
      
      const updatedController = controllers.getController(ControllerType.HEAD);
      expect(updatedController?.rotation).toBeDefined();
    });

    it('should apply translation constraints', () => {
      // HEAD controller constraints are removed, position should stay unchanged
      const beyondMaxPosition = new Vector3(0, 5, 0);
      const success = controllers.updateController(ControllerType.HEAD, {
        position: beyondMaxPosition
      });

      expect(success).toBe(true);
      
      const updatedController = controllers.getController(ControllerType.HEAD);
      // Constraints are removed, so Y should stay 5
      expect(updatedController?.position.y).toBeCloseTo(5);
    });

    it('should return false for non-existent controller', () => {
      const success = controllers.updateController('non-existent', {
        position: new Vector3(1, 2, 3)
      });
      expect(success).toBe(false);
    });
  });

  describe('setActiveController', () => {
    it('should set controller as active', () => {
      controllers.setActiveController(ControllerType.HEAD);
      
      const headController = controllers.getController(ControllerType.HEAD);
      expect(headController?.isActive).toBe(true);
    });

    it('should deactivate previous active controller', () => {
      // Activate HEAD
      controllers.setActiveController(ControllerType.HEAD);
      const headController = controllers.getController(ControllerType.HEAD);
      expect(headController?.isActive).toBe(true);

      // Activate CHEST
      controllers.setActiveController(ControllerType.CHEST);
      
      // HEAD should be deactivated
      const updatedHeadController = controllers.getController(ControllerType.HEAD);
      expect(updatedHeadController?.isActive).toBe(false);
      
      // CHEST should be activated
      const chestController = controllers.getController(ControllerType.CHEST);
      expect(chestController?.isActive).toBe(true);
    });

    it('should deactivate all controllers when null is passed', () => {
      // Activate HEAD
      controllers.setActiveController(ControllerType.HEAD);
      
      // Deactivate all
      controllers.setActiveController(null);
      
      const headController = controllers.getController(ControllerType.HEAD);
      expect(headController?.isActive).toBe(false);
    });
  });

  describe('getActiveController', () => {
    it('should return null when no controller is active', () => {
      const activeController = controllers.getActiveController();
      expect(activeController).toBeNull();
    });

    it('should return active controller', () => {
      controllers.setActiveController(ControllerType.HEAD);
      const activeController = controllers.getActiveController();
      expect(activeController).toBeDefined();
      expect(activeController?.type).toBe(ControllerType.HEAD);
    });
  });

  describe('constraints', () => {
    it('should have valid constraint ranges', () => {
      const headController = controllers.getController(ControllerType.HEAD);
      expect(headController?.constraints).toBeDefined();
      
      const { translation, rotation } = headController!.constraints;
      
      // Translation constraints should have min <= max
      expect(translation.min.x).toBeLessThanOrEqual(translation.max.x);
      expect(translation.min.y).toBeLessThanOrEqual(translation.max.y);
      expect(translation.min.z).toBeLessThanOrEqual(translation.max.z);
      
      // Rotation constraints should have min <= max
      expect(rotation.min.x).toBeLessThanOrEqual(rotation.max.x);
      expect(rotation.min.y).toBeLessThanOrEqual(rotation.max.y);
      expect(rotation.min.z).toBeLessThanOrEqual(rotation.max.z);
    });

    it('should apply rotation constraints', () => {
      // Create a rotation beyond constraints (HEAD max rotation is 45 degrees)
      const excessiveRotation = new Quaternion().setFromEuler(
        { x: Math.PI, y: 0, z: 0 } as any // 180 degrees in radians
      );
      
      const success = controllers.updateController(ControllerType.HEAD, {
        rotation: excessiveRotation
      });

      expect(success).toBe(true);
      
      const updatedController = controllers.getController(ControllerType.HEAD);
      expect(updatedController?.rotation).toBeDefined();
    });
  });

  describe('getControllersForJoint', () => {
    it('should return controllers linked to a joint', () => {
      const noseControllers = controllers.getControllersForJoint(Body25Index.NOSE);
      expect(noseControllers).toHaveLength(1);
      expect(noseControllers[0].type).toBe(ControllerType.HEAD);
      
      const neckControllers = controllers.getControllersForJoint(Body25Index.NECK);
      expect(neckControllers).toHaveLength(1);
      expect(neckControllers[0].type).toBe(ControllerType.CHEST);
    });

    it('should return empty array for joint not linked to any controller', () => {
      const controllersForJoint = controllers.getControllersForJoint(Body25Index.LEFT_BIG_TOE);
      expect(controllersForJoint).toHaveLength(0);
    });
  });

  describe('exportState and importState', () => {
    it('should export controller state', () => {
      const state = controllers.exportState();
      expect(state).toBeDefined();
      expect(typeof state).toBe('object');
      expect(state[ControllerType.HEAD]).toBeDefined();
      expect(state[ControllerType.HEAD].position).toBeInstanceOf(Array);
      expect(state[ControllerType.HEAD].rotation).toBeInstanceOf(Array);
    });

    it('should import controller state', () => {
      const originalState = controllers.exportState();
      
      // Modify a controller
      controllers.updateController(ControllerType.HEAD, {
        position: new Vector3(5, 5, 5)
      });
      
      // Import original state back
      controllers.importState(originalState);
      
      const headController = controllers.getController(ControllerType.HEAD);
      expect(headController?.position.x).toBeCloseTo(0); // Back to original position
    });
  });
});