import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ExportService } from '../ExportService';
import { Body25Index, type PoseData } from '../../lib/body25/body25-types';

function makeTPose(): PoseData {
  return {
    [Body25Index.NOSE]: { x: 0, y: 1.6, z: 0 },
    [Body25Index.NECK]: { x: 0, y: 1.4, z: 0 },
    [Body25Index.RIGHT_SHOULDER]: { x: 0.3, y: 1.35, z: 0 },
    [Body25Index.RIGHT_ELBOW]: { x: 0.6, y: 1.2, z: 0 },
    [Body25Index.RIGHT_WRIST]: { x: 0.8, y: 1.0, z: 0 },
    [Body25Index.LEFT_SHOULDER]: { x: -0.3, y: 1.35, z: 0 },
    [Body25Index.LEFT_ELBOW]: { x: -0.6, y: 1.2, z: 0 },
    [Body25Index.LEFT_WRIST]: { x: -0.8, y: 1.0, z: 0 },
    [Body25Index.MID_HIP]: { x: 0, y: 0.9, z: 0 },
    [Body25Index.RIGHT_HIP]: { x: 0.15, y: 0.85, z: 0 },
    [Body25Index.RIGHT_KNEE]: { x: 0.15, y: 0.45, z: 0 },
    [Body25Index.RIGHT_ANKLE]: { x: 0.15, y: 0.05, z: 0 },
    [Body25Index.LEFT_HIP]: { x: -0.15, y: 0.85, z: 0 },
    [Body25Index.LEFT_KNEE]: { x: -0.15, y: 0.45, z: 0 },
    [Body25Index.LEFT_ANKLE]: { x: -0.15, y: 0.05, z: 0 },
    [Body25Index.RIGHT_EYE]: { x: 0.05, y: 1.65, z: 0.1 },
    [Body25Index.LEFT_EYE]: { x: -0.05, y: 1.65, z: 0.1 },
    [Body25Index.RIGHT_EAR]: { x: 0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_EAR]: { x: -0.1, y: 1.6, z: 0 },
    [Body25Index.LEFT_BIG_TOE]: { x: -0.2, y: 0.0, z: 0.1 },
    [Body25Index.LEFT_SMALL_TOE]: { x: -0.25, y: 0.0, z: 0.05 },
    [Body25Index.LEFT_HEEL]: { x: -0.15, y: 0.0, z: -0.1 },
    [Body25Index.RIGHT_BIG_TOE]: { x: 0.2, y: 0.0, z: 0.1 },
    [Body25Index.RIGHT_SMALL_TOE]: { x: 0.25, y: 0.0, z: 0.05 },
    [Body25Index.RIGHT_HEEL]: { x: 0.15, y: 0.0, z: -0.1 },
  };
}

describe('ExportService.exportToOpenPoseJSON', () => {
  const res = 512;

  it('без камеры: фронтальная проекция XY для точки (0,0,0)', () => {
    const pose = makeTPose();
    pose[Body25Index.NOSE] = { x: 0, y: 0, z: 0, confidence: 0.5 };
    const json = ExportService.exportToOpenPoseJSON(pose, res);
    expect(json.version).toBe(1.3);
    expect(json.people).toHaveLength(1);
    const kp = json.people[0].pose_keypoints_2d;
    expect(kp).toHaveLength(75);
    expect(kp[0]).toBe(256);
    expect(kp[1]).toBe(512);
    expect(kp[2]).toBe(0.5);
  });

  it('без камеры: отсутствующий сустав даёт три нуля', () => {
    const pose = {} as PoseData;
    const json = ExportService.exportToOpenPoseJSON(pose, res);
    const kp = json.people[0].pose_keypoints_2d;
    expect(kp.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('с камерой: структура валидна и confidence сохраняется', () => {
    const pose = makeTPose();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 1, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    const json = ExportService.exportToOpenPoseJSON(pose, res, camera);
    const kp = json.people[0].pose_keypoints_2d;
    expect(kp).toHaveLength(75);
    for (let i = 0; i < 25; i++) {
      expect(Number.isFinite(kp[i * 3])).toBe(true);
      expect(Number.isFinite(kp[i * 3 + 1])).toBe(true);
      expect(kp[i * 3 + 2]).toBe(1);
    }
  });
});
