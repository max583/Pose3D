// src/components/controllers/SpineController.tsx
// Гизмо позвоночника: три кольца.
//
// Скручивание (фиолетовое, XZ-плоскость горизонтальное):
//   Drag dx → twistY (±45°).
//
// Изгиб вперёд/назад (оранжевое, YZ-плоскость вертикальное):
//   Drag dy → bendX. Кольцо в плоскости движения — видно сбоку.
//
// Изгиб влево/вправо (жёлтое, XY-плоскость вертикальное фронтальное):
//   Drag dx → bendZ. Кольцо в плоскости движения — видно спереди.

import React from 'react';
import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';

// ─── Настройки визуала ────────────────────────────────────────────────────────

const RING_OUTER      = 0.38;
const RING_OUTER_SIDE = 0.32;  // кольцо бокового изгиба чуть меньше — не перекрывает
const RING_TUBE       = 0.006;
const HIT_TUBE        = 0.05;

const BEND_SENS  = 0.010;  // rad/px
const TWIST_SENS = 0.010;  // rad/px

// ─── TwistRing ─── горизонтальное кольцо (скручивание вокруг Y) ───────────────

function TwistRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => rigService.applySpineTwist(dx * TWIST_SENS),
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

// ─── ForwardBendRing ─── вертикальное кольцо YZ (изгиб вперёд/назад, вокруг X) ─

function ForwardBendRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (_, dy) => rigService.applySpineBend(dy * BEND_SENS, 0),
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

// ─── LateralBendRing ─── вертикальное кольцо XY (изгиб вправо/влево, вокруг Z) ─

function LateralBendRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    // Позитивный Z-поворот наклоняет верхушку влево → инвертируем
    (dx) => rigService.applySpineBend(0, -dx * BEND_SENS),
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

// ─── SpineController ──────────────────────────────────────────────────────────

interface SpineControllerProps {
  spineMiddle: { x: number; y: number; z: number };
  rigService: RigService;
}

export function SpineController({ spineMiddle, rigService }: SpineControllerProps) {
  const pos: [number, number, number] = [spineMiddle.x, spineMiddle.y, spineMiddle.z];

  return (
    <group position={pos}>
      <TwistRing       rigService={rigService} />
      <ForwardBendRing rigService={rigService} />
      <LateralBendRing rigService={rigService} />
    </group>
  );
}
