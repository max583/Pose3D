// src/lib/rig/__tests__/RestPose.test.ts
import { describe, it, expect } from 'vitest';
import {
  createRestPoseFromTPose,
  createRestPoseFromPose,
  getBoneLength,
  getBody25ParentMap,
  getBody25ChildrenMap,
  defaultTPose,
} from '../RestPose';
import { Body25Index } from '../../body25/body25-types';

describe('getBody25ParentMap', () => {
  it('должна содержать 25 суставов', () => {
    const m = getBody25ParentMap();
    expect(m.size).toBe(25);
  });

  it('корень MID_HIP имеет parent null', () => {
    const m = getBody25ParentMap();
    expect(m.get(Body25Index.MID_HIP)).toBeNull();
  });

  it('NECK имеет parent MID_HIP', () => {
    const m = getBody25ParentMap();
    expect(m.get(Body25Index.NECK)).toBe(Body25Index.MID_HIP);
  });

  it('все суставы кроме корня имеют ненулевого родителя', () => {
    const m = getBody25ParentMap();
    let nonRootCount = 0;
    for (const [joint, parent] of m) {
      if (joint !== Body25Index.MID_HIP) {
        expect(parent).not.toBeNull();
        nonRootCount++;
      }
    }
    expect(nonRootCount).toBe(24);
  });
});

describe('getBody25ChildrenMap', () => {
  it('MID_HIP имеет детей: NECK, RIGHT_HIP, LEFT_HIP', () => {
    const m = getBody25ChildrenMap();
    const children = m.get(Body25Index.MID_HIP) ?? [];
    expect(children).toContain(Body25Index.NECK);
    expect(children).toContain(Body25Index.RIGHT_HIP);
    expect(children).toContain(Body25Index.LEFT_HIP);
  });

  it('NOSE имеет детей: RIGHT_EYE, LEFT_EYE', () => {
    const m = getBody25ChildrenMap();
    const children = m.get(Body25Index.NOSE) ?? [];
    expect(children).toContain(Body25Index.RIGHT_EYE);
    expect(children).toContain(Body25Index.LEFT_EYE);
  });

  it('RIGHT_ANKLE имеет детей: правые пальцы + пятка', () => {
    const m = getBody25ChildrenMap();
    const children = m.get(Body25Index.RIGHT_ANKLE) ?? [];
    expect(children).toContain(Body25Index.RIGHT_BIG_TOE);
    expect(children).toContain(Body25Index.RIGHT_SMALL_TOE);
    expect(children).toContain(Body25Index.RIGHT_HEEL);
  });
});

describe('createRestPoseFromTPose', () => {
  const rest = createRestPoseFromTPose();

  it('localOffsets содержит 25 суставов', () => {
    expect(rest.localOffsets.size).toBe(25);
  });

  it('offset MID_HIP равен мировой позиции (нет родителя)', () => {
    const offset = rest.localOffsets.get(Body25Index.MID_HIP)!;
    expect(offset.x).toBeCloseTo(0.0);
    expect(offset.y).toBeCloseTo(0.9);
    expect(offset.z).toBeCloseTo(0.0);
  });

  it('offset NECK = pos[NECK] - pos[MID_HIP]', () => {
    const pose = defaultTPose();
    const offset = rest.localOffsets.get(Body25Index.NECK)!;
    expect(offset.x).toBeCloseTo(pose[Body25Index.NECK]!.x - pose[Body25Index.MID_HIP]!.x);
    expect(offset.y).toBeCloseTo(pose[Body25Index.NECK]!.y - pose[Body25Index.MID_HIP]!.y);
  });

  it('boneLengths содержит 24 пары', () => {
    expect(rest.boneLengths.size).toBe(24);
  });

  it('длина MID_HIP→NECK примерно 0.5 (по T-позе)', () => {
    const len = getBoneLength(rest, Body25Index.MID_HIP, Body25Index.NECK);
    expect(len).toBeCloseTo(0.5, 1);
  });

  it('все длины костей > 0', () => {
    for (const [, len] of rest.boneLengths) {
      expect(len).toBeGreaterThan(0);
    }
  });

  it('пятка лежит на оси лодыжка-середина пальцев в виде сверху', () => {
    const pose = defaultTPose();

    for (const side of ['RIGHT', 'LEFT'] as const) {
      const ankleIndex = side === 'RIGHT' ? Body25Index.RIGHT_ANKLE : Body25Index.LEFT_ANKLE;
      const bigToeIndex = side === 'RIGHT' ? Body25Index.RIGHT_BIG_TOE : Body25Index.LEFT_BIG_TOE;
      const smallToeIndex = side === 'RIGHT' ? Body25Index.RIGHT_SMALL_TOE : Body25Index.LEFT_SMALL_TOE;
      const heelIndex = side === 'RIGHT' ? Body25Index.RIGHT_HEEL : Body25Index.LEFT_HEEL;

      const ankle = pose[ankleIndex]!;
      const bigToe = pose[bigToeIndex]!;
      const smallToe = pose[smallToeIndex]!;
      const heel = pose[heelIndex]!;
      const toeMid = {
        x: (bigToe.x + smallToe.x) / 2,
        z: (bigToe.z + smallToe.z) / 2,
      };

      const toeAxis = { x: toeMid.x - ankle.x, z: toeMid.z - ankle.z };
      const heelAxis = { x: heel.x - ankle.x, z: heel.z - ankle.z };
      const cross = toeAxis.x * heelAxis.z - toeAxis.z * heelAxis.x;
      const dot = toeAxis.x * heelAxis.x + toeAxis.z * heelAxis.z;

      expect(cross).toBeCloseTo(0, 3);
      expect(dot).toBeLessThan(0);
    }
  });
});

describe('createRestPoseFromPose', () => {
  it('создаёт rest-позу из произвольных позиций', () => {
    const pose = {
      [Body25Index.MID_HIP]: { x: 0, y: 0, z: 0 },
      [Body25Index.NECK]:    { x: 0, y: 1, z: 0 },
    };
    const rest = createRestPoseFromPose(pose as any);
    const offset = rest.localOffsets.get(Body25Index.NECK)!;
    expect(offset.y).toBeCloseTo(1.0);
    const len = getBoneLength(rest, Body25Index.MID_HIP, Body25Index.NECK);
    expect(len).toBeCloseTo(1.0);
  });
});
