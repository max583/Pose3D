// src/lib/rig/SkeletonRig.ts
// Основная структура rig-состояния скелета.
// Содержит rest-позу, позицию и ориентацию корня, локальные повороты суставов
// и виртуальные цепочки для позвоночника и шеи.
//
// SkeletonRig — первичный источник истины.
// PoseData (мировые позиции суставов) — производное, вычисляемое через resolveSkeleton().

import { Euler, Quaternion, Vector3 } from 'three';
import { Body25Index } from '../body25/body25-types';
import { RestPose, createRestPoseFromTPose } from './RestPose';
import { VirtualChain, createVirtualChain } from './VirtualChain';

// Число виртуальных сегментов позвоночника и шеи по умолчанию
export const DEFAULT_SPINE_SEGMENTS = 4;
export const DEFAULT_NECK_SEGMENTS = 2;

export interface SkeletonRig {
  /** Rest-поза: фиксированные локальные смещения и длины костей. */
  rest: RestPose;

  /** Мировая позиция MID_HIP (корень скелета). */
  rootPosition: Vector3;

  /** Мировая ориентация корня (вращение всего тела). */
  rootRotation: Quaternion;

  /**
   * Локальные кватернионы поворота суставов — относительно родителя.
   * Не включает MID_HIP (его ориентация — rootRotation),
   * NECK и NOSE (они управляются через spine/neck VirtualChain).
   */
  localRotations: Map<Body25Index, Quaternion>;

  /**
   * Виртуальная цепочка позвоночника: MID_HIP → NECK.
   * Число сегментов = DEFAULT_SPINE_SEGMENTS.
   */
  spine: VirtualChain;

  /**
   * Виртуальная цепочка шеи: NECK → NOSE.
   * Число сегментов = DEFAULT_NECK_SEGMENTS.
   */
  neck: VirtualChain;

  /**
   * Суммарные углы позвоночника (радианы). Синхронизированы с spine.rotations.
   * bendX — наклон вперёд/назад (вокруг X), bendZ — боковой наклон (вокруг Z),
   * twistY — скручивание (вокруг Y).
   */
  spineAngles: { bendX: number; bendZ: number; twistY: number };

  /**
   * Суммарные углы шеи (радианы). Синхронизированы с neck.rotations.
   */
  neckAngles: { bendX: number; bendZ: number; twistY: number };

  /**
   * Поворот головы как жёсткого блока вокруг точки NECK.
   * Применяется поверх шейной цепочки в resolveSkeleton.
   * pitch — кивок вперёд(+)/назад(-), yaw — поворот влево/вправо, roll — наклон в сторону.
   */
  headAngles: { pitch: number; yaw: number; roll: number };

  /** Кватернион, производный от headAngles (порядок YXZ). */
  headRotation: Quaternion;
}

/**
 * Создать SkeletonRig в T-позе по умолчанию.
 * Все повороты нейтральные (identity quaternion).
 */
export function createDefaultRig(): SkeletonRig {
  const rest = createRestPoseFromTPose();

  // Длины виртуальных цепочек берём из rest-позы
  const spineLength = rest.boneLengths.get(`${Body25Index.MID_HIP}-${Body25Index.NECK}`) ?? 0.5;
  const neckLength = rest.boneLengths.get(`${Body25Index.NECK}-${Body25Index.NOSE}`) ?? 0.2;

  // Начальная позиция корня — из T-позы (позиция MID_HIP)
  const midHipOffset = rest.localOffsets.get(Body25Index.MID_HIP);
  const rootPosition = midHipOffset
    ? new Vector3(midHipOffset.x, midHipOffset.y, midHipOffset.z)
    : new Vector3(0, 0.9, 0);

  // Нейтральные повороты для всех суставов (кроме управляемых через VirtualChain)
  const localRotations = new Map<Body25Index, Quaternion>();
  const identity = new Quaternion();

  // Инициализируем все суставы кроме корня, NECK (spine-цепочка), NOSE (neck-цепочка)
  const managedByChain = new Set([Body25Index.MID_HIP, Body25Index.NECK, Body25Index.NOSE]);

  for (const index of Object.values(Body25Index).filter(v => typeof v === 'number') as Body25Index[]) {
    if (!managedByChain.has(index)) {
      localRotations.set(index, identity.clone());
    }
  }

  return {
    rest,
    rootPosition,
    rootRotation: new Quaternion(),
    localRotations,
    spine: createVirtualChain(DEFAULT_SPINE_SEGMENTS, spineLength),
    neck: createVirtualChain(DEFAULT_NECK_SEGMENTS, neckLength),
    spineAngles: { bendX: 0, bendZ: 0, twistY: 0 },
    neckAngles:  { bendX: 0, bendZ: 0, twistY: 0 },
    headAngles:  { pitch: 0, yaw: 0, roll: 0 },
    headRotation: new Quaternion(),
  };
}

/**
 * Создать глубокую копию rig (для undo/redo снепшотов).
 */
export function cloneRig(rig: SkeletonRig): SkeletonRig {
  const localRotations = new Map<Body25Index, Quaternion>();
  for (const [k, v] of rig.localRotations) {
    localRotations.set(k, v.clone());
  }

  return {
    rest: rig.rest, // RestPose неизменяема — можно переиспользовать
    rootPosition: rig.rootPosition.clone(),
    rootRotation: rig.rootRotation.clone(),
    localRotations,
    spine: {
      segments: rig.spine.segments,
      segmentLength: rig.spine.segmentLength,
      rotations: rig.spine.rotations.map(q => q.clone()),
    },
    neck: {
      segments: rig.neck.segments,
      segmentLength: rig.neck.segmentLength,
      rotations: rig.neck.rotations.map(q => q.clone()),
    },
    spineAngles:  { ...rig.spineAngles },
    neckAngles:   { ...rig.neckAngles },
    headAngles:   { ...rig.headAngles },
    headRotation: rig.headRotation.clone(),
  };
}

/**
 * Построить кватернион headRotation из headAngles (порядок YXZ).
 */
export function buildHeadRotation(angles: { pitch: number; yaw: number; roll: number }): Quaternion {
  return new Quaternion().setFromEuler(
    new Euler(angles.pitch, angles.yaw, angles.roll, 'YXZ'),
  );
}
