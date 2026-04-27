// src/components/controllers/ArmController.tsx
// Гизмо руки (Stage 4.1):
//   • WristHandle  — сфера на запястье, camera-plane drag → applyArmIK (FABRIK)
//   • ElbowTwistArc — дуга ±45° вокруг оси плечо→запястье; drag dx → applyElbowTwist
//
// Активируется при selectedElement === 'arm_r' / 'arm_l'.

import { useCallback, useMemo } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';
import { useCameraPlaneWorldDrag } from '../../hooks/useCameraPlaneWorldDrag';

// ─── Константы визуала ────────────────────────────────────────────────────────

const WRIST_SPHERE_R = 0.045;
const ARC_TUBE       = 0.006;
const ARC_HIT_TUBE   = 0.045;
const CONE_R         = 0.016;
const CONE_H         = 0.042;
const TWIST_SENS     = 0.012;  // rad/px
const COLOR_ARM      = '#00ccff';

// ─── WristHandle ──────────────────────────────────────────────────────────────

interface WristHandleProps {
  wristPos:   { x: number; y: number; z: number };
  side:       'r' | 'l';
  rigService: RigService;
}

function WristHandle({ wristPos, side, rigService }: WristHandleProps) {
  // getCurrentPos вызывается ОДИН раз при drag-start → создать плоскость камеры
  const getCurrentPos = useCallback(
    () => new Vector3(wristPos.x, wristPos.y, wristPos.z),
    [wristPos.x, wristPos.y, wristPos.z],
  );

  const { handlePointerDown } = useCameraPlaneWorldDrag(
    getCurrentPos,
    () => rigService.beginDrag(),
    (newPos) => rigService.applyArmIK(side, newPos.x, newPos.y, newPos.z),
  );

  return (
    <mesh
      position={[wristPos.x, wristPos.y, wristPos.z]}
      onPointerDown={handlePointerDown}
    >
      <sphereGeometry args={[WRIST_SPHERE_R, 12, 12]} />
      <meshBasicMaterial color={COLOR_ARM} depthTest={false} />
    </mesh>
  );
}

// ─── ElbowTwistArc ────────────────────────────────────────────────────────────

interface ElbowTwistArcProps {
  shoulderPos: { x: number; y: number; z: number };
  elbowPos:    { x: number; y: number; z: number };
  wristPos:    { x: number; y: number; z: number };
  side:        'r' | 'l';
  rigService:  RigService;
}

function ElbowTwistArc({ shoulderPos, elbowPos, wristPos, side, rigService }: ElbowTwistArcProps) {
  // Вычисляем параметры дуги из текущих позиций
  const arcParams = useMemo(() => {
    const sh = new Vector3(shoulderPos.x, shoulderPos.y, shoulderPos.z);
    const el = new Vector3(elbowPos.x,    elbowPos.y,    elbowPos.z);
    const wr = new Vector3(wristPos.x,    wristPos.y,    wristPos.z);

    // Ось: плечо → запястье
    const axis = new Vector3().subVectors(wr, sh).normalize();

    // Основание перпендикуляра от локтя до оси
    const t = new Vector3().subVectors(el, sh).dot(axis);
    const center = sh.clone().addScaledVector(axis, t);

    // Направление к локтю и радиус
    const elbowDir = new Vector3().subVectors(el, center);
    const radius = elbowDir.length();

    // Если локоть лежит на оси (radius ≈ 0) — дугу не рисуем
    if (radius < 0.001) return null;

    elbowDir.normalize();

    // Ориентация группы: X = elbowDir, Z = axis, Y = Z×X
    const arcX = elbowDir.clone();
    const arcZ = axis.clone();
    const arcY = new Vector3().crossVectors(arcZ, arcX).normalize();
    const mat  = new Matrix4().makeBasis(arcX, arcY, arcZ);
    const quat = new Quaternion().setFromRotationMatrix(mat);

    return { center, radius, quat };
  }, [shoulderPos, elbowPos, wristPos]);

  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx) => rigService.applyElbowTwist(side, dx * TWIST_SENS),
  );

  if (!arcParams) return null;
  const { center, radius, quat } = arcParams;

  // Вспомогательная функция: позиция + поворот стрелки на конце дуги
  // angle — угол от локальной оси X в плоскости XY группы
  // dir: +1 = CCW, -1 = CW (направление стрелки)
  function arrowAt(angle: number, dir: 1 | -1): [pos: [number, number, number], rotZ: number] {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    // Касательное направление: CCW = (-sin θ, cos θ), CW = (sin θ, -cos θ)
    const tx = -dir * Math.sin(angle);
    const ty =  dir * Math.cos(angle);
    // Поворот конуса (по умолчанию ось Y): rotZ такой, что (-sin rotZ, cos rotZ) = (tx, ty)
    const rotZ = Math.atan2(-tx, ty);
    return [[x, y, 0], rotZ];
  }

  const [startPos, startRot] = arrowAt(-Math.PI / 4, -1);  // начало дуги, CW
  const [endPos,   endRot]   = arrowAt( Math.PI / 4,  1);  // конец дуги, CCW

  return (
    <group
      position={center.toArray() as [number, number, number]}
      quaternion={[quat.x, quat.y, quat.z, quat.w]}
    >
      {/* Видимая дуга ±45° (начинается в 0° = elbowDir, сдвигаем на -45°) */}
      <group rotation={[0, 0, -Math.PI / 4]}>
        <mesh>
          <torusGeometry args={[radius, ARC_TUBE, 8, 32, Math.PI / 2]} />
          <meshBasicMaterial color={COLOR_ARM} depthTest={false} />
        </mesh>
      </group>

      {/* Стрелка на конце дуги (+45°) */}
      <mesh position={endPos} rotation={[0, 0, endRot]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={COLOR_ARM} depthTest={false} />
      </mesh>

      {/* Стрелка на начале дуги (−45°) */}
      <mesh position={startPos} rotation={[0, 0, startRot]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={COLOR_ARM} depthTest={false} />
      </mesh>

      {/* Невидимая зона для захвата drag (полное кольцо) */}
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[radius, ARC_HIT_TUBE, 8, 32]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── ArmController ────────────────────────────────────────────────────────────

interface ArmControllerProps {
  side:        'r' | 'l';
  shoulderPos: { x: number; y: number; z: number };
  elbowPos:    { x: number; y: number; z: number };
  wristPos:    { x: number; y: number; z: number };
  rigService:  RigService;
}

/**
 * Гизмо управления рукой.
 * Рендерить внутри R3F Canvas когда selectedElement === 'arm_r' / 'arm_l'.
 */
export function ArmController({
  side,
  shoulderPos,
  elbowPos,
  wristPos,
  rigService,
}: ArmControllerProps) {
  return (
    <>
      <WristHandle
        wristPos={wristPos}
        side={side}
        rigService={rigService}
      />
      <ElbowTwistArc
        shoulderPos={shoulderPos}
        elbowPos={elbowPos}
        wristPos={wristPos}
        side={side}
        rigService={rigService}
      />
    </>
  );
}
