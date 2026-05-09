import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../body25/body25-types';
import { solveFABRIK } from '../solvers/FABRIKSolver';
import { SkeletonRig } from './SkeletonRig';
import { toVec3, worldPosToLocalRot } from './armIK';
import {
  isKneeAnteriorValid,
  isKneeFlexionWithinLimits,
  LEG_ANATOMY_LIMITS,
  measureKneeFlexion,
  measureTrueKneeFlexion,
} from './legAnatomy';
import {
  buildPelvisLegFrame,
  DEFAULT_HIP_LIMITS,
  getHipLateralLimits as getPelvisHipLateralLimits,
  limitHipPose,
  measureHipPose,
  solveHipDirection,
} from './legHip';
import {
  buildKneeFrame,
  posFromKneePose,
  solveKneePose,
} from './legKnee';

export interface LegIKCandidateDiagnostics {
  valid: boolean;
  reasons: string[];
  hip: {
    flexionDeg: number;
    abductionDeg: number;
    clamped: boolean;
    clampReasons: string[];
  };
  knee: {
    flexionDeg: number;
    signedFlexionDeg: number;
    anteriorValid: boolean;
    highFrontPose: boolean;
  };
}

const KNEE_FORWARD_LIMIT = LEG_ANATOMY_LIMITS.kneeFlexion.max;
const HIP_HIGH_FRONT_FLEXION_START = 90 * Math.PI / 180;
const LIMIT_TOLERANCE = 1 * Math.PI / 180;
const TARGET_TOLERANCE = 0.025;
const LIMIT_SURFACE_TOLERANCE = 1e-4;
const BRANCH_PRESERVE_TARGET_DISTANCE = 0.06;
const EPS = 1e-6;

export const LEG_JOINTS = {
  r: {
    hip: Body25Index.RIGHT_HIP,
    knee: Body25Index.RIGHT_KNEE,
    ankle: Body25Index.RIGHT_ANKLE,
  },
  l: {
    hip: Body25Index.LEFT_HIP,
    knee: Body25Index.LEFT_KNEE,
    ankle: Body25Index.LEFT_ANKLE,
  },
} as const;

export { toVec3 };

export function getHipAccRot(rig: SkeletonRig, side: 'r' | 'l'): Quaternion {
  const { hip } = LEG_JOINTS[side];
  const hipLocalRot = rig.localRotations.get(hip) ?? new Quaternion();
  return rig.rootRotation.clone().multiply(hipLocalRot);
}

export function applyLegChainToRig(
  rig: SkeletonRig,
  side: 'r' | 'l',
  hipPos: Vector3,
  newKneePos: Vector3,
  newAnklePos: Vector3,
): void {
  const { knee, ankle } = LEG_JOINTS[side];
  const hipAccRot = getHipAccRot(rig, side);

  const kneeRestOffset = rig.rest.localOffsets.get(knee)!;
  const newKneeLocalRot = worldPosToLocalRot(
    hipPos,
    hipAccRot,
    newKneePos,
    kneeRestOffset,
  );
  rig.localRotations.set(knee, newKneeLocalRot);

  const kneeAccRot = hipAccRot.clone().multiply(newKneeLocalRot);
  const ankleRestOffset = rig.rest.localOffsets.get(ankle)!;
  const newAnkleLocalRot = worldPosToLocalRot(
    newKneePos,
    kneeAccRot,
    newAnklePos,
    ankleRestOffset,
  );
  rig.localRotations.set(ankle, newAnkleLocalRot);
}

export function getLegBoneLengths(rig: SkeletonRig, side: 'r' | 'l'): [number, number] {
  const { hip, knee, ankle } = LEG_JOINTS[side];
  const hk = rig.rest.boneLengths.get(`${hip}-${knee}`) ?? 0.43;
  const ka = rig.rest.boneLengths.get(`${knee}-${ankle}`) ?? 0.37;
  return [hk, ka];
}

export function solveLegFABRIK(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  target: Vector3,
  boneLengths: [number, number],
  bodyForward: Vector3 = new Vector3(0, 0, 1),
  bodyUp: Vector3 = new Vector3(0, 1, 0),
  side: 'r' | 'l' = 'r',
): Vector3[] {
  const preserveCurrentBranch = shouldPreserveCurrentKneeBranch(
    hipPos,
    kneePos,
    anklePos,
    target,
    bodyForward,
    bodyUp,
    side,
  );
  const result = solveFABRIK({
    chain: [hipPos.clone(), kneePos.clone(), anklePos.clone()],
    target,
    boneLengths,
  });
  const kneeLimited = constrainKneeBendPreserveTwist(
    hipPos,
    kneePos,
    result.chain[2],
    bodyForward,
    bodyUp,
    side,
    boneLengths,
    preserveCurrentBranch,
  );
  const hipLimited = constrainHipDirection(
    kneeLimited[0],
    kneeLimited[1],
    kneeLimited[2],
    bodyForward,
    bodyUp,
    side,
    boneLengths,
  );
  if (hipLimited[1].distanceToSquared(kneeLimited[1]) < EPS) {
    return solveKneePoseWithFixedThigh(
      kneeLimited[0],
      kneeLimited[1],
      kneeLimited[2],
      bodyForward,
      bodyUp,
      side,
      boneLengths,
    );
  }

  return solveKneePoseWithFixedThigh(
    hipLimited[0],
    hipLimited[1],
    target,
    bodyForward,
    bodyUp,
    side,
    boneLengths,
  );
}

export function solveLegIKWithinLimits(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  target: Vector3,
  boneLengths: [number, number],
  bodyForward: Vector3 = new Vector3(0, 0, 1),
  bodyUp: Vector3 = new Vector3(0, 1, 0),
  side: 'r' | 'l' = 'r',
): Vector3[] | null {
  const preserveCurrentBranch = shouldPreserveCurrentKneeBranch(
    hipPos,
    kneePos,
    anklePos,
    target,
    bodyForward,
    bodyUp,
    side,
  );
  const result = solveFABRIK({
    chain: [hipPos.clone(), kneePos.clone(), anklePos.clone()],
    target,
    boneLengths,
  });
  const kneeLimited = constrainKneeBendPreserveTwist(
    hipPos,
    kneePos,
    result.chain[2],
    bodyForward,
    bodyUp,
    side,
    boneLengths,
    preserveCurrentBranch,
  );
  const hipLimited = constrainHipDirection(
    kneeLimited[0],
    kneeLimited[1],
    kneeLimited[2],
    bodyForward,
    bodyUp,
    side,
    boneLengths,
  );

  const targetHighFront = isHighFrontTarget(hipPos, target, bodyForward, bodyUp, side);
  const kneeLimitedValid = isLegIKCandidateWithinLimits(
    kneeLimited[0],
    kneeLimited[1],
    kneeLimited[2],
    bodyForward,
    bodyUp,
    side,
  );
  const kneeLimitedImprovesTarget = kneeLimited[2].distanceTo(target)
    < anklePos.distanceTo(target) - LIMIT_SURFACE_TOLERANCE;

  if (
    hipLimited[1].distanceToSquared(kneeLimited[1]) > EPS ||
    !kneeLimitedValid ||
    (targetHighFront && !kneeLimitedImprovesTarget)
  ) {
    const hipLimitedValid = isLegIKCandidateWithinLimits(
      hipLimited[0],
      hipLimited[1],
      hipLimited[2],
      bodyForward,
      bodyUp,
      side,
    );
    const hipLimitedImprovesTarget = hipLimited[2].distanceTo(target)
      < anklePos.distanceTo(target) - LIMIT_SURFACE_TOLERANCE;
    if (hipLimitedValid && hipLimitedImprovesTarget) {
      return hipLimited;
    }

    // D3: try hip-first solver before FABRIK; it is the natural primary path for
    // high-front targets and a reliable fallback for other targets.
    const hipFirst = solveLegIKHipFirst(
      hipPos,
      kneePos,
      anklePos,
      target,
      boneLengths,
      bodyForward,
      bodyUp,
      side,
    );
    if (hipFirst) {
      const improvesHipFirstTargetDistance = hipFirst[2].distanceTo(target)
        < anklePos.distanceTo(target) - LIMIT_SURFACE_TOLERANCE;
      if (
        hipFirst[2].distanceTo(target) <= TARGET_TOLERANCE ||
        (targetHighFront && improvesHipFirstTargetDistance)
      ) {
        return hipFirst;
      }
    }

    const relimited = solveLegFABRIK(
      hipPos,
      kneePos,
      anklePos,
      target,
      boneLengths,
      bodyForward,
      bodyUp,
      side,
    );
    const validRelimited = isLegIKCandidateWithinLimits(
      relimited[0],
      relimited[1],
      relimited[2],
      bodyForward,
      bodyUp,
      side,
    );
    const improvesTargetDistance = relimited[2].distanceTo(target)
      < anklePos.distanceTo(target) - LIMIT_SURFACE_TOLERANCE;
    if (
      validRelimited &&
      (
        relimited[2].distanceTo(target) <= TARGET_TOLERANCE ||
        (targetHighFront && improvesTargetDistance)
      )
    ) {
      return relimited;
    }

    return null;
  }

  return kneeLimited;
}

export function constrainKneeBend(
  hipPos: Vector3,
  candidateAnklePos: Vector3,
  bodyForward: Vector3,
  boneLengths: [number, number],
): Vector3[] {
  const [hipToKnee, kneeToAnkle] = boneLengths;
  const maxReach = hipToKnee + kneeToAnkle;
  const forwardMinDistance = distanceForFlexion(hipToKnee, kneeToAnkle, KNEE_FORWARD_LIMIT);

  const targetVec = candidateAnklePos.clone().sub(hipPos);
  const rawDistance = targetVec.length();
  if (rawDistance < EPS) {
    const axis = new Vector3(0, -1, 0);
    const ankle = hipPos.clone().addScaledVector(axis, forwardMinDistance);
    const knee = buildKneeOnAxis(hipPos, ankle, bodyForward, 1, hipToKnee, kneeToAnkle);
    return [hipPos.clone(), knee, ankle];
  }

  const axis = targetVec.normalize();
  const minDistance = forwardMinDistance;
  const distance = Math.min(maxReach, Math.max(minDistance, rawDistance));
  const ankle = hipPos.clone().addScaledVector(axis, distance);
  const knee = buildKneeOnAxis(
    hipPos,
    ankle,
    bodyForward,
    1,
    hipToKnee,
    kneeToAnkle,
  );

  return [hipPos.clone(), knee, ankle];
}

export function constrainKneeBendPreserveTwist(
  hipPos: Vector3,
  preferredKneePos: Vector3,
  candidateAnklePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
  boneLengths: [number, number],
  preserveCurrentBranch: boolean = true,
): Vector3[] {
  const [hipToKnee, kneeToAnkle] = boneLengths;
  const maxReach = hipToKnee + kneeToAnkle;
  const forwardMinDistance = distanceForFlexion(hipToKnee, kneeToAnkle, KNEE_FORWARD_LIMIT);

  const targetVec = candidateAnklePos.clone().sub(hipPos);
  const rawDistance = targetVec.length();
  if (rawDistance < EPS) {
    const axis = new Vector3(0, -1, 0);
    const ankle = hipPos.clone().addScaledVector(axis, forwardMinDistance);
    const knee = buildKneeOnAxisWithPreferredRadial(
      hipPos,
      ankle,
      preferredKneePos,
      bodyForward,
      bodyUp,
      side,
      hipToKnee,
      kneeToAnkle,
      preserveCurrentBranch,
    );
    return [hipPos.clone(), knee, ankle];
  }

  const axis = targetVec.normalize();
  const distance = Math.min(maxReach, Math.max(forwardMinDistance, rawDistance));
  const ankle = hipPos.clone().addScaledVector(axis, distance);
  const knee = buildKneeOnAxisWithPreferredRadial(
    hipPos,
    ankle,
    preferredKneePos,
    bodyForward,
    bodyUp,
    side,
    hipToKnee,
    kneeToAnkle,
    preserveCurrentBranch,
  );

  return [hipPos.clone(), knee, ankle];
}

export function getSignedKneeFlexion(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  bodyForward: Vector3,
): number {
  return measureKneeFlexion(
    { hip: hipPos, knee: kneePos, ankle: anklePos },
    bodyForward,
  );
}

export function constrainHipDirection(
  hipPos: Vector3,
  candidateKneePos: Vector3,
  candidateAnklePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
  boneLengths: [number, number],
): Vector3[] {
  const [hipToKnee, kneeToAnkle] = boneLengths;
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const dir = candidateKneePos.clone().sub(hipPos);
  if (dir.lengthSq() < EPS) {
    const knee = hipPos.clone().addScaledVector(frame.down, hipToKnee);
    const ankle = knee.clone().addScaledVector(frame.down, kneeToAnkle);
    return [hipPos.clone(), knee, ankle];
  }

  const solved = solveHipDirection(hipPos, candidateKneePos, hipToKnee, frame);

  if (!solved.limited.clamped) {
    return [hipPos.clone(), candidateKneePos.clone(), candidateAnklePos.clone()];
  }

  const knee = solved.knee;
  const ankleDir = candidateAnklePos.clone().sub(knee);
  if (ankleDir.lengthSq() < EPS) {
    ankleDir.copy(solved.limited.pose.direction);
  }
  ankleDir.normalize();
  const ankle = knee.clone().addScaledVector(ankleDir, kneeToAnkle);

  return [hipPos.clone(), knee, ankle];
}

export function getSignedHipAngles(
  hipPos: Vector3,
  kneePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): { forward: number; lateral: number } {
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const dir = kneePos.clone().sub(hipPos);
  if (dir.lengthSq() < EPS) {
    return { forward: 0, lateral: 0 };
  }
  const pose = measureHipPose(dir, frame);
  return { forward: pose.flexion, lateral: pose.abduction };
}

export function isLegIKCandidateWithinLimits(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): boolean {
  return getLegIKCandidateDiagnostics(
    hipPos,
    kneePos,
    anklePos,
    bodyForward,
    bodyUp,
    side,
  ).valid;
}

export function getLegIKCandidateDiagnostics(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): LegIKCandidateDiagnostics {
  const hipAngles = getSignedHipAngles(hipPos, kneePos, bodyForward, bodyUp, side);
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const hipPose = measureHipPose(kneePos.clone().sub(hipPos), frame);
  const limitedHip = limitHipPose(hipPose, frame);
  const reasons: string[] = [];
  if (
    limitedHip.clamped &&
    (
      Math.abs(limitedHip.pose.flexion - hipPose.flexion) > LIMIT_TOLERANCE ||
      Math.abs(limitedHip.pose.abduction - hipPose.abduction) > LIMIT_TOLERANCE
    )
  ) {
    reasons.push(`hip:${limitedHip.reasons.join(',')}`);
  }

  const legPoints = { hip: hipPos, knee: kneePos, ankle: anklePos };
  const kneeAboveHip = kneePos.clone().sub(hipPos).dot(bodyUp.clone().normalize()) > 0;
  const highFrontPose = kneeAboveHip
    && hipAngles.forward > HIP_HIGH_FRONT_FLEXION_START - LIMIT_TOLERANCE
    && Math.abs(hipAngles.lateral) <= getPelvisHipLateralLimits(hipAngles.forward).abductionMax + LIMIT_TOLERANCE;
  const anteriorValid = isKneeAnteriorValid(legPoints, bodyForward);
  if (!anteriorValid) {
    reasons.push('knee:patella-back');
  }

  const signedKneeFlexion = measureKneeFlexion(legPoints, bodyForward);
  const trueKneeFlexion = measureTrueKneeFlexion(legPoints);
  if (!isKneeFlexionWithinLimits(trueKneeFlexion, {
    min: LEG_ANATOMY_LIMITS.kneeFlexion.min - LIMIT_TOLERANCE,
    max: LEG_ANATOMY_LIMITS.kneeFlexion.max + LIMIT_TOLERANCE,
  })) {
    reasons.push('knee:flexion-limit');
  }

  return {
    valid: reasons.length === 0,
    reasons,
    hip: {
      flexionDeg: radiansToDegrees(hipAngles.forward),
      abductionDeg: radiansToDegrees(hipAngles.lateral),
      clamped: limitedHip.clamped,
      clampReasons: limitedHip.reasons,
    },
    knee: {
      flexionDeg: radiansToDegrees(trueKneeFlexion),
      signedFlexionDeg: radiansToDegrees(signedKneeFlexion),
      anteriorValid,
      highFrontPose,
    },
  };
}

export function twistKnee(
  hip: Vector3,
  knee: Vector3,
  ankle: Vector3,
  delta: number,
): Vector3 {
  const axis = ankle.clone().sub(hip);
  if (axis.lengthSq() < EPS) return knee.clone();
  axis.normalize();

  const t = knee.clone().sub(hip).dot(axis);
  const arcCenter = hip.clone().addScaledVector(axis, t);
  const radialVec = knee.clone().sub(arcCenter);
  if (radialVec.lengthSq() < EPS) return knee.clone();

  const q = new Quaternion().setFromAxisAngle(axis, delta);
  radialVec.applyQuaternion(q);

  return arcCenter.add(radialVec);
}

function buildKneeOnAxis(
  hipPos: Vector3,
  anklePos: Vector3,
  bodyForward: Vector3,
  sign: 1 | -1,
  hipToKnee: number,
  kneeToAnkle: number,
): Vector3 {
  const hipToAnkle = anklePos.clone().sub(hipPos);
  const distance = Math.max(EPS, hipToAnkle.length());
  const axis = hipToAnkle.normalize();
  const along = (
    hipToKnee ** 2 -
    kneeToAnkle ** 2 +
    distance ** 2
  ) / (2 * distance);
  const radius = Math.sqrt(Math.max(0, hipToKnee ** 2 - along ** 2));
  const center = hipPos.clone().addScaledVector(axis, along);

  let radial = bodyForward.clone().addScaledVector(axis, -bodyForward.dot(axis));
  if (radial.lengthSq() < EPS) {
    radial = getPerpendicularAxis(axis);
  }
  radial.normalize().multiplyScalar(sign);

  return center.addScaledVector(radial, radius);
}

function buildKneeOnAxisWithPreferredRadial(
  hipPos: Vector3,
  anklePos: Vector3,
  preferredKneePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
  hipToKnee: number,
  kneeToAnkle: number,
  preservePreferredInHighFront: boolean = false,
  enforceAnteriorWhenPreserving: boolean = false,
): Vector3 {
  const hipToAnkle = anklePos.clone().sub(hipPos);
  const distance = Math.max(EPS, hipToAnkle.length());
  const axis = hipToAnkle.normalize();
  const along = (
    hipToKnee ** 2 -
    kneeToAnkle ** 2 +
    distance ** 2
  ) / (2 * distance);
  const radius = Math.sqrt(Math.max(0, hipToKnee ** 2 - along ** 2));
  const center = hipPos.clone().addScaledVector(axis, along);

  const axes = getBodyAxes(bodyForward, bodyUp);
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const { limited: solvedHipForTarget } = solveHipDirection(
    hipPos,
    hipPos.clone().addScaledVector(axis, hipToKnee),
    hipToKnee,
    frame,
  );
  const targetLateralLimit = getPelvisHipLateralLimits(solvedHipForTarget.pose.flexion);
  const preferHighFrontBranch = solvedHipForTarget.pose.flexion > DEFAULT_HIP_LIMITS.highFlexionStart
    && Math.abs(solvedHipForTarget.pose.abduction) <= targetLateralLimit.abductionMax + LIMIT_TOLERANCE;
  const preferredThighDir = preferredKneePos.clone().sub(hipPos);
  const preferredAngles = preferredThighDir.lengthSq() >= EPS
    ? measureHipPose(preferredThighDir.normalize(), frame)
    : null;
  const preserveCurrentHighFrontBranch = Boolean(
    preservePreferredInHighFront &&
    preferredAngles &&
    preferredAngles.flexion > Math.PI / 2,
  );

  let radial = preferHighFrontBranch && !preserveCurrentHighFrontBranch
    ? axes.up.clone()
    : preferredKneePos.clone().sub(hipPos);
  radial.addScaledVector(axis, -radial.dot(axis));
  if (radial.lengthSq() < EPS) {
    radial = bodyForward.clone().addScaledVector(axis, -bodyForward.dot(axis));
  }
  if (radial.lengthSq() < EPS) {
    radial = getPerpendicularAxis(axis);
  }
  radial.normalize();

  const anterior = bodyForward.clone().addScaledVector(axis, -bodyForward.dot(axis));
  const shouldEnforceAnterior = enforceAnteriorWhenPreserving
    ? (!preferHighFrontBranch || preservePreferredInHighFront)
    : (!preserveCurrentHighFrontBranch && !preferHighFrontBranch);
  if (
    shouldEnforceAnterior &&
    anterior.lengthSq() >= EPS &&
    radial.dot(anterior.normalize()) < 0
  ) {
    radial.negate();
  }

  return center.addScaledVector(radial, radius);
}

function solveKneePoseWithFixedThigh(
  hipPos: Vector3,
  kneePos: Vector3,
  desiredAnklePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
  boneLengths: [number, number],
): Vector3[] {
  const [hipToKnee, kneeToAnkle] = boneLengths;
  const femurDir = kneePos.clone().sub(hipPos);
  if (femurDir.lengthSq() < EPS) {
    return [hipPos.clone(), kneePos.clone(), desiredAnklePos.clone()];
  }

  const pelvisFrame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const kneeFrame = buildKneeFrame(femurDir, pelvisFrame, side);
  const limitedKnee = solveKneePose(
    hipPos,
    desiredAnklePos,
    kneeFrame,
    { thigh: hipToKnee, shin: kneeToAnkle },
  );
  if (!limitedKnee) {
    return [hipPos.clone(), kneePos.clone(), desiredAnklePos.clone()];
  }

  const { knee, ankle } = posFromKneePose(
    hipPos,
    limitedKnee.pose,
    kneeFrame,
    { thigh: hipToKnee, shin: kneeToAnkle },
  );
  return [hipPos.clone(), knee, ankle];
}

function solveLegIKHipFirst(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  target: Vector3,
  boneLengths: [number, number],
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): Vector3[] | null {
  const [hipToKnee] = boneLengths;
  const currentThighChain = solveKneePoseWithFixedThigh(
    hipPos,
    kneePos,
    target,
    bodyForward,
    bodyUp,
    side,
    boneLengths,
  );
  if (
    currentThighChain[2].distanceTo(target) < anklePos.distanceTo(target) - LIMIT_SURFACE_TOLERANCE &&
    isLegIKCandidateWithinLimits(
      currentThighChain[0],
      currentThighChain[1],
      currentThighChain[2],
      bodyForward,
      bodyUp,
      side,
    )
  ) {
    return currentThighChain;
  }

  const reachableChain = solveReachableAnkleWithLimitedHip(
    hipPos,
    kneePos,
    target,
    bodyForward,
    bodyUp,
    side,
    boneLengths,
  );
  if (
    reachableChain[2].distanceTo(target) < anklePos.distanceTo(target) - LIMIT_SURFACE_TOLERANCE &&
    isHipFirstReachCandidateAcceptable(
      reachableChain,
      bodyForward,
      bodyUp,
      side,
    )
  ) {
    return reachableChain;
  }

  const requestedDirection = target.clone().sub(hipPos);
  if (requestedDirection.lengthSq() < EPS) {
    requestedDirection.copy(kneePos).sub(hipPos);
  }
  if (requestedDirection.lengthSq() < EPS) return null;

  requestedDirection.normalize();
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const { knee } = solveHipDirection(
    hipPos,
    hipPos.clone().addScaledVector(requestedDirection, hipToKnee),
    hipToKnee,
    frame,
    DEFAULT_HIP_LIMITS,
  );
  const chain = solveKneePoseWithFixedThigh(
    hipPos,
    knee,
    target,
    bodyForward,
    bodyUp,
    side,
    boneLengths,
  );

  if (!isLegIKCandidateWithinLimits(
    chain[0],
    chain[1],
    chain[2],
    bodyForward,
    bodyUp,
    side,
  )) {
    return null;
  }

  return chain;
}

export function solveReachableAnkleWithLimitedHip(
  hipPos: Vector3,
  preferredKneePos: Vector3,
  target: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
  boneLengths: [number, number],
): Vector3[] {
  const [hipToKnee, kneeToAnkle] = boneLengths;
  const maxReach = hipToKnee + kneeToAnkle;
  const minReach = distanceForFlexion(hipToKnee, kneeToAnkle, KNEE_FORWARD_LIMIT);
  const targetVec = target.clone().sub(hipPos);
  if (targetVec.lengthSq() < EPS) {
    targetVec.copy(preferredKneePos).sub(hipPos);
  }
  if (targetVec.lengthSq() < EPS) {
    targetVec.copy(bodyUp).negate();
  }

  const axis = targetVec.normalize();
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const { knee: hipLimitedPreferredKnee } = solveHipDirection(
    hipPos,
    preferredKneePos,
    hipToKnee,
    frame,
    DEFAULT_HIP_LIMITS,
  );

  const minDistance = clamp(target.distanceTo(hipPos), minReach, maxReach);
  const nearest = buildReachableChainAtDistance(
    hipPos,
    hipLimitedPreferredKnee,
    axis,
    minDistance,
    bodyForward,
    bodyUp,
    side,
    hipToKnee,
    kneeToAnkle,
  );
  if (isHipFirstReachCandidateAcceptable(nearest, bodyForward, bodyUp, side)) {
    return nearest;
  }

  const steps = 32;
  for (let i = 1; i <= steps; i += 1) {
    const distance = minDistance + (maxReach - minDistance) * (i / steps);
    const candidate = buildReachableChainAtDistance(
      hipPos,
      hipLimitedPreferredKnee,
      axis,
      distance,
      bodyForward,
      bodyUp,
      side,
      hipToKnee,
      kneeToAnkle,
    );
    if (isHipFirstReachCandidateAcceptable(candidate, bodyForward, bodyUp, side)) {
      return candidate;
    }
  }

  return nearest;
}

function buildReachableChainAtDistance(
  hipPos: Vector3,
  preferredKneePos: Vector3,
  axis: Vector3,
  distance: number,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
  hipToKnee: number,
  kneeToAnkle: number,
): Vector3[] {
  const ankle = hipPos.clone().addScaledVector(axis, distance);
  const knee = buildKneeOnAxisWithPreferredRadial(
    hipPos,
    ankle,
    preferredKneePos,
    bodyForward,
    bodyUp,
    side,
    hipToKnee,
    kneeToAnkle,
    true,
    true,
  );

  return [hipPos.clone(), knee, ankle];
}

function isHipFirstReachCandidateAcceptable(
  chain: Vector3[],
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): boolean {
  return isLegIKCandidateWithinLimits(
    chain[0],
    chain[1],
    chain[2],
    bodyForward,
    bodyUp,
    side,
  );
}

function getBodyAxes(bodyForward: Vector3, bodyUp: Vector3) {
  let forward = bodyForward.clone();
  if (forward.lengthSq() < EPS) forward = new Vector3(0, 0, 1);
  forward.normalize();

  let up = bodyUp.clone().addScaledVector(forward, -bodyUp.dot(forward));
  if (up.lengthSq() < EPS) up = new Vector3(0, 1, 0);
  up.normalize();

  const right = up.clone().cross(forward).normalize();
  const down = up.clone().negate();
  return { forward, up, right, down };
}

function isHighFrontTarget(
  hipPos: Vector3,
  target: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): boolean {
  const targetDir = target.clone().sub(hipPos);
  if (targetDir.lengthSq() < EPS) return false;
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const angles = measureHipPose(targetDir, frame);
  const lateralLimits = getPelvisHipLateralLimits(angles.flexion);
  return angles.flexion > DEFAULT_HIP_LIMITS.highFlexionStart
    && Math.abs(angles.abduction) <= lateralLimits.abductionMax + LIMIT_TOLERANCE;
}

function shouldPreserveCurrentKneeBranch(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  target: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): boolean {
  if (anklePos.distanceTo(target) <= BRANCH_PRESERVE_TARGET_DISTANCE) return true;

  const thighDir = kneePos.clone().sub(hipPos);
  if (thighDir.lengthSq() < EPS) return false;
  const frame = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const currentPose = measureHipPose(thighDir, frame);
  return currentPose.flexion > HIP_HIGH_FRONT_FLEXION_START;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function radiansToDegrees(value: number): number {
  return value * 180 / Math.PI;
}

function distanceForFlexion(hipToKnee: number, kneeToAnkle: number, flexion: number): number {
  const kneeAngle = Math.PI - flexion;
  return Math.sqrt(
    hipToKnee ** 2 +
    kneeToAnkle ** 2 -
    2 * hipToKnee * kneeToAnkle * Math.cos(kneeAngle),
  );
}

function getPerpendicularAxis(axis: Vector3): Vector3 {
  const base = Math.abs(axis.y) < 0.9
    ? new Vector3(0, 1, 0)
    : new Vector3(1, 0, 0);
  return base.cross(axis).normalize();
}
