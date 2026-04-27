// src/lib/rig/armIK.ts
// Чистые функции для IK рук: FABRIK, twist локтя, конвертация позиций → localRotations.

import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../body25/body25-types';
import { SkeletonRig } from './SkeletonRig';
import { getEndRotation } from './VirtualChain';
import { solveFABRIK } from '../solvers/FABRIKSolver';

// ─── Константы ────────────────────────────────────────────────────────────────

export const ARM_JOINTS = {
  r: {
    shoulder: Body25Index.RIGHT_SHOULDER,
    elbow:    Body25Index.RIGHT_ELBOW,
    wrist:    Body25Index.RIGHT_WRIST,
  },
  l: {
    shoulder: Body25Index.LEFT_SHOULDER,
    elbow:    Body25Index.LEFT_ELBOW,
    wrist:    Body25Index.LEFT_WRIST,
  },
} as const;

// ─── Вспомогательная конвертация ──────────────────────────────────────────────

export function toVec3(p: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

// ─── Накопленный поворот плеча ────────────────────────────────────────────────

/**
 * Накопленный мировой поворот плечевого сустава.
 * Путь: MID_HIP → spine_chain(NECK) → localRot[SHOULDER].
 *
 * В resolveSkeleton: accRot[NECK] = getEndRotation(spine, rootRot).
 * accRot[SHOULDER] = accRot[NECK] * localRot[SHOULDER].
 */
export function getShoulderAccRot(rig: SkeletonRig, side: 'r' | 'l'): Quaternion {
  const { shoulder } = ARM_JOINTS[side];
  const spineEndRot = getEndRotation(rig.spine, rig.rootRotation);
  const shoulderLocalRot = rig.localRotations.get(shoulder) ?? new Quaternion();
  return spineEndRot.clone().multiply(shoulderLocalRot);
}

// ─── Конвертация мировой позиции → localRotation ──────────────────────────────

/**
 * Вычислить localRotation дочернего сустава по его мировой позиции.
 *
 * Алгоритм (см. inverseFK.ts):
 *   actualDirWorld = normalize(childWorldPos - parentWorldPos)
 *   localActualDir = inv(parentAccRot) * actualDirWorld
 *   localRot = quaternionFromTo(restDir, localActualDir)
 */
export function worldPosToLocalRot(
  parentWorldPos: Vector3,
  parentAccRot:   Quaternion,
  childNewWorldPos: Vector3,
  restOffset:     Vector3,
): Quaternion {
  const actualDirWorld = new Vector3()
    .subVectors(childNewWorldPos, parentWorldPos)
    .normalize();

  const restDir = restOffset.clone().normalize();
  const invParentAccRot = parentAccRot.clone().invert();
  const localActualDir = actualDirWorld.clone().applyQuaternion(invParentAccRot);

  return quaternionFromTo(restDir, localActualDir);
}

// ─── Запись новых позиций цепочки в rig ──────────────────────────────────────

/**
 * Записать новые мировые позиции локтя и запястья как localRotations в rig.
 * Позиция плеча фиксирована — используется для вычисления локального поворота локтя.
 */
export function applyArmChainToRig(
  rig:           SkeletonRig,
  side:          'r' | 'l',
  shoulderPos:   Vector3,
  newElbowPos:   Vector3,
  newWristPos:   Vector3,
): void {
  const { elbow, wrist } = ARM_JOINTS[side];
  const shoulderAccRot = getShoulderAccRot(rig, side);

  // Локоть
  const elbowRestOffset = rig.rest.localOffsets.get(elbow)!;
  const newElbowLocalRot = worldPosToLocalRot(
    shoulderPos, shoulderAccRot, newElbowPos, elbowRestOffset,
  );
  rig.localRotations.set(elbow, newElbowLocalRot);

  // Запястье
  const elbowAccRot = shoulderAccRot.clone().multiply(newElbowLocalRot);
  const wristRestOffset = rig.rest.localOffsets.get(wrist)!;
  const newWristLocalRot = worldPosToLocalRot(
    newElbowPos, elbowAccRot, newWristPos, wristRestOffset,
  );
  rig.localRotations.set(wrist, newWristLocalRot);
}

// ─── IK запястья (FABRIK) ─────────────────────────────────────────────────────

/**
 * Длины костей руки из rest-позы: [shoulder→elbow, elbow→wrist].
 */
export function getArmBoneLengths(rig: SkeletonRig, side: 'r' | 'l'): [number, number] {
  const { shoulder, elbow, wrist } = ARM_JOINTS[side];
  const se = rig.rest.boneLengths.get(`${shoulder}-${elbow}`) ?? 0.28;
  const ew = rig.rest.boneLengths.get(`${elbow}-${wrist}`) ?? 0.24;
  return [se, ew];
}

/**
 * Выполнить FABRIK IK для руки.
 * Плечо фиксировано; возвращает новые позиции [плечо, локоть, запястье].
 */
export function solveArmFABRIK(
  shoulderPos: Vector3,
  elbowPos:    Vector3,
  wristPos:    Vector3,
  target:      Vector3,
  boneLengths: [number, number],
): Vector3[] {
  const result = solveFABRIK({
    chain:      [shoulderPos.clone(), elbowPos.clone(), wristPos.clone()],
    target,
    boneLengths,
  });
  return result.chain;
}

// ─── Twist локтя ─────────────────────────────────────────────────────────────

/**
 * Повернуть локоть вокруг оси (плечо → запястье) на угол delta.
 * Плечо и запястье остаются неподвижными.
 *
 * @returns новая мировая позиция локтя
 */
export function twistElbow(
  shoulder: Vector3,
  elbow:    Vector3,
  wrist:    Vector3,
  delta:    number,
): Vector3 {
  const axis = new Vector3().subVectors(wrist, shoulder).normalize();

  // Проекция локтя на ось (основание перпендикуляра)
  const t = new Vector3().subVectors(elbow, shoulder).dot(axis);
  const arcCenter = shoulder.clone().addScaledVector(axis, t);

  // Вектор от arcCenter к локтю → повернуть вокруг axis
  const radialVec = new Vector3().subVectors(elbow, arcCenter);
  const q = new Quaternion().setFromAxisAngle(axis, delta);
  radialVec.applyQuaternion(q);

  return arcCenter.clone().add(radialVec);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function quaternionFromTo(from: Vector3, to: Vector3): Quaternion {
  const f = from.clone().normalize();
  const t = to.clone().normalize();
  // Обработка антипараллельных векторов
  if (f.dot(t) < -0.9999) {
    const perp = new Vector3(1, 0, 0);
    if (Math.abs(f.dot(perp)) > 0.9) perp.set(0, 1, 0);
    const axis = new Vector3().crossVectors(f, perp).normalize();
    return new Quaternion().setFromAxisAngle(axis, Math.PI);
  }
  return new Quaternion().setFromUnitVectors(f, t);
}
