// src/components/controllers/PelvisController.tsx
// Гизмо таза: 3 стрелки трансляции (X/Y/Z) + 3 кольца вращения (X/Y/Z).
// Рендерится когда selectedElement === 'pelvis'.
//
// Drag по стрелке → перемещает таз вдоль соответствующей мировой оси.
// Drag по кольцу → вращает таз вокруг соответствующей мировой оси.

import React, { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';

// ─── Настройки визуала ────────────────────────────────────────────────────────

const ARROW_LENGTH   = 0.32;   // длина стрелки (units)
const ARROW_R        = 0.013;  // радиус стержня
const CONE_R         = 0.038;  // радиус конуса
const CONE_H         = 0.09;   // высота конуса
const HIT_R          = 0.06;   // радиус невидимой hit-зоны стержня

const RING_OUTER     = 0.30;   // радиус кольца вращения
const RING_TUBE      = 0.012;  // радиус трубки кольца
const RING_HIT_TUBE  = 0.05;   // радиус невидимой hit-зоны кольца

const ROT_SENS       = 0.012;  // чувствительность вращения (rad/px)

const AXIS_COLOR = {
  x: '#ff4444',
  y: '#44dd44',
  z: '#4488ff',
} as const;

// ─── Вспомогательные типы ─────────────────────────────────────────────────────

type Axis = 'x' | 'y' | 'z';

// ─── TranslationArrow ─────────────────────────────────────────────────────────

interface TranslationArrowProps {
  axis: Axis;
  origin: THREE.Vector3;
  rigService: RigService;
}

/**
 * Стрелка трансляции для одной оси.
 * Drag: проецирует курсор через плоскость камеры на мировую ось.
 */
function TranslationArrow({ axis, origin, rigService }: TranslationArrowProps) {
  const { camera, gl, controls } = useThree();

  const axisDir = axis === 'x' ? new THREE.Vector3(1, 0, 0)
                : axis === 'y' ? new THREE.Vector3(0, 1, 0)
                               : new THREE.Vector3(0, 0, 1);

  // Rotation чтобы стрелка смотрела вдоль нужной оси
  // By default CylinderGeometry/ConeGeometry направлены вдоль Y.
  const groupRotation: [number, number, number] =
    axis === 'x' ? [0, 0, -Math.PI / 2] :
    axis === 'y' ? [0, 0, 0]            :
                   [Math.PI / 2, 0, 0];

  // ─── Drag по камерной плоскости с проекцией на ось ────────────────────────

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();

    const rect = gl.domElement.getBoundingClientRect();

    const getProjection = (clientX: number, clientY: number): number | null => {
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, camera);

      // Плоскость перпендикулярна камере, проходит через origin
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDir, origin);

      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return hit.dot(axisDir);
    };

    const startProj = getProjection(e.clientX, e.clientY);
    if (startProj === null) return;

    let prevProj = startProj;

    if (controls) (controls as { enabled: boolean }).enabled = false;
    rigService.beginDrag();

    const moveHandler = (ev: PointerEvent) => {
      const proj = getProjection(ev.clientX, ev.clientY);
      if (proj === null) return;
      const delta = proj - prevProj;
      prevProj = proj;
      rigService.applyPelvisTranslate(
        delta * axisDir.x,
        delta * axisDir.y,
        delta * axisDir.z,
      );
    };

    const upHandler = () => {
      if (controls) (controls as { enabled: boolean }).enabled = true;
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  }, [axis, origin, camera, gl, controls, rigService, axisDir]);

  const color = AXIS_COLOR[axis];
  const shaftLength = ARROW_LENGTH - CONE_H;

  return (
    <group rotation={groupRotation}>
      {/* Стержень */}
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[ARROW_R, ARROW_R, shaftLength, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Конус (наконечник) */}
      <mesh position={[0, shaftLength + CONE_H / 2, 0]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Невидимая hit-зона */}
      <mesh
        position={[0, ARROW_LENGTH / 2, 0]}
        onPointerDown={handlePointerDown}
      >
        <cylinderGeometry args={[HIT_R, HIT_R, ARROW_LENGTH, 8]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── RotationRing ─────────────────────────────────────────────────────────────

interface RotationRingProps {
  axis: Axis;
  rigService: RigService;
}

/**
 * Кольцо вращения вокруг одной мировой оси.
 * Drag: простое экранное смещение → дельта угла.
 *
 * Маппинг (интуитивен с фронтального вида):
 *   X-кольцо: screenDy → pitch
 *   Y-кольцо: screenDx → yaw
 *   Z-кольцо: screenDx → roll
 */
function RotationRing({ axis, rigService }: RotationRingProps) {
  // Кольцо лежит в плоскости перпендикулярной оси:
  // X-ось → кольцо в YZ → rotation [0, 0, π/2] (torusGeometry по умолчанию в XY)
  const rotation: [number, number, number] =
    axis === 'x' ? [0, Math.PI / 2, 0]  :
    axis === 'y' ? [Math.PI / 2, 0, 0]  :
                   [0, 0, 0];

  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx, dy) => {
      const raw = axis === 'x' ? dy : dx;
      rigService.applyPelvisRotate(axis, raw * ROT_SENS);
    },
  );

  const color = AXIS_COLOR[axis];

  return (
    <group rotation={rotation}>
      {/* Визуальное кольцо */}
      <mesh>
        <torusGeometry args={[RING_OUTER, RING_TUBE, 8, 64]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Невидимая hit-зона */}
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[RING_OUTER, RING_HIT_TUBE, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

// ─── PelvisController ─────────────────────────────────────────────────────────

interface PelvisControllerProps {
  /** Мировая позиция MID_HIP (обновляется при изменении позы). */
  rootPos: { x: number; y: number; z: number };
  rigService: RigService;
}

/**
 * Гизмо управления тазом.
 * Рендерить внутри R3F Canvas когда selectedElement === 'pelvis'.
 */
export function PelvisController({ rootPos, rigService }: PelvisControllerProps) {
  const pos: [number, number, number] = [rootPos.x, rootPos.y, rootPos.z];
  const origin = new THREE.Vector3(rootPos.x, rootPos.y, rootPos.z);

  return (
    <group position={pos}>
      {/* Стрелки трансляции */}
      <TranslationArrow axis="x" origin={origin} rigService={rigService} />
      <TranslationArrow axis="y" origin={origin} rigService={rigService} />
      <TranslationArrow axis="z" origin={origin} rigService={rigService} />

      {/* Кольца вращения */}
      <RotationRing axis="x" rigService={rigService} />
      <RotationRing axis="y" rigService={rigService} />
      <RotationRing axis="z" rigService={rigService} />
    </group>
  );
}
