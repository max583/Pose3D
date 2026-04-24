// src/lib/experimental/controllers/DragAdapter.ts
// Адаптер для преобразования drag событий в движения контроллеров

import { Vector3, Quaternion, Raycaster, Plane, Vector2, Euler, Sphere } from 'three';
import { MainControllers, ControllerState } from './MainControllers';
import { useSettingsStore } from '../../stores/settingsStore';
import { canvasLogger } from '../../logger';

export interface DragEvent {
  type: 'start' | 'drag' | 'end';
  screenPosition: Vector2;
  controllerId: string | null;
  delta?: Vector2;
}

export interface DragPlane {
  normal: Vector3;
  point: Vector3;
}

export class DragAdapter {
  private controllers: MainControllers;
  private raycaster: Raycaster;
  private dragPlane: DragPlane | null = null;
  private isDragging = false;
  private activeControllerId: string | null = null;
  private lastScreenPosition: Vector2 | null = null;
  
  // Конфигурация
  private config = {
    dragSensitivity: 1.0,
    rotationSensitivity: 0.01,
    planeOffset: 0.5, // Смещение плоскости драга от камеры
  };

  constructor(controllers: MainControllers) {
    this.controllers = controllers;
    this.raycaster = new Raycaster();
  }

  /**
   * Обработать drag событие
   */
  handleDragEvent(event: DragEvent, camera: any, canvasSize: { width: number; height: number }): boolean {
    canvasLogger.debug('handleDragEvent', { type: event.type, screenPosition: event.screenPosition });
    switch (event.type) {
      case 'start':
        return this.handleDragStart(event, camera, canvasSize);
      case 'drag':
        return this.handleDrag(event, camera, canvasSize);
      case 'end':
        return this.handleDragEnd(event);
      default:
        return false;
    }
  }

  /**
   * Обработать начало drag
   */
  private handleDragStart(event: DragEvent, camera: any, canvasSize: { width: number; height: number }): boolean {
    console.log('DragAdapter.handleDragStart', { screenPosition: event.screenPosition, canvasSize });
    if (this.isDragging) {
      console.log('DragAdapter.handleDragStart: already dragging');
      return false;
    }

    // Находим контроллер под курсором
    const controller = this.findControllerUnderCursor(event.screenPosition, camera, canvasSize);
    if (!controller) {
      canvasLogger.debug('handleDragStart: no controller under cursor');
      console.log('DragAdapter.handleDragStart: no controller under cursor');
      return false;
    }

    // Если указан controllerId в событии, проверяем что он совпадает с найденным контроллером
    if (event.controllerId && event.controllerId !== controller.id) {
      console.log('DragAdapter.handleDragStart: controllerId mismatch', { eventControllerId: event.controllerId, foundId: controller.id });
      return false;
    }

    // Устанавливаем активный контроллер
    this.activeControllerId = controller.id;
    this.controllers.setActiveController(controller.id);
    
    // Создаем плоскость для драга
    this.dragPlane = this.createDragPlane(controller.position, camera);
    this.lastScreenPosition = event.screenPosition.clone();
    this.isDragging = true;
    canvasLogger.debug('handleDragStart: drag started', { controllerId: controller.id });
    console.log('DragAdapter.handleDragStart: drag started', { controllerId: controller.id });

    return true;
  }

  /**
   * Обработать drag движение
   */
  private handleDrag(event: DragEvent, camera: any, canvasSize: { width: number; height: number }): boolean {
    if (!this.isDragging || !this.activeControllerId || !this.dragPlane || !this.lastScreenPosition) {
      return false;
    }

    // Если указан controllerId в событии, проверяем что он совпадает с активным контроллером
    if (event.controllerId && event.controllerId !== this.activeControllerId) {
      return false;
    }

    const controller = this.controllers.getController(this.activeControllerId);
    if (!controller) {
      return false;
    }

    // Вычисляем дельту движения
    const delta = new Vector2(
      event.screenPosition.x - this.lastScreenPosition.x,
      event.screenPosition.y - this.lastScreenPosition.y
    );

    // Определяем режим трансформации (перемещение/вращение)
    const transformMode = this.determineTransformMode(event);

    if (transformMode === 'translate') {
      // Перемещение контроллера
      this.handleTranslation(delta, controller, camera, canvasSize);
    } else if (transformMode === 'rotate') {
      // Вращение контроллера
      this.handleRotation(delta, controller);
    }

    this.lastScreenPosition = event.screenPosition.clone();
    return true;
  }

  /**
   * Обработать конец drag
   */
  private handleDragEnd(event: DragEvent): boolean {
    if (!this.isDragging) {
      return false;
    }

    // Если указан controllerId в событии, проверяем что он совпадает с активным контроллером
    if (event.controllerId && event.controllerId !== this.activeControllerId) {
      return false;
    }

    this.isDragging = false;
    this.activeControllerId = null;
    this.dragPlane = null;
    this.lastScreenPosition = null;
    
    // Сбрасываем активный контроллер
    this.controllers.setActiveController(null);

    return true;
  }

  /**
   * Найти контроллер под курсором
   */
  private findControllerUnderCursor(
    screenPosition: Vector2,
    camera: any,
    canvasSize: { width: number; height: number }
  ): ControllerState | null {
    canvasLogger.debug('findControllerUnderCursor', { screenPosition, canvasSize });
    // Конвертируем координаты экрана в нормализованные координаты (-1 до 1)
    const normalizedPosition = new Vector2(
      (screenPosition.x / canvasSize.width) * 2 - 1,
      -(screenPosition.y / canvasSize.height) * 2 + 1
    );
    console.log('DragAdapter.findControllerUnderCursor normalized', normalizedPosition);

    // Устанавливаем позицию рейкастера
    this.raycaster.setFromCamera(normalizedPosition, camera);

    // DEBUG: Log ray details
    console.log('Ray origin:', this.raycaster.ray.origin);
    console.log('Ray direction:', this.raycaster.ray.direction);
    console.log('Ray far:', camera.far);
    console.log('Camera position:', camera.position);
    console.log('Camera rotation:', camera.rotation);

    // Получаем все контроллеры
    const allControllers = this.controllers.getAllControllers();
    
    // Получаем размер контроллеров из настроек
    const controllerSize = useSettingsStore.getState().settings.controllerSize;
    console.log('controllerSize from settings:', controllerSize, 'expected default 0.24');
    
    // Ensure controllerSize is not too small for hit detection
    const effectiveControllerSize = controllerSize < 0.2 ? 0.24 : controllerSize;
    if (controllerSize !== effectiveControllerSize) {
      console.log('Adjusted controllerSize from', controllerSize, 'to', effectiveControllerSize);
    }

    // TEST: Use larger radius for debugging
    const debugRadius = 0.5; // Large radius for testing
    console.log('DEBUG: Using test radius:', debugRadius);

    // Проверяем пересечение с каждым контроллером
    for (const controller of allControllers) {
      if (!controller.isVisible) continue;

      // Создаем сферу для проверки пересечения
      // Sphere geometry имеет радиус controllerSize, масштабируется controller.scale
      // Поскольку scale uniform (1.0, 1.0, 1.0), используем controller.scale.x
      const sphereRadius = effectiveControllerSize * controller.scale.x;
      const sphereCenter = controller.position;

      // DEBUG: Log controller details
      console.log(`Controller ${controller.id}:`, {
        position: sphereCenter,
        scale: controller.scale.x,
        calculatedRadius: sphereRadius,
        testRadius: debugRadius,
        effectiveControllerSize
      });

      // Test with both original and debug radius
      let intersection = this.raycaster.ray.intersectSphere(new Sphere(sphereCenter, sphereRadius), new Vector3());
      if (intersection === null) {
        // Try with debug radius
        intersection = this.raycaster.ray.intersectSphere(new Sphere(sphereCenter, debugRadius), new Vector3());
        if (intersection !== null) {
          console.log(`DEBUG HIT with large radius on ${controller.id}`);
        }
      }

      canvasLogger.debug('Controller check', { controllerId: controller.id, intersection: !!intersection, sphereCenter, sphereRadius });
      console.log('Controller check', controller.id, intersection, sphereCenter, sphereRadius);
      if (intersection !== null) {
        canvasLogger.debug('Controller hit', { controllerId: controller.id });
        console.log('Controller hit', controller.id);
        return controller;
      }
    }

    canvasLogger.debug('No controller found under cursor');
    console.log('No controller found under cursor');
    return null;
  }

  /**
   * Создать плоскость для drag
   */
  private createDragPlane(controllerPosition: Vector3, camera: any): DragPlane {
    // Создаем плоскость, перпендикулярную направлению взгляда камеры
    const cameraDirection = new Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Плоскость проходит через позицию контроллера
    return {
      normal: cameraDirection.normalize(),
      point: controllerPosition.clone(),
    };
  }

  /**
   * Определить режим трансформации
   */
  private determineTransformMode(event: DragEvent): 'translate' | 'rotate' {
    // В реальном приложении это может определяться модификаторами (Shift, Ctrl и т.д.)
    // Пока используем простую логику: по умолчанию перемещение
    return 'translate';
  }

  /**
   * Обработать перемещение контроллера
   */
  private handleTranslation(
    delta: Vector2,
    controller: ControllerState,
    camera: any,
    canvasSize: { width: number; height: number }
  ): void {
    if (!this.dragPlane) return;

    // Конвертируем дельту экрана в мировые координаты
    const worldDelta = this.screenDeltaToWorldDelta(delta, controller.position, camera, canvasSize);
    
    // Вычисляем новую позицию
    const newPosition = controller.position.clone().add(worldDelta);
    
    // Обновляем контроллер
    this.controllers.updateController(controller.id, {
      position: newPosition,
    });
  }

  /**
   * Обработать вращение контроллера
   */
  private handleRotation(delta: Vector2, controller: ControllerState): void {
    // Вычисляем углы вращения на основе дельты
    const rotationDelta = new Vector3(
      delta.y * this.config.rotationSensitivity,
      delta.x * this.config.rotationSensitivity,
      0
    );

    // Создаем кватернион из дельты вращения
    const deltaEuler = new Euler(rotationDelta.x, rotationDelta.y, rotationDelta.z, 'XYZ');
    const deltaQuaternion = new Quaternion().setFromEuler(deltaEuler);

    // Применяем вращение к текущему кватерниону
    const newRotation = controller.rotation.clone().multiply(deltaQuaternion);
    
    // Обновляем контроллер
    this.controllers.updateController(controller.id, {
      rotation: newRotation,
    });
  }

  /**
   * Конвертировать дельту экрана в мировую дельту
   */
  private screenDeltaToWorldDelta(
    delta: Vector2,
    controllerPosition: Vector3,
    camera: any,
    canvasSize: { width: number; height: number }
  ): Vector3 {
    if (!this.dragPlane) return new Vector3();

    // Создаем луч из камеры через точку на экране
    const normalizedDelta = new Vector2(
      delta.x / canvasSize.width,
      delta.y / canvasSize.height
    );

    // Вычисляем направление луча
    const rayDirection = new Vector3();
    const cameraDirection = new Vector3();
    
    camera.getWorldDirection(cameraDirection);
    
    // Упрощенный расчет: перемещаем вдоль плоскости
    const cameraRight = new Vector3().crossVectors(cameraDirection, new Vector3(0, 1, 0)).normalize();
    const cameraUp = new Vector3().crossVectors(cameraRight, cameraDirection).normalize();
    
    // Масштабируем дельту с учетом чувствительности
    const worldDelta = new Vector3()
      .addScaledVector(cameraRight, delta.x * this.config.dragSensitivity * 0.01)
      .addScaledVector(cameraUp, -delta.y * this.config.dragSensitivity * 0.01);

    return worldDelta;
  }

  /**
   * Проверить, происходит ли drag в данный момент
   */
  isDraggingNow(): boolean {
    return this.isDragging;
  }

  /**
   * Получить ID активного контроллера
   */
  getActiveControllerId(): string | null {
    return this.activeControllerId;
  }

  /**
   * Сбросить состояние адаптера
   */
  reset(): void {
    this.isDragging = false;
    this.activeControllerId = null;
    this.dragPlane = null;
    this.lastScreenPosition = null;
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}