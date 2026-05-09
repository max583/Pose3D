import { describe, it, expect } from 'vitest';
import { Euler } from 'three';
import { Body25Index } from '../../body25/body25-types';
import { resolveSkeleton } from '../../rig/resolveSkeleton';
import { getAllPosePresets, getPosePreset, POSE_PRESETS } from '../body25-presets';

describe('body25-presets', () => {
  it('POSE_PRESETS содержит 12 пресетов с уникальными id', () => {
    expect(POSE_PRESETS).toHaveLength(13);
    const ids = POSE_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(13);
  });

  it('каждый пресет содержит все 25 ключевых точек', () => {
    for (const p of getAllPosePresets()) {
      for (let i = 0; i < 25; i++) {
        const j = p.poseData[i as Body25Index];
        expect(j, `preset ${p.id} missing joint ${i}`).toBeDefined();
        expect(typeof j!.x).toBe('number');
        expect(typeof j!.y).toBe('number');
        expect(typeof j!.z).toBe('number');
      }
    }
  });

  it('getPosePreset находит известный id и undefined для неизвестного', () => {
    expect(getPosePreset('t-pose')?.name).toBe('T-Pose');
    expect(getPosePreset('no-such-preset')).toBeUndefined();
  });

  it('arabesque похож на базовый side-view reference: опора вниз, свободная нога назад', () => {
    const arabesque = getPosePreset('arabesque')?.poseData;

    expect(arabesque).toBeDefined();
    expect(arabesque![Body25Index.RIGHT_ANKLE].y).toBeLessThan(0.1);
    expect(arabesque![Body25Index.LEFT_ANKLE].y).toBeGreaterThan(arabesque![Body25Index.LEFT_HIP].y);
    expect(arabesque![Body25Index.LEFT_ANKLE].z).toBeGreaterThan(arabesque![Body25Index.LEFT_HIP].z + 0.75);
    expect(arabesque![Body25Index.NOSE].z).toBeLessThan(arabesque![Body25Index.MID_HIP].z);
    expect(arabesque![Body25Index.RIGHT_WRIST].z).toBeLessThan(arabesque![Body25Index.RIGHT_SHOULDER].z);
    expect(arabesque![Body25Index.LEFT_WRIST].z).toBeGreaterThan(arabesque![Body25Index.LEFT_SHOULDER].z);
  });

  it('forward-fold похож на side-view наклон вперед: таз высоко, корпус и руки к полу', () => {
    const fold = getPosePreset('forward-fold')?.poseData;

    expect(fold).toBeDefined();
    expect(fold![Body25Index.MID_HIP].y).toBeGreaterThan(fold![Body25Index.NECK].y);
    expect(fold![Body25Index.NECK].z).toBeLessThan(fold![Body25Index.MID_HIP].z - 0.45);
    expect(fold![Body25Index.NOSE].y).toBeLessThan(fold![Body25Index.NECK].y);
    expect(fold![Body25Index.RIGHT_WRIST].y).toBeLessThan(0.1);
    expect(fold![Body25Index.LEFT_WRIST].y).toBeLessThan(0.1);
    expect(fold![Body25Index.RIGHT_KNEE].y).toBeGreaterThan(fold![Body25Index.RIGHT_ANKLE].y + 0.35);
    expect(fold![Body25Index.LEFT_KNEE].y).toBeGreaterThan(fold![Body25Index.LEFT_ANKLE].y + 0.35);
  });

  it('forward-fold-hip-hinge сгибается тазом, а не позвоночником', () => {
    const preset = getPosePreset('forward-fold-hip-hinge');

    expect(preset?.createRig).toBeDefined();

    const rig = preset!.createRig!();
    const rootEuler = new Euler().setFromQuaternion(rig.rootRotation, 'YXZ');
    const pose = resolveSkeleton(rig).pose;

    expect(rootEuler.x).toBeLessThan(-1.2);
    expect(Math.abs(rig.spineAngles.bendX)).toBeLessThan(1e-6);
    expect(Math.abs(rig.spineAngles.bendZ)).toBeLessThan(1e-6);
    expect(Math.abs(rig.spineAngles.twistY)).toBeLessThan(1e-6);
    expect(rig.neckAngles.bendX).toBeGreaterThan(0.2);
    expect(pose[Body25Index.NECK].z).toBeLessThan(pose[Body25Index.MID_HIP].z - 0.4);
    expect(pose[Body25Index.NECK].y).toBeLessThan(pose[Body25Index.MID_HIP].y);
    expect(pose[Body25Index.RIGHT_KNEE].y).toBeGreaterThan(pose[Body25Index.RIGHT_ANKLE].y + 0.3);
    expect(pose[Body25Index.LEFT_KNEE].y).toBeGreaterThan(pose[Body25Index.LEFT_ANKLE].y + 0.3);
  });
});
