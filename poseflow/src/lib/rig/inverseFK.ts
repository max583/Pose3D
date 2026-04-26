// src/lib/rig/inverseFK.ts
// Восстановление SkeletonRig из PoseData (мировых позиций суставов).
// Используется при загрузке пресетов.
//
// Алгоритм:
//   Для каждого сустава (BFS от корня):
//     localRot[child] = inv(accRot[parent]) * quaternionFromTo(restDir, actualDir)
//   где:
//     restDir  = normalize(localOffset[child])  — направление в rest-позе
//     actualDir = normalize(pos[child] - pos[parent])  — фактическое направление
//
// Ограничения:
//   - Позвоночник и шея восстанавливаются как единый поворот (нейтральные VirtualChain).
//   - Длины костей из PoseData могут немного отличаться от rest → мы их игнорируем
//     (используем только направление), сохраняя фиксированные длины.

import { Quaternion, Vector3 } from 'three';
import { Body25Index, PoseData } from '../body25/body25-types';
import { SkeletonRig, cloneRig, createDefaultRig } from './SkeletonRig';
import { getBody25ParentMap } from './RestPose';
import { setBend } from './VirtualChain';

/**
 * Восстановить SkeletonRig из PoseData.
 * Если сустав отсутствует в позе — используется нейтральный поворот.
 */
export function rigFromPose(pose: PoseData): SkeletonRig {
  const rig = createDefaultRig();
  const parents = getBody25ParentMap();

  // --- Корень: позиция MID_HIP ---
  const midHipP = pose[Body25Index.MID_HIP];
  if (midHipP) {
    rig.rootPosition.set(midHipP.x, midHipP.y, midHipP.z);
  }
  // rootRotation остаётся identity (поза не задаёт ориентацию корня напрямую)

  // Накопленные мировые повороты (нужны для вычисления локального поворота дочернего сустава)
  const accRotations = new Map<Body25Index, Quaternion>();
  accRotations.set(Body25Index.MID_HIP, new Quaternion()); // identity

  // --- Позвоночник: MID_HIP → NECK ---
  const neckP = pose[Body25Index.NECK];
  const midHipOffset = rig.rest.localOffsets.get(Body25Index.NECK) ?? new Vector3(0, 0.5, 0);
  if (neckP && midHipP) {
    const actualDir = new Vector3(
      neckP.x - midHipP.x,
      neckP.y - midHipP.y,
      neckP.z - midHipP.z,
    ).normalize();
    const restDir = midHipOffset.clone().normalize();

    // Получаем суммарный поворот spine
    const spineRot = quaternionFromTo(restDir, actualDir);

    // Разложим на Euler и установим через setBend
    const { x: bendX, y: twistY, z: bendZ } = eulerFromQuat(spineRot);
    rig.spine = setBend(rig.spine, bendX, bendZ, twistY);
    accRotations.set(Body25Index.NECK, spineRot);
  } else {
    accRotations.set(Body25Index.NECK, new Quaternion());
  }

  // --- Шея: NECK → NOSE ---
  const noseP = pose[Body25Index.NOSE];
  const neckOffset = rig.rest.localOffsets.get(Body25Index.NOSE) ?? new Vector3(0, 0.2, 0);
  if (noseP && neckP) {
    const actualDir = new Vector3(
      noseP.x - neckP.x,
      noseP.y - neckP.y,
      noseP.z - neckP.z,
    ).normalize();
    const restDir = neckOffset.clone().normalize();

    const neckRot = quaternionFromTo(restDir, actualDir);
    const { x: bendX, y: twistY, z: bendZ } = eulerFromQuat(neckRot);
    rig.neck = setBend(rig.neck, bendX, bendZ, twistY);

    // Накопленный поворот NOSE = поворот NECK * поворот neck-цепочки
    const neckAccRot = accRotations.get(Body25Index.NECK) ?? new Quaternion();
    accRotations.set(Body25Index.NOSE, neckAccRot.clone().multiply(neckRot));
  } else {
    const neckAccRot = accRotations.get(Body25Index.NECK) ?? new Quaternion();
    accRotations.set(Body25Index.NOSE, neckAccRot.clone());
  }

  // --- Остальные суставы: BFS ---
  const processedByChain = new Set([
    Body25Index.MID_HIP,
    Body25Index.NECK,
    Body25Index.NOSE,
  ]);

  // Все суставы, не управляемые цепочками
  const queue: Body25Index[] = [];
  for (const [joint, parent] of parents) {
    if (!processedByChain.has(joint) && parent !== null) {
      queue.push(joint);
    }
  }

  // BFS: обрабатываем суставы по порядку (родитель всегда раньше ребёнка)
  const processed = new Set(processedByChain);
  let iterations = 0;
  const maxIterations = queue.length * 2;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const joint = queue.shift()!;
    if (processed.has(joint)) continue;

    const parentIdx = parents.get(joint);
    if (parentIdx === undefined || parentIdx === null) {
      processed.add(joint);
      continue;
    }

    if (!processed.has(parentIdx)) {
      // Родитель ещё не обработан — откладываем
      queue.push(joint);
      continue;
    }

    const parentAccRot = accRotations.get(parentIdx) ?? new Quaternion();
    const localOffset = rig.rest.localOffsets.get(joint);
    if (!localOffset) {
      processed.add(joint);
      continue;
    }

    const restDir = localOffset.clone().normalize();
    const parentP = pose[parentIdx];
    const childP = pose[joint];

    if (parentP && childP) {
      const actualDirWorld = new Vector3(
        childP.x - parentP.x,
        childP.y - parentP.y,
        childP.z - parentP.z,
      ).normalize();

      // Направление в rest-позе в мировом пространстве = parentAccRot * restDir
      const restDirWorld = restDir.clone().applyQuaternion(parentAccRot);

      // Мировой поворот от rest к actual
      const worldRot = quaternionFromTo(restDirWorld, actualDirWorld);

      // Локальный поворот = inv(parentAccRot) * worldRot * parentAccRot
      // Точнее: localRot такой, что parentAccRot * localRot * restDir = actualDirWorld (в world)
      // localRot = inv(parentAccRot) * quaternionFromTo(restDirWorld, actualDirWorld) * parentAccRot
      // Но проще: localRot = quaternionFromTo(restDir, localActualDir)
      // где localActualDir = inv(parentAccRot) * actualDirWorld
      const invParentRot = parentAccRot.clone().invert();
      const localActualDir = actualDirWorld.clone().applyQuaternion(invParentRot);
      const localRot = quaternionFromTo(restDir, localActualDir);

      rig.localRotations.set(joint, localRot);

      // Накопленный мировой поворот для детей
      accRotations.set(joint, parentAccRot.clone().multiply(localRot));
    } else {
      // Сустав отсутствует в позе — нейтральный поворот
      accRotations.set(joint, parentAccRot.clone());
    }

    processed.add(joint);
  }

  return rig;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Кватернион поворота «от вектора from к вектору to».
 */
function quaternionFromTo(from: Vector3, to: Vector3): Quaternion {
  const q = new Quaternion();
  q.setFromUnitVectors(
    from.clone().normalize(),
    to.clone().normalize(),
  );
  return q;
}

/**
 * Разложить кватернион в Euler YXZ и вернуть компоненты.
 */
function eulerFromQuat(q: Quaternion): { x: number; y: number; z: number } {
  // Используем упрощённое разложение через матрицу
  // Для малых углов достаточно первого приближения
  const sinX = 2 * (q.w * q.x - q.y * q.z);
  const cosX = 1 - 2 * (q.x * q.x + q.z * q.z);
  const x = Math.atan2(sinX, cosX);

  const sinY = 2 * (q.w * q.y + q.x * q.z);
  const y = Math.asin(Math.max(-1, Math.min(1, sinY)));

  const sinZ = 2 * (q.w * q.z - q.x * q.y);
  const cosZ = 1 - 2 * (q.y * q.y + q.z * q.z);
  const z = Math.atan2(sinZ, cosZ);

  return { x, y, z };
}
