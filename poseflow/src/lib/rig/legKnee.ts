// src/lib/rig/legKnee.ts
//
// Knee layer of the hip-first leg solver.
// Purely femur-relative geometry: takes a fixed femur direction (output of
// the hip layer) and decides knee flexion, patella direction, and tibia
// axial twist within anatomical limits.
//
// This module is currently *not* wired into legIK.ts at runtime — slice 1
// only establishes the contract and unit tests. Slice 2 will replace
// constrainKneeFlexionWithFixedThigh and the inline knee math in legIK.ts
// with calls into this module.
//
// See: ai/tasks/leg-hierarchical-solver-design.md § Knee Joint Model.

import { Vector3 } from 'three';
import type { PelvisLegFrame, LegSide } from './legHip';

const EPS = 1e-8;
const DEG = Math.PI / 180;

// ─── Public contract ───────────────────────────────────────────────────────

export interface KneePose {
  /** Unsigned hinge angle between thigh and tibia. 0 = straight, π = folded back. */
  flexion: number;
  /**
   * Signed angle around the femur axis, measured for the bend plane.
   * 0 = bend plane is sagittal (patella faces pelvisForward).
   * Positive = bend plane rotates outward (mannequin's right for right leg,
   * mannequin's left for left leg). Per-side normalized so the same numeric
   * input describes the same anatomy on both legs.
   */
  patellaAngle: number;
  /**
   * Signed axial twist of the tibia around its own (knee->ankle) axis.
   * Anatomically only available when the knee is meaningfully bent;
   * limitKneePose collapses it toward 0 near full extension.
   *
   * Note: tibiaTwist does *not* change ankle position; it only affects
   * foot orientation. Therefore posFromKneePose ignores it and the
   * knee-only layer can round-trip it as opaque state.
   */
  tibiaTwist: number;
}

export interface KneeFrame {
  /** Unit femur direction (hip -> knee). Input from the hip layer. */
  femurAxis: Vector3;
  /** Unit reference forward in the plane perpendicular to femurAxis. */
  kneeForward: Vector3;
  /** Unit outward-side reference perpendicular to femurAxis and kneeForward. Per-leg signed. */
  kneeOutward: Vector3;
}

export interface KneeLimits {
  flexionMin: number;
  flexionMax: number;
  /** Largest allowed positive patellaAngle (outward). */
  patellaOutwardMax: number;
  /** Largest allowed |negative| patellaAngle (inward). Stored as positive magnitude. */
  patellaInwardMax: number;
  /** |tibiaTwist| limit when flexion >= tibiaTwistFlexionFold. */
  tibiaTwistAtFold: number;
  /** |tibiaTwist| limit when flexion <= tibiaTwistFlexionLock. */
  tibiaTwistAtExtension: number;
  /** Above this flexion, twist limit is `tibiaTwistAtFold`. */
  tibiaTwistFlexionFold: number;
  /** Below this flexion, twist limit is `tibiaTwistAtExtension`. Linear lerp in between. */
  tibiaTwistFlexionLock: number;
}

export type KneeLimitReason =
  | 'flexion-min'
  | 'flexion-max'
  | 'patella-outward'
  | 'patella-inward'
  | 'tibia-twist';

export interface LimitedKneePose {
  pose: KneePose;
  clamped: boolean;
  reasons: KneeLimitReason[];
}

export const DEFAULT_KNEE_LIMITS: KneeLimits = {
  flexionMin: 0,
  flexionMax: 150 * DEG,
  patellaOutwardMax: 45 * DEG,
  patellaInwardMax: 20 * DEG,
  tibiaTwistAtFold: 15 * DEG,
  tibiaTwistAtExtension: 3 * DEG,
  tibiaTwistFlexionFold: 30 * DEG,
  tibiaTwistFlexionLock: 10 * DEG,
};

// ─── Frame ──────────────────────────────────────────────────────────────────

/**
 * Build a femur-relative frame from the femur direction and the pelvis frame.
 *
 * `kneeForward` is `pelvisForward` projected onto the plane perpendicular
 * to the femur axis. Falls back to `pelvisRight` then `pelvisUp` if degenerate
 * (femur axis nearly parallel to forward).
 *
 * `kneeOutward` is per-leg signed: for the right leg it points to the
 * mannequin's right side; for the left leg it points to the mannequin's
 * left side. So a positive `patellaAngle` always means "patella rotates
 * outward" in the leg's anatomy.
 */
export function buildKneeFrame(
  femurDir: Vector3,
  pelvisFrame: PelvisLegFrame,
  side: LegSide,
): KneeFrame {
  const femurAxis = femurDir.clone();
  if (femurAxis.lengthSq() < EPS) {
    femurAxis.copy(pelvisFrame.down);
  }
  femurAxis.normalize();

  const kneeForward = projectPerpendicularUnit(pelvisFrame.forward, femurAxis);
  if (!kneeForward) {
    // femur ≈ ±pelvisForward → try right, then up.
    const fallbackRight = projectPerpendicularUnit(pelvisFrame.right, femurAxis);
    if (fallbackRight) {
      const kf = fallbackRight;
      const ko = computeOutward(kf, femurAxis, side);
      return { femurAxis, kneeForward: kf, kneeOutward: ko };
    }
    const fallbackUp = projectPerpendicularUnit(pelvisFrame.up, femurAxis);
    if (fallbackUp) {
      const kf = fallbackUp;
      const ko = computeOutward(kf, femurAxis, side);
      return { femurAxis, kneeForward: kf, kneeOutward: ko };
    }
    // Should never reach here if pelvis frame is well-formed.
    return {
      femurAxis,
      kneeForward: new Vector3(0, 0, 1),
      kneeOutward: new Vector3(side === 'r' ? 1 : -1, 0, 0),
    };
  }

  const kneeOutward = computeOutward(kneeForward, femurAxis, side);
  return { femurAxis, kneeForward, kneeOutward };
}

function computeOutward(kneeForward: Vector3, femurAxis: Vector3, side: LegSide): Vector3 {
  // kneeSide_world = kneeForward × femurAxis (right-handed; for legDown femur
  // this points to mannequin's right side regardless of leg).
  const kneeSide = new Vector3().crossVectors(kneeForward, femurAxis);
  if (kneeSide.lengthSq() < EPS) {
    return new Vector3(side === 'r' ? 1 : -1, 0, 0);
  }
  kneeSide.normalize();
  return side === 'r' ? kneeSide : kneeSide.negate();
}

function projectPerpendicularUnit(v: Vector3, axis: Vector3): Vector3 | null {
  const result = v.clone().addScaledVector(axis, -v.dot(axis));
  if (result.lengthSq() < EPS) return null;
  return result.normalize();
}

// ─── Forward direction: KneePose → positions ───────────────────────────────

/**
 * Patella direction (unit, in the plane perpendicular to femurAxis).
 * At `patellaAngle = 0` faces `kneeForward`; positive rotates toward `kneeOutward`.
 */
export function patellaDirection(
  patellaAngle: number,
  frame: KneeFrame,
): Vector3 {
  return frame.kneeForward.clone()
    .multiplyScalar(Math.cos(patellaAngle))
    .addScaledVector(frame.kneeOutward, Math.sin(patellaAngle));
}

/**
 * Tibia direction (unit, knee→ankle) for a given KneePose.
 * tibiaTwist does not affect direction.
 *
 * Geometry: at flexion = 0, tibia continues femur (= +femurAxis).
 * At flexion = π/2, tibia points opposite to patella (since the knee bends
 * away from the patella; e.g., a standing knee bend sends the heel backward
 * while the patella stays facing forward).
 */
export function tibiaDirection(
  flexion: number,
  patellaAngle: number,
  frame: KneeFrame,
): Vector3 {
  const patella = patellaDirection(patellaAngle, frame);
  return frame.femurAxis.clone()
    .multiplyScalar(Math.cos(flexion))
    .addScaledVector(patella, -Math.sin(flexion))
    .normalize();
}

/**
 * Knee + ankle world positions from a hip position, femur direction, and
 * KneePose. tibiaTwist is opaque to position computation; foot orientation
 * is the consumer's responsibility.
 */
export function posFromKneePose(
  hipPos: Vector3,
  pose: KneePose,
  frame: KneeFrame,
  boneLengths: { thigh: number; shin: number },
): { knee: Vector3; ankle: Vector3 } {
  const knee = hipPos.clone()
    .addScaledVector(frame.femurAxis, Math.max(0, boneLengths.thigh));
  const tibia = tibiaDirection(pose.flexion, pose.patellaAngle, frame);
  const ankle = knee.clone()
    .addScaledVector(tibia, Math.max(0, boneLengths.shin));
  return { knee, ankle };
}

// ─── Reverse direction: positions → KneePose ───────────────────────────────

/**
 * Measure flexion + patellaAngle from world-space hip/knee/ankle positions.
 * tibiaTwist is not derivable from positions alone; pass `tibiaTwist`
 * separately (e.g., from `measureTibiaAxialTwist(rig, side)`).
 *
 * Returns flexion in [0, π]. Returns patellaAngle = 0 when flexion is
 * near zero (bend plane is undefined for a straight leg).
 */
export function measureKneePose(
  hipPos: Vector3,
  kneePos: Vector3,
  anklePos: Vector3,
  frame: KneeFrame,
  tibiaTwist = 0,
): KneePose {
  const tibia = anklePos.clone().sub(kneePos);
  if (tibia.lengthSq() < EPS) {
    return { flexion: 0, patellaAngle: 0, tibiaTwist };
  }
  tibia.normalize();

  // Flexion = angle between femur (hip→knee) and tibia (knee→ankle).
  const cos = clamp(frame.femurAxis.dot(tibia), -1, 1);
  const flexion = Math.acos(cos);

  if (flexion < 1 * DEG) {
    return { flexion, patellaAngle: 0, tibiaTwist };
  }

  // patellaDir = -bendRadial; bendRadial = (tibia − cos(flex)*femur) / sin(flex).
  const bendRadial = tibia.clone()
    .addScaledVector(frame.femurAxis, -cos);
  if (bendRadial.lengthSq() < EPS) {
    return { flexion, patellaAngle: 0, tibiaTwist };
  }
  bendRadial.normalize();
  const patella = bendRadial.negate();

  const a = patella.dot(frame.kneeForward);
  const b = patella.dot(frame.kneeOutward);
  const patellaAngle = Math.atan2(b, a);

  // Suppress |hipPos| to keep the function interface symmetric with
  // posFromKneePose; the value is not needed for measurement.
  void hipPos;

  return { flexion, patellaAngle, tibiaTwist };
}

// ─── Limits ─────────────────────────────────────────────────────────────────

/**
 * Tibia-twist magnitude limit at a given flexion. Smoothly interpolates
 * between `tibiaTwistAtExtension` (knee locked) and `tibiaTwistAtFold`
 * (knee free), with linear lerp between `tibiaTwistFlexionLock` and
 * `tibiaTwistFlexionFold`.
 */
export function tibiaTwistLimitAtFlexion(
  flexion: number,
  limits: KneeLimits = DEFAULT_KNEE_LIMITS,
): number {
  if (flexion <= limits.tibiaTwistFlexionLock) {
    return limits.tibiaTwistAtExtension;
  }
  if (flexion >= limits.tibiaTwistFlexionFold) {
    return limits.tibiaTwistAtFold;
  }
  const span = limits.tibiaTwistFlexionFold - limits.tibiaTwistFlexionLock;
  if (span < EPS) return limits.tibiaTwistAtFold;
  const t = (flexion - limits.tibiaTwistFlexionLock) / span;
  return lerp(limits.tibiaTwistAtExtension, limits.tibiaTwistAtFold, t);
}

/** Clamp a KneePose request through the configured anatomical limits. */
export function limitKneePose(
  requested: KneePose,
  limits: KneeLimits = DEFAULT_KNEE_LIMITS,
): LimitedKneePose {
  const reasons: KneeLimitReason[] = [];

  let flexion = requested.flexion;
  if (flexion < limits.flexionMin) {
    flexion = limits.flexionMin;
    reasons.push('flexion-min');
  } else if (flexion > limits.flexionMax) {
    flexion = limits.flexionMax;
    reasons.push('flexion-max');
  }

  let patellaAngle = requested.patellaAngle;
  if (patellaAngle > limits.patellaOutwardMax) {
    patellaAngle = limits.patellaOutwardMax;
    reasons.push('patella-outward');
  } else if (patellaAngle < -limits.patellaInwardMax) {
    patellaAngle = -limits.patellaInwardMax;
    reasons.push('patella-inward');
  }

  let tibiaTwist = requested.tibiaTwist;
  const twistMax = tibiaTwistLimitAtFlexion(flexion, limits);
  if (tibiaTwist > twistMax) {
    tibiaTwist = twistMax;
    reasons.push('tibia-twist');
  } else if (tibiaTwist < -twistMax) {
    tibiaTwist = -twistMax;
    reasons.push('tibia-twist');
  }

  return {
    pose: { flexion, patellaAngle, tibiaTwist },
    clamped: reasons.length > 0,
    reasons,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
