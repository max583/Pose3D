// src/__tests__/baseline-regression.spec.ts
// Baseline тесты для регрессии - гарантируют стабильность ключевых функций

import { describe, it, expect, beforeEach } from 'vitest';
import { PoseService } from '../services/PoseService';
import { RigService } from '../services/RigService';
import { SkeletonGraph } from '../lib/body25/SkeletonGraph';
import { solveFABRIK } from '../lib/solvers/FABRIKSolver';
import { Body25Index, JointPosition } from '../lib/body25/body25-types';
import { UndoStack } from '../lib/UndoStack';
import { createTPose } from '../lib/presets/body25-presets';
import { Vector3 } from 'three';

describe('Baseline Regression Tests', () => {
  describe('Core Pose Operations', () => {
    let poseService: PoseService;
    
    beforeEach(() => {
      poseService = new PoseService(new RigService());
    });
    
    it('should initialize with T-pose containing 25 joints', () => {
      const pose = poseService.getPoseData();
      expect(Object.keys(pose).length).toBe(25);
      // Проверяем что MID_HIP находится на ожидаемой высоте
      expect(pose[Body25Index.MID_HIP].y).toBeCloseTo(0.9, 0.1);
    });
    
    it('should translate all joints correctly', () => {
      const before = poseService.getPoseData()[Body25Index.NOSE];
      poseService.translate(0.5, -0.3, 0.2);
      const after = poseService.getPoseData()[Body25Index.NOSE];
      
      expect(after.x).toBeCloseTo(before.x + 0.5, 0.001);
      expect(after.y).toBeCloseTo(before.y - 0.3, 0.001);
      expect(after.z).toBeCloseTo(before.z + 0.2, 0.001);
    });
    
    it('should support undo/redo operations', () => {
      const originalPose = { ...poseService.getPoseData()[Body25Index.NOSE] };
      
      // Изменение
      poseService.translate(1, 0, 0);
      expect(poseService.canUndo).toBe(true);
      
      // Отмена
      poseService.undo();
      const afterUndo = poseService.getPoseData()[Body25Index.NOSE];
      expect(afterUndo.x).toBeCloseTo(originalPose.x, 0.001);
      
      // Повтор
      poseService.redo();
      const afterRedo = poseService.getPoseData()[Body25Index.NOSE];
      expect(afterRedo.x).toBeCloseTo(originalPose.x + 1, 0.001);
    });
    
    it('should mirror pose correctly', () => {
      const rightShoulderBefore = poseService.getPoseData()[Body25Index.RIGHT_SHOULDER];
      const leftShoulderBefore = poseService.getPoseData()[Body25Index.LEFT_SHOULDER];
      
      poseService.mirrorPose();
      
      const rightShoulderAfter = poseService.getPoseData()[Body25Index.RIGHT_SHOULDER];
      const leftShoulderAfter = poseService.getPoseData()[Body25Index.LEFT_SHOULDER];
      
      // Проверка симметрии
      expect(rightShoulderAfter.x).toBeCloseTo(-leftShoulderBefore.x, 0.001);
      expect(leftShoulderAfter.x).toBeCloseTo(-rightShoulderBefore.x, 0.001);
      // Y и Z координаты должны остаться неизменными
      expect(rightShoulderAfter.y).toBeCloseTo(leftShoulderBefore.y, 0.001);
      expect(leftShoulderAfter.y).toBeCloseTo(rightShoulderBefore.y, 0.001);
    });
    
    it('should scale pose correctly', () => {
      const noseBefore = poseService.getPoseData()[Body25Index.NOSE];
      const scaleFactor = 1.5;
      
      poseService.scale(scaleFactor);
      
      const noseAfter = poseService.getPoseData()[Body25Index.NOSE];
      
      expect(noseAfter.x).toBeCloseTo(noseBefore.x * scaleFactor, 0.001);
      expect(noseAfter.y).toBeCloseTo(noseBefore.y * scaleFactor, 0.001);
      expect(noseAfter.z).toBeCloseTo(noseBefore.z * scaleFactor, 0.001);
    });
  });
  
  describe('Skeleton Graph Operations', () => {
    it('should compute bone lengths correctly', () => {
      const pose = createTPose();
      const graph = new SkeletonGraph();
      graph.computeBoneLengths(pose);
      
      // Проверяем длину кости между плечом и локтем
      const shoulderToElbow = graph.getBoneLength(Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW);
      expect(shoulderToElbow).toBeGreaterThan(0);
      expect(shoulderToElbow).toBeLessThan(1.0);
      
      // Симметричные кости должны иметь одинаковую длину
      const leftShoulderToElbow = graph.getBoneLength(Body25Index.LEFT_SHOULDER, Body25Index.LEFT_ELBOW);
      expect(shoulderToElbow).toBeCloseTo(leftShoulderToElbow, 0.001);
    });
    
    it('should find kinematic chains correctly', () => {
      const pose = createTPose();
      const graph = new SkeletonGraph();
      graph.computeBoneLengths(pose);
      
      // Цепь от корпуса до правой кисти (from ancestor to descendant)
      const chain = graph.getChain(Body25Index.MID_HIP, Body25Index.RIGHT_WRIST);
      expect(chain.length).toBeGreaterThan(2);
      expect(chain).toContain(Body25Index.RIGHT_WRIST);
      expect(chain).toContain(Body25Index.RIGHT_ELBOW);
      expect(chain).toContain(Body25Index.RIGHT_SHOULDER);
      expect(chain).toContain(Body25Index.MID_HIP);
    });
  });
  
  describe('FABRIK Solver', () => {
    it('should solve simple chain correctly', () => {
      // Простая цепь из 3 точек
      const chain: Vector3[] = [
        new Vector3(0, 0, 0),
        new Vector3(0, 1, 0),
        new Vector3(0, 2, 0)
      ];
      const target = new Vector3(1, 1, 0);
      const lengths = [1.0, 1.0];
      
      const result = solveFABRIK({
        chain,
        target,
        boneLengths: lengths,
        iterations: 10,
        tolerance: 0.01
      });
      
      expect(result.reached).toBe(true);
      // Последняя точка должна быть близка к цели
      const lastPoint = result.chain[result.chain.length - 1];
      expect(lastPoint.x).toBeCloseTo(target.x, 0.1);
      expect(lastPoint.y).toBeCloseTo(target.y, 0.1);
      expect(lastPoint.z).toBeCloseTo(target.z, 0.1);
    });
    
    it('should respect bone length constraints', () => {
      const chain: Vector3[] = [
        new Vector3(0, 0, 0),
        new Vector3(0, 1, 0),
        new Vector3(0, 2, 0)
      ];
      const originalLengths = [1.0, 1.0];
      const target = new Vector3(2, 2, 0);
      
      const result = solveFABRIK({
        chain,
        target,
        boneLengths: originalLengths,
        iterations: 20,
        tolerance: 0.001
      });
      
      // Проверяем что длины костей сохранились
      const dx1 = result.chain[1].x - result.chain[0].x;
      const dy1 = result.chain[1].y - result.chain[0].y;
      const dz1 = result.chain[1].z - result.chain[0].z;
      const length1 = Math.sqrt(dx1*dx1 + dy1*dy1 + dz1*dz1);
      expect(length1).toBeCloseTo(originalLengths[0], 0.01);
      
      const dx2 = result.chain[2].x - result.chain[1].x;
      const dy2 = result.chain[2].y - result.chain[1].y;
      const dz2 = result.chain[2].z - result.chain[1].z;
      const length2 = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);
      expect(length2).toBeCloseTo(originalLengths[1], 0.01);
    });
  });
  
  describe('UndoStack', () => {
    it('should push and pop states correctly', () => {
      const stack = new UndoStack<string>(3);
      
      stack.push('state1');
      stack.push('state2');
      
      expect(stack.canUndo).toBe(true);
      // undo возвращает последнее сохраненное состояние ('state2')
      // и сохраняет текущее состояние ('current') в redo стек
      expect(stack.undo('current')).toBe('state2');
      expect(stack.canRedo).toBe(true);
      // redo возвращает состояние из redo стека ('current')
      expect(stack.redo('state1')).toBe('current');
    });
    
    it('should respect max size limit', () => {
      const stack = new UndoStack<number>(2);
      
      stack.push(1);
      stack.push(2);
      stack.push(3); // Должен вытеснить 1, оставляя [2,3]
      
      // undo возвращает последнее состояние (3)
      expect(stack.undo(99)).toBe(3);
      // еще один undo возвращает 2
      expect(stack.undo(98)).toBe(2);
      // больше нет состояний
      expect(stack.undo(97)).toBeNull();
    });
  });
  
  describe('Integration: PoseService + SkeletonGraph', () => {
    it('should maintain bone lengths after pose translation', () => {
      const poseService = new PoseService(new RigService());
      const pose = poseService.getPoseData();
      const graph = new SkeletonGraph();
      graph.computeBoneLengths(pose);
      
      // Запоминаем исходные длины
      const originalLengths = new Map<string, number>();
      const connections = [
        [Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW],
        [Body25Index.RIGHT_ELBOW, Body25Index.RIGHT_WRIST],
        [Body25Index.LEFT_SHOULDER, Body25Index.LEFT_ELBOW],
        [Body25Index.LEFT_HIP, Body25Index.LEFT_KNEE]
      ];
      
      connections.forEach(([a, b]) => {
        originalLengths.set(`${a}-${b}`, graph.getBoneLength(a, b));
      });
      
      // Применяем трансляцию
      poseService.translate(0.5, 0.3, -0.2);
      const newPose = poseService.getPoseData();
      const newGraph = new SkeletonGraph();
      newGraph.computeBoneLengths(newPose);
      
      // Длины костей должны остаться неизменными
      connections.forEach(([a, b]) => {
        const newLength = newGraph.getBoneLength(a, b);
        const originalLength = originalLengths.get(`${a}-${b}`)!;
        expect(newLength).toBeCloseTo(originalLength, 0.001);
      });
    });
  });
});