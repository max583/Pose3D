import { Quaternion, Vector3 } from 'three';
import { Body25Index } from '../body25/body25-types';
import { solveFABRIK } from '../solvers/FABRIKSolver';
import { SkeletonRig } from './SkeletonRig';
import { toVec3, worldPosToLocalRot } from './armIK';

const KNEE_FORWARD_LIMIT = 85 * Math.PI / 180;
const KNEE_BACK_LIMIT = 0;
const HIP_FORWARD_LIMIT = 120 * Math.PI / 180;
const HIP_BACK_LIMIT = 20 * Math.PI / 180;
const HIP_OUTWARD_LIMIT = 50 * Math.PI / 180;
const HIP_INWARD_LIMIT = 30 * Math.PI / 180;
const LIMIT_TOLERANCE = 1 * Math.PI / 180;
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
    boneLengths,
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
    return kneeLimited;
  }

  const hipRelimited = constrainKneeBend(
    hipLimited[0],
    hipLimited[1],
    hipLimited[2],
    bodyForward,
    boneLengths,
  );
  const finalHipLimited = constrainHipDirection(
    hipRelimited[0],
    hipRelimited[1],
    hipRelimited[2],
    bodyForward,
    bodyUp,
    side,
    boneLengths,
  );
  return constrainKneeFlexionWithFixedThigh(
    finalHipLimited[0],
    finalHipLimited[1],
    target,
    bodyForward,
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
    boneLengths,
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

  if (hipLimited[1].distanceToSquared(kneeLimited[1]) > EPS) {
    return null;
  }

  return kneeLimited;
}

export function constrainKneeBend(
  hipPos: Vector3,
  candidateKneePos: Vector3,
  candidateAnklePos: Vector3,
  bodyForward: Vector3,
  boneLengths: [number, number],
): Vector3[] {
  const [hipToKnee, kneeToAnkle] = boneLengths;
  const maxReach = hipToKnee + kneeToAnkle;
  const forwardMinDistance = distanceForFlexion(hipToKnee, kneeToAnkle, KNEE_FORWARD_LIMIT);
  const backMinDistance = distanceForFlexion(hipToKnee, kneeToAnkle, KNEE_BACK_LIMIT);

  const targetVec = candidateAnklePos.clone().sub(hipPos);
  const rawDistance = targetVec.length();
  if (rawDistance < EPS) {
    const axis = new Vector3(0, -1, 0);
    const ankle = hipPos.clone().addScaledVector(axis, forwardMinDistance);
    const knee = buildKneeOnAxis(hipPos, ankle, bodyForward, 1, hipToKnee, kneeToAnkle);
    return [hipPos.clone(), knee, ankle];
  }

  const axis = targetVec.normalize();
  const candidateSign = getTargetBendSign(hipPos, candidateKneePos, candidateAnklePos, bodyForward);
  const minDistance = candidateSign < 0 ? backMinDistance : forwardMinDistance;
  const distance = Math.min(maxReach, Math.max(minDistance, rawDistance));
  const ankle = hipPos.clone().addScaledVector(axis, distance);
  const knee = buildKneeOnAxis(
    hipPos,
    ankle,
    bodyForward,
    candidateSign,
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
    const knee = buildKneeOnAxisWithPreferredRadial(
      hipPos,
      ankle,
      preferredKneePos,
      bodyForward,
      hipToKnee,
      kneeToAnkle,
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
    hipToKnee,
    kneeToAnkle,
  );

  return [hipPos.clone(), knee, ankle];
}

export function getSignedKneeFlexion(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  bodyForward: Vector3,
): number {
  const upper = hipPos.clone().sub(kneePos);
  const lower = anklePos.clone().sub(kneePos);
  if (upper.lengthSq() < EPS || lower.lengthSq() < EPS) return 0;

  const angle = upper.angleTo(lower);
  const flexion = Math.PI - angle;
  return flexion * getKneeBendSign(hipPos, kneePos, anklePos, bodyForward);
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
  const axes = getBodyAxes(bodyForward, bodyUp);
  const dir = candidateKneePos.clone().sub(hipPos);
  if (dir.lengthSq() < EPS) {
    const knee = hipPos.clone().addScaledVector(axes.down, hipToKnee);
    const ankle = knee.clone().addScaledVector(axes.down, kneeToAnkle);
    return [hipPos.clone(), knee, ankle];
  }

  dir.normalize();
  const angles = getHipDirectionAnglesFromDir(dir, axes, side);
  const limitedForward = clamp(angles.forward, -HIP_BACK_LIMIT, HIP_FORWARD_LIMIT);
  const limitedLateral = clamp(
    angles.lateral,
    -HIP_INWARD_LIMIT,
    HIP_OUTWARD_LIMIT,
  );

  if (
    Math.abs(limitedForward - angles.forward) < EPS &&
    Math.abs(limitedLateral - angles.lateral) < EPS
  ) {
    return [hipPos.clone(), candidateKneePos.clone(), candidateAnklePos.clone()];
  }

  const limitedDir = directionFromHipAngles(limitedForward, limitedLateral, axes, side);
  const knee = hipPos.clone().addScaledVector(limitedDir, hipToKnee);
  const ankleDir = candidateAnklePos.clone().sub(knee);
  if (ankleDir.lengthSq() < EPS) {
    ankleDir.copy(limitedDir);
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
  const axes = getBodyAxes(bodyForward, bodyUp);
  const dir = kneePos.clone().sub(hipPos);
  if (dir.lengthSq() < EPS) {
    return { forward: 0, lateral: 0 };
  }
  return getHipDirectionAnglesFromDir(dir.normalize(), axes, side);
}

export function isLegIKCandidateWithinLimits(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  bodyForward: Vector3,
  bodyUp: Vector3,
  side: 'r' | 'l',
): boolean {
  const hipAngles = getSignedHipAngles(hipPos, kneePos, bodyForward, bodyUp, side);
  if (hipAngles.forward < -HIP_BACK_LIMIT - LIMIT_TOLERANCE) return false;
  if (hipAngles.forward > HIP_FORWARD_LIMIT + LIMIT_TOLERANCE) return false;
  if (hipAngles.lateral < -HIP_INWARD_LIMIT - LIMIT_TOLERANCE) return false;
  if (hipAngles.lateral > HIP_OUTWARD_LIMIT + LIMIT_TOLERANCE) return false;

  const kneeFlexion = getSignedKneeFlexion(hipPos, kneePos, anklePos, bodyForward);
  if (Math.abs(kneeFlexion) > KNEE_FORWARD_LIMIT + LIMIT_TOLERANCE) return false;

  const hipToAnkleDepth = anklePos.clone().sub(hipPos).dot(bodyForward);
  if (
    hipToAnkleDepth < -EPS &&
    Math.abs(kneeFlexion) > KNEE_BACK_LIMIT + LIMIT_TOLERANCE
  ) {
    return false;
  }

  return true;
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

  let radial = preferredKneePos.clone().sub(hipPos);
  radial.addScaledVector(axis, -radial.dot(axis));
  if (radial.lengthSq() < EPS) {
    radial = bodyForward.clone().addScaledVector(axis, -bodyForward.dot(axis));
  }
  if (radial.lengthSq() < EPS) {
    radial = getPerpendicularAxis(axis);
  }
  radial.normalize();

  return center.addScaledVector(radial, radius);
}

function getKneeBendSign(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  bodyForward: Vector3,
): 1 | -1 {
  const axis = anklePos.clone().sub(hipPos);
  if (axis.lengthSq() < EPS) return 1;
  axis.normalize();

  const centerOffset = kneePos.clone().sub(hipPos);
  const radial = centerOffset.addScaledVector(axis, -centerOffset.dot(axis));
  if (radial.lengthSq() < EPS) return 1;

  const forward = bodyForward.clone().addScaledVector(axis, -bodyForward.dot(axis));
  if (forward.lengthSq() < EPS) return 1;

  return radial.dot(forward) < 0 ? -1 : 1;
}

function getTargetBendSign(
  hipPos: Vector3,
  candidateKneePos: Vector3,
  candidateAnklePos: Vector3,
  bodyForward: Vector3,
): 1 | -1 {
  const hipToAnkle = candidateAnklePos.clone().sub(hipPos);
  const projectedForward = bodyForward.clone();
  if (projectedForward.lengthSq() < EPS) return 1;
  projectedForward.normalize();

  const targetDepth = hipToAnkle.dot(projectedForward);
  if (Math.abs(targetDepth) > EPS) return targetDepth < 0 ? -1 : 1;

  return getKneeBendSign(hipPos, candidateKneePos, candidateAnklePos, bodyForward);
}

function constrainKneeFlexionWithFixedThigh(
  hipPos: Vector3,
  kneePos: Vector3,
  desiredAnklePos: Vector3,
  bodyForward: Vector3,
  boneLengths: [number, number],
): Vector3[] {
  const [, kneeToAnkle] = boneLengths;
  const upperFromKnee = hipPos.clone().sub(kneePos);
  if (upperFromKnee.lengthSq() < EPS) {
    return [hipPos.clone(), kneePos.clone(), desiredAnklePos.clone()];
  }

  upperFromKnee.normalize();
  const straight = upperFromKnee.clone().negate();
  let radial = bodyForward.clone().addScaledVector(straight, -bodyForward.dot(straight));
  if (radial.lengthSq() < EPS) {
    radial = getPerpendicularAxis(straight);
  }
  radial.normalize();

  const candidateLower = desiredAnklePos.clone().sub(kneePos);
  if (candidateLower.lengthSq() < EPS) {
    const ankle = kneePos.clone().addScaledVector(straight, kneeToAnkle);
    return [hipPos.clone(), kneePos.clone(), ankle];
  }
  candidateLower.normalize();

  const rawFlexion = Math.atan2(candidateLower.dot(radial), candidateLower.dot(straight));
  const targetDepth = desiredAnklePos.clone().sub(hipPos).dot(bodyForward);
  const signedFlexion = Math.abs(targetDepth) > EPS
    ? Math.abs(rawFlexion) * (targetDepth < 0 ? -1 : 1)
    : rawFlexion;
  const flexion = clamp(signedFlexion, -KNEE_BACK_LIMIT, KNEE_FORWARD_LIMIT);
  const lowerDir = straight.multiplyScalar(Math.cos(flexion))
    .addScaledVector(radial, Math.sin(flexion))
    .normalize();
  const ankle = kneePos.clone().addScaledVector(lowerDir, kneeToAnkle);

  return [hipPos.clone(), kneePos.clone(), ankle];
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

function getHipDirectionAnglesFromDir(
  dir: Vector3,
  axes: ReturnType<typeof getBodyAxes>,
  side: 'r' | 'l',
): { forward: number; lateral: number } {
  const down = Math.max(EPS, dir.dot(axes.down));
  const forward = Math.atan2(dir.dot(axes.forward), down);
  const sideSign = side === 'r' ? 1 : -1;
  const lateral = Math.atan2(dir.dot(axes.right) * sideSign, down);
  return { forward, lateral };
}

function directionFromHipAngles(
  forwardAngle: number,
  lateralAngle: number,
  axes: ReturnType<typeof getBodyAxes>,
  side: 'r' | 'l',
): Vector3 {
  const sideSign = side === 'r' ? 1 : -1;
  return axes.down.clone()
    .addScaledVector(axes.forward, Math.tan(forwardAngle))
    .addScaledVector(axes.right, Math.tan(lateralAngle) * sideSign)
    .normalize();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
