// src/lib/rig/resolveSkeleton.ts
// FK-разрешение: из SkeletonRig → PoseData (мировые позиции суставов).
//
// Алгоритм:
//   1. Корень (MID_HIP): pos = rootPosition, accRot = rootRotation.
//   2. Позвоночник: обходим spine VirtualChain от MID_HIP к NECK.
//      Промежуточные позиции не попадают в PoseData (они для гизмо).
//   3. Шея: обходим neck VirtualChain от NECK к NOSE.
//   4. Все остальные суставы: BFS-обход дерева.
//      pos[child] = pos[parent] + accRot[parent] * localRot[child] * localOffset[child].
//
// Длины костей не могут быть нарушены — они зашиты в localOffset.length().

import { Quaternion, Vector3 } from 'three';
import { Body25Index, JointPosition, PoseData } from '../body25/body25-types';
import { SkeletonRig } from './SkeletonRig';
import { getBody25ChildrenMap, getBody25ParentMap } from './RestPose';
import {
  getEndRotation,
  getSegmentPositions,
} from './VirtualChain';

/** Промежуточные мировые позиции сегментов позвоночника и шеи (для гизмо). */
export interface VirtualChainPositions {
  spine: Vector3[];
  neck: Vector3[];
}

/**
 * Разрешить скелет: SkeletonRig → PoseData.
 * @returns { pose, virtualPositions } — поза + промежуточные позиции цепочек.
 */
export function resolveSkeleton(rig: SkeletonRig): {
  pose: PoseData;
  virtualPositions: VirtualChainPositions;
} {
  const pose = {} as PoseData;
  const accRotations = new Map<Body25Index, Quaternion>();
  const worldPositions = new Map<Body25Index, Vector3>();

  const children = getBody25ChildrenMap();
  const parents = getBody25ParentMap();

  // --- 1. Корень: MID_HIP ---
  const midHipPos = rig.rootPosition.clone();
  worldPositions.set(Body25Index.MID_HIP, midHipPos);
  accRotations.set(Body25Index.MID_HIP, rig.rootRotation.clone());
  pose[Body25Index.MID_HIP] = vec3ToJoint(midHipPos);

  // --- 2. Позвоночник: MID_HIP → NECK через VirtualChain ---
  const midHipRot = rig.rootRotation.clone();

  // Направление spine в rest (от MID_HIP к NECK, нормализованное)
  const spineRestOffset = rig.rest.localOffsets.get(Body25Index.NECK) ?? new Vector3(0, 0.5, 0);
  const spineRestDir = spineRestOffset.clone().normalize();

  const spineSegPositions = getSegmentPositions(
    rig.spine,
    midHipPos,
    midHipRot,
    spineRestDir,
  );
  const neckPos = spineSegPositions[spineSegPositions.length - 1];
  const neckRot = getEndRotation(rig.spine, midHipRot);

  worldPositions.set(Body25Index.NECK, neckPos);
  accRotations.set(Body25Index.NECK, neckRot);
  pose[Body25Index.NECK] = vec3ToJoint(neckPos);

  // --- 3. Шея: NECK → NOSE через VirtualChain ---
  const neckRestOffset = rig.rest.localOffsets.get(Body25Index.NOSE) ?? new Vector3(0, 0.2, 0);
  const neckRestDir = neckRestOffset.clone().normalize();

  const neckSegPositions = getSegmentPositions(
    rig.neck,
    neckPos,
    neckRot,
    neckRestDir,
  );
  const nosePosFromChain = neckSegPositions[neckSegPositions.length - 1];
  const noseRot = getEndRotation(rig.neck, neckRot);

  // --- Голова: поворот жёсткого блока {NOSE, глаза, уши} вокруг NECK ---
  // noseOffset = вектор от NECK до NOSE после шейной цепочки
  const noseOffset = nosePosFromChain.clone().sub(neckPos);
  noseOffset.applyQuaternion(rig.headRotation);
  const nosePos = neckPos.clone().add(noseOffset);
  // Накопленный поворот для NOSE = конец шейной цепочки × поворот головы
  const headOri = noseRot.clone().multiply(rig.headRotation);

  // Обновляем последний сегмент шейной дуги, чтобы она заканчивалась в правильном NOSE
  neckSegPositions[neckSegPositions.length - 1] = nosePos.clone();

  worldPositions.set(Body25Index.NOSE, nosePos);
  accRotations.set(Body25Index.NOSE, headOri);
  pose[Body25Index.NOSE] = vec3ToJoint(nosePos);

  // --- 4. BFS по оставшимся суставам ---
  // Очередь: суставы, у которых известна позиция родителя
  // Начинаем с детей MID_HIP (кроме NECK — уже обработан),
  // и детей NECK (кроме NOSE — уже обработан), и детей NOSE.
  const processedByChain = new Set([
    Body25Index.MID_HIP,
    Body25Index.NECK,
    Body25Index.NOSE,
  ]);

  // BFS-очередь: узлы, чьих родителей уже обработали
  const queue: Body25Index[] = [];

  // Добавляем детей уже обработанных узлов
  for (const processed of processedByChain) {
    const ch = children.get(processed) ?? [];
    for (const child of ch) {
      if (!processedByChain.has(child)) {
        queue.push(child);
      }
    }
  }

  while (queue.length > 0) {
    const joint = queue.shift()!;

    if (worldPositions.has(joint)) continue; // уже обработан

    const parentIdx = parents.get(joint);
    if (parentIdx === undefined || parentIdx === null) continue;

    const parentPos = worldPositions.get(parentIdx);
    const parentRot = accRotations.get(parentIdx);
    if (!parentPos || !parentRot) continue; // родитель ещё не обработан — отложим

    // Локальное смещение в rest-позе
    const localOffset = rig.rest.localOffsets.get(joint);
    if (!localOffset) continue;

    // Локальный поворот этого сустава (если есть)
    const localRot = rig.localRotations.get(joint) ?? new Quaternion();

    // Накопленный мировой поворот: parentRot * localRot
    const accRot = parentRot.clone().multiply(localRot);
    accRotations.set(joint, accRot);

    // Мировая позиция: parentPos + accRot * localOffset
    const worldOffset = localOffset.clone().applyQuaternion(accRot);
    const worldPos = parentPos.clone().add(worldOffset);
    worldPositions.set(joint, worldPos);
    pose[joint] = vec3ToJoint(worldPos);

    // Добавляем детей в очередь
    const ch = children.get(joint) ?? [];
    for (const child of ch) {
      if (!worldPositions.has(child)) {
        queue.push(child);
      }
    }
  }

  return {
    pose,
    virtualPositions: {
      spine: spineSegPositions,
      neck: neckSegPositions,
    },
  };
}

/**
 * Разрешить только PoseData (без промежуточных позиций цепочек).
 * Удобная обёртка для большинства случаев.
 */
export function resolveSkeletonPose(rig: SkeletonRig): PoseData {
  return resolveSkeleton(rig).pose;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vec3ToJoint(v: Vector3): JointPosition {
  return { x: v.x, y: v.y, z: v.z };
}
