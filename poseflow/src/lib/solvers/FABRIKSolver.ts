// FABRIKSolver.ts — Forward And Backward Reaching Inverse Kinematics
import { Vector3 } from 'three';

export interface FABRIKInput {
  /** Позиции суставов от root до end-effector */
  chain: Vector3[];
  /** Целевая позиция end-effector */
  target: Vector3;
  /** Длины костей (chain.length - 1 элементов) */
  boneLengths: number[];
  /** Макс. итераций (default 10) */
  iterations?: number;
  /** Порог сходимости (default 0.001) */
  tolerance?: number;
}

export interface FABRIKResult {
  chain: Vector3[];
  /** Достигнута ли цель (false = target вне досягаемости) */
  reached: boolean;
}

/**
 * Решает IK-цепочку методом FABRIK.
 * Возвращает новые позиции суставов (не мутирует вход).
 */
export function solveFABRIK({
  chain: inputChain,
  target,
  boneLengths,
  iterations = 10,
  tolerance = 0.001,
}: FABRIKInput): FABRIKResult {
  if (inputChain.length < 2) {
    return { chain: inputChain.map(v => v.clone()), reached: true };
  }

  // Проверяем, достижима ли цель
  const totalLength = boneLengths.reduce((a, b) => a + b, 0);
  const rootToTarget = inputChain[0].distanceTo(target);
  const outOfReach = rootToTarget > totalLength;

  // Копируем цепочку
  const chain = inputChain.map(v => v.clone());
  const fixedRoot = chain[0].clone();
  const last = chain.length - 1;

  if (outOfReach) {
    // Цель вне досягаемости — вытянуть в прямую линию к цели
    for (let i = 0; i < last; i++) {
      const dir = new Vector3().subVectors(target, chain[i]).normalize();
      chain[i + 1].copy(chain[i]).addScaledVector(dir, boneLengths[i]);
    }
    return { chain, reached: false };
  }

  // Итерации FABRIK
  for (let iter = 0; iter < iterations; iter++) {
    // --- Forward pass (от конца к корню) ---
    chain[last].copy(target);
    for (let i = last - 1; i >= 0; i--) {
      const dir = new Vector3().subVectors(chain[i], chain[i + 1]).normalize();
      chain[i].copy(chain[i + 1]).addScaledVector(dir, boneLengths[i]);
    }

    // --- Backward pass (от корня к концу) ---
    chain[0].copy(fixedRoot);
    for (let i = 0; i < last; i++) {
      const dir = new Vector3().subVectors(chain[i + 1], chain[i]).normalize();
      chain[i + 1].copy(chain[i]).addScaledVector(dir, boneLengths[i]);
    }

    // Проверка сходимости
    if (chain[last].distanceTo(target) < tolerance) break;
  }

  return { chain, reached: true };
}
