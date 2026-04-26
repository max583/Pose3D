// src/lib/rig/__tests__/resolveSkeleton.test.ts
import { describe, it, expect } from 'vitest';
import { Quaternion, Euler, Vector3 } from 'three';
import { createDefaultRig, cloneRig } from '../SkeletonRig';
import { resolveSkeleton, resolveSkeletonPose } from '../resolveSkeleton';
import { setBend } from '../VirtualChain';
import { Body25Index } from '../../body25/body25-types';
import { defaultTPose } from '../RestPose';
import { getBoneLength } from '../RestPose';

/** Расстояние между двумя JointPosition */
function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

describe('resolveSkeleton — T-поза', () => {
  const rig = createDefaultRig();
  const { pose } = resolveSkeleton(rig);
  const tpose = defaultTPose();

  it('MID_HIP совпадает с T-позой', () => {
    const j = pose[Body25Index.MID_HIP]!;
    const t = tpose[Body25Index.MID_HIP]!;
    expect(j.x).toBeCloseTo(t.x, 2);
    expect(j.y).toBeCloseTo(t.y, 2);
    expect(j.z).toBeCloseTo(t.z, 2);
  });

  it('NECK совпадает с T-позой', () => {
    const j = pose[Body25Index.NECK]!;
    const t = tpose[Body25Index.NECK]!;
    expect(j.x).toBeCloseTo(t.x, 2);
    expect(j.y).toBeCloseTo(t.y, 2);
    expect(j.z).toBeCloseTo(t.z, 2);
  });

  it('RIGHT_SHOULDER совпадает с T-позой', () => {
    const j = pose[Body25Index.RIGHT_SHOULDER]!;
    const t = tpose[Body25Index.RIGHT_SHOULDER]!;
    expect(j.x).toBeCloseTo(t.x, 2);
    expect(j.y).toBeCloseTo(t.y, 2);
    expect(j.z).toBeCloseTo(t.z, 2);
  });

  it('все 25 суставов присутствуют в выходной позе', () => {
    for (let i = 0; i <= 24; i++) {
      expect(pose[i]).toBeDefined();
    }
  });
});

describe('resolveSkeleton — rootRotation 90° по Y', () => {
  it('после поворота корня на 90°Y все позиции повёрнуты (MID_HIP на месте, NECK смещён)', () => {
    const rig = createDefaultRig();
    rig.rootRotation.setFromEuler(new Euler(0, Math.PI / 2, 0));
    const { pose } = resolveSkeleton(rig);

    // MID_HIP не должен двигаться (поворот вокруг него)
    const midHip = pose[Body25Index.MID_HIP]!;
    expect(midHip.x).toBeCloseTo(0, 2);
    expect(midHip.y).toBeCloseTo(0.9, 2);

    // NECK в T-позе выше MID_HIP на 0.5 по Y. После 90°Y поворота
    // вектор (0, 0.5, 0) остаётся (0, 0.5, 0) — Y-поворот не меняет вертикальный вектор
    const neck = pose[Body25Index.NECK]!;
    expect(neck.y).toBeCloseTo(1.4, 2); // 0.9 + 0.5
  });
});

describe('resolveSkeleton — длины костей не меняются', () => {
  it('длины костей в resolved позе ≈ rest lengths', () => {
    const rig = createDefaultRig();

    // Применяем произвольный поворот плеча
    const q = new Quaternion().setFromEuler(new Euler(0.3, 0.5, 0.2));
    rig.localRotations.set(Body25Index.RIGHT_SHOULDER, q);

    const { pose } = resolveSkeleton(rig);

    // Проверяем несколько пар
    const pairs: [Body25Index, Body25Index][] = [
      [Body25Index.MID_HIP, Body25Index.NECK],
      [Body25Index.NECK, Body25Index.RIGHT_SHOULDER],
      [Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW],
      [Body25Index.RIGHT_ELBOW, Body25Index.RIGHT_WRIST],
    ];

    for (const [from, to] of pairs) {
      const restLen = getBoneLength(rig.rest, from, to);
      const actualLen = dist(pose[from]!, pose[to]!);
      expect(actualLen).toBeCloseTo(restLen, 3);
    }
  });
});

describe('resolveSkeleton — spine bend', () => {
  it('изгиб позвоночника 30°: длина MID_HIP→NECK сохраняется', () => {
    const rig = createDefaultRig();
    rig.spine = setBend(rig.spine, (30 * Math.PI) / 180, 0, 0);

    const { pose } = resolveSkeleton(rig);

    // Длина пути по виртуальным сегментам = spine total length (≈0.5)
    const restLen = getBoneLength(rig.rest, Body25Index.MID_HIP, Body25Index.NECK);
    // Прямое расстояние (chord) < или = длины пути (arc)
    const chordLen = dist(pose[Body25Index.MID_HIP]!, pose[Body25Index.NECK]!);
    expect(chordLen).toBeLessThanOrEqual(restLen + 1e-4);
  });

  it('изгиб позвоночника меняет позицию NECK', () => {
    const rig = createDefaultRig();
    const { pose: poseBefore } = resolveSkeleton(rig);

    rig.spine = setBend(rig.spine, (30 * Math.PI) / 180, 0, 0);
    const { pose: poseAfter } = resolveSkeleton(rig);

    const neckBefore = poseBefore[Body25Index.NECK]!;
    const neckAfter = poseAfter[Body25Index.NECK]!;

    // Позиция NECK должна измениться
    const moved = Math.abs(neckBefore.x - neckAfter.x) +
                  Math.abs(neckBefore.y - neckAfter.y) +
                  Math.abs(neckBefore.z - neckAfter.z);
    expect(moved).toBeGreaterThan(0.01);
  });
});

describe('resolveSkeleton — localRotation плеча', () => {
  it('поворот RIGHT_SHOULDER двигает плечо и всё дистальнее, длины сохраняются', () => {
    // В rotation-tree модели localRot[SHOULDER] задаёт направление кости NECK→SHOULDER,
    // поэтому позиция плеча МЕНЯЕТСЯ при его повороте. Длины при этом сохраняются.
    const rig = createDefaultRig();
    const { pose: poseBefore } = resolveSkeleton(rig);

    const q = new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 4)); // 45° roll
    rig.localRotations.set(Body25Index.RIGHT_SHOULDER, q);
    const { pose: poseAfter } = resolveSkeleton(rig);

    // RIGHT_SHOULDER должен переместиться (localRot меняет направление кости от NECK)
    const shoulderBefore = poseBefore[Body25Index.RIGHT_SHOULDER]!;
    const shoulderAfter = poseAfter[Body25Index.RIGHT_SHOULDER]!;
    const shoulderMoved = dist(shoulderBefore, shoulderAfter);
    expect(shoulderMoved).toBeGreaterThan(0.01);

    // Длина NECK→SHOULDER сохраняется
    const neckToShoulderBefore = getBoneLength(rig.rest, Body25Index.NECK, Body25Index.RIGHT_SHOULDER);
    const neckAfter = poseAfter[Body25Index.NECK]!;
    expect(dist(neckAfter, shoulderAfter)).toBeCloseTo(neckToShoulderBefore, 3);

    // RIGHT_ELBOW тоже переместился (следует за плечом)
    const elbowBefore = poseBefore[Body25Index.RIGHT_ELBOW]!;
    const elbowAfter = poseAfter[Body25Index.RIGHT_ELBOW]!;
    const elbowMoved = dist(elbowBefore, elbowAfter);
    expect(elbowMoved).toBeGreaterThan(0.01);

    // Длина SHOULDER→ELBOW сохраняется
    const restLen = getBoneLength(rig.rest, Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW);
    const actualLen = dist(shoulderAfter, elbowAfter);
    expect(actualLen).toBeCloseTo(restLen, 3);
  });
});
