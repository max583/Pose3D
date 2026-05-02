// src/lib/rig/RestPose.ts
// Rest-поза — базовое (нейтральное) положение скелета.
// Хранит локальные смещения каждого сустава от родителя (в системе координат
// родителя при единичном повороте) и производные длины костей.
//
// При rotation-tree модели позы:
//   pos[child] = pos[parent] + accumulatedRotation[parent] * localOffset[child]
// Длины |localOffset[child]| фиксированы и не могут быть изменены — это и есть
// «фиксированные длины костей» по DesignDoll.

import { Vector3 } from 'three';
import { Body25Index, PoseData } from '../body25/body25-types';

export interface RestPose {
  /** Локальное смещение каждого сустава от родителя в rest-T-позе. */
  localOffsets: Map<Body25Index, Vector3>;
  /** Длины костей по парам "from-to" (производные от localOffsets). */
  boneLengths: Map<string, number>;
}

/**
 * Дерево родительских связей BODY_25 (та же иерархия, что в SkeletonGraph).
 * Корень — MID_HIP. Возвращает Map: child → parent (или null для корня).
 */
export function getBody25ParentMap(): Map<Body25Index, Body25Index | null> {
  const m = new Map<Body25Index, Body25Index | null>();
  m.set(Body25Index.MID_HIP, null);
  m.set(Body25Index.NECK, Body25Index.MID_HIP);
  m.set(Body25Index.NOSE, Body25Index.NECK);
  m.set(Body25Index.RIGHT_EYE, Body25Index.NOSE);
  m.set(Body25Index.RIGHT_EAR, Body25Index.RIGHT_EYE);
  m.set(Body25Index.LEFT_EYE, Body25Index.NOSE);
  m.set(Body25Index.LEFT_EAR, Body25Index.LEFT_EYE);
  m.set(Body25Index.RIGHT_SHOULDER, Body25Index.NECK);
  m.set(Body25Index.RIGHT_ELBOW, Body25Index.RIGHT_SHOULDER);
  m.set(Body25Index.RIGHT_WRIST, Body25Index.RIGHT_ELBOW);
  m.set(Body25Index.LEFT_SHOULDER, Body25Index.NECK);
  m.set(Body25Index.LEFT_ELBOW, Body25Index.LEFT_SHOULDER);
  m.set(Body25Index.LEFT_WRIST, Body25Index.LEFT_ELBOW);
  m.set(Body25Index.RIGHT_HIP, Body25Index.MID_HIP);
  m.set(Body25Index.RIGHT_KNEE, Body25Index.RIGHT_HIP);
  m.set(Body25Index.RIGHT_ANKLE, Body25Index.RIGHT_KNEE);
  m.set(Body25Index.RIGHT_BIG_TOE, Body25Index.RIGHT_ANKLE);
  m.set(Body25Index.RIGHT_SMALL_TOE, Body25Index.RIGHT_ANKLE);
  m.set(Body25Index.RIGHT_HEEL, Body25Index.RIGHT_ANKLE);
  m.set(Body25Index.LEFT_HIP, Body25Index.MID_HIP);
  m.set(Body25Index.LEFT_KNEE, Body25Index.LEFT_HIP);
  m.set(Body25Index.LEFT_ANKLE, Body25Index.LEFT_KNEE);
  m.set(Body25Index.LEFT_BIG_TOE, Body25Index.LEFT_ANKLE);
  m.set(Body25Index.LEFT_SMALL_TOE, Body25Index.LEFT_ANKLE);
  m.set(Body25Index.LEFT_HEEL, Body25Index.LEFT_ANKLE);
  return m;
}

/** Дети каждого сустава (обратный индекс). */
export function getBody25ChildrenMap(): Map<Body25Index, Body25Index[]> {
  const parents = getBody25ParentMap();
  const children = new Map<Body25Index, Body25Index[]>();
  for (const [child, parent] of parents) {
    if (parent !== null) {
      const list = children.get(parent) ?? [];
      list.push(child);
      children.set(parent, list);
    }
  }
  return children;
}

/**
 * Создать RestPose из произвольной BODY_25-позы.
 * localOffset[child] = pos[child] - pos[parent] (в мире, без накопленных поворотов;
 * предполагается, что rest-поза — нейтральная без поворотов).
 */
export function createRestPoseFromPose(pose: PoseData): RestPose {
  const parents = getBody25ParentMap();
  const localOffsets = new Map<Body25Index, Vector3>();
  const boneLengths = new Map<string, number>();

  for (const [child, parent] of parents) {
    const cp = pose[child];
    if (!cp) continue;
    if (parent === null) {
      // Корень: локальное смещение = сама позиция (от мирового начала)
      localOffsets.set(child, new Vector3(cp.x, cp.y, cp.z));
      continue;
    }
    const pp = pose[parent];
    if (!pp) continue;
    const offset = new Vector3(cp.x - pp.x, cp.y - pp.y, cp.z - pp.z);
    localOffsets.set(child, offset);
    boneLengths.set(`${parent}-${child}`, offset.length());
  }
  return { localOffsets, boneLengths };
}

/** T-поза (используется как rest по умолчанию). */
export function defaultTPose(): PoseData {
  return {
    [Body25Index.NOSE]:            { x:  0.00, y: 1.60, z: 0.00 },
    [Body25Index.NECK]:            { x:  0.00, y: 1.40, z: 0.00 },
    // Плечи: |1-2|=|1-5|=1.2×|8-9|≈0.190, x=sqrt(0.0335)≈0.183
    // Руки горизонтальны: верхняя рука 0.287 (3-2 = 0.47-0.183), предплечье 0.24 (4-3)
    // Ноги: femur:tibia ≈ 1.22:1 → бедро 0.43, голень 0.37 (сумма 0.80)
    [Body25Index.RIGHT_SHOULDER]:  { x:  0.183, y: 1.35, z: 0.00 },
    [Body25Index.RIGHT_ELBOW]:     { x:  0.47,  y: 1.35, z: 0.00 },
    [Body25Index.RIGHT_WRIST]:     { x:  0.71,  y: 1.35, z: 0.00 },
    [Body25Index.LEFT_SHOULDER]:   { x: -0.183, y: 1.35, z: 0.00 },
    [Body25Index.LEFT_ELBOW]:      { x: -0.47,  y: 1.35, z: 0.00 },
    [Body25Index.LEFT_WRIST]:      { x: -0.71,  y: 1.35, z: 0.00 },
    [Body25Index.MID_HIP]:         { x:  0.00,  y: 0.90, z: 0.00 },
    [Body25Index.RIGHT_HIP]:       { x:  0.15,  y: 0.85, z: 0.00 },
    [Body25Index.RIGHT_KNEE]:      { x:  0.15,  y: 0.42, z: 0.00 },
    [Body25Index.RIGHT_ANKLE]:     { x:  0.15,  y: 0.05, z: 0.00 },
    [Body25Index.LEFT_HIP]:        { x: -0.15,  y: 0.85, z: 0.00 },
    [Body25Index.LEFT_KNEE]:       { x: -0.15,  y: 0.42, z: 0.00 },
    [Body25Index.LEFT_ANKLE]:      { x: -0.15,  y: 0.05, z: 0.00 },
    [Body25Index.RIGHT_EYE]:       { x:  0.05, y: 1.65, z: 0.10 },
    [Body25Index.LEFT_EYE]:        { x: -0.05, y: 1.65, z: 0.10 },
    [Body25Index.RIGHT_EAR]:       { x:  0.10, y: 1.60, z: 0.00 },
    [Body25Index.LEFT_EAR]:        { x: -0.10, y: 1.60, z: 0.00 },
    [Body25Index.LEFT_BIG_TOE]:    { x: -0.20, y: 0.00, z: 0.10 },
    [Body25Index.LEFT_SMALL_TOE]:  { x: -0.25, y: 0.00, z: 0.05 },
    [Body25Index.LEFT_HEEL]:       { x: -0.079, y: 0.00, z: -0.071 },
    [Body25Index.RIGHT_BIG_TOE]:   { x:  0.20, y: 0.00, z: 0.10 },
    [Body25Index.RIGHT_SMALL_TOE]: { x:  0.25, y: 0.00, z: 0.05 },
    [Body25Index.RIGHT_HEEL]:      { x:  0.079, y: 0.00, z: -0.071 },
  };
}

/** RestPose из T-позы по умолчанию. */
export function createRestPoseFromTPose(): RestPose {
  return createRestPoseFromPose(defaultTPose());
}

/** Получить длину кости по парам "from-to". */
export function getBoneLength(rest: RestPose, from: Body25Index, to: Body25Index): number {
  return rest.boneLengths.get(`${from}-${to}`) ?? 0;
}
