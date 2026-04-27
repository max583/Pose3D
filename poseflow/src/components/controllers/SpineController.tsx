// src/components/controllers/SpineController.tsx
// Гизмо позвоночника: два кольца.
//
// Кольцо скручивания (фиолетовое, XZ-плоскость, горизонтальное):
//   Drag влево/вправо (screenDx) → twistY (±45°).
//
// Кольцо наклона вперёд/назад (оранжевое, XY-плоскость, вертикальное фронтальное):
//   Drag вверх/вниз (screenDy) → bendX.

import React from 'react';
import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';

// ─── Настройки визуала ────────────────────────────────────────────────────────

const RING_OUTER = 0.38;
const RING_TUBE  = 0.006;   // тонкие кольца
const HIT_TUBE   = 0.05;    // невидимая hit-зона

const BEND_SENS  = 0.010;   // rad/px
const TWIST_SENS = 0.010;   // rad/px

// ─── TwistRing ─── горизонтальное кольцо (скручивание вокруг Y) ───────────────

function TwistRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => rigService.applySpineTwist(dx * TWIST_SENS),
  );

  return (
    // XZ-плоскость: TorusGeometry по умолчанию в XY, поворот π/2 вокруг X → XZ
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

// ─── BendRing ─── вертикальное кольцо (наклон вперёд/назад вокруг X) ─────────

function BendRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (_, dy) => rigService.applySpineBend(-dy * BEND_SENS, 0),
  );

  return (
    // YZ-плоскость (вращение вокруг X): поворот π/2 вокруг Y
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

// ─── SpineController ──────────────────────────────────────────────────────────

interface SpineControllerProps {
  spineMiddle: { x: number; y: number; z: number };
  rigService: RigService;
}

export function SpineController({ spineMiddle, rigService }: SpineControllerProps) {
  const pos: [number, number, number] = [spineMiddle.x, spineMiddle.y, spineMiddle.z];

  return (
    <group position={pos}>
      <TwistRing rigService={rigService} />
      <BendRing  rigService={rigService} />
    </group>
  );
}
