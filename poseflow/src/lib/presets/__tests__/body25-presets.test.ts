import { describe, it, expect } from 'vitest';
import { Body25Index } from '../../body25/body25-types';
import { getAllPosePresets, getPosePreset, POSE_PRESETS } from '../body25-presets';

describe('body25-presets', () => {
  it('POSE_PRESETS содержит 10 пресетов с уникальными id', () => {
    expect(POSE_PRESETS).toHaveLength(10);
    const ids = POSE_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(10);
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
});
