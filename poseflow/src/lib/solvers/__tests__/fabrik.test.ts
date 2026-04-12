import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { solveFABRIK } from '../FABRIKSolver';

const EPS = 0.005; // допустимая погрешность

describe('FABRIKSolver', () => {
  it('сохраняет длины костей для достижимой цели', () => {
    const chain = [
      new Vector3(0, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 2, 0),
    ];
    const boneLengths = [1, 1];
    const target = new Vector3(1, 1.5, 0);

    const { chain: result, reached } = solveFABRIK({ chain, target, boneLengths });

    expect(reached).toBe(true);
    // Длины костей должны сохраниться
    expect(result[0].distanceTo(result[1])).toBeCloseTo(1, 2);
    expect(result[1].distanceTo(result[2])).toBeCloseTo(1, 2);
    // End-effector достигает цели
    expect(result[2].distanceTo(target)).toBeLessThan(EPS);
  });

  it('корень не двигается', () => {
    const root = new Vector3(0, 0, 0);
    const chain = [root.clone(), new Vector3(0, 1, 0), new Vector3(0, 2, 0)];
    const boneLengths = [1, 1];
    const target = new Vector3(1, 1, 0);

    const { chain: result } = solveFABRIK({ chain, target, boneLengths });

    expect(result[0].distanceTo(root)).toBeLessThan(EPS);
  });

  it('цель вне досягаемости — вытягивается в сторону цели', () => {
    const chain = [
      new Vector3(0, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 2, 0),
    ];
    const boneLengths = [1, 1];
    const target = new Vector3(0, 10, 0); // totalLength = 2, target = 10

    const { chain: result, reached } = solveFABRIK({ chain, target, boneLengths });

    expect(reached).toBe(false);
    // Цепочка вытягивается вдоль направления к цели
    expect(result[2].y).toBeGreaterThan(result[1].y);
    expect(result[1].y).toBeGreaterThan(result[0].y);
    // Длины сохраняются
    expect(result[0].distanceTo(result[1])).toBeCloseTo(1, 2);
    expect(result[1].distanceTo(result[2])).toBeCloseTo(1, 2);
  });

  it('target = текущий end-effector — цепочка не изменяется', () => {
    const chain = [
      new Vector3(0, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 2, 0),
    ];
    const boneLengths = [1, 1];
    const target = new Vector3(0, 2, 0); // уже там

    const { chain: result } = solveFABRIK({ chain, target, boneLengths });

    for (let i = 0; i < chain.length; i++) {
      expect(result[i].distanceTo(chain[i])).toBeLessThan(EPS);
    }
  });

  it('минимальная цепочка из 2 суставов', () => {
    const chain = [new Vector3(0, 0, 0), new Vector3(0, 1, 0)];
    const boneLengths = [1];
    const target = new Vector3(1, 0, 0);

    const { chain: result, reached } = solveFABRIK({ chain, target, boneLengths });

    expect(reached).toBe(true);
    expect(result[0].distanceTo(result[1])).toBeCloseTo(1, 2);
    expect(result[1].distanceTo(target)).toBeLessThan(EPS);
  });
});
