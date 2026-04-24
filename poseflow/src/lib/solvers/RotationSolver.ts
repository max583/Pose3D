// src/lib/solvers/RotationSolver.ts
// Утилиты для вращения точек вокруг осей

import { Vector3 } from 'three';

/**
 * Вращает точку вокруг оси, проходящей через центр
 * @param point - Точка для вращения
 * @param axis - Ось вращения (нормализованный вектор)
 * @param center - Центр вращения
 * @param angle - Угол вращения в радианах
 * @returns Новая позиция точки после вращения
 */
export function rotateAround(
  point: Vector3,
  axis: Vector3,
  center: Vector3,
  angle: number
): Vector3 {
  // Создаем вектор от центра к точке
  const relativePoint = point.clone().sub(center);
  
  // Применяем матрицу вращения
  const rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
  relativePoint.applyMatrix4(rotationMatrix);
  
  // Возвращаем точку обратно в мировые координаты
  return relativePoint.add(center);
}

/**
 * Вычисляет ось вращения на основе выбранного кольца гизмо
 * @param axis - 'x', 'y', или 'z'
 * @param jointPosition - Позиция сустава
 * @returns Нормализованный вектор оси
 */
export function getGizmoAxis(axis: 'x' | 'y' | 'z', jointPosition: Vector3): Vector3 {
  switch (axis) {
    case 'x':
      return new Vector3(1, 0, 0);
    case 'y':
      return new Vector3(0, 1, 0);
    case 'z':
      return new Vector3(0, 0, 1);
    default:
      return new Vector3(0, 1, 0);
  }
}

/**
 * Вычисляет угол вращения на основе движения мыши
 * @param deltaX - Изменение по X
 * @param deltaY - Изменение по Y
 * @param sensitivity - Чувствительность (по умолчанию 0.01)
 * @returns Угол в радианах
 */
export function computeRotationAngle(
  deltaX: number,
  deltaY: number,
  sensitivity: number = 0.01
): number {
  // Используем комбинацию deltaX и deltaY для плавного вращения
  const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const direction = Math.sign(deltaX + deltaY);
  return delta * sensitivity * direction;
}

/**
 * Вращает массив точек вокруг оси
 * @param points - Массив точек для вращения
 * @param axis - Ось вращения
 * @param center - Центр вращения
 * @param angle - Угол вращения
 * @returns Массив новых позиций
 */
export function rotatePointsAround(
  points: Vector3[],
  axis: Vector3,
  center: Vector3,
  angle: number
): Vector3[] {
  return points.map(point => rotateAround(point, axis, center, angle));
}

/**
 * Проверяет, находится ли точка на кольце гизмо
 * @param point - Точка для проверки
 * @param center - Центр кольца
 * @param radius - Радиус кольца
 * @param axis - Ось кольца
 * @param threshold - Порог точности
 * @returns true, если точка находится на кольце
 */
export function isPointOnGizmoRing(
  point: Vector3,
  center: Vector3,
  radius: number,
  axis: 'x' | 'y' | 'z',
  threshold: number = 0.05
): boolean {
  const toPoint = point.clone().sub(center);
  
  // Проекция на плоскость, перпендикулярную оси
  let projected: Vector3;
  switch (axis) {
    case 'x':
      projected = new Vector3(0, toPoint.y, toPoint.z);
      break;
    case 'y':
      projected = new Vector3(toPoint.x, 0, toPoint.z);
      break;
    case 'z':
      projected = new Vector3(toPoint.x, toPoint.y, 0);
      break;
  }
  
  const distanceToCenter = projected.length();
  return Math.abs(distanceToCenter - radius) < threshold;
}

// Re-export THREE для использования в этой файле
import * as THREE from 'three';