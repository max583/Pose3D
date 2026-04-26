// src/components/controllers/SpineController.tsx
// Гизмо позвоночника: одно кольцо изгиба (горизонтальное) + одно кольцо скручивания (вертикальное).
// Рендерится когда selectedElement === 'spine'.
//
// Кольцо изгиба (оранжевое, XZ-плоскость, горизонтальное):
//   Drag вверх/вниз (screenDy) → наклон вперёд/назад (bendX).
//   Drag влево/вправо (screenDx) → боковой наклон (bendZ).
//
// Кольцо скручивания (фиолетовое, XY-плоскость, вертикальное):
//   Drag влево/вправо (screenDx) → скручивание вокруг Y (twistY, ±45°).

import React from 'react';
import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';

// ─── Настройки визуала ────────────────────────────────────────────────────────

const BEND_RING_R    = 0.38;   // радиус кольца изгиба
const BEND_RING_TUBE = 0.013;
const BEND_HIT_TUBE  = 0.055;

const TWIST_RING_R    = 0.30;  // радиус кольца скручивания
const TWIST_RING_TUBE = 0.013;
const TWIST_HIT_TUBE  = 0.055;

const BEND_SENS  = 0.010;  // rad/px для изгиба
const TWIST_SENS = 0.010;  // rad/px для скручивания

// ─── BendRing ─────────────────────────────────────────────────────────────────

interface BendRingProps {
  rigService: RigService;
}

/**
 * Горизонтальное кольцо изгиба позвоночника.
 * Drag: dx → bendZ (боковой наклон), dy → bendX (наклон вперёд/назад).
 */
function BendRing({ rigService }: BendRingProps) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx, dy) => {
      rigService.applySpineBend(-dy * BEND_SENS, dx * BEND_SENS);
    },
  );

  return (
    // Кольцо лежит в XZ-плоскости (горизонтальное): повернуть TorusGeometry на π/2 вокруг X
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Визуальное кольцо (оранжевое) */}
      <mesh>
        <torusGeometry args={[BEND_RING_R, BEND_RING_TUBE, 8, 64]} />
        <meshBasicMaterial color="#ff8800" depthTest={false} />
      </mesh>

      {/* Невидимая hit-зона */}
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[BEND_RING_R, BEND_HIT_TUBE, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── TwistRing ────────────────────────────────────────────────────────────────

interface TwistRingProps {
  rigService: RigService;
}

/**
 * Вертикальное кольцо скручивания позвоночника (вращение вокруг Y).
 * Drag: dx → twistY (ограничено ±45°).
 */
function TwistRing({ rigService }: TwistRingProps) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => {
      rigService.applySpineTwist(dx * TWIST_SENS);
    },
  );

  return (
    // Кольцо лежит в XY-плоскости (вертикальное): без дополнительного поворота
    <group>
      {/* Визуальное кольцо (фиолетовое) */}
      <mesh>
        <torusGeometry args={[TWIST_RING_R, TWIST_RING_TUBE, 8, 64]} />
        <meshBasicMaterial color="#aa44ff" depthTest={false} />
      </mesh>

      {/* Невидимая hit-зона */}
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[TWIST_RING_R, TWIST_HIT_TUBE, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── SpineController ──────────────────────────────────────────────────────────

interface SpineControllerProps {
  /** Мировая позиция середины позвоночника. */
  spineMiddle: { x: number; y: number; z: number };
  rigService: RigService;
}

/**
 * Гизмо управления позвоночником.
 * Рендерить внутри R3F Canvas когда selectedElement === 'spine'.
 */
export function SpineController({ spineMiddle, rigService }: SpineControllerProps) {
  const pos: [number, number, number] = [spineMiddle.x, spineMiddle.y, spineMiddle.z];

  return (
    <group position={pos}>
      <BendRing rigService={rigService} />
      <TwistRing rigService={rigService} />
    </group>
  );
}
