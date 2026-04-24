// src/lib/experimental/integration/FeatureFlagIntegration.ts
// Интеграция компонентов Phase 2 с feature flags

import { FeatureFlagService } from '../../feature-flags/FeatureFlagService';
import { MainControllers } from '../controllers/MainControllers';
import { DragAdapter } from '../controllers/DragAdapter';
import { SkullGroup } from '../rigid/SkullGroup';
import { SpineChain } from '../spine/SpineChain';
import { FixedLengthSolver } from '../fixed-length/FixedLengthSolver';
import { usePoseStore } from '../../stores/poseStore';
import { PoseData, Body25Index, JointPosition } from '../../body25/body25-types';
import { Vector3 } from 'three';

export class FeatureFlagIntegration {
  private featureFlagService: FeatureFlagService;
  
  // Компоненты Phase 2 (создаются только при включенных feature flags)
  private mainControllers: MainControllers | null = null;
  private dragAdapter: DragAdapter | null = null;
  private skullGroup: SkullGroup | null = null;
  private spineChain: SpineChain | null = null;
  private fixedLengthSolver: FixedLengthSolver | null = null;
  
  constructor(featureFlagService: FeatureFlagService) {
    this.featureFlagService = featureFlagService;
  }

  /**
   * Инициализировать компоненты Phase 2 на основе feature flags
   */
  initialize(): void {
    // Инициализируем только те компоненты, для которых включены feature flags
    if (this.isDesignDollControllersEnabled()) {
      this.mainControllers = new MainControllers();
      this.dragAdapter = new DragAdapter(this.mainControllers);
    }
    
    if (this.isRigidSkullEnabled()) {
      this.skullGroup = new SkullGroup();
    }
    
    if (this.isSpineChainEnabled()) {
      this.spineChain = new SpineChain();
    }
    
    if (this.isFixedLengthsEnabled()) {
      this.fixedLengthSolver = new FixedLengthSolver();
    }
    
    // Инициализируем pose store с поддержкой расширенной модели
    if (this.isExtendedModelEnabled()) {
      const poseStore = usePoseStore.getState();
      poseStore.setUseExtendedModel(true);
    }
  }

  /**
   * Обновить позу с учетом компонентов Phase 2
   */
  updatePoseWithPhase2Features(pose: PoseData): PoseData {
    let updatedPose = { ...pose };
    
    // Применяем цепь позвоночника, если включена (должна быть первой, так как генерирует новую позу)
    if (this.isSpineChainEnabled() && this.spineChain) {
      if (!this.spineChain.isReady()) {
        this.spineChain.initializeFromPose(updatedPose);
      }
      // Генерируем позу на основе состояния позвоночника
      updatedPose = this.spineChain.generatePose();
    }
    
    // Применяем жесткий череп, если включен
    if (this.isRigidSkullEnabled() && this.skullGroup) {
      if (!this.skullGroup.isReady()) {
        this.skullGroup.initializeFromPose(updatedPose);
      }
      updatedPose = this.skullGroup.updatePose(updatedPose);
    }
    
    // Применяем фиксированные длины костей, если включены
    if (this.isFixedLengthsEnabled() && this.fixedLengthSolver) {
      // Инициализируем длины костей из позы, если еще не инициализированы
      this.fixedLengthSolver.computeBoneLengths(updatedPose);
      // Применяем ограничения фиксированных длин к позе
      // Note: Для применения ограничений нужен dragged joint, поэтому здесь только инициализация
    }
    
    // Обновляем позиции контроллеров DesignDoll на основе обновленной позы
    if (this.isDesignDollControllersEnabled() && this.mainControllers) {
      this.mainControllers.updatePositionsFromPose(updatedPose);
    }
    
    // Обновляем pose store
    if (this.isExtendedModelEnabled()) {
      const poseStore = usePoseStore.getState();
      poseStore.setLegacyPose(updatedPose);
    }
    
    return updatedPose;
  }

  /**
   * Обработать drag событие через адаптер
   */
  handleDragEvent(event: any, camera: any, canvasSize: { width: number; height: number }): boolean {
    console.log('FeatureFlagIntegration.handleDragEvent', { type: event.type, screenPosition: event.screenPosition, canvasSize });
    if (!this.isDesignDollControllersEnabled() || !this.dragAdapter) {
      console.log('FeatureFlagIntegration: design doll controllers not enabled or dragAdapter missing');
      return false;
    }
    
    const result = this.dragAdapter.handleDragEvent(event, camera, canvasSize);
    console.log('FeatureFlagIntegration.handleDragEvent result', result);
    return result;
  }

  /**
   * Получить контроллеры для отображения
   */
  getControllersForDisplay(): any[] {
    if (!this.isDesignDollControllersEnabled() || !this.mainControllers) {
      return [];
    }
    
    return this.mainControllers.getAllControllers();
  }

  /**
   * Получить активный контроллер
   */
  getActiveController(): any | null {
    if (!this.isDesignDollControllersEnabled() || !this.mainControllers) {
      return null;
    }
    
    return this.mainControllers.getActiveController();
  }

  /**
   * Проверить, включены ли контроллеры DesignDoll
   */
  isDesignDollControllersEnabled(): boolean {
    return this.featureFlagService.isEnabled('USE_DESIGNDOLL_CONTROLLERS');
  }

  /**
   * Проверить, включен ли жесткий череп
   */
  isRigidSkullEnabled(): boolean {
    return this.featureFlagService.isEnabled('USE_RIGID_SKULL');
  }

  /**
   * Проверить, включена ли цепь позвоночника
   */
  isSpineChainEnabled(): boolean {
    return this.featureFlagService.isEnabled('USE_SPINE_CHAIN');
  }

  /**
   * Проверить, включена ли расширенная модель данных
   */
  isExtendedModelEnabled(): boolean {
    return this.featureFlagService.isEnabled('USE_ZUSTAND_STORE');
  }

  /**
   * Проверить, включены ли фиксированные длины
   */
  isFixedLengthsEnabled(): boolean {
    return this.featureFlagService.isEnabled('USE_FIXED_LENGTHS');
  }

  /**
   * Получить экземпляр MainControllers
   */
  getMainControllers(): MainControllers | null {
    return this.mainControllers;
  }

  /**
   * Получить экземпляр DragAdapter
   */
  getDragAdapter(): DragAdapter | null {
    return this.dragAdapter;
  }

  /**
   * Получить экземпляр SkullGroup
   */
  getSkullGroup(): SkullGroup | null {
    return this.skullGroup;
  }

  /**
   * Получить экземпляр SpineChain
   */
  getSpineChain(): SpineChain | null {
    return this.spineChain;
  }

  /**
   * Получить экземпляр FixedLengthSolver
   */
  getFixedLengthSolver(): FixedLengthSolver | null {
    return this.fixedLengthSolver;
  }

  /**
   * Применить ограничения фиксированных длин к позе при drag
   */
  applyFixedLengthConstraints(
    draggedJoint: Body25Index,
    targetPosition: Vector3,
    pose: PoseData
  ): PoseData {
    if (!this.isFixedLengthsEnabled() || !this.fixedLengthSolver) {
      return pose;
    }
    
    // Инициализируем длины костей, если еще не инициализированы
    this.fixedLengthSolver.computeBoneLengths(pose);
    
    // Применяем drag с фиксированными длинами
    return this.fixedLengthSolver.applyDrag(draggedJoint, targetPosition, pose);
  }

  /**
   * Решить IK цепь с фиксированными длинами
   */
  solveIKWithFixedLengths(
    chain: Body25Index[],
    target: Vector3,
    pose: PoseData
  ): PoseData {
    if (!this.isFixedLengthsEnabled() || !this.fixedLengthSolver) {
      return pose;
    }
    
    // Инициализируем длины костей, если еще не инициализированы
    this.fixedLengthSolver.computeBoneLengths(pose);
    
    // Решаем IK с фиксированными длинами
    return this.fixedLengthSolver.solveIKWithFixedLengths(chain, target, pose);
  }

  /**
   * Сбросить все компоненты Phase 2
   */
  reset(): void {
    if (this.mainControllers) {
      this.mainControllers.resetToDefault();
    }
    
    if (this.dragAdapter) {
      this.dragAdapter.reset();
    }
    
    if (this.skullGroup) {
      this.skullGroup.reset();
    }
    
    if (this.spineChain) {
      this.spineChain.reset();
    }
    
    if (this.fixedLengthSolver) {
      // FixedLengthSolver не имеет метода reset, но мы можем создать новый экземпляр
      this.fixedLengthSolver = new FixedLengthSolver();
    }
    
    // Сбросить pose store
    const poseStore = usePoseStore.getState();
    poseStore.setUseExtendedModel(false);
  }

  /**
   * Экспортировать состояние всех компонентов Phase 2
   */
  exportState(): Record<string, any> {
    const state: Record<string, any> = {
      featureFlags: {
        designDollControllers: this.isDesignDollControllersEnabled(),
        rigidSkull: this.isRigidSkullEnabled(),
        spineChain: this.isSpineChainEnabled(),
        extendedModel: this.isExtendedModelEnabled(),
        fixedLengths: this.isFixedLengthsEnabled(),
      },
    };
    
    if (this.mainControllers) {
      state.controllers = this.mainControllers.exportState();
    }
    
    if (this.skullGroup) {
      state.skullGroup = {
        pivotPosition: this.skullGroup.getPivotPosition().toArray(),
        rotation: this.skullGroup.getRotation().toArray(),
      };
    }
    
    if (this.spineChain) {
      const spineState = this.spineChain.getState();
      state.spineChain = {
        length: spineState.length,
        curvature: spineState.curvature,
        twist: spineState.twist,
      };
    }
    
    return state;
  }

  /**
   * Импортировать состояние компонентов Phase 2
   */
  importState(state: Record<string, any>): void {
    if (this.mainControllers && state.controllers) {
      this.mainControllers.importState(state.controllers);
    }
    
    // Дополнительная логика импорта для других компонентов
    // может быть добавлена здесь
  }
}