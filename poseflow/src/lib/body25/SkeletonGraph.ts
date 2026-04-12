// SkeletonGraph.ts — иерархия BODY_25 и FK-пропагация
import { Vector3 } from 'three';
import { Body25Index, JointPosition, PoseData } from './body25-types';

export interface SkeletonNode {
  index: Body25Index;
  parent: Body25Index | null;
  children: Body25Index[];
}

// Дерево BODY_25 с корнем в MID_HIP (8)
// Полное дерево — см. CLAUDE.md "BODY_25 tree"
const TREE: Array<{ index: Body25Index; parent: Body25Index | null }> = [
  { index: Body25Index.MID_HIP,         parent: null },
  { index: Body25Index.NECK,            parent: Body25Index.MID_HIP },
  { index: Body25Index.NOSE,            parent: Body25Index.NECK },
  { index: Body25Index.RIGHT_EYE,       parent: Body25Index.NOSE },
  { index: Body25Index.RIGHT_EAR,       parent: Body25Index.RIGHT_EYE },
  { index: Body25Index.LEFT_EYE,        parent: Body25Index.NOSE },
  { index: Body25Index.LEFT_EAR,        parent: Body25Index.LEFT_EYE },
  { index: Body25Index.RIGHT_SHOULDER,  parent: Body25Index.NECK },
  { index: Body25Index.RIGHT_ELBOW,     parent: Body25Index.RIGHT_SHOULDER },
  { index: Body25Index.RIGHT_WRIST,     parent: Body25Index.RIGHT_ELBOW },
  { index: Body25Index.LEFT_SHOULDER,   parent: Body25Index.NECK },
  { index: Body25Index.LEFT_ELBOW,      parent: Body25Index.LEFT_SHOULDER },
  { index: Body25Index.LEFT_WRIST,      parent: Body25Index.LEFT_ELBOW },
  { index: Body25Index.RIGHT_HIP,       parent: Body25Index.MID_HIP },
  { index: Body25Index.RIGHT_KNEE,      parent: Body25Index.RIGHT_HIP },
  { index: Body25Index.RIGHT_ANKLE,     parent: Body25Index.RIGHT_KNEE },
  { index: Body25Index.RIGHT_BIG_TOE,   parent: Body25Index.RIGHT_ANKLE },
  { index: Body25Index.RIGHT_SMALL_TOE, parent: Body25Index.RIGHT_ANKLE },
  { index: Body25Index.RIGHT_HEEL,      parent: Body25Index.RIGHT_ANKLE },
  { index: Body25Index.LEFT_HIP,        parent: Body25Index.MID_HIP },
  { index: Body25Index.LEFT_KNEE,       parent: Body25Index.LEFT_HIP },
  { index: Body25Index.LEFT_ANKLE,      parent: Body25Index.LEFT_KNEE },
  { index: Body25Index.LEFT_BIG_TOE,    parent: Body25Index.LEFT_ANKLE },
  { index: Body25Index.LEFT_SMALL_TOE,  parent: Body25Index.LEFT_ANKLE },
  { index: Body25Index.LEFT_HEEL,       parent: Body25Index.LEFT_ANKLE },
];

export class SkeletonGraph {
  private nodes: Map<Body25Index, SkeletonNode> = new Map();
  boneLengths: Map<string, number> = new Map();
  // Суставы с отключённой FK-пропагацией вниз
  private unlinked: Set<Body25Index> = new Set();

  constructor() {
    // Строим узлы
    for (const { index, parent } of TREE) {
      this.nodes.set(index, { index, parent, children: [] });
    }
    // Строим children
    for (const { index, parent } of TREE) {
      if (parent !== null) {
        this.nodes.get(parent)!.children.push(index);
      }
    }
  }

  getNode(index: Body25Index): SkeletonNode | undefined {
    return this.nodes.get(index);
  }

  getChildren(index: Body25Index): Body25Index[] {
    return this.nodes.get(index)?.children ?? [];
  }

  /** Все потомки сустава (BFS), с учётом unlinked */
  getDescendants(index: Body25Index): Body25Index[] {
    const result: Body25Index[] = [];
    const queue = [...this.getChildren(index)];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      result.push(cur);
      // Если сустав unlinked — его дети не двигаются
      if (!this.unlinked.has(cur)) {
        queue.push(...this.getChildren(cur));
      }
    }
    return result;
  }

  /** Цепочка от from до to (включительно), если to является потомком from */
  getChain(from: Body25Index, to: Body25Index): Body25Index[] {
    // Идём от to вверх до from
    const chain: Body25Index[] = [];
    let cur: Body25Index | null = to;
    while (cur !== null && cur !== from) {
      chain.unshift(cur);
      cur = this.nodes.get(cur)?.parent ?? null;
    }
    if (cur === from) chain.unshift(from);
    return chain;
  }

  /** Длина кости — ключ: "from-to" */
  getBoneLength(from: Body25Index, to: Body25Index): number {
    return this.boneLengths.get(`${from}-${to}`) ?? 0.3;
  }

  /** Вычислить длины костей из текущей позы */
  computeBoneLengths(poseData: PoseData): void {
    this.boneLengths.clear();
    for (const [, node] of this.nodes) {
      for (const child of node.children) {
        const p = poseData[node.index];
        const c = poseData[child];
        if (p && c) {
          const len = new Vector3(p.x, p.y, p.z)
            .distanceTo(new Vector3(c.x, c.y, c.z));
          // Минимальная длина 0.01, чтобы не было деления на ноль в FABRIK
          this.boneLengths.set(`${node.index}-${child}`, Math.max(len, 0.01));
        }
      }
    }
  }

  /** FK: сдвинуть сустав и все его потомки на одинаковый delta */
  applyFK(poseData: PoseData, movedJoint: Body25Index, newPosition: JointPosition): PoseData {
    const result = { ...poseData };
    const old = result[movedJoint];
    const dx = newPosition.x - old.x;
    const dy = newPosition.y - old.y;
    const dz = newPosition.z - old.z;

    result[movedJoint] = { ...newPosition };

    for (const desc of this.getDescendants(movedJoint)) {
      const j = result[desc];
      result[desc] = { ...j, x: j.x + dx, y: j.y + dy, z: j.z + dz };
    }
    return result;
  }

  // ─── Link / Unlink ────────────────────────────────────────────────────────

  setLinked(joint: Body25Index, linked: boolean): void {
    if (linked) {
      this.unlinked.delete(joint);
    } else {
      this.unlinked.add(joint);
    }
  }

  isLinked(joint: Body25Index): boolean {
    return !this.unlinked.has(joint);
  }
}

// Singleton — один граф на всё приложение (Step 9 создаст per-skeleton инстансы)
export const skeletonGraph = new SkeletonGraph();
