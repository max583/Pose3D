// src/lib/rig/__tests__/armIK.test.ts
// Тесты чистых функций armIK.

import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { twistElbow, worldPosToLocalRot } from '../armIK';

describe('twistElbow', () => {
  it('delta=0 не перемещает локоть', () => {
    const shoulder = new Vector3(0, 1.35, 0);
    const elbow    = new Vector3(0.47, 1.35, 0);
    const wrist    = new Vector3(0.71, 1.35, 0);

    const result = twistElbow(shoulder, elbow, wrist, 0);
    expect(result.distanceTo(elbow)).toBeCloseTo(0, 5);
  });

  it('сохраняет расстояние локтя от оси плечо→запястье', () => {
    const shoulder = new Vector3(0.18, 1.35, 0);
    const elbow    = new Vector3(0.47, 1.35, 0);
    const wrist    = new Vector3(0.71, 1.35, 0);

    const axis = new Vector3().subVectors(wrist, shoulder).normalize();
    const t    = new Vector3().subVectors(elbow, shoulder).dot(axis);
    const ctr  = shoulder.clone().addScaledVector(axis, t);
    const radiusBefore = elbow.distanceTo(ctr);

    const result = twistElbow(shoulder, elbow, wrist, Math.PI / 3);

    const t2   = new Vector3().subVectors(result, shoulder).dot(axis);
    const ctr2 = shoulder.clone().addScaledVector(axis, t2);
    const radiusAfter = result.distanceTo(ctr2);

    expect(radiusAfter).toBeCloseTo(radiusBefore, 4);
  });

  it('поворот на 2π возвращает локоть на исходное место', () => {
    const shoulder = new Vector3(0, 0, 0);
    const elbow    = new Vector3(0.3, 0.4, 0.1);
    const wrist    = new Vector3(0.6, 0, 0);

    const result = twistElbow(shoulder, elbow, wrist, 2 * Math.PI);
    expect(result.distanceTo(elbow)).toBeCloseTo(0, 4);
  });

  it('поворот перемещает локоть в другое место', () => {
    const shoulder = new Vector3(0, 0, 0);
    const elbow    = new Vector3(0, 0.4, 0);  // локоть над осью плечо→запястье
    const wrist    = new Vector3(1, 0, 0);

    const result = twistElbow(shoulder, elbow, wrist, Math.PI / 2);
    // Ожидаем смещение локтя (он повернулся вокруг оси X)
    expect(Math.abs(result.z)).toBeGreaterThan(0.1);
    expect(result.distanceTo(elbow)).toBeGreaterThan(0.1);
  });
});

describe('worldPosToLocalRot', () => {
  it('дочерний сустав в rest-позиции → поворот близкий к identity', () => {
    const parentPos    = new Vector3(0, 0, 0);
    const parentAccRot = new Quaternion();              // identity
    const restOffset   = new Vector3(0.3, 0, 0);       // rest: вдоль X
    const childRestPos = new Vector3(0.3, 0, 0);       // сустав в rest-позе

    const localRot = worldPosToLocalRot(parentPos, parentAccRot, childRestPos, restOffset);
    expect(localRot.w).toBeCloseTo(1, 4);              // identity = w≈1
  });

  it('дочерний сустав повёрнут на 90° → длина вектора localRot ≈ 1', () => {
    const parentPos    = new Vector3(0, 0, 0);
    const parentAccRot = new Quaternion();
    const restOffset   = new Vector3(1, 0, 0);   // rest: вдоль X
    const rotatedPos   = new Vector3(0, 1, 0);   // фактически: вдоль Y (90° поворот)

    const localRot = worldPosToLocalRot(parentPos, parentAccRot, rotatedPos, restOffset);
    const len = Math.sqrt(
      localRot.x ** 2 + localRot.y ** 2 + localRot.z ** 2 + localRot.w ** 2,
    );
    expect(len).toBeCloseTo(1, 5);                     // единичный кватернион
    expect(localRot.w).toBeCloseTo(Math.SQRT1_2, 4);  // 90° → w = cos(45°)
  });
});
