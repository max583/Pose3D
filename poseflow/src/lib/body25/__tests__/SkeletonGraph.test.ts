import { describe, it, expect, beforeEach } from 'vitest';
import { SkeletonGraph } from '../SkeletonGraph';
import { Body25Index, PoseData } from '../body25-types';

/** Минимальная поза: все суставы в уникальных позициях на сетке */
function makePose(): PoseData {
  const pose: Partial<PoseData> = {};
  for (let i = 0; i < 25; i++) {
    pose[i as Body25Index] = { x: i * 0.1, y: i * 0.05, z: 0 };
  }
  return pose as PoseData;
}

describe('SkeletonGraph', () => {
  let graph: SkeletonGraph;

  beforeEach(() => {
    graph = new SkeletonGraph();
  });

  // ─── Структура дерева ───────────────────────────────────────────────────────

  it('getDescendants(MID_HIP) возвращает все 24 остальных сустава', () => {
    const desc = graph.getDescendants(Body25Index.MID_HIP);
    expect(desc).toHaveLength(24);
    expect(desc).not.toContain(Body25Index.MID_HIP);
  });

  it('getDescendants(RIGHT_WRIST) пустой — листовой сустав', () => {
    const desc = graph.getDescendants(Body25Index.RIGHT_WRIST);
    expect(desc).toHaveLength(0);
  });

  it('getDescendants(NECK) включает руки и голову, но не ноги', () => {
    const desc = graph.getDescendants(Body25Index.NECK);
    // Должны присутствовать
    expect(desc).toContain(Body25Index.RIGHT_SHOULDER);
    expect(desc).toContain(Body25Index.LEFT_SHOULDER);
    expect(desc).toContain(Body25Index.RIGHT_ELBOW);
    expect(desc).toContain(Body25Index.RIGHT_WRIST);
    expect(desc).toContain(Body25Index.NOSE);
    // Ноги не входят в поддерево NECK
    expect(desc).not.toContain(Body25Index.RIGHT_HIP);
    expect(desc).not.toContain(Body25Index.LEFT_KNEE);
    expect(desc).not.toContain(Body25Index.RIGHT_ANKLE);
  });

  it('getChain(RIGHT_SHOULDER, RIGHT_WRIST) возвращает [2, 3, 4]', () => {
    const chain = graph.getChain(Body25Index.RIGHT_SHOULDER, Body25Index.RIGHT_WRIST);
    expect(chain).toEqual([
      Body25Index.RIGHT_SHOULDER,
      Body25Index.RIGHT_ELBOW,
      Body25Index.RIGHT_WRIST,
    ]);
  });

  it('getChain(LEFT_HIP, LEFT_ANKLE) возвращает [12, 13, 14]', () => {
    const chain = graph.getChain(Body25Index.LEFT_HIP, Body25Index.LEFT_ANKLE);
    expect(chain).toEqual([
      Body25Index.LEFT_HIP,
      Body25Index.LEFT_KNEE,
      Body25Index.LEFT_ANKLE,
    ]);
  });

  // ─── FK-пропагация ─────────────────────────────────────────────────────────

  it('applyFK на листовом суставе двигает только его самого', () => {
    const pose = makePose();
    const newPos = { x: 99, y: 99, z: 99 };
    const result = graph.applyFK(pose, Body25Index.RIGHT_WRIST, newPos);

    expect(result[Body25Index.RIGHT_WRIST]).toEqual(newPos);
    // Остальные суставы не тронуты
    expect(result[Body25Index.RIGHT_ELBOW]).toEqual(pose[Body25Index.RIGHT_ELBOW]);
    expect(result[Body25Index.RIGHT_SHOULDER]).toEqual(pose[Body25Index.RIGHT_SHOULDER]);
  });

  it('applyFK(NECK) сдвигает все суставы верхней части на одинаковый delta', () => {
    const pose = makePose();
    const old = pose[Body25Index.NECK];
    const newPos = { x: old.x + 1, y: old.y + 2, z: old.z + 3 };
    const result = graph.applyFK(pose, Body25Index.NECK, newPos);

    // Шея на новом месте
    expect(result[Body25Index.NECK]).toEqual(newPos);

    // Правое плечо сдвинуто на тот же delta
    const rShoulder = pose[Body25Index.RIGHT_SHOULDER];
    expect(result[Body25Index.RIGHT_SHOULDER].x).toBeCloseTo(rShoulder.x + 1, 6);
    expect(result[Body25Index.RIGHT_SHOULDER].y).toBeCloseTo(rShoulder.y + 2, 6);
    expect(result[Body25Index.RIGHT_SHOULDER].z).toBeCloseTo(rShoulder.z + 3, 6);

    // Запястье тоже
    const rWrist = pose[Body25Index.RIGHT_WRIST];
    expect(result[Body25Index.RIGHT_WRIST].x).toBeCloseTo(rWrist.x + 1, 6);
    expect(result[Body25Index.RIGHT_WRIST].y).toBeCloseTo(rWrist.y + 2, 6);
    expect(result[Body25Index.RIGHT_WRIST].z).toBeCloseTo(rWrist.z + 3, 6);

    // Ноги НЕ двигаются (не потомки NECK)
    expect(result[Body25Index.RIGHT_HIP]).toEqual(pose[Body25Index.RIGHT_HIP]);
    expect(result[Body25Index.LEFT_KNEE]).toEqual(pose[Body25Index.LEFT_KNEE]);
  });

  it('applyFK не мутирует исходный объект позы', () => {
    const pose = makePose();
    const originalNeck = { ...pose[Body25Index.NECK] };
    graph.applyFK(pose, Body25Index.NECK, { x: 99, y: 99, z: 99 });
    expect(pose[Body25Index.NECK]).toEqual(originalNeck);
  });

  // ─── Link / Unlink ─────────────────────────────────────────────────────────

  it('по умолчанию все суставы linked', () => {
    expect(graph.isLinked(Body25Index.RIGHT_ELBOW)).toBe(true);
    expect(graph.isLinked(Body25Index.NECK)).toBe(true);
  });

  it('setLinked(false) останавливает FK-пропагацию через сустав', () => {
    // Отвязываем локоть — запястье перестаёт двигаться при FK на плече
    graph.setLinked(Body25Index.RIGHT_ELBOW, false);
    const desc = graph.getDescendants(Body25Index.RIGHT_SHOULDER);

    expect(desc).toContain(Body25Index.RIGHT_ELBOW);   // сам локоть двигается
    expect(desc).not.toContain(Body25Index.RIGHT_WRIST); // но запястье — нет
  });

  it('setLinked(true) восстанавливает пропагацию', () => {
    graph.setLinked(Body25Index.RIGHT_ELBOW, false);
    graph.setLinked(Body25Index.RIGHT_ELBOW, true);
    const desc = graph.getDescendants(Body25Index.RIGHT_SHOULDER);
    expect(desc).toContain(Body25Index.RIGHT_WRIST);
  });

  // ─── Длины костей ──────────────────────────────────────────────────────────

  it('computeBoneLengths вычисляет корректное расстояние', () => {
    const pose: Partial<PoseData> = {};
    for (let i = 0; i < 25; i++) pose[i as Body25Index] = { x: 0, y: 0, z: 0 };
    // Шея на 0,1.4,0 — плечо на 0.3,1.35,0
    pose[Body25Index.NECK]           = { x: 0,   y: 1.4,  z: 0 };
    pose[Body25Index.RIGHT_SHOULDER] = { x: 0.3, y: 1.35, z: 0 };

    graph.computeBoneLengths(pose as PoseData);
    const len = graph.getBoneLength(Body25Index.NECK, Body25Index.RIGHT_SHOULDER);

    const expected = Math.sqrt(0.3 * 0.3 + 0.05 * 0.05);
    expect(len).toBeCloseTo(expected, 4);
  });

  it('getBoneLength возвращает 0.3 по умолчанию если кость не вычислена', () => {
    expect(graph.getBoneLength(Body25Index.NECK, Body25Index.RIGHT_SHOULDER)).toBe(0.3);
  });
});
