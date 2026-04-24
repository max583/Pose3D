// src/lib/experimental/controllers/__tests__/DragAdapter.test.ts
// Тесты для DragAdapter

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragAdapter, DragEvent } from '../DragAdapter';
import { MainControllers, ControllerType } from '../MainControllers';
import { Vector2, Vector3, PerspectiveCamera } from 'three';

// Mock camera for testing
const createMockCamera = () => {
  const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  return camera;
};

describe('DragAdapter', () => {
  let dragAdapter: DragAdapter;
  let mockControllers: MainControllers;
  let mockCamera: PerspectiveCamera;
  const canvasSize = { width: 800, height: 600 };

  beforeEach(() => {
    mockControllers = new MainControllers();
    dragAdapter = new DragAdapter(mockControllers);
    mockCamera = createMockCamera();
    
    // Position the HEAD controller at the origin where the ray will hit it
    // This ensures the findControllerUnderCursor method works in tests
    // We need to bypass constraints for testing, so we directly modify the controller
    const headController = mockControllers.getController(ControllerType.HEAD);
    if (headController) {
      // Directly modify the position to bypass constraints
      headController.position.set(0, 0, 0);
      // Also update the controller in the map to ensure it's the same reference
      // The controller from getController is the actual object in the map,
      // so this modification should work
    }
  });

  describe('initialization', () => {
    it('should create DragAdapter with controllers', () => {
      expect(dragAdapter).toBeDefined();
      expect(dragAdapter).toBeInstanceOf(DragAdapter);
    });

    it('should have default configuration', () => {
      // We can't access private config directly, but we can test through behavior
      const dragEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };

      const result = dragAdapter.handleDragEvent(dragEvent, mockCamera, canvasSize);
      expect(result).toBe(true); // Should handle the event
    });
  });

  describe('handleDragEvent - start', () => {
    it('should start drag on valid controller', () => {
      const dragEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };

      const result = dragAdapter.handleDragEvent(dragEvent, mockCamera, canvasSize);
      expect(result).toBe(true);
    });

    it('should return false for invalid controller', () => {
      const dragEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: 'non-existent-controller',
      };

      const result = dragAdapter.handleDragEvent(dragEvent, mockCamera, canvasSize);
      expect(result).toBe(false);
    });

    it('should return false when already dragging', () => {
      // Start first drag
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      // Try to start another drag
      const secondStartEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.CHEST,
      };
      const result = dragAdapter.handleDragEvent(secondStartEvent, mockCamera, canvasSize);
      expect(result).toBe(false); // Should fail because already dragging
    });
  });

  describe('handleDragEvent - drag', () => {
    it('should handle drag movement', () => {
      // Start drag
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      // Drag movement
      const dragEvent: DragEvent = {
        type: 'drag',
        screenPosition: new Vector2(410, 310),
        controllerId: ControllerType.HEAD,
        delta: new Vector2(10, 10),
      };

      const result = dragAdapter.handleDragEvent(dragEvent, mockCamera, canvasSize);
      expect(result).toBe(true);
    });

    it('should return false when not dragging', () => {
      const dragEvent: DragEvent = {
        type: 'drag',
        screenPosition: new Vector2(410, 310),
        controllerId: ControllerType.HEAD,
        delta: new Vector2(10, 10),
      };

      const result = dragAdapter.handleDragEvent(dragEvent, mockCamera, canvasSize);
      expect(result).toBe(false); // Not started dragging yet
    });

    it('should return false for wrong controller during drag', () => {
      // Start drag on HEAD
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      // Try to drag with different controller
      const dragEvent: DragEvent = {
        type: 'drag',
        screenPosition: new Vector2(410, 310),
        controllerId: ControllerType.CHEST, // Wrong controller
        delta: new Vector2(10, 10),
      };

      const result = dragAdapter.handleDragEvent(dragEvent, mockCamera, canvasSize);
      expect(result).toBe(false);
    });
  });

  describe('handleDragEvent - end', () => {
    it('should end drag successfully', () => {
      // Start drag
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      // End drag
      const endEvent: DragEvent = {
        type: 'end',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };

      const result = dragAdapter.handleDragEvent(endEvent, mockCamera, canvasSize);
      expect(result).toBe(true);
    });

    it('should return false when not dragging', () => {
      const endEvent: DragEvent = {
        type: 'end',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };

      const result = dragAdapter.handleDragEvent(endEvent, mockCamera, canvasSize);
      expect(result).toBe(false); // Not started dragging yet
    });
  });

  describe('drag plane calculation', () => {
    it('should create drag plane for controller', () => {
      // This tests internal logic through public API
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };

      const result = dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);
      expect(result).toBe(true); // Should create drag plane
    });
  });

  describe('screen to world conversion', () => {
    it('should convert screen coordinates to world position', () => {
      // Test through drag behavior
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };

      const result = dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);
      expect(result).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      // We need to test this through behavior since config is private
      // First start a drag to establish baseline
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      // Update config (this should work without errors)
      dragAdapter.updateConfig({ dragSensitivity: 2.0 });
      
      // Try to drag with new sensitivity
      const dragEvent: DragEvent = {
        type: 'drag',
        screenPosition: new Vector2(410, 310),
        controllerId: ControllerType.HEAD,
        delta: new Vector2(10, 10),
      };

      const result = dragAdapter.handleDragEvent(dragEvent, mockCamera, canvasSize);
      expect(result).toBe(true);
    });
  });

  describe('getActiveControllerId', () => {
    it('should return null when not dragging', () => {
      const activeId = dragAdapter.getActiveControllerId();
      expect(activeId).toBeNull();
    });

    it('should return active controller ID when dragging', () => {
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      const activeId = dragAdapter.getActiveControllerId();
      expect(activeId).toBe(ControllerType.HEAD);
    });
  });

  describe('isDraggingNow', () => {
    it('should return false when not dragging', () => {
      const isDragging = dragAdapter.isDraggingNow();
      expect(isDragging).toBe(false);
    });

    it('should return true when dragging', () => {
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      const isDragging = dragAdapter.isDraggingNow();
      expect(isDragging).toBe(true);
    });

    it('should return false after drag ends', () => {
      // Start drag
      const startEvent: DragEvent = {
        type: 'start',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(startEvent, mockCamera, canvasSize);

      // End drag
      const endEvent: DragEvent = {
        type: 'end',
        screenPosition: new Vector2(400, 300),
        controllerId: ControllerType.HEAD,
      };
      dragAdapter.handleDragEvent(endEvent, mockCamera, canvasSize);

      const isDragging = dragAdapter.isDraggingNow();
      expect(isDragging).toBe(false);
    });
  });
});