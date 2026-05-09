import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import {
  buildKneeFrame,
  DEFAULT_KNEE_LIMITS,
  limitKneePose,
  measureKneePose,
  patellaDirection,
  posFromKneePose,
  tibiaDirection,
  tibiaTwistLimitAtFlexion,
} from '../legKnee';
import { buildPelvisLegFrame } from '../legHip';

const DEG = Math.PI / 180;
const TOL = 1 * DEG;

const bodyForward = new Vector3(0, 0, 1);
const bodyUp = new Vector3(0, 1, 0);

function legDownFrame(side: 'r' | 'l') {
  const pelvis = buildPelvisLegFrame(bodyForward, bodyUp, side);
  const femurDir = pelvis.down.clone();
  const knee = buildKneeFrame(femurDir, pelvis, side);
  return { pelvis, femurDir, knee };
}

describe('legKnee', () => {
  describe('frame', () => {
    it('builds a sane frame for a standing right leg', () => {
      const { knee } = legDownFrame('r');
      expect(knee.femurAxis.distanceTo(new Vector3(0, -1, 0))).toBeLessThan(1e-6);
      expect(knee.kneeForward.distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-6);
      expect(knee.kneeOutward.distanceTo(new Vector3(1, 0, 0))).toBeLessThan(1e-6);
    });

    it('flips kneeOutward for the left leg', () => {
      const { knee } = legDownFrame('l');
      expect(knee.kneeOutward.distanceTo(new Vector3(-1, 0, 0))).toBeLessThan(1e-6);
    });

    it('falls back when femur is parallel to pelvisForward', () => {
      const pelvis = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
      // femur axis points along pelvisForward — degenerate for kneeForward projection.
      const knee = buildKneeFrame(new Vector3(0, 0, 1), pelvis, 'r');
      // kneeForward must be perpendicular to femurAxis and unit length.
      expect(Math.abs(knee.femurAxis.dot(knee.kneeForward))).toBeLessThan(1e-6);
      expect(knee.kneeForward.length()).toBeCloseTo(1, 5);
      expect(Math.abs(knee.femurAxis.dot(knee.kneeOutward))).toBeLessThan(1e-6);
      expect(knee.kneeOutward.length()).toBeCloseTo(1, 5);
    });
  });

  describe('K1 neutral straight leg', () => {
    it('places ankle directly below hip; round-trip yields zero flexion and patella', () => {
      const { knee } = legDownFrame('r');
      const hip = new Vector3();
      const { knee: kneePos, ankle } = posFromKneePose(
        hip,
        { flexion: 0, patellaAngle: 0, tibiaTwist: 0 },
        knee,
        { thigh: 1, shin: 1 },
      );

      expect(kneePos.distanceTo(new Vector3(0, -1, 0))).toBeLessThan(1e-6);
      expect(ankle.distanceTo(new Vector3(0, -2, 0))).toBeLessThan(1e-6);

      const measured = measureKneePose(hip, kneePos, ankle, knee);
      expect(measured.flexion).toBeCloseTo(0, 5);
      expect(measured.patellaAngle).toBeCloseTo(0, 5);

      const limited = limitKneePose({ flexion: 0, patellaAngle: 0, tibiaTwist: 0 });
      expect(limited.clamped).toBe(false);
    });
  });

  describe('K2 natural deep fold', () => {
    it('allows flexion 140 deg in the sagittal plane', () => {
      const { knee } = legDownFrame('r');
      const hip = new Vector3();
      const pose = { flexion: 140 * DEG, patellaAngle: 0, tibiaTwist: 0 };
      const { knee: kneePos, ankle } = posFromKneePose(hip, pose, knee, { thigh: 1, shin: 1 });

      // Ankle should move forward-no, backward (heel toward butt) and lift up.
      // Standing leg bent: femurAxis points down; tibia bends backward (toward -kneeForward).
      expect(ankle.x).toBeCloseTo(0, 5);
      expect(ankle.z).toBeLessThan(0); // backward
      expect(ankle.y).toBeGreaterThan(-1); // lifted relative to straight (-2)

      const measured = measureKneePose(hip, kneePos, ankle, knee);
      expect(measured.flexion).toBeCloseTo(140 * DEG, 5);
      expect(measured.patellaAngle).toBeCloseTo(0, 5);

      const limited = limitKneePose(pose);
      expect(limited.clamped).toBe(false);
    });
  });

  describe('K3 hyperextension request clamps to flexion.min', () => {
    it('rejects negative flexion', () => {
      const limited = limitKneePose({ flexion: -10 * DEG, patellaAngle: 0, tibiaTwist: 0 });
      expect(limited.clamped).toBe(true);
      expect(limited.reasons).toContain('flexion-min');
      expect(limited.pose.flexion).toBeCloseTo(0, 5);
    });
  });

  describe('K4 beyond max fold clamps to flexion.max', () => {
    it('clamps 170 deg request', () => {
      const limited = limitKneePose({ flexion: 170 * DEG, patellaAngle: 0, tibiaTwist: 0 });
      expect(limited.clamped).toBe(true);
      expect(limited.reasons).toContain('flexion-max');
      expect(limited.pose.flexion).toBeCloseTo(DEFAULT_KNEE_LIMITS.flexionMax, 5);
    });
  });

  describe('K5 Q-angle outward', () => {
    it('round-trips patellaAngle = +25 deg on the right leg', () => {
      const { knee } = legDownFrame('r');
      const hip = new Vector3();
      const pose = { flexion: 90 * DEG, patellaAngle: 25 * DEG, tibiaTwist: 0 };
      const { knee: kneePos, ankle } = posFromKneePose(hip, pose, knee, { thigh: 1, shin: 1 });

      const measured = measureKneePose(hip, kneePos, ankle, knee);
      expect(measured.flexion).toBeCloseTo(90 * DEG, 5);
      expect(measured.patellaAngle).toBeCloseTo(25 * DEG, 5);

      const limited = limitKneePose(pose);
      expect(limited.clamped).toBe(false);
    });
  });

  describe('K6 excessive outward patella clamps', () => {
    it('clamps patellaAngle to +45 deg', () => {
      const limited = limitKneePose({ flexion: 90 * DEG, patellaAngle: 70 * DEG, tibiaTwist: 0 });
      expect(limited.clamped).toBe(true);
      expect(limited.reasons).toContain('patella-outward');
      expect(limited.pose.patellaAngle).toBeCloseTo(DEFAULT_KNEE_LIMITS.patellaOutwardMax, 5);
    });
  });

  describe('K7 mild inward patella allowed', () => {
    it('does not clamp patellaAngle = -10 deg', () => {
      const limited = limitKneePose({ flexion: 90 * DEG, patellaAngle: -10 * DEG, tibiaTwist: 0 });
      expect(limited.clamped).toBe(false);
      expect(limited.pose.patellaAngle).toBeCloseTo(-10 * DEG, 5);
    });
  });

  describe('K8 excessive inward patella clamps', () => {
    it('clamps patellaAngle to -20 deg', () => {
      const limited = limitKneePose({ flexion: 90 * DEG, patellaAngle: -40 * DEG, tibiaTwist: 0 });
      expect(limited.clamped).toBe(true);
      expect(limited.reasons).toContain('patella-inward');
      expect(limited.pose.patellaAngle).toBeCloseTo(-DEFAULT_KNEE_LIMITS.patellaInwardMax, 5);
    });
  });

  describe('K9 tibia twist at deep fold allowed', () => {
    it('does not clamp twist 10 deg at flexion 90 deg', () => {
      const limited = limitKneePose({
        flexion: 90 * DEG,
        patellaAngle: 0,
        tibiaTwist: 10 * DEG,
      });
      expect(limited.clamped).toBe(false);
      expect(limited.pose.tibiaTwist).toBeCloseTo(10 * DEG, 5);
    });
  });

  describe('K10 excessive tibia twist at deep fold clamps', () => {
    it('clamps twist 25 deg to +15 deg at flexion 90 deg', () => {
      const limited = limitKneePose({
        flexion: 90 * DEG,
        patellaAngle: 0,
        tibiaTwist: 25 * DEG,
      });
      expect(limited.clamped).toBe(true);
      expect(limited.reasons).toContain('tibia-twist');
      expect(limited.pose.tibiaTwist).toBeCloseTo(DEFAULT_KNEE_LIMITS.tibiaTwistAtFold, 5);
    });
  });

  describe('K11 tibia twist near extension is locked', () => {
    it('clamps twist 10 deg to ~3 deg at flexion 5 deg', () => {
      const limited = limitKneePose({
        flexion: 5 * DEG,
        patellaAngle: 0,
        tibiaTwist: 10 * DEG,
      });
      expect(limited.clamped).toBe(true);
      expect(limited.reasons).toContain('tibia-twist');
      expect(limited.pose.tibiaTwist).toBeCloseTo(DEFAULT_KNEE_LIMITS.tibiaTwistAtExtension, 5);
    });
  });

  describe('K12 right/left mirror', () => {
    it('mirrors ankle position across x = 0 for the same KneePose', () => {
      const right = legDownFrame('r');
      const left = legDownFrame('l');
      const hip = new Vector3();
      const pose = { flexion: 90 * DEG, patellaAngle: 25 * DEG, tibiaTwist: 0 };
      const rightAnkle = posFromKneePose(hip, pose, right.knee, { thigh: 1, shin: 1 }).ankle;
      const leftAnkle = posFromKneePose(hip, pose, left.knee, { thigh: 1, shin: 1 }).ankle;

      expect(rightAnkle.x).toBeCloseTo(-leftAnkle.x, 5);
      expect(rightAnkle.y).toBeCloseTo(leftAnkle.y, 5);
      expect(rightAnkle.z).toBeCloseTo(leftAnkle.z, 5);
    });
  });

  describe('K13 femur-tilt invariance', () => {
    it('round-trips KneePose when femur is forward-flexed 60 deg', () => {
      const pelvis = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
      const femurDir = new Vector3(0, -Math.cos(60 * DEG), Math.sin(60 * DEG));
      const knee = buildKneeFrame(femurDir, pelvis, 'r');
      const hip = new Vector3(0.1, 0.5, -0.2);
      const pose = { flexion: 90 * DEG, patellaAngle: 0, tibiaTwist: 0 };
      const { knee: kneePos, ankle } = posFromKneePose(hip, pose, knee, { thigh: 0.43, shin: 0.42 });

      // Knee must lie 0.43 along femurDir from hip.
      expect(kneePos.distanceTo(hip)).toBeCloseTo(0.43, 5);

      const measured = measureKneePose(hip, kneePos, ankle, knee);
      expect(measured.flexion).toBeCloseTo(90 * DEG, 5);
      expect(measured.patellaAngle).toBeCloseTo(0, 5);
    });
  });

  describe('K14 root-rotated mannequin', () => {
    it('produces the same KneePose values after applying root rotation to all inputs', () => {
      const pelvis = buildPelvisLegFrame(bodyForward, bodyUp, 'r');
      const femurDir = pelvis.down.clone();
      const knee = buildKneeFrame(femurDir, pelvis, 'r');
      const hip = new Vector3();
      const pose = { flexion: 110 * DEG, patellaAngle: 30 * DEG, tibiaTwist: 0 };
      const { knee: baseKneePos, ankle: baseAnkle } = posFromKneePose(
        hip, pose, knee, { thigh: 1, shin: 1 },
      );

      const q = new Quaternion()
        .setFromAxisAngle(new Vector3(0.3, 1, 0.2).normalize(), 67 * DEG);
      const rotForward = bodyForward.clone().applyQuaternion(q);
      const rotUp = bodyUp.clone().applyQuaternion(q);
      const rotPelvis = buildPelvisLegFrame(rotForward, rotUp, 'r');
      const rotFemur = femurDir.clone().applyQuaternion(q);
      const rotKnee = buildKneeFrame(rotFemur, rotPelvis, 'r');
      const rotHip = hip.clone().applyQuaternion(q);
      const rotKneePos = baseKneePos.clone().applyQuaternion(q);
      const rotAnkle = baseAnkle.clone().applyQuaternion(q);

      const measured = measureKneePose(rotHip, rotKneePos, rotAnkle, rotKnee);
      expect(measured.flexion).toBeCloseTo(110 * DEG, 5);
      expect(measured.patellaAngle).toBeCloseTo(30 * DEG, 5);
    });
  });

  describe('helpers', () => {
    it('patellaDirection at angle 0 equals kneeForward', () => {
      const { knee } = legDownFrame('r');
      const p = patellaDirection(0, knee);
      expect(p.distanceTo(knee.kneeForward)).toBeLessThan(1e-6);
    });

    it('tibiaDirection at flexion 0 equals femurAxis', () => {
      const { knee } = legDownFrame('r');
      const t = tibiaDirection(0, 0, knee);
      expect(t.distanceTo(knee.femurAxis)).toBeLessThan(1e-6);
    });

    it('tibiaTwistLimitAtFlexion lerps between extension and fold ranges', () => {
      const limits = DEFAULT_KNEE_LIMITS;
      // At lock threshold and below: extension range.
      expect(tibiaTwistLimitAtFlexion(0)).toBeCloseTo(limits.tibiaTwistAtExtension, 6);
      expect(tibiaTwistLimitAtFlexion(limits.tibiaTwistFlexionLock))
        .toBeCloseTo(limits.tibiaTwistAtExtension, 6);
      // At fold threshold and above: fold range.
      expect(tibiaTwistLimitAtFlexion(limits.tibiaTwistFlexionFold))
        .toBeCloseTo(limits.tibiaTwistAtFold, 6);
      expect(tibiaTwistLimitAtFlexion(170 * DEG)).toBeCloseTo(limits.tibiaTwistAtFold, 6);
      // Midpoint: arithmetic mean.
      const mid = (limits.tibiaTwistFlexionLock + limits.tibiaTwistFlexionFold) / 2;
      const expected = (limits.tibiaTwistAtExtension + limits.tibiaTwistAtFold) / 2;
      expect(tibiaTwistLimitAtFlexion(mid)).toBeCloseTo(expected, 6);
    });

    it('limitKneePose collects multiple reasons in one pass', () => {
      const limited = limitKneePose({
        flexion: -5 * DEG,
        patellaAngle: 90 * DEG,
        tibiaTwist: 30 * DEG,
      });
      expect(limited.clamped).toBe(true);
      expect(limited.reasons).toContain('flexion-min');
      expect(limited.reasons).toContain('patella-outward');
      // Twist is evaluated at the *clamped* flexion (= 0), so the limit is the extension range.
      expect(limited.reasons).toContain('tibia-twist');
      expect(limited.pose.tibiaTwist)
        .toBeCloseTo(DEFAULT_KNEE_LIMITS.tibiaTwistAtExtension, 5);
    });

    it('measureKneePose accepts an external tibiaTwist value', () => {
      const { knee } = legDownFrame('r');
      const hip = new Vector3();
      const { knee: kneePos, ankle } = posFromKneePose(
        hip,
        { flexion: 90 * DEG, patellaAngle: 0, tibiaTwist: 0 },
        knee,
        { thigh: 1, shin: 1 },
      );
      const measured = measureKneePose(hip, kneePos, ankle, knee, 12 * DEG);
      expect(measured.tibiaTwist).toBeCloseTo(12 * DEG, 5);
    });
  });
});

// keep TOL referenced so unused-locals stay happy when tests rely on tighter tolerance.
void TOL;
