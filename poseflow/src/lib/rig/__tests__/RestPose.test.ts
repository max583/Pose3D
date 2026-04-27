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
