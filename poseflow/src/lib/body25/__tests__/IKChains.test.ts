import { describe, it, expect } from 'vitest';
import { Body25Index } from '../body25-types';
import { getIKChainForJoint, IK_CHAINS, IK_END_EFFECTORS } from '../IKChains';

describe('IKChains', () => {
  it('IK_CHAINS содержит 4 цепочки (руки и ноги)', () => {
    expect(IK_CHAINS).toHaveLength(4);
    expect(IK_CHAINS.map(c => c.name)).toEqual([
      'rightArm',
      'leftArm',
      'rightLeg',
      'leftLeg',
    ]);
  });

  it('getIKChainForJoint возвращает цепочку для сустава внутри IK', () => {
    const arm = getIKChainForJoint(Body25Index.RIGHT_ELBOW);
    expect(arm).not.toBeNull();
    expect(arm!.joints).toContain(Body25Index.RIGHT_ELBOW);
    expect(arm!.endEffector).toBe(Body25Index.RIGHT_WRIST);
  });

  it('getIKChainForJoint возвращает ту же цепочку для root и end-effector', () => {
    const fromRoot = getIKChainForJoint(Body25Index.RIGHT_SHOULDER);
    const fromEnd = getIKChainForJoint(Body25Index.RIGHT_WRIST);
    expect(fromRoot).toBe(fromEnd);
  });

  it('getIKChainForJoint возвращает null для сустава вне IK (например NOSE)', () => {
    expect(getIKChainForJoint(Body25Index.NOSE)).toBeNull();
    expect(getIKChainForJoint(Body25Index.MID_HIP)).toBeNull();
  });

  it('IK_END_EFFECTORS — ровно по одному на цепочку', () => {
    expect(IK_END_EFFECTORS.size).toBe(4);
    expect(IK_END_EFFECTORS.has(Body25Index.RIGHT_WRIST)).toBe(true);
    expect(IK_END_EFFECTORS.has(Body25Index.LEFT_WRIST)).toBe(true);
    expect(IK_END_EFFECTORS.has(Body25Index.RIGHT_ANKLE)).toBe(true);
    expect(IK_END_EFFECTORS.has(Body25Index.LEFT_ANKLE)).toBe(true);
  });
});
