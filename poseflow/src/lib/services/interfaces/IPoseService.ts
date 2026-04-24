// src/lib/services/interfaces/IPoseService.ts
// Интерфейс сервиса управления позой

import { Body25Index, JointPosition, PoseData, ManipulationMode } from '../../types/common';
import { Vector3 } from 'three';
import { SkeletonGraph } from '../../body25/SkeletonGraph';

export interface IPoseService {
  // ─── Основные операции ─────────────────────────────────────────────────────
  
  /** Получить текущую позу активного скелета */
  getPoseData(): PoseData;
  
  /** Установить новую позу (с сохранением в undo) */
  setPoseData(data: PoseData): void;
  
  /** Сдвинуть всю позу на указанный вектор */
  translate(dx: number, dy: number, dz: number): void;
  
  /** Масштабировать позу */
  scale(factor: number): void;
  
  /** Отразить позу по оси X */
  mirrorPose(): void;
  
  /** Сбросить позу к T-pose */
  reset(): void;
  
  // ─── Работа с отдельными суставами ────────────────────────────────────────
  
  /** Обновить позицию сустава с учетом FK/IK режима */
  updateJoint(index: Body25Index, position: JointPosition): void;
  
  /** Установить позицию сустава напрямую (без FK/IK) */
  setJointPosition(index: Body25Index, position: JointPosition): void;
  
  /** Получить позицию сустава */
  getJointPosition(index: Body25Index): JointPosition;
  
  // ─── FK/IK управление ─────────────────────────────────────────────────────
  
  /** Получить текущий режим манипуляции */
  getManipulationMode(): ManipulationMode;
  
  /** Установить режим манипуляции */
  setManipulationMode(mode: ManipulationMode): void;
  
  /** Переключить FK-связь сустава с родителем */
  toggleJointLink(index: Body25Index): void;
  
  /** Проверить, есть ли FK-связь у сустава */
  isJointLinked(index: Body25Index): boolean;
  
  /** Получить множество суставов с отключённой FK-пропагацией */
  getUnlinkedJoints(): Set<Body25Index>;
  
  // ─── Undo/Redo ────────────────────────────────────────────────────────────
  
  /** Отменить последнее действие */
  undo(): void;
  
  /** Повторить отмененное действие */
  redo(): void;
  
  /** Проверить возможность отмены */
  get canUndo(): boolean;
  
  /** Проверить возможность повтора */
  get canRedo(): boolean;
  
  // ─── Подписки на изменения ────────────────────────────────────────────────
  
  /** Подписаться на изменения позы */
  subscribe(listener: (data: PoseData) => void): () => void;
  
  // ─── Вспомогательные методы ───────────────────────────────────────────────
  
  /** Получить граф скелета (для внутреннего использования) */
  getGraph(): SkeletonGraph;
  
  /** Создать T-pose */
  createTPose(): PoseData;
  
  /** Создать A-pose */
  createAPose(): PoseData;
  
  /** Создать стоячую позу */
  createStandingPose(): PoseData;
  
  // ─── Multiple skeletons support (Step 9) ──────────────────────────────────
  
  /** Получить количество скелетов */
  getSkeletonCount(): number;
  
  /** Получить идентификатор активного скелета */
  getActiveSkeletonId(): number;
  
  /** Установить активный скелет по идентификатору */
  setActiveSkeletonId(id: number): void;
  
  /** Добавить новый скелет (копия активного) */
  addSkeleton(): number;
  
  /** Удалить скелет по идентификатору (нельзя удалить последний) */
  removeSkeleton(id: number): void;
  
  /** Получить позу скелета по идентификатору */
  getSkeletonPose(id: number): PoseData;
  
  /** Установить позу скелета по идентификатору */
  setSkeletonPose(id: number, data: PoseData): void;
  
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  
  /** Очистить ресурсы (опционально) */
  dispose?(): void;
}