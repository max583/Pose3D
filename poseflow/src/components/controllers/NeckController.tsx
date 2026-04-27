// src/components/controllers/NeckController.tsx
// Гизмо шеи: три кольца, расположенные на суставе NECK.
//
// Скручивание (фиолетовое, XZ горизонт.): drag dx → twistY (±45°).
// Изгиб вперёд/назад (оранжевое, YZ верт.): drag dy → bendX (±45°).
// Изгиб в сторону (жёлтое, XY верт.): drag dx → bendZ (±30°).
//
// Кольца меньше, чем у SpineController — шея короткая.

import React from 'react';
import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';

// ─── Настройки визуала ────────────────────────────────────────────────────────

const RING_OUTER      = 0.22;  // меньше, чем у spine (0.38)
const RING_OUTER_SIDE = 0.18;  // боковое кольцо чуть меньше
const RING_TUBE       = 0.006;
const HIT_TUBE        = 0.04;

const BEND_SENS  = 0.010;  // rad/px
const TWIST_SENS = 0.010;  // rad/px

// ─── TwistRing ────────────────────────────────────────────────────────────────

function TwistRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => rigService.applyNeckTwist(dx * TWIST_SENS),
  );

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[RING_OUTER, RING_TUBE, 8, 64]} />
        <meshBasicMaterial color="#aa44ff" depthTest={false} />
      </mesh>
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[RING_OUTER, HIT_TUBE, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── ForwardBendRing ──────────────────────────────────────────────────────────

function ForwardBendRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (_, dy) => rigService.applyNeckBend(dy * BEND_SENS, 0),
  );

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <torusGeometry args={[RING_OUTER, RING_TUBE, 8, 64]} />
        <meshBasicMaterial color="#ff8800" depthTest={false} />
      </mesh>
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[RING_OUTER, HIT_TUBE, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── LateralBendRing ─────────────────────────────────────────────────────────

function LateralBendRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => rigService.applyNeckBend(0, -dx * BEND_SENS),
  );

  return (
    <group>
      <mesh>
        <torusGeometry args={[RING_OUTER_SIDE, RING_TUBE, 8, 64]} />
        <meshBasicMaterial color="#ddcc00" depthTest={false} />
      </mesh>
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[RING_OUTER_SIDE, HIT_TUBE, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── NeckController ───────────────────────────────────────────────────────────

interface NeckControllerProps {
  /** Мировая позиция сустава NECK. */
  neckPos: { x: number; y: number; z: number };
  rigService: RigService;
}

/**
 * Гизмо управления шеей.
 * Рендерить внутри R3F Canvas когда selectedElement === 'neck'.
 */
export function NeckController({ neckPos, rigService }: NeckControllerProps) {
  const pos: [number, number, number] = [neckPos.x, neckPos.y, neckPos.z];

  return (
    <group position={pos}>
      <TwistRing       rigService={rigService} />
      <ForwardBendRing rigService={rigService} />
      <LateralBendRing rigService={rigService} />
    </group>
  );
}
