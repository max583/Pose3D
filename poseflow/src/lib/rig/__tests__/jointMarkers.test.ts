import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { getJointOutsideBendDirection } from '../jointMarkers';

describe('jointMarkers', () => {
  it('points away from the adjacent bone midpoint when the joint is bent', () => {
    const direction = getJointOutsideBendDirection({
      parent: new Vector3(0, 1, 0),
      joint: new Vector3(0.2, 0, 0),
      child: new Vector3(0, -1, 0),
      fallbackDirection: new Vector3(0, 0, 1),
    });

    expect(direction.x).toBeCloseTo(1, 5);
    expect(direction.y).toBeCloseTo(0, 5);
    expect(direction.z).toBeCloseTo(0, 5);
  });

  it('uses the fallback direction for a straight limb', () => {
    const direction = getJointOutsideBendDirection({
      parent: new Vector3(0, 1, 0),
      joint: new Vector3(0, 0, 0),
      child: new Vector3(0, -1, 0),
      fallbackDirection: new Vector3(0, 0, -2),
    });

    expect(direction.x).toBeCloseTo(0, 5);
    expect(direction.y).toBeCloseTo(0, 5);
    expect(direction.z).toBeCloseTo(-1, 5);
  });

  it('uses the fallback direction for a straight limb with unequal segment lengths', () => {
    const direction = getJointOutsideBendDirection({
      parent: new Vector3(0, 1.2, 0),
      joint: new Vector3(0, 0, 0),
      child: new Vector3(0, -0.7, 0),
      fallbackDirection: new Vector3(0, 0, 3),
    });

    expect(direction.x).toBeCloseTo(0, 5);
    expect(direction.y).toBeCloseTo(0, 5);
    expect(direction.z).toBeCloseTo(1, 5);
  });
});
