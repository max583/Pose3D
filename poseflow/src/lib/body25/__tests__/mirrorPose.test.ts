import { describe, it, expect } from 'vitest';
import { Body25Index, PoseData } from '../body25-types';
import { MIRROR_PAIRS } from '../body25-mirror';

/**
 * Применяет зеркалирование позы — копия алгоритма из PoseService.mirrorPose().
 * Тестируется как чистая функция, без зависимостей от сервисов.
 */
function applyMirror(pose: PoseData): PoseData {
  const result = { ...pose };
  const center = pose[Body25Index.MID_HIP].x;
  for (const [right, left] of MIRROR_PAIRS) {
    const rPos = result[right];
    const lPos = result[left];
    result[right] = { ...lPos, x: 2 * center - lPos.x };
    result[left]  = { ...rPos, x: 2 * center - rPos.x };
  }
  return result as PoseData;
}

/** Минимальная поза для тестов зеркалирования */
function makeAsymmetricPose(): PoseData {
  const pose: Partial<PoseData> = {};
  for (let i = 0; i < 25; i++) pose[i as Body25Index] = { x: 0, y: i * 0.1, z: 0 };
  pose[Body25Index.MID_HIP]         = { x: 0,    y: 0.9, z: 0 };
  pose[Body25Index.RIGHT_SHOULDER]  = { x: 0.3,  y: 1.35, z: 0 };
  pose[Body25Index.LEFT_SHOULDER]   = { x: -0.5, y: 1.35, z: 0 }; // специально несимметрично
  pose[Body25Index.RIGHT_WRIST]     = { x: 0.8,  y: 1.0,  z: 0.2 };
  pose[Body25Index.LEFT_WRIST]      = { x: -0.4, y: 0.8,  z: -0.1 };
  return pose as PoseData;
}

describe('mirrorPose algorithm', () => {
  it('правое и левое плечо меняются местами с отражением X', () => {
    const pose = makeAsymmetricPose();
    const mirrored = applyMirror(pose);
    const center = pose[Body25Index.MID_HIP].x; // 0

    // RIGHT_SHOULDER получает X от LEFT_SHOULDER, отражённый
    expect(mirrored[Body25Index.RIGHT_SHOULDER].x).toBeCloseTo(2 * center - pose[Body25Index.LEFT_SHOULDER].x);
    // LEFT_SHOULDER получает X от RIGHT_SHOULDER, отражённый
    expect(mirrored[Body25Index.LEFT_SHOULDER].x).toBeCloseTo(2 * center - pose[Body25Index.RIGHT_SHOULDER].x);
  });

  it('Y-координаты пар не изменяются при зеркалировании', () => {
    const pose = makeAsymmetricPose();
    const mirrored = applyMirror(pose);

    // Y запястий обмениваются вместе с позициями (swap)
    expect(mirrored[Body25Index.RIGHT_WRIST].y).toBeCloseTo(pose[Body25Index.LEFT_WRIST].y);
    expect(mirrored[Body25Index.LEFT_WRIST].y).toBeCloseTo(pose[Body25Index.RIGHT_WRIST].y);
  });

  it('Z-координаты пар обмениваются при зеркалировании', () => {
    const pose = makeAsymmetricPose();
    const mirrored = applyMirror(pose);

    expect(mirrored[Body25Index.RIGHT_WRIST].z).toBeCloseTo(pose[Body25Index.LEFT_WRIST].z);
    expect(mirrored[Body25Index.LEFT_WRIST].z).toBeCloseTo(pose[Body25Index.RIGHT_WRIST].z);
  });

  it('двойное зеркалирование возвращает исходную позу (идемпотентность)', () => {
    const pose = makeAsymmetricPose();
    const doubleMirrored = applyMirror(applyMirror(pose));

    for (const [right, left] of MIRROR_PAIRS) {
      expect(doubleMirrored[right].x).toBeCloseTo(pose[right].x, 5);
      expect(doubleMirrored[right].y).toBeCloseTo(pose[right].y, 5);
      expect(doubleMirrored[left].x).toBeCloseTo(pose[left].x, 5);
      expect(doubleMirrored[left].y).toBeCloseTo(pose[left].y, 5);
    }
  });

  it('центральный сустав MID_HIP не меняет X при зеркалировании', () => {
    const pose = makeAsymmetricPose();
    const mirrored = applyMirror(pose);
    expect(mirrored[Body25Index.MID_HIP].x).toBeCloseTo(pose[Body25Index.MID_HIP].x);
  });

  it('MIRROR_PAIRS содержит ровно 11 пар без дублирований', () => {
    expect(MIRROR_PAIRS).toHaveLength(11);
    const allIndices = MIRROR_PAIRS.flatMap(([r, l]) => [r, l]);
    const unique = new Set(allIndices);
    expect(unique.size).toBe(22); // все 22 индекса уникальны
  });
});
