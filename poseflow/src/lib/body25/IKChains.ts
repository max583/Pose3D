// IKChains.ts — определение IK-цепочек для BODY_25
import { Body25Index } from './body25-types';

export interface IKChainDef {
  name: string;
  /** Суставы от root до end-effector */
  joints: Body25Index[];
  endEffector: Body25Index;
  root: Body25Index;
}

export const IK_CHAINS: IKChainDef[] = [
  {
    name: 'rightArm',
    joints: [Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_ELBOW, Body25Index.RIGHT_WRIST],
    endEffector: Body25Index.RIGHT_WRIST,
    root: Body25Index.RIGHT_SHOULDER,
  },
  {
    name: 'leftArm',
    joints: [Body25Index.LEFT_SHOULDER, Body25Index.LEFT_ELBOW, Body25Index.LEFT_WRIST],
    endEffector: Body25Index.LEFT_WRIST,
    root: Body25Index.LEFT_SHOULDER,
  },
  {
    name: 'rightLeg',
    joints: [Body25Index.RIGHT_HIP, Body25Index.RIGHT_KNEE, Body25Index.RIGHT_ANKLE],
    endEffector: Body25Index.RIGHT_ANKLE,
    root: Body25Index.RIGHT_HIP,
  },
  {
    name: 'leftLeg',
    joints: [Body25Index.LEFT_HIP, Body25Index.LEFT_KNEE, Body25Index.LEFT_ANKLE],
    endEffector: Body25Index.LEFT_ANKLE,
    root: Body25Index.LEFT_HIP,
  },
];

/** Найти цепочку, в которой joint является end-effector или промежуточным суставом */
export function getIKChainForJoint(joint: Body25Index): IKChainDef | null {
  return IK_CHAINS.find(c => c.joints.includes(joint)) ?? null;
}

/** Set индексов, являющихся end-effectors */
export const IK_END_EFFECTORS = new Set<Body25Index>(
  IK_CHAINS.map(c => c.endEffector),
);
