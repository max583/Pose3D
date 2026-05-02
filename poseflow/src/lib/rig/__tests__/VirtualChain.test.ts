// src/lib/rig/__tests__/VirtualChain.test.ts
import { describe, it, expect } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import {
  createVirtualChain,
  setBend,
  setBendAtStart,
  getEndPosition,
  getSegmentPositions,
  getEndRotation,
  getTotalBendAngle,
  getTotalTwistAngle,
} from '../VirtualChain';

const TOTAL_LENGTH = 0.5; // длина кости (например, позвоночник)
const SEGMENTS = 4;

describe('createVirtualChain', () => {
  it('создаёт цепочку с нейтральными поворотами', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    expect(chain.segments).toBe(SEGMENTS);
    expect(chain.segmentLength).toBeCloseTo(TOTAL_LENGTH / SEGMENTS);
    expect(chain.rotations).toHaveLength(SEGMENTS);
    for (const q of chain.rotations) {
      expect(q.w).toBeCloseTo(1);
      expect(q.x).toBeCloseTo(0);
      expect(q.y).toBeCloseTo(0);
      expect(q.z).toBeCloseTo(0);
    }
  });

  it('clamps segments to minimum 1', () => {
    const chain = createVirtualChain(0, 1.0);
    expect(chain.segments).toBe(1);
  });
});

describe('setBend + getEndPosition (нейтральная поза)', () => {
  it('нейтральный изгиб: конец цепочки точно выше начала', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    const neutral = setBend(chain, 0, 0, 0);
    const start = new Vector3(0, 0, 0);
    const parentRot = new Quaternion(); // identity
    const restDir = new Vector3(0, 1, 0); // вертикально вверх

    const end = getEndPosition(neutral, start, parentRot, restDir);
    expect(end.x).toBeCloseTo(0);
    expect(end.y).toBeCloseTo(TOTAL_LENGTH);
    expect(end.z).toBeCloseTo(0);
  });
});

describe('setBend + getEndPosition (изгиб вперёд)', () => {
  it('изгиб вперёд: конец смещается вперёд, длина сохраняется', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    // Изгиб 90° вперёд (bendX = π/2 → цепочка горизонтальна вдоль Z)
    const bent = setBend(chain, Math.PI / 2, 0, 0);
    const start = new Vector3(0, 0, 0);
    const parentRot = new Quaternion();
    const restDir = new Vector3(0, 1, 0);

    const positions = getSegmentPositions(bent, start, parentRot, restDir);

    // Общая длина пути по сегментам должна быть равна TOTAL_LENGTH
    let pathLen = 0;
    let prev = start;
    for (const pos of positions) {
      pathLen += prev.distanceTo(pos);
      prev = pos;
    }
    expect(pathLen).toBeCloseTo(TOTAL_LENGTH, 3);
  });

  it('изгиб 30°: длина от start до end < TOTAL_LENGTH (chord < arc)', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    const bent = setBend(chain, (30 * Math.PI) / 180, 0, 0);
    const start = new Vector3(0, 0, 0);
    const end = getEndPosition(bent, start, new Quaternion(), new Vector3(0, 1, 0));

    // Прямое расстояние < длины пути
    const chord = start.distanceTo(end);
    expect(chord).toBeLessThanOrEqual(TOTAL_LENGTH + 1e-6);
  });
});

describe('setBend + getTotalBendAngle/getTotalTwistAngle', () => {
  it('после setBend суммарный угол изгиба примерно равен заданному', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    const angleDeg = 45;
    const angleRad = (angleDeg * Math.PI) / 180;
    const bent = setBend(chain, angleRad, 0, 0);

    const total = getTotalBendAngle(bent);
    expect(total).toBeCloseTo(angleRad, 2);
  });

  it('после setBend суммарный twist примерно равен заданному', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    const twistRad = (30 * Math.PI) / 180;
    const twisted = setBend(chain, 0, 0, twistRad);

    const total = getTotalTwistAngle(twisted);
    expect(total).toBeCloseTo(twistRad, 2);
  });

  it('нейтральная цепочка: оба угла ≈ 0', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    const neutral = setBend(chain, 0, 0, 0);
    expect(getTotalBendAngle(neutral)).toBeCloseTo(0);
    expect(getTotalTwistAngle(neutral)).toBeCloseTo(0);
  });
});

describe('setBendAtStart', () => {
  it('puts the full bend into the first chain segment', () => {
    const chain = createVirtualChain(2, TOTAL_LENGTH);
    const bent = setBendAtStart(chain, Math.PI / 6, Math.PI / 8, 0);

    const first = new Euler().setFromQuaternion(bent.rotations[0], 'YXZ');
    const second = new Euler().setFromQuaternion(bent.rotations[1], 'YXZ');

    expect(first.x).toBeCloseTo(Math.PI / 6);
    expect(first.z).toBeCloseTo(Math.PI / 8);
    expect(second.x).toBeCloseTo(0);
    expect(second.z).toBeCloseTo(0);
  });
});

describe('getEndRotation', () => {
  it('нейтральный: конечный поворот = parentRot', () => {
    const chain = createVirtualChain(SEGMENTS, TOTAL_LENGTH);
    const neutral = setBend(chain, 0, 0, 0);
    const parentRot = new Quaternion(); // identity

    const endRot = getEndRotation(neutral, parentRot);
    expect(endRot.w).toBeCloseTo(1);
    expect(endRot.x).toBeCloseTo(0);
    expect(endRot.y).toBeCloseTo(0);
    expect(endRot.z).toBeCloseTo(0);
  });
});
