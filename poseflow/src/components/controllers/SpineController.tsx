// src/components/controllers/SpineController.tsx
// Spine gizmo: twist ring plus arc arrows for forward/back and lateral bend.

import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';
import { useAngularGizmoDrag } from '../../hooks/useAngularGizmoDrag';
import { Matrix4, Quaternion, Vector2, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { screenDragAlongWorldDirection } from '../../lib/rig/coordinateFrames';
import { useAppSettings } from '../../context/AppSettingsContext';

const RING_OUTER = 0.38;
const RING_TUBE = 0.006;
const HIT_TUBE = 0.05;

const ARC_TUBE = 0.006;
const ARC_HIT_TUBE = 0.045;
const BASE_ARC_LENGTH = 0.18 * Math.PI / 2;
const ARC_LENGTH_SCALE = 2 / 3;
const CONE_R = 0.016;
const CONE_H = 0.035;
const ARROW_COLOR = '#00ccff';

const BEND_SENS = 0.010;

type Point3 = { x: number; y: number; z: number };

function TwistRing({
  midHipPos,
  neckPos,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: {
  midHipPos: Point3;
  neckPos: Point3;
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}) {
  const { camera } = useThree();
  const midHip = toVector(midHipPos);
  const neck = toVector(neckPos);
  const spineAxis = neck.clone().sub(midHip);
  if (spineAxis.lengthSq() < 1e-8) spineAxis.set(0, 1, 0);
  spineAxis.normalize();

  const getViewSign = () => {
    const cameraFromSpine = camera.position.clone().sub(neck);
    if (cameraFromSpine.lengthSq() < 1e-8) return 1;
    return cameraFromSpine.normalize().dot(spineAxis) >= 0 ? 1 : -1;
  };

  const { groupRef, handlePointerDown } = useAngularGizmoDrag(
    () => rigService.beginDrag(),
    (delta) => rigService.applySpineTwist(-delta * getViewSign() * dragSensitivity),
  );

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[RING_OUTER, RING_TUBE, 8, 64]} />
        <meshBasicMaterial color="#aa44ff" depthTest={false} />
      </mesh>
      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[RING_OUTER, HIT_TUBE * hitZoneScale, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

interface BendArcArrowProps {
  radius: number;
  startAngle: number;
  sweep: number;
  onDrag: (dx: number, dy: number) => void;
  rigService: RigService;
  hitTube: number;
}

function BendArcArrow({ radius, startAngle, sweep, onDrag, rigService, hitTube }: BendArcArrowProps) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    onDrag,
  );

  const arcStart = sweep >= 0 ? startAngle : startAngle + sweep;
  const endAngle = startAngle + sweep;
  const tangentRot = sweep >= 0 ? endAngle : endAngle + Math.PI;
  const anchor: [number, number, number] = [
    Math.cos(startAngle) * radius,
    Math.sin(startAngle) * radius,
    0,
  ];
  const arcOffset: [number, number, number] = [-anchor[0], -anchor[1], -anchor[2]];
  const endPos: [number, number, number] = [
    Math.cos(endAngle) * radius - anchor[0],
    Math.sin(endAngle) * radius - anchor[1],
    0,
  ];

  return (
    <group>
      <group position={arcOffset} rotation={[0, 0, arcStart]}>
        <mesh>
          <torusGeometry args={[radius, ARC_TUBE, 8, 32, Math.abs(sweep)]} />
          <meshBasicMaterial color={ARROW_COLOR} depthTest={false} />
        </mesh>
        <mesh onPointerDown={handlePointerDown}>
          <torusGeometry args={[radius, hitTube, 8, 32, Math.abs(sweep)]} />
          <meshBasicMaterial transparent opacity={0} depthTest={false} />
        </mesh>
      </group>

      <mesh position={endPos} rotation={[0, 0, tangentRot]} onPointerDown={handlePointerDown}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={ARROW_COLOR} depthTest={false} />
      </mesh>
    </group>
  );
}

function ForwardBendArrows({
  neckPos,
  orientation,
  orientationQuat,
  arcRadius,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: {
  neckPos: Point3;
  orientation: [number, number, number, number];
  orientationQuat: Quaternion;
  arcRadius: number;
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}) {
  const { camera, gl } = useThree();
  const pos: [number, number, number] = [neckPos.x, neckPos.y, neckPos.z];
  const pivot = toVector(neckPos);
  const arcAngle = getArcAngle(arcRadius);
  const getProjectedDrag = (dx: number, dy: number, direction: Vector3) => {
    const rect = gl.domElement.getBoundingClientRect();
    return screenDragAlongWorldDirection(
      new Vector2(dx, dy),
      pivot,
      direction,
      camera,
      { width: rect.width, height: rect.height },
    );
  };
  const negativeBendDirection = getForwardArcWorldDirection(-arcAngle, orientationQuat);
  const positiveBendDirection = getForwardArcWorldDirection(arcAngle, orientationQuat);

  return (
    <group position={pos} quaternion={orientation}>
      <group rotation={[0, -Math.PI / 2, 0]}>
        <BendArcArrow
          radius={arcRadius}
          startAngle={Math.PI / 2}
          sweep={-arcAngle}
          onDrag={(dx, dy) => {
            const drag = getProjectedDrag(dx, dy, negativeBendDirection);
            rigService.applySpineBend(drag * BEND_SENS * dragSensitivity, 0);
          }}
          rigService={rigService}
          hitTube={ARC_HIT_TUBE * hitZoneScale}
        />
        <BendArcArrow
          radius={arcRadius}
          startAngle={Math.PI / 2}
          sweep={arcAngle}
          onDrag={(dx, dy) => {
            const drag = getProjectedDrag(dx, dy, positiveBendDirection);
            rigService.applySpineBend(-drag * BEND_SENS * dragSensitivity, 0);
          }}
          rigService={rigService}
          hitTube={ARC_HIT_TUBE * hitZoneScale}
        />
      </group>
    </group>
  );
}

function LateralBendArrows({
  neckPos,
  orientation,
  orientationQuat,
  arcRadius,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: {
  neckPos: Point3;
  orientation: [number, number, number, number];
  orientationQuat: Quaternion;
  arcRadius: number;
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}) {
  const { camera, gl } = useThree();
  const pos: [number, number, number] = [neckPos.x, neckPos.y, neckPos.z];
  const pivot = toVector(neckPos);
  const arcAngle = getArcAngle(arcRadius);
  const getProjectedDrag = (dx: number, dy: number, direction: Vector3) => {
    const rect = gl.domElement.getBoundingClientRect();
    return screenDragAlongWorldDirection(
      new Vector2(dx, dy),
      pivot,
      direction,
      camera,
      { width: rect.width, height: rect.height },
    );
  };
  const negativeBendDirection = getLateralArcWorldDirection(-arcAngle, orientationQuat);
  const positiveBendDirection = getLateralArcWorldDirection(arcAngle, orientationQuat);

  return (
    <group position={pos} quaternion={orientation}>
      <BendArcArrow
        radius={arcRadius}
        startAngle={Math.PI / 2}
        sweep={-arcAngle}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, negativeBendDirection);
          rigService.applySpineBend(0, -drag * BEND_SENS * dragSensitivity);
        }}
        rigService={rigService}
        hitTube={ARC_HIT_TUBE * hitZoneScale}
      />
      <BendArcArrow
        radius={arcRadius}
        startAngle={Math.PI / 2}
        sweep={arcAngle}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, positiveBendDirection);
          rigService.applySpineBend(0, drag * BEND_SENS * dragSensitivity);
        }}
        rigService={rigService}
        hitTube={ARC_HIT_TUBE * hitZoneScale}
      />
    </group>
  );
}

interface SpineControllerProps {
  spineMiddle: Point3;
  midHipPos: Point3;
  neckPos: Point3;
  rightShoulderPos: Point3;
  leftShoulderPos: Point3;
  rigService: RigService;
}

export function SpineController({
  spineMiddle,
  midHipPos,
  neckPos,
  rightShoulderPos,
  leftShoulderPos,
  rigService,
}: SpineControllerProps) {
  const { settings } = useAppSettings();
  const twistPos: [number, number, number] = [spineMiddle.x, spineMiddle.y, spineMiddle.z];
  const arcRadius = toVector(neckPos).distanceTo(toVector(midHipPos));
  const orientation = getTorsoOrientation(
    midHipPos,
    neckPos,
    rightShoulderPos,
    leftShoulderPos,
  );
  const quaternion: [number, number, number, number] = [
    orientation.x,
    orientation.y,
    orientation.z,
    orientation.w,
  ];

  return (
    <>
      <group position={twistPos} quaternion={quaternion}>
        <TwistRing
          midHipPos={midHipPos}
          neckPos={neckPos}
          rigService={rigService}
          dragSensitivity={settings.gizmoDragSensitivity}
          hitZoneScale={settings.gizmoHitZoneScale}
        />
      </group>
      <ForwardBendArrows
        neckPos={neckPos}
        orientation={quaternion}
        orientationQuat={orientation}
        arcRadius={arcRadius}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
      <LateralBendArrows
        neckPos={neckPos}
        orientation={quaternion}
        orientationQuat={orientation}
        arcRadius={arcRadius}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
    </>
  );
}

function getArcAngle(radius: number): number {
  if (radius < 1e-6) return Math.PI / 6;
  return (BASE_ARC_LENGTH * ARC_LENGTH_SCALE) / radius;
}

function getTorsoOrientation(
  midHipPos: Point3,
  neckPos: Point3,
  rightShoulderPos: Point3,
  leftShoulderPos: Point3,
): Quaternion {
  const midHip = toVector(midHipPos);
  const neck = toVector(neckPos);
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

function getForwardArcWorldDirection(sweep: number, orientation: Quaternion): Vector3 {
  const endAngle = Math.PI / 2 + sweep;
  const tangentSign = sweep >= 0 ? 1 : -1;
  const localTangent = new Vector3(
    -Math.sin(endAngle) * tangentSign,
    Math.cos(endAngle) * tangentSign,
    0,
  );
  const forwardPlaneRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2);
  return localTangent
    .applyQuaternion(forwardPlaneRotation)
    .applyQuaternion(orientation)
    .normalize();
}

function getLateralArcWorldDirection(sweep: number, orientation: Quaternion): Vector3 {
  const endAngle = Math.PI / 2 + sweep;
  const tangentSign = sweep >= 0 ? 1 : -1;
  return new Vector3(
    -Math.sin(endAngle) * tangentSign,
    Math.cos(endAngle) * tangentSign,
    0,
  )
    .applyQuaternion(orientation)
    .normalize();
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
