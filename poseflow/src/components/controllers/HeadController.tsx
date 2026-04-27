// src/components/controllers/HeadController.tsx
// Гизмо головы: три кольца у сустава NOSE.
//
// Поворот головы как жёсткого блока вокруг NECK.
//
// Кивок вперёд/назад  (оранжевое, YZ верт.): drag dy → pitch (−30°/+45°).
// Поворот вправо/влево (фиолетовое, XZ гориз.): drag dx → yaw (±80°).
// Боковой наклон      (жёлтое, XY верт.): drag dx → roll (±30°).
//
// Кольца меньше, чем у NeckController (0.22) — голова — маленький элемент.

import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';

// ─── Настройки визуала ────────────────────────────────────────────────────────

const RING_OUTER      = 0.16;
const RING_OUTER_SIDE = 0.13;
const RING_TUBE       = 0.006;
const HIT_TUBE        = 0.04;

const PITCH_SENS = 0.010;  // rad/px
const YAW_SENS   = 0.010;  // rad/px
const ROLL_SENS  = 0.010;  // rad/px

// ─── YawRing ──────────────────────────────────────────────────────────────────

function YawRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => rigService.applyHeadYaw(-dx * YAW_SENS),
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

// ─── PitchRing ────────────────────────────────────────────────────────────────

function PitchRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (_, dy) => rigService.applyHeadPitch(dy * PITCH_SENS),
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

// ─── RollRing ─────────────────────────────────────────────────────────────────

function RollRing({ rigService }: { rigService: RigService }) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => rigService.applyHeadRoll(-dx * ROLL_SENS),
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

// ─── HeadController ───────────────────────────────────────────────────────────

interface HeadControllerProps {
  /** Мировая позиция сустава NOSE (у него рендерим гизмо). */
  nosePos: { x: number; y: number; z: number };
  rigService: RigService;
}

/**
 * Гизмо управления головой.
 * Рендерить внутри R3F Canvas когда selectedElement === 'head'.
 */
export function HeadController({ nosePos, rigService }: HeadControllerProps) {
  const pos: [number, number, number] = [nosePos.x, nosePos.y, nosePos.z];

  return (
    <group position={pos}>
      <YawRing   rigService={rigService} />
      <PitchRing rigService={rigService} />
      <RollRing  rigService={rigService} />
    </group>
  );
}
