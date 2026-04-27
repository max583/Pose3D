// src/lib/rig/__tests__/elements.test.ts
import { describe, it, expect } from 'vitest';
import {
  JOINT_TO_ELEMENT,
  getElementForJoint,
  getJointsForElement,
  ALL_ELEMENTS,
} from '../elements';
import { Body25Index } from '../../body25/body25-types';

describe('JOINT_TO_ELEMENT', () => {
  it('содержит все 25 суставов', () => {
    expect(JOINT_TO_ELEMENT.size).toBe(25);
  });

  it('MID_HIP → pelvis', () => {
    expect(getElementForJoint(Body25Index.MID_HIP)).toBe('pelvis');
  });

  it('NECK → spine', () => {
    expect(getElementForJoint(Body25Index.NECK)).toBe('spine');
  });

  it('RIGHT_ELBOW → arm_r', () => {
    expect(getElementForJoint(Body25Index.RIGHT_ELBOW)).toBe('arm_r');
  });

  it('LEFT_KNEE → leg_l', () => {
    expect(getElementForJoint(Body25Index.LEFT_KNEE)).toBe('leg_l');
  });

  it('RIGHT_BIG_TOE → foot_r', () => {
    expect(getElementForJoint(Body25Index.RIGHT_BIG_TOE)).toBe('foot_r');
  });
});

describe('ELEMENT_TO_JOINTS', () => {
  it('pelvis содержит MID_HIP, RIGHT_HIP, LEFT_HIP', () => {
    const joints = getJointsForElement('pelvis');
    expect(joints).toContain(Body25Index.MID_HIP);
    expect(joints).toContain(Body25Index.RIGHT_HIP);
    expect(joints).toContain(Body25Index.LEFT_HIP);
  });

  it('элементы с суставами имеют хотя бы один (hand_r/hand_l — без суставов до Stage 5)', () => {
    // hand_r и hand_l пока не имеют своих суставов: WRIST → arm_r/arm_l
    const elementsWithoutJoints = new Set(['hand_r', 'hand_l']);
    for (const el of ALL_ELEMENTS) {
      const joints = getJointsForElement(el);
      if (!elementsWithoutJoints.has(el)) {
        expect(joints.length).toBeGreaterThan(0);
      }
    }
  });

  it('суммарное число суставов по всем элементам = 25 (hand_r/hand_l пустые)', () => {
    let total = 0;
    for (const el of ALL_ELEMENTS) {
      total += getJointsForElement(el).length;
    }
    // 25 суставов = 3(pelvis)+3(spine)+1(neck)+4(head)+2(arm_r)+2(arm_l)+0(hand_r)+0(hand_l)+2(leg_r)+2(leg_l)+3(foot_r)+3(foot_l)
    expect(total).toBe(25);
  });
});

describe('getElementForJoint', () => {
  it('возвращает null для несуществующего индекса', () => {
    expect(getElementForJoint(999 as Body25Index)).toBeNull();
  });
});
