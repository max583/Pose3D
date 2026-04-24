import { describe, it, expect, beforeEach } from 'vitest';
import { PoseService } from '../PoseService';
import { Body25Index } from '../../lib/body25/body25-types';

describe('PoseService', () => {
  let svc: PoseService;

  beforeEach(() => {
    svc = new PoseService();
  });

  it('новый сервис: T-pose и 25 суставов', () => {
    const pose = svc.getPoseData();
    const keys = Object.keys(pose).map(Number);
    expect(keys.length).toBe(25);
    expect(pose[Body25Index.MID_HIP].y).toBeCloseTo(0.9, 5);
  });

  it('translate сдвигает все суставы', () => {
    const before = svc.getPoseData()[Body25Index.NOSE];
    svc.translate(0.1, -0.2, 0.3);
    const after = svc.getPoseData()[Body25Index.NOSE];
    expect(after.x).toBeCloseTo(before.x + 0.1, 5);
    expect(after.y).toBeCloseTo(before.y - 0.2, 5);
    expect(after.z).toBeCloseTo(before.z + 0.3, 5);
  });

  it('undo после translate откатывает позу', () => {
    const orig = svc.getPoseData()[Body25Index.NOSE];
    svc.translate(1, 0, 0);
    expect(svc.canUndo).toBe(true);
    svc.undo();
    const back = svc.getPoseData()[Body25Index.NOSE];
    expect(back.x).toBeCloseTo(orig.x, 5);
    expect(back.y).toBeCloseTo(orig.y, 5);
  });

  it('reset возвращает T-pose', () => {
    svc.translate(5, 5, 5);
    svc.reset();
    expect(svc.getPoseData()[Body25Index.MID_HIP].y).toBeCloseTo(0.9, 5);
  });

  it('double mirrorPose восстанавливает симметрию по x (пара правый/левый)', () => {
    const p0 = svc.getPoseData();
    const rs0 = p0[Body25Index.RIGHT_SHOULDER].x;
    const ls0 = p0[Body25Index.LEFT_SHOULDER].x;
    svc.mirrorPose();
    svc.mirrorPose();
    const p2 = svc.getPoseData();
    expect(p2[Body25Index.RIGHT_SHOULDER].x).toBeCloseTo(rs0, 5);
    expect(p2[Body25Index.LEFT_SHOULDER].x).toBeCloseTo(ls0, 5);
  });

  it('scale умножает координаты', () => {
    svc.scale(2);
    const hip = svc.getPoseData()[Body25Index.MID_HIP];
    expect(hip.y).toBeCloseTo(0.9 * 2, 5);
  });

  // ─── Multiple skeletons support (Step 9) ──────────────────────────────────

  it('начальное количество скелетов равно 1', () => {
    expect(svc.getSkeletonCount()).toBe(1);
  });

  it('активный скелет по умолчанию имеет id 0', () => {
    expect(svc.getActiveSkeletonId()).toBe(0);
  });

  it('добавление скелета увеличивает количество', () => {
    const newId = svc.addSkeleton();
    expect(svc.getSkeletonCount()).toBe(2);
    expect(newId).toBe(1);
  });

  it('переключение активного скелета', () => {
    svc.addSkeleton();
    svc.setActiveSkeletonId(1);
    expect(svc.getActiveSkeletonId()).toBe(1);
  });

  it('получение позы скелета по id', () => {
    const pose0 = svc.getSkeletonPose(0);
    expect(pose0[Body25Index.MID_HIP].y).toBeCloseTo(0.9, 5);
  });

  it('установка позы скелета по id', () => {
    const newPose = { ...svc.getSkeletonPose(0) };
    newPose[Body25Index.MID_HIP] = { x: 0, y: 2, z: 0 };
    svc.setSkeletonPose(0, newPose);
    const updated = svc.getSkeletonPose(0);
    expect(updated[Body25Index.MID_HIP].y).toBe(2);
  });

  it('удаление скелета уменьшает количество', () => {
    svc.addSkeleton();
    expect(svc.getSkeletonCount()).toBe(2);
    svc.removeSkeleton(1);
    expect(svc.getSkeletonCount()).toBe(1);
  });

  it('нельзя удалить последний скелет', () => {
    expect(() => svc.removeSkeleton(0)).toThrow('Cannot remove the last skeleton');
  });

  it('undo после добавления скелета', () => {
    svc.addSkeleton();
    expect(svc.getSkeletonCount()).toBe(2);
    svc.undo();
    expect(svc.getSkeletonCount()).toBe(1);
  });
});
