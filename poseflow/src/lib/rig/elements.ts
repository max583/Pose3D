// src/lib/rig/elements.ts
// Маппинг суставов BODY_25 на логические элементы тела (для выделения и гизмо).
//
// При клике на сустав или кость → находим элемент → показываем гизмо этого элемента.

import { Body25Index } from '../body25/body25-types';

/**
 * Логические элементы тела, которыми управляет пользователь.
 */
export type ElementId =
  | 'pelvis'   // Таз (MID_HIP + HIP суставы)
  | 'spine'    // Позвоночник (MID_HIP→NECK)
  | 'neck'     // Шея (NECK→NOSE)
  | 'head'     // Голова (NOSE + глаза + уши)
  | 'shoulder_r' // Правое плечо (FK верхней руки)
  | 'shoulder_l' // Левое плечо
  | 'arm_r'    // Правая рука (плечо + локоть + запястье)
  | 'arm_l'    // Левая рука
  | 'hand_r'   // Правая кисть (ориентация запястья)
  | 'hand_l'   // Левая кисть
  | 'leg_r'    // Правая нога (бедро + колено + лодыжка)
  | 'leg_l'    // Левая нога
  | 'foot_r'   // Правая стопа (лодыжка + пальцы + пятка)
  | 'foot_l';  // Левая стопа

/**
 * Все возможные значения ElementId.
 */
export const ALL_ELEMENTS: ElementId[] = [
  'pelvis', 'spine', 'neck', 'head',
  'shoulder_r', 'shoulder_l',
  'arm_r', 'arm_l', 'hand_r', 'hand_l',
  'leg_r', 'leg_l', 'foot_r', 'foot_l',
];

/**
 * Отображаемые имена элементов (для UI).
 */
export const ELEMENT_LABELS: Record<ElementId, string> = {
  pelvis: 'Таз',
  spine: 'Позвоночник',
  neck: 'Шея',
  head: 'Голова',
  shoulder_r: 'Правое плечо',
  shoulder_l: 'Левое плечо',
  arm_r: 'Правая рука',
  arm_l: 'Левая рука',
  hand_r: 'Правая кисть',
  hand_l: 'Левая кисть',
  leg_r: 'Правая нога',
  leg_l: 'Левая нога',
  foot_r: 'Правая стопа',
  foot_l: 'Левая стопа',
};

/**
 * Маппинг: сустав → элемент тела.
 *
 * Примечания по неоднозначным случаям:
 * - NECK → spine (часть позвоночника, а не отдельный элемент шеи)
 * - NOSE → neck (конец шейной цепочки, управляется вместе с шеей)
 * - RIGHT_SHOULDER, LEFT_SHOULDER → shoulder_r/shoulder_l (Stage 4.2)
 * - RIGHT_WRIST / LEFT_WRIST → arm (при первом клике; hand при повторном — в Stage 5)
 * - RIGHT_ANKLE / LEFT_ANKLE → leg (аналогично для foot в Stage 7)
 */
export const JOINT_TO_ELEMENT: Map<Body25Index, ElementId> = new Map([
  // Таз
  [Body25Index.MID_HIP,        'pelvis'],
  [Body25Index.RIGHT_HIP,      'pelvis'],
  [Body25Index.LEFT_HIP,       'pelvis'],

  // Позвоночник (управляется через spine VirtualChain)
  [Body25Index.NECK,           'spine'],

  // Плечи
  [Body25Index.RIGHT_SHOULDER, 'shoulder_r'],
  [Body25Index.LEFT_SHOULDER,  'shoulder_l'],

  // Шея
  [Body25Index.NOSE,           'neck'],

  // Голова
  [Body25Index.RIGHT_EYE,      'head'],
  [Body25Index.LEFT_EYE,       'head'],
  [Body25Index.RIGHT_EAR,      'head'],
  [Body25Index.LEFT_EAR,       'head'],

  // Правая рука
  [Body25Index.RIGHT_ELBOW,    'arm_r'],
  [Body25Index.RIGHT_WRIST,    'arm_r'],

  // Левая рука
  [Body25Index.LEFT_ELBOW,     'arm_l'],
  [Body25Index.LEFT_WRIST,     'arm_l'],

  // Правая нога
  [Body25Index.RIGHT_KNEE,     'leg_r'],
  [Body25Index.RIGHT_ANKLE,    'leg_r'],

  // Левая нога
  [Body25Index.LEFT_KNEE,      'leg_l'],
  [Body25Index.LEFT_ANKLE,     'leg_l'],

  // Правая стопа
  [Body25Index.RIGHT_BIG_TOE,   'foot_r'],
  [Body25Index.RIGHT_SMALL_TOE, 'foot_r'],
  [Body25Index.RIGHT_HEEL,      'foot_r'],

  // Левая стопа
  [Body25Index.LEFT_BIG_TOE,    'foot_l'],
  [Body25Index.LEFT_SMALL_TOE,  'foot_l'],
  [Body25Index.LEFT_HEEL,       'foot_l'],
]);

/**
 * Получить элемент по суставу. Возвращает null для неизвестных суставов.
 */
export function getElementForJoint(joint: Body25Index): ElementId | null {
  return JOINT_TO_ELEMENT.get(joint) ?? null;
}

/**
 * Получить все суставы, принадлежащие данному элементу.
 */
export function getJointsForElement(element: ElementId): Body25Index[] {
  const result: Body25Index[] = [];
  for (const [joint, el] of JOINT_TO_ELEMENT) {
    if (el === element) result.push(joint);
  }
  return result;
}

/**
 * Обратный маппинг: элемент → список суставов (кэшированный).
 */
export const ELEMENT_TO_JOINTS: Map<ElementId, Body25Index[]> = new Map(
  ALL_ELEMENTS.map(el => [el, getJointsForElement(el)])
);
