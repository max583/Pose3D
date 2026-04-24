// src/lib/experimental/fixed-length/FixedLengthSolver.ts
// Прототип решателя с фиксированными длинами костей

import { Body25Index, JointPosition, PoseData } from '../../body25/body25-types';
import { Vector3 } from 'three';
import { SkeletonGraph } from '../../body25/SkeletonGraph';
import { BODY25_CONNECTIONS } from '../../body25/body25-connections';
import { getIKChainForJoint, IK_END_EFFECTORS } from '../../body25/IKChains';

/**
 * Решатель, который сохраняет фиксированные длины костей при манипуляциях
 */
export class FixedLengthSolver {
  private boneLengths: Map<string, number> = new Map();
  private graph: SkeletonGraph;
  
  constructor() {
    this.graph = new SkeletonGraph();
  }
  
  /**
   * Получить ключ для кости (упорядоченный)
   */
  private getBoneKey(from: Body25Index, to: Body25Index): string {
    return from < to ? `${from}-${to}` : `${to}-${from}`;
  }
  
  /**
   * Вычислить и сохранить длины костей из позы
   */
  computeBoneLengths(pose: PoseData): void {
    this.graph.computeBoneLengths(pose);
    
    // Сохраняем длины для всех костей
    for (const connection of BODY25_CONNECTIONS) {
      const from = connection.from;
      const to = connection.to;
      const fromPos = pose[from];
      const toPos = pose[to];
      
      if (fromPos && toPos) {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dz = toPos.z - fromPos.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const key = this.getBoneKey(from, to);
        this.boneLengths.set(key, length);
      }
    }
  }
  
  /**
   * Получить сохраненную длину кости
   */
  getBoneLength(from: Body25Index, to: Body25Index): number | undefined {
    const key = this.getBoneKey(from, to);
    return this.boneLengths.get(key);
  }
  
  /**
   * Получить все кости, связанные с суставом
   */
  private getConnectedBones(joint: Body25Index): Array<[Body25Index, Body25Index]> {
    const connected: Array<[Body25Index, Body25Index]> = [];
    
    for (const connection of BODY25_CONNECTIONS) {
      const from = connection.from;
      const to = connection.to;
      if (from === joint || to === joint) {
        connected.push([from, to]);
      }
    }
    
    return connected;
  }
  
  /**
   * Применить ограничение длины к кости
   */
  private applyBoneConstraint(
    from: Body25Index,
    to: Body25Index,
    pose: PoseData
  ): void {
    const key = this.getBoneKey(from, to);
    const targetLength = this.boneLengths.get(key);
    
    if (!targetLength || targetLength <= 0) {
      return;
    }
    
    const fromPos = pose[from];
    const toPos = pose[to];
    
    if (!fromPos || !toPos) {
      return;
    }
    
    // Вычисляем текущий вектор и длину
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const dz = toPos.z - fromPos.z;
    const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (currentLength <= 0) {
      return;
    }
    
    // Масштабируем вектор до целевой длины
    const scale = targetLength / currentLength;
    
    // Обновляем позицию 'to' сустава
    pose[to] = {
      x: fromPos.x + dx * scale,
      y: fromPos.y + dy * scale,
      z: fromPos.z + dz * scale,
      confidence: toPos.confidence
    };
  }
  
  /**
   * Применить drag к суставу с сохранением длин костей
   */
  applyDrag(
    draggedJoint: Body25Index,
    targetPosition: Vector3,
    pose: PoseData
  ): PoseData {
    // Проверяем, является ли dragged сустав промежуточным в IK-цепи
    const chain = getIKChainForJoint(draggedJoint);
    
    if (chain && !IK_END_EFFECTORS.has(draggedJoint)) {
      // Dragged сустав является промежуточным (например, локоть, колено)
      // Для цепочек из 3 суставов используем applySimpleDrag, который работает лучше
      if (chain.joints.length === 3) {
        return this.applySimpleDrag(draggedJoint, targetPosition, pose);
      } else {
        return this.applyIntermediateJointDrag(draggedJoint, targetPosition, pose, chain);
      }
    } else {
      // Dragged сустав является end effector или не входит в IK-цепь
      return this.applyEndpointDrag(draggedJoint, targetPosition, pose);
    }
  }

  /**
   * Применить drag к end effector или суставу вне IK-цепи
   */
  private applyEndpointDrag(
    draggedJoint: Body25Index,
    targetPosition: Vector3,
    pose: PoseData
  ): PoseData {
    // Проверяем, является ли dragged сустав end effector в IK-цепи
    const chain = getIKChainForJoint(draggedJoint);
    
    if (chain && IK_END_EFFECTORS.has(draggedJoint)) {
      // Dragged сустав является end effector в IK-цепи
      // Используем solveIKWithFixedLengths для всей цепи
      return this.solveIKWithFixedLengths(chain.joints, targetPosition, pose);
    } else {
      // Dragged сустав не входит в IK-цепь или не является end effector
      // Используем оригинальную логику (для одиночных костей)
      return this.applySimpleDrag(draggedJoint, targetPosition, pose);
    }
  }

  /**
   * Применить drag к суставу вне IK-цепи (простая логика для одиночных костей)
   */
  private applySimpleDrag(
    draggedJoint: Body25Index,
    targetPosition: Vector3,
    pose: PoseData
  ): PoseData {
    // Копируем позу для модификации
    const newPose = { ...pose };
    
    // Обновляем позицию dragged сустава
    newPose[draggedJoint] = {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      confidence: 1.0
    };
    
    // Итеративное применение constraints для сходимости
    const MAX_ITERATIONS = 10;
    const TOLERANCE = 0.001;
    
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let maxError = 0;
      
      // Проходим по всем костям и применяем constraints
      for (const connection of BODY25_CONNECTIONS) {
        const from = connection.from;
        const to = connection.to;
        
        // Пропускаем кости, не связанные с dragged суставом (для производительности)
        if (from !== draggedJoint && to !== draggedJoint) {
          continue;
        }
        
        const key = this.getBoneKey(from, to);
        const targetLength = this.boneLengths.get(key);
        
        if (!targetLength || targetLength <= 0) {
          continue;
        }
        
        const fromPos = newPose[from];
        const toPos = newPose[to];
        
        if (!fromPos || !toPos) {
          continue;
        }
        
        // Вычисляем текущий вектор и длину
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dz = toPos.z - fromPos.z;
        const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (currentLength <= 0) {
          continue;
        }
        
        const error = Math.abs(currentLength - targetLength);
        maxError = Math.max(maxError, error);
        
        // Масштабируем вектор до целевой длины
        const scale = targetLength / currentLength;
        
        // Определяем какой сустав можно двигать
        // Если dragged сустав - from, двигаем to
        // Если dragged сустав - to, двигаем from
        // Если оба не dragged, пропускаем
        if (from === draggedJoint) {
          // Двигаем to сустав
          newPose[to] = {
            x: fromPos.x + dx * scale,
            y: fromPos.y + dy * scale,
            z: fromPos.z + dz * scale,
            confidence: toPos.confidence
          };
        } else if (to === draggedJoint) {
          // Двигаем from сустав
          newPose[from] = {
            x: toPos.x - dx * scale,
            y: toPos.y - dy * scale,
            z: toPos.z - dz * scale,
            confidence: fromPos.confidence
          };
        }
      }
      
      // Проверяем сходимость
      if (maxError < TOLERANCE) {
        break;
      }
    }
    
    return newPose;
  }

  /**
   * Применить drag к промежуточному суставу в IK-цепи
   */
  private applyIntermediateJointDrag(
    draggedJoint: Body25Index,
    targetPosition: Vector3,
    pose: PoseData,
    chain: import('../../body25/IKChains').IKChainDef
  ): PoseData {
    // Находим индекс dragged сустава в цепи
    const jointIndex = chain.joints.indexOf(draggedJoint);
    if (jointIndex === -1 || jointIndex === 0 || jointIndex === chain.joints.length - 1) {
      // Если сустав не найден в цепи или является первым/последним, используем endpoint логику
      return this.applyEndpointDrag(draggedJoint, targetPosition, pose);
    }
    
    // Используем итеративный алгоритм, похожий на applySimpleDrag, но для всей цепи
    const MAX_ITERATIONS = 50;
    const TOLERANCE = 0.001;
    const ATTRACTION_FACTOR = 0.5; // Насколько сильно dragged сустав притягивается к target
    
    // Копируем позу для модификации
    let newPose = { ...pose };
    
    // Итеративно настраиваем все суставы в цепи
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let maxError = 0;
      
      // Шаг 1: Притягиваем dragged сустав к target позиции (но не полностью)
      const draggedPos = newPose[draggedJoint];
      const dxTarget = targetPosition.x - draggedPos.x;
      const dyTarget = targetPosition.y - draggedPos.y;
      const dzTarget = targetPosition.z - draggedPos.z;
      
      // Мягко притягиваем dragged сустав к target
      newPose[draggedJoint] = {
        x: draggedPos.x + dxTarget * ATTRACTION_FACTOR,
        y: draggedPos.y + dyTarget * ATTRACTION_FACTOR,
        z: draggedPos.z + dzTarget * ATTRACTION_FACTOR,
        confidence: draggedPos.confidence
      };
      
      // Шаг 2: Настраиваем суставы перед dragged суставом (от root к dragged)
      for (let i = jointIndex - 1; i >= 0; i--) {
        const current = chain.joints[i];
        const next = chain.joints[i + 1];
        
        const targetLength = this.getBoneLength(current, next);
        if (!targetLength) {
          continue;
        }
        
        const nextPos = newPose[next as Body25Index];
        const currentPos = newPose[current as Body25Index];
        
        if (!nextPos || !currentPos) {
          continue;
        }
        
        // Вычисляем направление от current к next
        const dx = nextPos.x - currentPos.x;
        const dy = nextPos.y - currentPos.y;
        const dz = nextPos.z - currentPos.z;
        const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (currentLength <= 0) {
          continue;
        }
        
        // Вычисляем ошибку длины
        const error = Math.abs(currentLength - targetLength);
        maxError = Math.max(maxError, error);
        
        // Масштабируем до целевой длины
        const scale = targetLength / currentLength;
        
        // Обновляем позицию current сустава, чтобы сохранить длину кости
        // Двигаем current сустав к next суставу
        newPose[current as Body25Index] = {
          x: nextPos.x - dx * scale,
          y: nextPos.y - dy * scale,
          z: nextPos.z - dz * scale,
          confidence: currentPos.confidence
        };
      }
      
      // Шаг 3: Настраиваем суставы после dragged сустава (от dragged к end effector)
      for (let i = jointIndex + 1; i < chain.joints.length; i++) {
        const prev = chain.joints[i - 1];
        const current = chain.joints[i];
        
        const targetLength = this.getBoneLength(prev, current);
        if (!targetLength) {
          continue;
        }
        
        const prevPos = newPose[prev as Body25Index];
        const currentPos = newPose[current as Body25Index];
        
        if (!prevPos || !currentPos) {
          continue;
        }
        
        // Вычисляем направление от prev к current
        const dx = currentPos.x - prevPos.x;
        const dy = currentPos.y - prevPos.y;
        const dz = currentPos.z - prevPos.z;
        const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (currentLength <= 0) {
          continue;
        }
        
        // Вычисляем ошибку длины
        const error = Math.abs(currentLength - targetLength);
        maxError = Math.max(maxError, error);
        
        // Масштабируем до целевой длины
        const scale = targetLength / currentLength;
        
        // Обновляем позицию current сустава, чтобы сохранить длину кости
        newPose[current as Body25Index] = {
          x: prevPos.x + dx * scale,
          y: prevPos.y + dy * scale,
          z: prevPos.z + dz * scale,
          confidence: currentPos.confidence
        };
      }
      
      // Проверяем сходимость
      if (maxError < TOLERANCE) {
        break;
      }
    }
    
    return newPose;
  }
  
  /**
   * Решить IK цепь с фиксированными длинами (упрощенный FABRIK)
   */
  solveIKWithFixedLengths(
    chain: Body25Index[],
    target: Vector3,
    pose: PoseData
  ): PoseData {
    if (chain.length < 2) {
      return pose;
    }
    
    // Копируем позу
    const newPose = { ...pose };
    
    // Устанавливаем end effector в target позицию
    const endEffector = chain[chain.length - 1];
    newPose[endEffector] = {
      x: target.x,
      y: target.y,
      z: target.z,
      confidence: 1.0
    };
    
    // Проходим по цепи от конца к началу
    for (let i = chain.length - 2; i >= 0; i--) {
      const current = chain[i];
      const next = chain[i + 1];
      
      const targetLength = this.getBoneLength(current, next);
      if (!targetLength) {
        continue;
      }
      
      const nextPos = newPose[next];
      const currentPos = newPose[current];
      
      if (!nextPos || !currentPos) {
        continue;
      }
      
      // Вычисляем направление от next к current
      const dx = currentPos.x - nextPos.x;
      const dy = currentPos.y - nextPos.y;
      const dz = currentPos.z - nextPos.z;
      const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (currentLength <= 0) {
        continue;
      }
      
      // Масштабируем до целевой длины
      const scale = targetLength / currentLength;
      
      // Обновляем позицию current сустава
      newPose[current] = {
        x: nextPos.x + dx * scale,
        y: nextPos.y + dy * scale,
        z: nextPos.z + dz * scale,
        confidence: currentPos.confidence
      };
    }
    
    return newPose;
  }
  
  /**
   * Проверить, что все кости имеют правильную длину
   */
  validateBoneLengths(pose: PoseData): Array<{
    from: Body25Index;
    to: Body25Index;
    expected: number;
    actual: number;
    error: number;
  }> {
    const results: Array<{
      from: Body25Index;
      to: Body25Index;
      expected: number;
      actual: number;
      error: number;
    }> = [];
    
    for (const connection of BODY25_CONNECTIONS) {
      const from = connection.from;
      const to = connection.to;
      const expected = this.getBoneLength(from, to);
      if (!expected) {
        continue;
      }
      
      const fromPos = pose[from];
      const toPos = pose[to];
      
      if (!fromPos || !toPos) {
        continue;
      }
      
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const dz = toPos.z - fromPos.z;
      const actual = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const error = Math.abs(actual - expected);
      
      results.push({
        from,
        to,
        expected,
        actual,
        error
      });
    }
    
    return results;
  }
}