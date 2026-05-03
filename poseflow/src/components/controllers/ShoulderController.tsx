// src/components/controllers/ShoulderController.tsx
// Shoulder gizmo (Stage 4.2): move shoulder point around NECK.

import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';
import { useThree } from '@react-three/fiber';
import { Matrix4, Quaternion, Vector2, Vector3 } from 'three';
import { screenDragAlongWorldDirection } from '../../lib/rig/coordinateFrames';
import { useAppSettings } from '../../context/AppSettingsContext';

const ARROW_LENGTH = 0.11;
const ARROW_R = 0.008;
const CONE_R = 0.016;
const CONE_H = 0.03;
const HIT_R = 0.045;
const ARROW_OFFSET = 0.015;
const ARROW_COLOR = '#00ccff';

const RAISE_SENS = 0.010;
const FORWARD_SENS = 0.010;

interface ArrowProps {
  side: 'r' | 'l';
  direction: 'up' | 'down' | 'forward' | 'back';
  shoulderPos: Point3;
  orientation: Quaternion;
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}

function ShoulderArrow({
  side,
  direction,
  shoulderPos,
  orientation,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: ArrowProps) {
  const { camera, gl } = useThree();
  const isRaise = direction === 'up' || direction === 'down';
  const sign = direction === 'down' || direction === 'back' ? -1 : 1;

  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx, dy) => {
      const rect = gl.domElement.getBoundingClientRect();
      const drag = screenDragAlongWorldDirection(
        new Vector2(dx, dy),
        toVector(shoulderPos),
        getArrowLocalDirection(direction).applyQuaternion(orientation),
        camera,
        { width: rect.width, height: rect.height },
      );
      if (isRaise) {
        rigService.applyShoulderRaise(side, drag * RAISE_SENS * sign * dragSensitivity);
      } else {
        rigService.applyShoulderForward(side, drag * FORWARD_SENS * sign * dragSensitivity);
      }
    },
  );

  const shaftLength = ARROW_LENGTH - CONE_H;
  const position: [number, number, number] =
    direction === 'up' ? [0, ARROW_OFFSET, 0] :
    direction === 'down' ? [0, -ARROW_OFFSET, 0] :
    direction === 'forward' ? [0, 0, ARROW_OFFSET] :
    [0, 0, -ARROW_OFFSET];

  const rotation: [number, number, number] =
    direction === 'up' ? [0, 0, 0] :
    direction === 'down' ? [0, 0, Math.PI] :
    direction === 'forward' ? [Math.PI / 2, 0, 0] :
    [-Math.PI / 2, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[ARROW_R, ARROW_R, shaftLength, 8]} />
        <meshBasicMaterial color={ARROW_COLOR} depthTest={false} />
      </mesh>

      <mesh position={[0, shaftLength + CONE_H / 2, 0]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={ARROW_COLOR} depthTest={false} />
      </mesh>

      <mesh position={[0, ARROW_LENGTH / 2, 0]} onPointerDown={handlePointerDown}>
        <cylinderGeometry args={[HIT_R * hitZoneScale, HIT_R * hitZoneScale, ARROW_LENGTH, 8]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

interface ShoulderControllerProps {
  side: 'r' | 'l';
  shoulderPos: { x: number; y: number; z: number };
  neckPos: { x: number; y: number; z: number };
  midHipPos: { x: number; y: number; z: number };
  rightShoulderPos: { x: number; y: number; z: number };
  leftShoulderPos: { x: number; y: number; z: number };
  rigService: RigService;
}

export function ShoulderController({
  side,
  shoulderPos,
  neckPos,
  midHipPos,
  rightShoulderPos,
  leftShoulderPos,
  rigService,
}: ShoulderControllerProps) {
  const { settings } = useAppSettings();
  const pos: [number, number, number] = [shoulderPos.x, shoulderPos.y, shoulderPos.z];
  const orientation = getTorsoOrientation(neckPos, midHipPos, rightShoulderPos, leftShoulderPos);

  return (
    <group position={pos} quaternion={[orientation.x, orientation.y, orientation.z, orientation.w]}>
      <ShoulderArrow
        side={side}
        direction="up"
        shoulderPos={shoulderPos}
        orientation={orientation}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
      <ShoulderArrow
        side={side}
        direction="down"
        shoulderPos={shoulderPos}
        orientation={orientation}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
      <ShoulderArrow
        side={side}
        direction="forward"
        shoulderPos={shoulderPos}
        orientation={orientation}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
      <ShoulderArrow
        side={side}
        direction="back"
        shoulderPos={shoulderPos}
        orientation={orientation}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
    </group>
  );
}

type Point3 = { x: number; y: number; z: number };

function getTorsoOrientation(
  neckPos: Point3,
  midHipPos: Point3,
  rightShoulderPos: Point3,
  leftShoulderPos: Point3,
): Quaternion {
  const neck = toVector(neckPos);
  const midHip = toVector(midHipPos);
  const rightShoulder = toVector(rightShoulderPos);
  const leftShoulder = toVector(leftShoulderPos);

  const yAxis = neck.clone().sub(midHip);
  if (yAxis.lengthSq() < 1e-8) yAxis.set(0, 1, 0);
  yAxis.normalize();

  const xAxis = rightShoulder.clone().sub(leftShoulder);
  if (xAxis.lengthSq() < 1e-8) xAxis.copy(getPerpendicularAxis(yAxis));
  xAxis.addScaledVector(yAxis, -xAxis.dot(yAxis));
  if (xAxis.lengthSq() < 1e-8) xAxis.copy(getPerpendicularAxis(yAxis));
  xAxis.normalize();

  const zAxis = xAxis.clone().cross(yAxis);
  if (zAxis.lengthSq() < 1e-8) zAxis.set(0, 0, 1);
  zAxis.normalize();
  xAxis.copy(yAxis.clone().cross(zAxis)).normalize();

  const matrix = new Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new Quaternion().setFromRotationMatrix(matrix);
}

function getArrowLocalDirection(direction: 'up' | 'down' | 'forward' | 'back'): Vector3 {
  if (direction === 'up') return new Vector3(0, 1, 0);
  if (direction === 'down') return new Vector3(0, -1, 0);
  if (direction === 'forward') return new Vector3(0, 0, 1);
  return new Vector3(0, 0, -1);
}

function toVector(p: Point3): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

function getPerpendicularAxis(axis: Vector3): Vector3 {
  const base = Math.abs(axis.y) < 0.9
    ? new Vector3(0, 1, 0)
    : new Vector3(1, 0, 0);
  return base.cross(axis).normalize();
}
