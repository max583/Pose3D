// src/components/controllers/NeckController.tsx
// Neck gizmo: twist ring plus compact arc arrows for forward/back and lateral bend.

import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';
import { useAngularGizmoDrag } from '../../hooks/useAngularGizmoDrag';
import { Matrix4, Quaternion, Vector2, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { screenDragAlongWorldDirection } from '../../lib/rig/coordinateFrames';
import { useAppSettings } from '../../context/AppSettingsContext';

const RING_OUTER = 0.22;
const RING_TUBE = 0.006;
const HIT_TUBE = 0.04;

const FORWARD_ARC_R = 0.22;
const LATERAL_ARC_R = 0.18;
const ARC_TUBE = 0.006;
const ARC_HIT_TUBE = 0.04;
const ARC_ANGLE = Math.PI / 4;
const CONE_R = 0.008;
const CONE_H = 0.0175;
const ARROW_COLOR = '#00ccff';

const BEND_SENS = 0.010;

type Point3 = { x: number; y: number; z: number };

function TwistRing({
  neckPos,
  upperSpineJoint,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: {
  neckPos: Point3;
  upperSpineJoint: Point3;
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}) {
  const { camera } = useThree();
  const neck = toVector(neckPos);
  const neckAxis = neck.clone().sub(toVector(upperSpineJoint));
  if (neckAxis.lengthSq() < 1e-8) neckAxis.set(0, 1, 0);
  neckAxis.normalize();

  const getViewSign = () => {
    const cameraFromNeck = camera.position.clone().sub(neck);
    if (cameraFromNeck.lengthSq() < 1e-8) return 1;
    return cameraFromNeck.normalize().dot(neckAxis) >= 0 ? 1 : -1;
  };

  const { groupRef, handlePointerDown } = useAngularGizmoDrag(
    () => rigService.beginDrag(),
    (delta) => rigService.applyNeckTwist(-delta * getViewSign() * dragSensitivity),
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

function BendArcArrow({
  radius,
  startAngle,
  sweep,
  onDrag,
  rigService,
  hitTube,
}: BendArcArrowProps) {
  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    onDrag,
  );

  const arcStart = sweep >= 0 ? startAngle : startAngle + sweep;
  const endAngle = startAngle + sweep;
  const tangentRot = sweep >= 0 ? endAngle : endAngle + Math.PI;
  const endPos: [number, number, number] = [
    Math.cos(endAngle) * radius,
    Math.sin(endAngle) * radius,
    0,
  ];

  return (
    <group>
      <group rotation={[0, 0, arcStart]}>
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
  rigService,
  dragSensitivity,
  hitZoneScale,
}: {
  neckPos: Point3;
  orientation: Quaternion;
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}) {
  const { camera, gl } = useThree();
  const pivot = toVector(neckPos);
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
  const negativeBendDirection = getForwardArcWorldDirection(-ARC_ANGLE, orientation);
  const positiveBendDirection = getForwardArcWorldDirection(ARC_ANGLE, orientation);

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <BendArcArrow
        radius={FORWARD_ARC_R}
        startAngle={Math.PI / 2}
        sweep={-ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, negativeBendDirection);
          rigService.applyNeckBend(-drag * BEND_SENS * dragSensitivity, 0);
        }}
        rigService={rigService}
        hitTube={ARC_HIT_TUBE * hitZoneScale}
      />
      <BendArcArrow
        radius={FORWARD_ARC_R}
        startAngle={Math.PI / 2}
        sweep={ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, positiveBendDirection);
          rigService.applyNeckBend(drag * BEND_SENS * dragSensitivity, 0);
        }}
        rigService={rigService}
        hitTube={ARC_HIT_TUBE * hitZoneScale}
      />
    </group>
  );
}

function LateralBendArrows({
  neckPos,
  orientation,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: {
  neckPos: Point3;
  orientation: Quaternion;
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}) {
  const { camera, gl } = useThree();
  const pivot = toVector(neckPos);
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
  const negativeBendDirection = getLateralArcWorldDirection(-ARC_ANGLE, orientation);
  const positiveBendDirection = getLateralArcWorldDirection(ARC_ANGLE, orientation);

  return (
    <group>
      <BendArcArrow
        radius={LATERAL_ARC_R}
        startAngle={Math.PI / 2}
        sweep={-ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, negativeBendDirection);
          rigService.applyNeckBend(0, -drag * BEND_SENS * dragSensitivity);
        }}
        rigService={rigService}
        hitTube={ARC_HIT_TUBE * hitZoneScale}
      />
      <BendArcArrow
        radius={LATERAL_ARC_R}
        startAngle={Math.PI / 2}
        sweep={ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, positiveBendDirection);
          rigService.applyNeckBend(0, drag * BEND_SENS * dragSensitivity);
        }}
        rigService={rigService}
        hitTube={ARC_HIT_TUBE * hitZoneScale}
      />
    </group>
  );
}

interface NeckControllerProps {
  neckPos: Point3;
  upperSpineJoint: Point3;
  rightShoulderPos: Point3;
  leftShoulderPos: Point3;
  rigService: RigService;
}

export function NeckController({
  neckPos,
  upperSpineJoint,
  rightShoulderPos,
  leftShoulderPos,
  rigService,
}: NeckControllerProps) {
  const { settings } = useAppSettings();
  const pos: [number, number, number] = [neckPos.x, neckPos.y, neckPos.z];
  const orientation = getTorsoOrientation(
    neckPos,
    upperSpineJoint,
    rightShoulderPos,
    leftShoulderPos,
  );
  return (
    <group position={pos} quaternion={[orientation.x, orientation.y, orientation.z, orientation.w]}>
      <TwistRing
        neckPos={neckPos}
        upperSpineJoint={upperSpineJoint}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
      <ForwardBendArrows
        neckPos={neckPos}
        orientation={orientation}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
      <LateralBendArrows
        neckPos={neckPos}
        orientation={orientation}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
    </group>
  );
}

function getTorsoOrientation(
  neckPos: Point3,
  upperSpineJoint: Point3,
  rightShoulderPos: Point3,
  leftShoulderPos: Point3,
): Quaternion {
  const neck = toVector(neckPos);
  const spine = toVector(upperSpineJoint);
  const rightShoulder = toVector(rightShoulderPos);
  const leftShoulder = toVector(leftShoulderPos);

  const yAxis = neck.clone().sub(spine);
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
  const forwardPlaneRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
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
