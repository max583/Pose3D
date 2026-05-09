// src/services/RigService.ts
// Сервис управления SkeletonRig — первичным источником истины позы.
// PoseData (мировые позиции) — производное, вычисляемое через resolveSkeleton().
//
// RigService инкапсулирует:
//   - состояние SkeletonRig
//   - undo/redo стек (снимки SkeletonRig)
//   - кэш PoseData (инвалидируется при изменении rig)
//   - подписки на изменения

import { Euler, Quaternion, Vector3 } from 'three';
import { PoseData } from '../lib/body25/body25-types';
import { SkeletonRig, createDefaultRig, cloneRig } from '../lib/rig/SkeletonRig';
import { resolveSkeleton, VirtualChainPositions } from '../lib/rig/resolveSkeleton';
import { rigFromPose } from '../lib/rig/inverseFK';
import { setBend, setBendAtStart } from '../lib/rig/VirtualChain';
import {
  ARM_JOINTS,
  applyArmChainToRig,
  getArmBoneLengths,
  getShoulderAccRot,
  twistElbow,
  toVec3,
} from '../lib/rig/armIK';
import {
  isUpperArmDirectionWithinLimits,
  measureUpperArmDirection,
  solveArmIKWithinLimits,
} from '../lib/rig/armLimits';
import {
  LEG_JOINTS,
  applyLegChainToRig,
  getLegIKCandidateDiagnostics,
  getLegBoneLengths,
  isLegIKCandidateWithinLimits,
  solveLegIKWithinLimits,
  twistKnee,
} from '../lib/rig/legIK';
import {
  isUpperLegAxialTwistWithinLimits,
  isKneePlaneTwistDeltaWithinLimits,
} from '../lib/rig/legLimits';
import { isTibiaAxialTwistWithinLimits } from '../lib/rig/legAnatomy';
import { applyFootRotationDelta, FootAxis } from '../lib/rig/footFK';
import { applyShoulderDelta, ShoulderAxis } from '../lib/rig/shoulderFK';
import { UndoStack } from '../lib/UndoStack';
import { MIRROR_PAIRS } from '../lib/body25/body25-mirror';
import { Body25Index } from '../lib/body25/body25-types';
import { createLogger } from '../lib/logger';
import { isLegIKTraceEnabled } from '../lib/debugFlags';
import { getService } from '../lib/di/setup';
import { ServiceKeys } from '../lib/di/types';
import { FeatureFlagService } from '../lib/feature-flags/FeatureFlagService';

type RigListener = (pose: PoseData) => void;

const legIKTraceLogger = createLogger('LegIKTrace');

export class RigService {
  private rig: SkeletonRig;
  private undoStack: UndoStack<SkeletonRig>;
  private resolvedCache: { pose: PoseData; virtualPositions: VirtualChainPositions } | null = null;
  private listeners: RigListener[] = [];
  private dragStartRig: SkeletonRig | null = null;

  private featureFlagService: FeatureFlagService;

  constructor(featureFlagService?: FeatureFlagService) {
    this.rig = createDefaultRig();
    this.undoStack = new UndoStack<SkeletonRig>(50);
    if (featureFlagService) {
      this.featureFlagService = featureFlagService;
    } else {
      try {
        this.featureFlagService = getService<FeatureFlagService>(ServiceKeys.FeatureFlagService);
      } catch {
        // В тестовой среде DI-контейнер не инициализирован — используем пустой сервис.
        this.featureFlagService = new FeatureFlagService();
      }
    }
  }

  // ─── Rig access ────────────────────────────────────────────────────────────

  /** Получить текущий SkeletonRig (только чтение). */
  getRig(): Readonly<SkeletonRig> {
    return this.rig;
  }

  /** Заменить rig (с undo-снимком). */
  setRig(newRig: SkeletonRig): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = newRig;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── PoseData (производное) ────────────────────────────────────────────────

  /** Получить текущую позу (кэшируется до следующего изменения rig). */
  getPoseData(): PoseData {
    return this.getResolved().pose;
  }

  /** Получить промежуточные позиции сегментов позвоночника и шеи. */
  getVirtualPositions(): VirtualChainPositions {
    return this.getResolved().virtualPositions;
  }

  private getResolved() {
    if (!this.resolvedCache) {
      this.resolvedCache = resolveSkeleton(this.rig);
    }
    return this.resolvedCache;
  }

  // ─── Load from PoseData (для пресетов, mirror, reset) ─────────────────────

  /**
   * Загрузить позу из PoseData.
   * Восстанавливает SkeletonRig через inverseFK.
   */
  loadPose(pose: PoseData): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = rigFromPose(pose);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Pose helpers ──────────────────────────────────────────────────────────

  /** Сбросить в T-позу (default rig). */
  resetPose(): void {
    this.undoStack.push(cloneRig(this.rig));
    this.rig = createDefaultRig();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /** Отразить позу по оси X (mirror). */
  mirrorPose(): void {
    const currentPose = this.getPoseData();
    const mirrored = { ...currentPose };
    const center = currentPose[Body25Index.MID_HIP]?.x ?? 0;

    for (const [right, left] of MIRROR_PAIRS) {
      const rPos = currentPose[right];
      const lPos = currentPose[left];
      if (rPos && lPos) {
        mirrored[right] = { ...lPos, x: 2 * center - lPos.x };
        mirrored[left]  = { ...rPos, x: 2 * center - rPos.x };
      }
    }

    this.undoStack.push(cloneRig(this.rig));
    this.rig = rigFromPose(mirrored as PoseData);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Масштабировать позу (масштабирует rest-позу + rootPosition).
   * Прямая операция — не требует inverseFK.
   */
  scalePose(factor: number): void {
    const newRig = cloneRig(this.rig);
    // Масштабируем rootPosition
    newRig.rootPosition.multiplyScalar(factor);
    // Масштабируем локальные смещения rest-позы (фиксированные длины костей пропорционально меняются)
    const scaledOffsets = new Map<Body25Index, Vector3>();
    for (const [k, v] of newRig.rest.localOffsets) {
      scaledOffsets.set(k, v.clone().multiplyScalar(factor));
    }
    const scaledBoneLengths = new Map<string, number>();
    for (const [k, v] of newRig.rest.boneLengths) {
      scaledBoneLengths.set(k, v * factor);
    }
    newRig.rest = { localOffsets: scaledOffsets, boneLengths: scaledBoneLengths };
    // Масштабируем длины сегментов виртуальных цепочек
    newRig.spine = { ...newRig.spine, segmentLength: newRig.spine.segmentLength * factor,
      rotations: newRig.spine.rotations };
    newRig.neck = { ...newRig.neck, segmentLength: newRig.neck.segmentLength * factor,
      rotations: newRig.neck.rotations };

    this.undoStack.push(cloneRig(this.rig));
    this.rig = newRig;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Переместить всю позу.
   * Прямая операция — сдвигает только rootPosition, rotations не меняются.
   */
  translatePose(offsetX: number, offsetY: number, offsetZ: number): void {
    const newRig = cloneRig(this.rig);
    newRig.rootPosition.x += offsetX;
    newRig.rootPosition.y += offsetY;
    newRig.rootPosition.z += offsetZ;

    this.undoStack.push(cloneRig(this.rig));
    this.rig = newRig;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Gizmo drag operations (без undo-снимка — beginDrag() вызывается перед серией) ──

  /**
   * Начать drag-операцию: сохранить undo-снимок текущего rig.
   * Вызывать один раз в onPointerDown гизмо.
   */
  beginDrag(): void {
    const snapshot = cloneRig(this.rig);
    this.undoStack.push(snapshot);
    this.dragStartRig = cloneRig(this.rig);
  }

  /** Переместить таз на дельту (мировые координаты). */
  applyPelvisTranslate(dx: number, dy: number, dz: number): void {
    this.rig.rootPosition.x += dx;
    this.rig.rootPosition.y += dy;
    this.rig.rootPosition.z += dz;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Повернуть таз вокруг мировой оси.
   * @param axis — 'x' | 'y' | 'z'
   * @param angle — угол в радианах (delta)
   */
  applyPelvisRotate(axis: 'x' | 'y' | 'z', angle: number): void {
    const axisVec =
      axis === 'x' ? new Vector3(1, 0, 0) :
      axis === 'y' ? new Vector3(0, 1, 0) :
                     new Vector3(0, 0, 1);
    const q = new Quaternion().setFromAxisAngle(axisVec, angle);
    // Premultiply: поворот в мировом пространстве
    this.rig.rootRotation.premultiply(q);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Повернуть таз вокруг локальной оси скелета.
   * Используется root-гизмо у MID_HIP, которое визуально следует за rootRotation.
   */
  applyPelvisRotateLocal(axis: 'x' | 'y' | 'z', angle: number): void {
    const axisVec =
      axis === 'x' ? new Vector3(1, 0, 0) :
      axis === 'y' ? new Vector3(0, 1, 0) :
                     new Vector3(0, 0, 1);
    const q = new Quaternion().setFromAxisAngle(axisVec, angle);
    this.rig.rootRotation.multiply(q).normalize();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить изгиб позвоночника.
   * @param deltaX — дельта наклона вперёд/назад (рад)
   * @param deltaZ — дельта бокового наклона (рад)
   */
  applySpineBend(deltaX: number, deltaZ: number): void {
    const angles = this.rig.spineAngles;
    const maxBendX = Math.PI / 4;          // ±45° вперёд/назад
    const maxBendZ = 15 * Math.PI / 180;   // ±15° в стороны
    angles.bendX = clamp(angles.bendX + deltaX, -maxBendX, maxBendX);
    angles.bendZ = clamp(angles.bendZ + deltaZ, -maxBendZ, maxBendZ);
    this.rig.spine = setBend(this.rig.spine, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить скручивание позвоночника. Ограничение: ±45°.
   * @param delta — дельта угла скручивания (рад)
   */
  applySpineTwist(delta: number): void {
    const angles = this.rig.spineAngles;
    const maxTwist = Math.PI / 4; // ±45°
    angles.twistY = clamp(angles.twistY + delta, -maxTwist, maxTwist);
    this.rig.spine = setBend(this.rig.spine, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить изгиб шеи.
   * @param deltaX — дельта наклона вперёд/назад (рад), лимит ±45°
   * @param deltaZ — дельта бокового наклона (рад), лимит ±30°
   */
  applyNeckBend(deltaX: number, deltaZ: number): void {
    const angles = this.rig.neckAngles;
    const maxBendX = Math.PI / 4;          // ±45°
    const maxBendZ = 30 * Math.PI / 180;   // ±30°
    angles.bendX = clamp(angles.bendX + deltaX, -maxBendX, maxBendX);
    angles.bendZ = clamp(angles.bendZ + deltaZ, -maxBendZ, maxBendZ);
    this.rig.neck = setBendAtStart(this.rig.neck, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Добавить скручивание шеи. Ограничение: ±45°.
   * @param delta — дельта угла скручивания (рад)
   */
  applyNeckTwist(delta: number): void {
    const angles = this.rig.neckAngles;
    const maxTwist = Math.PI / 4; // ±45°
    angles.twistY = clamp(angles.twistY + delta, -maxTwist, maxTwist);
    this.rig.neck = setBend(this.rig.neck, angles.bendX, angles.bendZ, angles.twistY);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Arm IK (Stage 4.1) ───────────────────────────────────────────────────

  /**
   * IK запястья: FABRIK-решение цепочки плечо→локоть→запястье.
   * Плечо фиксировано; запястье движется к целевой мировой позиции.
   *
   * @param side  'r' | 'l'
   * @param tx/ty/tz  целевая мировая позиция запястья
   */
  applyArmIK(side: 'r' | 'l', tx: number, ty: number, tz: number): void {
    const pose = this.getPoseData();
    const joints = ARM_JOINTS[side];

    const shoulderPos = toVec3(pose[joints.shoulder]!);
    const elbowPos    = toVec3(pose[joints.elbow]!);
    const wristPos    = toVec3(pose[joints.wrist]!);
    const target      = new Vector3(tx, ty, tz);

    const boneLengths = getArmBoneLengths(this.rig, side);
    const shoulderFrame = getShoulderAccRot(this.rig, side);
    const newChain = solveArmIKWithinLimits(
      shoulderPos,
      elbowPos,
      wristPos,
      target,
      boneLengths,
      side,
      shoulderFrame,
    );
    if (!newChain) return;

    applyArmChainToRig(this.rig, side, shoulderPos, newChain[1], newChain[2]);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Скручивание локтя: поворот локтя вокруг оси плечо→запястье.
   * Запястье и плечо остаются неподвижными.
   *
   * @param side   'r' | 'l'
   * @param delta  угол поворота (рад)
   */
  applyElbowTwist(side: 'r' | 'l', delta: number): void {
    const pose = this.getPoseData();
    const joints = ARM_JOINTS[side];

    const shoulderPos = toVec3(pose[joints.shoulder]!);
    const elbowPos    = toVec3(pose[joints.elbow]!);
    const wristPos    = toVec3(pose[joints.wrist]!);

    const newElbow = twistElbow(shoulderPos, elbowPos, wristPos, delta);
    const shoulderFrame = getShoulderAccRot(this.rig, side);
    const upperArmDirection = measureUpperArmDirection(
      shoulderPos,
      newElbow,
      side,
      shoulderFrame,
    );
    if (!isUpperArmDirectionWithinLimits(upperArmDirection)) return;

    // Запястье не двигается, но его localRot меняется (родитель-локоть переместился)
    applyArmChainToRig(this.rig, side, shoulderPos, newElbow, wristPos);
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Leg IK (Stage 6.1) ──────────────────────────────────────────────────

  /**
   * IK лодыжки: FABRIK-решение цепочки бедро→колено→лодыжка.
   * Бедро фиксировано; лодыжка движется к целевой мировой позиции.
   */
  applyLegIK(side: 'r' | 'l', tx: number, ty: number, tz: number): void {
    const t0 = performance.now();

    // Read flags once — localStorage reads are not free.
    const trace = isLegIKTraceEnabled();
    const perf = this.featureFlagService.isEnabled('ENABLE_PERFORMANCE_LOGGING');

    const pose = this.getPoseData();
    const joints = LEG_JOINTS[side];

    const hipPos = toVec3(pose[joints.hip]!);
    const kneePos = toVec3(pose[joints.knee]!);
    const anklePos = toVec3(pose[joints.ankle]!);
    const target = new Vector3(tx, ty, tz);

    const boneLengths = getLegBoneLengths(this.rig, side);
    const bodyForward = new Vector3(0, 0, 1).applyQuaternion(this.rig.rootRotation);
    const bodyUp = new Vector3(0, 1, 0).applyQuaternion(this.rig.rootRotation);

    const t1 = performance.now(); // end of setup

    if (trace) {
      legIKTraceLogger.info('applyLegIK input', {
        side,
        target: serializeVector(target),
        before: serializeLegPoints(hipPos, kneePos, anklePos),
        targetDistance: round(anklePos.distanceTo(target)),
      });
    }

    const newChain = solveLegIKWithinLimits(
      hipPos,
      kneePos,
      anklePos,
      target,
      boneLengths,
      bodyForward,
      bodyUp,
      side,
    );

    const t2 = performance.now(); // end of solver

    if (!newChain) {
      if (trace) {
        legIKTraceLogger.info('applyLegIK rejected', {
          side,
          reason: 'solver-null',
          target: serializeVector(target),
          beforeDiagnostics: getLegIKCandidateDiagnostics(
            hipPos,
            kneePos,
            anklePos,
            bodyForward,
            bodyUp,
            side,
          ),
        });
      }
      if (perf) {
        console.log(`[perf:applyLegIK] REJECTED(null) side=${side} total=${(performance.now()-t0).toFixed(2)}ms | setup=${(t1-t0).toFixed(2)}ms | solver=${(t2-t1).toFixed(2)}ms`);
      }
      return;
    }

    // Clone the rig to test tibia axial twist without mutating the live rig.
    const candidateRig = cloneRig(this.rig);
    applyLegChainToRig(candidateRig, side, hipPos, newChain[1], newChain[2]);

    const t3 = performance.now(); // end of clone+apply-candidate

    if (!isTibiaAxialTwistWithinLimits(candidateRig, side)) {
      if (trace) {
        legIKTraceLogger.info('applyLegIK rejected', {
          side,
          reason: 'tibia-axial-twist',
          target: serializeVector(target),
          candidate: serializeLegPoints(newChain[0], newChain[1], newChain[2]),
          candidateDiagnostics: getLegIKCandidateDiagnostics(
            newChain[0], newChain[1], newChain[2], bodyForward, bodyUp, side,
          ),
          targetDistance: round(newChain[2].distanceTo(target)),
        });
      }
      if (perf) {
        console.log(`[perf:applyLegIK] REJECTED(tibia) side=${side} total=${(performance.now()-t0).toFixed(2)}ms | setup=${(t1-t0).toFixed(2)}ms | solver=${(t2-t1).toFixed(2)}ms | clone=${(t3-t2).toFixed(2)}ms`);
      }
      return;
    }

    applyLegChainToRig(this.rig, side, hipPos, newChain[1], newChain[2]);
    this.resolvedCache = null;

    const t4 = performance.now(); // end of apply-live

    this.notifyListeners();

    const t5 = performance.now(); // end of notify (re-render triggered)

    if (trace) {
      legIKTraceLogger.info('applyLegIK applied', {
        side,
        target: serializeVector(target),
        result: serializeLegPoints(newChain[0], newChain[1], newChain[2]),
        candidateDiagnostics: getLegIKCandidateDiagnostics(
          newChain[0], newChain[1], newChain[2], bodyForward, bodyUp, side,
        ),
        targetDistance: round(newChain[2].distanceTo(target)),
      });
    }
    if (perf) {
      console.log(
        `[perf:applyLegIK] OK side=${side}` +
        ` total=${(t5-t0).toFixed(2)}ms` +
        ` | setup=${(t1-t0).toFixed(2)}ms` +
        ` | solver=${(t2-t1).toFixed(2)}ms` +
        ` | clone+validate=${(t3-t2).toFixed(2)}ms` +
        ` | apply=${(t4-t3).toFixed(2)}ms` +
        ` | notify=${(t5-t4).toFixed(2)}ms`,
      );
    }
  }

  /**
   * Скручивание колена: поворот колена вокруг оси бедро→лодыжка.
   * Бедро и лодыжка остаются на месте.
   */
  applyKneeTwist(side: 'r' | 'l', delta: number): void {
    const pose = this.getPoseData();
    const joints = LEG_JOINTS[side];

    const hipPos = toVec3(pose[joints.hip]!);
    const kneePos = toVec3(pose[joints.knee]!);
    const anklePos = toVec3(pose[joints.ankle]!);
    const newKnee = twistKnee(hipPos, kneePos, anklePos, delta);
    const bodyForward = new Vector3(0, 0, 1).applyQuaternion(this.rig.rootRotation);
    const bodyUp = new Vector3(0, 1, 0).applyQuaternion(this.rig.rootRotation);
    const trace = isLegIKTraceEnabled();
    if (trace) {
      legIKTraceLogger.info('applyKneeTwist input', {
        side,
        deltaDeg: round(delta * 180 / Math.PI),
        before: serializeLegPoints(hipPos, kneePos, anklePos),
        proposedKnee: serializeVector(newKnee),
      });
    }
    if (!isLegIKCandidateWithinLimits(
      hipPos,
      newKnee,
      anklePos,
      bodyForward,
      bodyUp,
      side,
    )) {
      if (trace) {
        legIKTraceLogger.info('applyKneeTwist rejected', {
          side,
          reason: 'candidate-limits',
          candidate: serializeLegPoints(hipPos, newKnee, anklePos),
          candidateDiagnostics: getLegIKCandidateDiagnostics(
            hipPos,
            newKnee,
            anklePos,
            bodyForward,
            bodyUp,
            side,
          ),
        });
      }
      return;
    }
    const candidateRig = cloneRig(this.rig);
    applyLegChainToRig(candidateRig, side, hipPos, newKnee, anklePos);
    const dragStartPose = this.dragStartRig
      ? resolveSkeleton(this.dragStartRig).pose
      : pose;
    const startKneePos = toVec3(dragStartPose[joints.knee]!);
    if (
      !isUpperLegAxialTwistWithinLimits(candidateRig, side) ||
      !isTibiaAxialTwistWithinLimits(candidateRig, side) ||
      !isKneePlaneTwistDeltaWithinLimits(
        hipPos,
        startKneePos,
        newKnee,
        anklePos,
      )
    ) {
      if (trace) {
        legIKTraceLogger.info('applyKneeTwist rejected', {
          side,
          reason: 'axial-or-plane-twist',
          candidate: serializeLegPoints(hipPos, newKnee, anklePos),
          candidateDiagnostics: getLegIKCandidateDiagnostics(
            hipPos,
            newKnee,
            anklePos,
            bodyForward,
            bodyUp,
            side,
          ),
        });
      }
      return;
    }

    applyLegChainToRig(this.rig, side, hipPos, newKnee, anklePos);
    this.resolvedCache = null;
    this.notifyListeners();
    if (trace) {
      legIKTraceLogger.info('applyKneeTwist applied', {
        side,
        result: serializeLegPoints(hipPos, newKnee, anklePos),
        candidateDiagnostics: getLegIKCandidateDiagnostics(
          hipPos,
          newKnee,
          anklePos,
          bodyForward,
          bodyUp,
          side,
        ),
      });
    }
  }

  // ─── Foot FK (Stage 7) ───────────────────────────────────────────────────

  /** Поворот стопы как жёсткой группы toe/heel вокруг ANKLE. */
  applyFootRotation(side: 'r' | 'l', axis: FootAxis, delta: number): void {
    const applied = applyFootRotationDelta(this.rig, side, axis, delta);
    if (applied === 0) return;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Shoulder FK (Stage 4.2) ──────────────────────────────────────────────

  /** Поворот плечевого пояса: двигает SHOULDER относительно NECK. */
  applyShoulderFK(side: 'r' | 'l', axis: ShoulderAxis, delta: number): void {
    const applied = applyShoulderDelta(this.rig, side, axis, delta);
    if (applied === 0) return;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  applyShoulderRaise(side: 'r' | 'l', delta: number): void {
    this.applyShoulderFK(side, 'raise', delta);
  }

  applyShoulderForward(side: 'r' | 'l', delta: number): void {
    this.applyShoulderFK(side, 'forward', delta);
  }

  // ─── Head rotation ────────────────────────────────────────────────────────

  /**
   * Обновить rig.headRotation из rig.headAngles.
   * Порядок Euler: YXZ (сначала yaw, потом pitch, потом roll).
   */
  private updateHeadRotation(): void {
    const { pitch, yaw, roll } = this.rig.headAngles;
    this.rig.headRotation = new Quaternion().setFromEuler(
      new Euler(pitch, yaw, roll, 'YXZ'),
    );
  }

  /**
   * Кивок вперёд/назад.
   * Вперёд (подбородок к груди) +45°, назад (голова запрокинута) −30°.
   * @param delta — дельта угла (рад)
   */
  applyHeadPitch(delta: number): void {
    const angles = this.rig.headAngles;
    const maxForward = 45 * Math.PI / 180;  // +45°
    const maxBack    = 30 * Math.PI / 180;  // −30°
    angles.pitch = clamp(angles.pitch + delta, -maxBack, maxForward);
    this.updateHeadRotation();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Поворот головы влево/вправо. Лимит ±80°.
   * @param delta — дельта угла (рад)
   */
  applyHeadYaw(delta: number): void {
    const angles = this.rig.headAngles;
    const maxYaw = 80 * Math.PI / 180;
    angles.yaw = clamp(angles.yaw + delta, -maxYaw, maxYaw);
    this.updateHeadRotation();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  /**
   * Боковой наклон головы. Лимит ±30°.
   * @param delta — дельта угла (рад)
   */
  applyHeadRoll(delta: number): void {
    const angles = this.rig.headAngles;
    const maxRoll = 30 * Math.PI / 180;
    angles.roll = clamp(angles.roll + delta, -maxRoll, maxRoll);
    this.updateHeadRotation();
    this.resolvedCache = null;
    this.notifyListeners();
  }

  // ─── Undo / Redo ───────────────────────────────────────────────────────────

  undo(): void {
    const prev = this.undoStack.undo(cloneRig(this.rig));
    if (!prev) return;
    this.rig = prev;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  redo(): void {
    const next = this.undoStack.redo(cloneRig(this.rig));
    if (!next) return;
    this.rig = next;
    this.resolvedCache = null;
    this.notifyListeners();
  }

  get canUndo(): boolean { return this.undoStack.canUndo; }
  get canRedo(): boolean { return this.undoStack.canRedo; }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: RigListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const data = this.getPoseData();
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  dispose(): void {
    this.listeners = [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function serializeVector(v: Vector3): { x: number; y: number; z: number } {
  return {
    x: round(v.x),
    y: round(v.y),
    z: round(v.z),
  };
}

function serializeLegPoints(
  hip: Vector3,
  knee: Vector3,
  ankle: Vector3,
): {
  hip: { x: number; y: number; z: number };
  knee: { x: number; y: number; z: number };
  ankle: { x: number; y: number; z: number };
} {
  return {
    hip: serializeVector(hip),
    knee: serializeVector(knee),
    ankle: serializeVector(ankle),
  };
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
