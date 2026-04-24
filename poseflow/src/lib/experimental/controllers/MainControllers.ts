// src/lib/experimental/controllers/MainControllers.ts
// Реестр семи основных контроллеров DesignDoll

import { Vector3, Quaternion, Color } from 'three';
import { Body25Index, PoseData } from '../../body25/body25-types';

// Типы контроллеров
export enum ControllerType {
  HEAD = 'head',
  CHEST = 'chest',
  PELVIS = 'pelvis',
  LEFT_HAND = 'left_hand',
  RIGHT_HAND = 'right_hand',
  LEFT_FOOT = 'left_foot',
  RIGHT_FOOT = 'right_foot',
}

// Состояние контроллера
export interface ControllerState {
  id: string;
  type: ControllerType;
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  isActive: boolean;
  isVisible: boolean;
  color: Color;
  opacity: number;
  
  // Связанные суставы BODY_25
  linkedJoints: Body25Index[];
  
  // Ограничения движения
  constraints: {
    translation: {
      min: Vector3;
      max: Vector3;
    };
    rotation: {
      min: Vector3; // Эйлеровы углы в градусах
      max: Vector3;
    };
  };
}

// Конфигурация контроллеров
const CONTROLLER_CONFIGS: Record<ControllerType, Omit<ControllerState, 'id' | 'position' | 'rotation' | 'isActive' | 'isVisible'>> = {
  [ControllerType.HEAD]: {
    type: ControllerType.HEAD,
    scale: new Vector3(1.0, 1.0, 1.0), // Одинаковый размер для всех
    color: new Color(0x888888), // Серый цвет
    opacity: 0.6, // Полупрозрачность
    linkedJoints: [Body25Index.NOSE],
    constraints: {
      translation: {
        min: new Vector3(-1000, -1000, -1000),
        max: new Vector3(1000, 1000, 1000),
      },
      rotation: {
        min: new Vector3(-180, -180, -180),
        max: new Vector3(180, 180, 180),
      },
    },
  },
  [ControllerType.CHEST]: {
    type: ControllerType.CHEST,
    scale: new Vector3(1.0, 1.0, 1.0), // Одинаковый размер для всех
    color: new Color(0x888888), // Серый цвет
    opacity: 0.6, // Полупрозрачность
    linkedJoints: [Body25Index.NECK],
    constraints: {
      translation: {
        min: new Vector3(-1000, -1000, -1000),
        max: new Vector3(1000, 1000, 1000),
      },
      rotation: {
        min: new Vector3(-180, -180, -180),
        max: new Vector3(180, 180, 180),
      },
    },
  },
  [ControllerType.PELVIS]: {
    type: ControllerType.PELVIS,
    scale: new Vector3(1.0, 1.0, 1.0), // Одинаковый размер для всех
    color: new Color(0x888888), // Серый цвет
    opacity: 0.6, // Полупрозрачность
    linkedJoints: [Body25Index.MID_HIP],
    constraints: {
      translation: {
        min: new Vector3(-0.3, 0.8, -0.3),
        max: new Vector3(0.3, 1.2, 0.3),
      },
      rotation: {
        min: new Vector3(-30, -30, -30),
        max: new Vector3(30, 30, 30),
      },
    },
  },
  [ControllerType.LEFT_HAND]: {
    type: ControllerType.LEFT_HAND,
    scale: new Vector3(1.0, 1.0, 1.0), // Одинаковый размер для всех
    color: new Color(0x888888), // Серый цвет
    opacity: 0.6, // Полупрозрачность
    linkedJoints: [Body25Index.LEFT_WRIST],
    constraints: {
      translation: {
        min: new Vector3(-1000, -1000, -1000),
        max: new Vector3(1000, 1000, 1000),
      },
      rotation: {
        min: new Vector3(-180, -180, -180),
        max: new Vector3(180, 180, 180),
      },
    },
  },
  [ControllerType.RIGHT_HAND]: {
    type: ControllerType.RIGHT_HAND,
    scale: new Vector3(1.0, 1.0, 1.0), // Одинаковый размер для всех
    color: new Color(0x888888), // Серый цвет
    opacity: 0.6, // Полупрозрачность
    linkedJoints: [Body25Index.RIGHT_WRIST],
    constraints: {
      translation: {
        min: new Vector3(-1000, -1000, -1000),
        max: new Vector3(1000, 1000, 1000),
      },
      rotation: {
        min: new Vector3(-180, -180, -180),
        max: new Vector3(180, 180, 180),
      },
    },
  },
  [ControllerType.LEFT_FOOT]: {
    type: ControllerType.LEFT_FOOT,
    scale: new Vector3(1.0, 1.0, 1.0), // Одинаковый размер для всех
    color: new Color(0x888888), // Серый цвет
    opacity: 0.6, // Полупрозрачность
    linkedJoints: [Body25Index.LEFT_ANKLE],
    constraints: {
      translation: {
        min: new Vector3(-1000, -1000, -1000),
        max: new Vector3(1000, 1000, 1000),
      },
      rotation: {
        min: new Vector3(-180, -180, -180),
        max: new Vector3(180, 180, 180),
      },
    },
  },
  [ControllerType.RIGHT_FOOT]: {
    type: ControllerType.RIGHT_FOOT,
    scale: new Vector3(1.0, 1.0, 1.0), // Одинаковый размер для всех
    color: new Color(0x888888), // Серый цвет
    opacity: 0.6, // Полупрозрачность
    linkedJoints: [Body25Index.RIGHT_ANKLE],
    constraints: {
      translation: {
        min: new Vector3(-1000, -1000, -1000),
        max: new Vector3(1000, 1000, 1000),
      },
      rotation: {
        min: new Vector3(-180, -180, -180),
        max: new Vector3(180, 180, 180),
      },
    },
  },
};

// Позиции по умолчанию (T-поза)
const DEFAULT_POSITIONS: Record<ControllerType, Vector3> = {
  [ControllerType.HEAD]: new Vector3(0, 1.7, 0),
  [ControllerType.CHEST]: new Vector3(0, 1.4, 0),
  [ControllerType.PELVIS]: new Vector3(0, 1.0, 0),
  [ControllerType.LEFT_HAND]: new Vector3(-0.5, 1.5, 0),
  [ControllerType.RIGHT_HAND]: new Vector3(0.5, 1.5, 0),
  [ControllerType.LEFT_FOOT]: new Vector3(-0.2, 0, 0),
  [ControllerType.RIGHT_FOOT]: new Vector3(0.2, 0, 0),
};

export class MainControllers {
  private controllers: Map<string, ControllerState> = new Map();
  private activeControllerId: string | null = null;

  constructor() {
    this.initializeControllers();
  }

  /**
   * Инициализировать все контроллеры
   */
  private initializeControllers(): void {
    for (const controllerType of Object.values(ControllerType)) {
      const config = CONTROLLER_CONFIGS[controllerType];
      const position = DEFAULT_POSITIONS[controllerType];
      
      const controller: ControllerState = {
        id: controllerType,
        type: controllerType,
        position: position.clone(),
        rotation: new Quaternion(),
        scale: config.scale.clone(),
        isActive: false,
        isVisible: true,
        color: config.color.clone(),
        opacity: config.opacity,
        linkedJoints: [...config.linkedJoints],
        constraints: {
          translation: {
            min: config.constraints.translation.min.clone(),
            max: config.constraints.translation.max.clone(),
          },
          rotation: {
            min: config.constraints.rotation.min.clone(),
            max: config.constraints.rotation.max.clone(),
          },
        },
      };
      
      this.controllers.set(controllerType, controller);
    }
  }

  /**
   * Получить все контроллеры
   */
  getAllControllers(): ControllerState[] {
    return Array.from(this.controllers.values());
  }

  /**
   * Получить контроллер по ID
   */
  getController(id: string): ControllerState | null {
    return this.controllers.get(id) || null;
  }

  /**
   * Получить контроллер по типу
   */
  getControllerByType(type: ControllerType): ControllerState | null {
    return this.getController(type);
  }

  /**
   * Обновить состояние контроллера
   */
  updateController(id: string, updates: Partial<ControllerState>): boolean {
    const controller = this.controllers.get(id);
    if (!controller) return false;

    // Применяем ограничения к позиции
    if (updates.position) {
      const constrainedPosition = this.applyTranslationConstraints(
        updates.position,
        controller.constraints.translation
      );
      updates.position = constrainedPosition;
    }

    // Применяем ограничения к вращению
    if (updates.rotation) {
      // Конвертируем кватернион в эйлеровы углы для проверки ограничений
      const euler = this.quaternionToEuler(updates.rotation);
      const constrainedEuler = this.applyRotationConstraints(
        euler,
        controller.constraints.rotation
      );
      updates.rotation = this.eulerToQuaternion(constrainedEuler);
    }

    // Обновляем контроллер
    this.controllers.set(id, {
      ...controller,
      ...updates,
    });

    return true;
  }

  /**
   * Установить активный контроллер
   */
  setActiveController(id: string | null): void {
    console.log('MainControllers.setActiveController', { id, previous: this.activeControllerId });
    // Сбрасываем активность у всех контроллеров
    if (this.activeControllerId && this.activeControllerId !== id) {
      const previous = this.controllers.get(this.activeControllerId);
      if (previous) {
        this.controllers.set(this.activeControllerId, {
          ...previous,
          isActive: false,
        });
      }
    }

    // Устанавливаем активность у нового контроллера
    if (id) {
      const controller = this.controllers.get(id);
      if (controller) {
        this.controllers.set(id, {
          ...controller,
          isActive: true,
        });
      }
    }

    this.activeControllerId = id;
  }

  /**
   * Получить активный контроллер
   */
  getActiveController(): ControllerState | null {
    if (!this.activeControllerId) return null;
    return this.controllers.get(this.activeControllerId) || null;
  }

  /**
   * Показать/скрыть контроллер
   */
  setControllerVisibility(id: string, isVisible: boolean): boolean {
    const controller = this.controllers.get(id);
    if (!controller) return false;

    this.controllers.set(id, {
      ...controller,
      isVisible,
    });

    return true;
  }

  /**
   * Показать/скрыть все контроллеры
   */
  setAllControllersVisibility(isVisible: boolean): void {
    for (const [id, controller] of this.controllers) {
      this.controllers.set(id, {
        ...controller,
        isVisible,
      });
    }
  }

  /**
   * Сбросить все контроллеры к позициям по умолчанию
   */
  resetToDefault(): void {
    for (const controllerType of Object.values(ControllerType)) {
      const controller = this.controllers.get(controllerType);
      if (controller) {
        this.controllers.set(controllerType, {
          ...controller,
          position: DEFAULT_POSITIONS[controllerType].clone(),
          rotation: new Quaternion(),
          isActive: false,
        });
      }
    }
    this.activeControllerId = null;
  }

  /**
   * Применить ограничения к перемещению
   */
  private applyTranslationConstraints(
    position: Vector3,
    constraints: { min: Vector3; max: Vector3 }
  ): Vector3 {
    return new Vector3(
      Math.max(constraints.min.x, Math.min(constraints.max.x, position.x)),
      Math.max(constraints.min.y, Math.min(constraints.max.y, position.y)),
      Math.max(constraints.min.z, Math.min(constraints.max.z, position.z))
    );
  }

  /**
   * Применить ограничения к вращению
   */
  private applyRotationConstraints(
    euler: Vector3,
    constraints: { min: Vector3; max: Vector3 }
  ): Vector3 {
    return new Vector3(
      Math.max(constraints.min.x, Math.min(constraints.max.x, euler.x)),
      Math.max(constraints.min.y, Math.min(constraints.max.y, euler.y)),
      Math.max(constraints.min.z, Math.min(constraints.max.z, euler.z))
    );
  }

  /**
   * Конвертировать кватернион в эйлеровы углы (упрощенная версия)
   */
  private quaternionToEuler(quaternion: Quaternion): Vector3 {
    // Упрощенная конвертация (для демонстрации)
    // В реальном приложении используйте Three.js Euler
    const euler = { x: 0, y: 0, z: 0 };
    const q = quaternion;
    
    // Конвертация кватерниона в эйлеровы углы (порядок XYZ)
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    euler.x = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (q.w * q.y - q.z * q.x);
    if (Math.abs(sinp) >= 1) {
      euler.y = (sinp >= 0 ? 1 : -1) * Math.PI / 2;
    } else {
      euler.y = Math.asin(sinp);
    }

    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    euler.z = Math.atan2(siny_cosp, cosy_cosp);

    // Конвертируем радианы в градусы
    return new Vector3(
      euler.x * (180 / Math.PI),
      euler.y * (180 / Math.PI),
      euler.z * (180 / Math.PI)
    );
  }

  /**
   * Конвертировать эйлеровы углы в кватернион (упрощенная версия)
   */
  private eulerToQuaternion(euler: Vector3): Quaternion {
    // Конвертируем градусы в радианы
    const x = euler.x * (Math.PI / 180);
    const y = euler.y * (Math.PI / 180);
    const z = euler.z * (Math.PI / 180);

    // Создаем кватернион из эйлеровых углов (порядок XYZ)
    const cy = Math.cos(z * 0.5);
    const sy = Math.sin(z * 0.5);
    const cp = Math.cos(y * 0.5);
    const sp = Math.sin(y * 0.5);
    const cr = Math.cos(x * 0.5);
    const sr = Math.sin(x * 0.5);

    const q = new Quaternion();
    q.w = cr * cp * cy + sr * sp * sy;
    q.x = sr * cp * cy - cr * sp * sy;
    q.y = cr * sp * cy + sr * cp * sy;
    q.z = cr * cp * sy - sr * sp * cy;

    return q;
  }

  /**
   * Получить контроллеры, связанные с суставом BODY_25
   */
  getControllersForJoint(jointIndex: Body25Index): ControllerState[] {
    const result: ControllerState[] = [];
    
    for (const controller of this.controllers.values()) {
      if (controller.linkedJoints.includes(jointIndex)) {
        result.push(controller);
      }
    }
    
    return result;
  }

  /**
   * Обновить позиции контроллеров на основе позы скелета
   * Вычисляет среднюю позицию связанных суставов для каждого контроллера
   */
  updatePositionsFromPose(pose: PoseData): void {
    for (const controller of this.controllers.values()) {
      if (controller.linkedJoints.length === 0) {
        continue;
      }

      // Для контроллеров с одним связанным суставом: жесткая привязка
      // Для контроллеров с несколькими суставами: средняя позиция
      if (controller.linkedJoints.length === 1) {
        // Берем первый (и единственный) связанный сустав
        const jointIndex = controller.linkedJoints[0];
        const joint = pose[jointIndex];
        if (joint && typeof joint.x === 'number' && typeof joint.y === 'number' && typeof joint.z === 'number') {
          // Прямое обновление позиции, минуя ограничения
          controller.position.set(joint.x, joint.y, joint.z);
          // Также обновляем объект в Map (controller уже является ссылкой, но для гарантии)
          this.controllers.set(controller.id, controller);
        }
      } else {
        // Вычисляем среднюю позицию всех связанных суставов (как раньше)
        const sum = new Vector3(0, 0, 0);
        let count = 0;
        
        for (const jointIndex of controller.linkedJoints) {
          const joint = pose[jointIndex];
          if (joint && typeof joint.x === 'number' && typeof joint.y === 'number' && typeof joint.z === 'number') {
            sum.x += joint.x;
            sum.y += joint.y;
            sum.z += joint.z;
            count++;
          }
        }
        
        if (count > 0) {
          const averagePosition = new Vector3(
            sum.x / count,
            sum.y / count,
            sum.z / count
          );
          
          // Обновляем позицию контроллера через стандартный метод (с ограничениями)
          this.updateController(controller.id, { position: averagePosition });
        }
      }
    }
  }

  /**
   * Экспортировать состояние всех контроллеров
   */
  exportState(): Record<string, any> {
    const state: Record<string, any> = {};
    
    for (const [id, controller] of this.controllers) {
      state[id] = {
        position: controller.position.toArray(),
        rotation: controller.rotation.toArray(),
        isActive: controller.isActive,
        isVisible: controller.isVisible,
      };
    }
    
    return state;
  }

  /**
   * Импортировать состояние контроллеров
   */
  importState(state: Record<string, any>): void {
    for (const [id, controllerState] of Object.entries(state)) {
      const controller = this.controllers.get(id);
      if (controller && controllerState) {
        const updates: Partial<ControllerState> = {};
        
        if (controllerState.position && Array.isArray(controllerState.position)) {
          updates.position = new Vector3().fromArray(controllerState.position);
        }
        
        if (controllerState.rotation && Array.isArray(controllerState.rotation)) {
          updates.rotation = new Quaternion().fromArray(controllerState.rotation);
        }
        
        if (typeof controllerState.isActive === 'boolean') {
          updates.isActive = controllerState.isActive;
        }
        
        if (typeof controllerState.isVisible === 'boolean') {
          updates.isVisible = controllerState.isVisible;
        }
        
        this.updateController(id, updates);
      }
    }
  }
}