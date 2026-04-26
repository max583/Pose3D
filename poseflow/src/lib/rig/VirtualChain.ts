// src/lib/rig/VirtualChain.ts
// Виртуальная цепочка сегментов внутри одной BODY_25-кости.
// Используется для позвоночника (MID_HIP→NECK) и шеи (NECK→NOSE),
// чтобы обеспечить плавный изгиб и скручивание.
//
// Модель: N сегментов одинаковой длины, каждый — кватернион поворота
// относительно предыдущего. Суммарный изгиб / скручивание равномерно
// распределяется по всем сегментам.

import { Quaternion, Vector3, Euler } from 'three';

export interface VirtualChain {
  /** Число виртуальных сегментов. */
  segments: number;
  /** Длина каждого сегмента (= boneLength / segments). */
  segmentLength: number;
  /**
   * Локальные кватернионы поворота — один на сегмент.
   * Каждый кватернион задаёт поворот i-го сегмента относительно (i-1)-го.
   * Сегмент 0 поворачивается относительно родительской кости.
   */
  rotations: Quaternion[];
}

/**
 * Создать VirtualChain с нейтральными (нулевыми) поворотами.
 * @param segments  Число виртуальных сегментов (≥ 1).
 * @param totalLength  Полная длина кости (sum of segments).
 */
export function createVirtualChain(segments: number, totalLength: number): VirtualChain {
  const n = Math.max(1, segments);
  return {
    segments: n,
    segmentLength: totalLength / n,
    rotations: Array.from({ length: n }, () => new Quaternion()),
  };
}

/**
 * Установить суммарный изгиб и скручивание цепочки.
 * Суммарный поворот равномерно распределяется по всем сегментам.
 *
 * @param chain    Исходная цепочка (не мутируется).
 * @param bendX    Изгиб вперёд/назад (радианы) — вокруг X.
 * @param bendZ    Изгиб вбок (радианы) — вокруг Z.
 * @param twistY   Скручивание (радианы) — вокруг Y.
 * @returns  Новая цепочка с обновлёнными кватернионами.
 */
export function setBend(
  chain: VirtualChain,
  bendX: number,
  bendZ: number,
  twistY: number,
): VirtualChain {
  const n = chain.segments;
  // Угол на один сегмент
  const perX = bendX / n;
  const perZ = bendZ / n;
  const perY = twistY / n;

  const rotations = Array.from({ length: n }, () => {
    const q = new Quaternion();
    q.setFromEuler(new Euler(perX, perY, perZ, 'YXZ'));
    return q;
  });

  return {
    segments: chain.segments,
    segmentLength: chain.segmentLength,
    rotations,
  };
}

/**
 * Получить позиции всех промежуточных суставов и конечной точки.
 *
 * @param chain        Цепочка.
 * @param start        Мировая позиция начальной точки (корневого сустава).
 * @param parentRot    Накопленный мировой кватернион родительской кости.
 * @param restDir      Единичный вектор направления кости в rest-позе
 *                     (в системе координат родителя при нейтральном вращении).
 * @returns  Массив длиной `segments`, где positions[i] — мировая позиция
 *           конца i-го сегмента. Последний элемент — конечная точка кости.
 */
export function getSegmentPositions(
  chain: VirtualChain,
  start: Vector3,
  parentRot: Quaternion,
  restDir: Vector3,
): Vector3[] {
  const positions: Vector3[] = [];
  let currentPos = start.clone();
  let accRot = parentRot.clone();

  for (let i = 0; i < chain.segments; i++) {
    // Накапливаем поворот сегмента
    accRot = accRot.clone().multiply(chain.rotations[i]);

    // Направление сегмента = accRot применённый к restDir
    const dir = restDir.clone().applyQuaternion(accRot).normalize();
    const segEnd = currentPos.clone().addScaledVector(dir, chain.segmentLength);
    positions.push(segEnd);
    currentPos = segEnd;
  }

  return positions;
}

/**
 * Получить мировую позицию конечной точки цепочки.
 */
export function getEndPosition(
  chain: VirtualChain,
  start: Vector3,
  parentRot: Quaternion,
  restDir: Vector3,
): Vector3 {
  const positions = getSegmentPositions(chain, start, parentRot, restDir);
  return positions[positions.length - 1];
}

/**
 * Получить накопленный мировой кватернион на конце цепочки.
 * Используется как parentRot для дочерних костей (напр., ветви от NECK).
 */
export function getEndRotation(chain: VirtualChain, parentRot: Quaternion): Quaternion {
  let accRot = parentRot.clone();
  for (let i = 0; i < chain.segments; i++) {
    accRot = accRot.clone().multiply(chain.rotations[i]);
  }
  return accRot;
}

/**
 * Получить суммарный угол изгиба цепочки (в радианах) как норму вектора (bendX, bendZ).
 * Вспомогательная функция для отображения в UI.
 */
export function getTotalBendAngle(chain: VirtualChain): number {
  // Сумма углов изгиба по всем сегментам
  let totalX = 0;
  let totalZ = 0;
  for (const q of chain.rotations) {
    const e = new Euler().setFromQuaternion(q, 'YXZ');
    totalX += e.x;
    totalZ += e.z;
  }
  return Math.sqrt(totalX * totalX + totalZ * totalZ);
}

/**
 * Получить суммарный угол скручивания цепочки (в радианах).
 */
export function getTotalTwistAngle(chain: VirtualChain): number {
  let totalY = 0;
  for (const q of chain.rotations) {
    const e = new Euler().setFromQuaternion(q, 'YXZ');
    totalY += e.y;
  }
  return totalY;
}
