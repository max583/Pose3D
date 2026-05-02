import { Matrix4, Quaternion, Vector2, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { RigService } from '../../services/RigService';
import { useAngularGizmoDrag } from '../../hooks/useAngularGizmoDrag';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';
import { screenDragAlongWorldDirection } from '../../lib/rig/coordinateFrames';

const RING_OUTER = 0.16;
const RING_TUBE = 0.006;
const HIT_TUBE = 0.04;

const ARC_TUBE = 0.006;
const ARC_HIT_TUBE = 0.034;
const PITCH_ARC_HIT_TUBE = ARC_HIT_TUBE / 2;
const ARC_ANGLE = Math.PI / 4;
const CONE_R = 0.008;
const CONE_H = 0.0175;
const ARROW_COLOR = '#00ccff';
const BEND_SENS = 0.010;
const PITCH_SENS = BEND_SENS / 2;
const HEAD_ARC_OFFSET = 0.08;
const HEAD_ARC_LIFT_MULTIPLIER = 1.5;

type Point3 = { x: number; y: number; z: number };

interface HeadControllerProps {
  nosePos: Point3;
  neckPivot: Point3;
  rightShoulderPos: Point3;
  leftShoulderPos: Point3;
  rightEyePos?: Point3;
  leftEyePos?: Point3;
  rightEarPos?: Point3;
  leftEarPos?: Point3;
  rigService: RigService;
}

function YawRing({ rigService }: { rigService: RigService }) {
  const { groupRef, handlePointerDown } = useAngularGizmoDrag(
    () => rigService.beginDrag(),
    (delta) => rigService.applyHeadYaw(-delta),
  );

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
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

interface BendArcArrowProps {
  radius: number;
  startAngle: number;
  sweep: number;
  onDrag: (dx: number, dy: number) => void;
  rigService: RigService;
  hitTube?: number;
}

function BendArcArrow({
  radius,
  startAngle,
  sweep,
  onDrag,
  rigService,
  hitTube = ARC_HIT_TUBE,
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

function PitchArcs({
  radius,
  pivot,
  orientation,
  rigService,
}: {
  radius: number;
  pivot: Vector3;
  orientation: Quaternion;
  rigService: RigService;
}) {
  const { camera, gl } = useThree();
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

  const negativePitchDirection = getPitchArcWorldDirection(-ARC_ANGLE, orientation);
  const positivePitchDirection = getPitchArcWorldDirection(ARC_ANGLE, orientation);

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <BendArcArrow
        radius={radius}
        startAngle={Math.PI / 2}
        sweep={-ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, negativePitchDirection);
          rigService.applyHeadPitch(-drag * PITCH_SENS);
        }}
        rigService={rigService}
        hitTube={PITCH_ARC_HIT_TUBE}
      />
      <BendArcArrow
        radius={radius}
        startAngle={Math.PI / 2}
        sweep={ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, positivePitchDirection);
          rigService.applyHeadPitch(drag * PITCH_SENS);
        }}
        rigService={rigService}
        hitTube={PITCH_ARC_HIT_TUBE}
      />
    </group>
  );
}

function RollArcs({
  radius,
  pivot,
  orientation,
  rigService,
}: {
  radius: number;
  pivot: Vector3;
  orientation: Quaternion;
  rigService: RigService;
}) {
  const { camera, gl } = useThree();
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

  const negativeRollDirection = getRollArcWorldDirection(-ARC_ANGLE, orientation);
  const positiveRollDirection = getRollArcWorldDirection(ARC_ANGLE, orientation);

  return (
    <group>
      <BendArcArrow
        radius={radius}
        startAngle={Math.PI / 2}
        sweep={-ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, negativeRollDirection);
          rigService.applyHeadRoll(-drag * BEND_SENS);
        }}
        rigService={rigService}
      />
      <BendArcArrow
        radius={radius}
        startAngle={Math.PI / 2}
        sweep={ARC_ANGLE}
        onDrag={(dx, dy) => {
          const drag = getProjectedDrag(dx, dy, positiveRollDirection);
          rigService.applyHeadRoll(drag * BEND_SENS);
        }}
        rigService={rigService}
      />
    </group>
  );
}

function HeadBendArcs({
  nosePos,
  neckPivot,
  rightShoulderPos,
  leftShoulderPos,
  rightEyePos,
  leftEyePos,
  rightEarPos,
  leftEarPos,
  rigService,
}: HeadControllerProps) {
  const pivot = toVector(neckPivot);
  const nose = toVector(nosePos);
  const basis = getHeadGizmoBasis(
    nosePos,
    neckPivot,
    rightShoulderPos,
    leftShoulderPos,
    rightEyePos,
    leftEyePos,
    rightEarPos,
    leftEarPos,
  );

  const headUp = nose.clone().sub(pivot);
  if (headUp.lengthSq() < 1e-8) headUp.set(0, 1, 0);
  headUp.normalize();

  const baseIntersection = nose.clone().addScaledVector(headUp, HEAD_ARC_OFFSET);
  const radius = Math.max(
    0.08,
    baseIntersection.distanceTo(pivot) * HEAD_ARC_LIFT_MULTIPLIER,
  );

  return (
    <group
      position={pivot.toArray() as [number, number, number]}
      quaternion={[basis.quaternion.x, basis.quaternion.y, basis.quaternion.z, basis.quaternion.w]}
    >
      <PitchArcs
        radius={radius}
        pivot={pivot}
        orientation={basis.quaternion}
        rigService={rigService}
      />
      <RollArcs
        radius={radius}
        pivot={pivot}
        orientation={basis.quaternion}
        rigService={rigService}
      />
    </group>
  );
}

export function HeadController({
  nosePos,
  neckPivot,
  rightShoulderPos,
  leftShoulderPos,
  rightEyePos,
  leftEyePos,
  rightEarPos,
  leftEarPos,
  rigService,
}: HeadControllerProps) {
  const basis = getHeadGizmoBasis(
    nosePos,
    neckPivot,
    rightShoulderPos,
    leftShoulderPos,
    rightEyePos,
    leftEyePos,
    rightEarPos,
    leftEarPos,
  );

  return (
    <>
      <group
        position={[nosePos.x, nosePos.y, nosePos.z]}
        quaternion={[basis.quaternion.x, basis.quaternion.y, basis.quaternion.z, basis.quaternion.w]}
      >
        <YawRing rigService={rigService} />
      </group>
      <HeadBendArcs
        nosePos={nosePos}
        neckPivot={neckPivot}
        rightShoulderPos={rightShoulderPos}
        leftShoulderPos={leftShoulderPos}
        rightEyePos={rightEyePos}
        leftEyePos={leftEyePos}
        rightEarPos={rightEarPos}
        leftEarPos={leftEarPos}
        rigService={rigService}
      />
    </>
  );
}

function getHeadGizmoBasis(
  nosePos: Point3,
  neckPivot: Point3,
  rightShoulderPos: Point3,
  leftShoulderPos: Point3,
  rightEyePos?: Point3,
  leftEyePos?: Point3,
  rightEarPos?: Point3,
  leftEarPos?: Point3,
): { quaternion: Quaternion; forward: Vector3 } {
  const nose = toVector(nosePos);
  const pivot = toVector(neckPivot);
  const rightShoulder = toVector(rightShoulderPos);
  const leftShoulder = toVector(leftShoulderPos);

  const yAxis = nose.clone().sub(pivot);
  if (yAxis.lengthSq() < 1e-8) yAxis.set(0, 1, 0);
  yAxis.normalize();

  const xAxis = getHeadSideAxis({
    rightEarPos,
    leftEarPos,
    rightEyePos,
    leftEyePos,
    rightShoulder,
    leftShoulder,
  });
  if (xAxis.lengthSq() < 1e-8) xAxis.copy(getPerpendicularAxis(yAxis));
  xAxis.addScaledVector(yAxis, -xAxis.dot(yAxis));
  if (xAxis.lengthSq() < 1e-8) xAxis.copy(getPerpendicularAxis(yAxis));
  xAxis.normalize();

  const zAxis = xAxis.clone().cross(yAxis);
  if (zAxis.lengthSq() < 1e-8) zAxis.set(0, 0, 1);
  zAxis.normalize();
  xAxis.copy(yAxis.clone().cross(zAxis)).normalize();
  const faceForward = getHeadForwardAxis({
    nose,
    yAxis,
    fallbackForward: zAxis,
    rightEyePos,
    leftEyePos,
    rightEarPos,
    leftEarPos,
  });

  const matrix = new Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return {
    quaternion: new Quaternion().setFromRotationMatrix(matrix),
    forward: faceForward,
  };
}

function toVector(p: Point3): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

function getHeadSideAxis({
  rightEarPos,
  leftEarPos,
  rightEyePos,
  leftEyePos,
  rightShoulder,
  leftShoulder,
}: {
  rightEarPos?: Point3;
  leftEarPos?: Point3;
  rightEyePos?: Point3;
  leftEyePos?: Point3;
  rightShoulder: Vector3;
  leftShoulder: Vector3;
}): Vector3 {
  if (rightEarPos && leftEarPos) {
    return toVector(rightEarPos).sub(toVector(leftEarPos));
  }
  if (rightEyePos && leftEyePos) {
    return toVector(rightEyePos).sub(toVector(leftEyePos));
  }
  return rightShoulder.clone().sub(leftShoulder);
}

function getHeadForwardAxis({
  nose,
  yAxis,
  fallbackForward,
  rightEyePos,
  leftEyePos,
  rightEarPos,
  leftEarPos,
}: {
  nose: Vector3;
  yAxis: Vector3;
  fallbackForward: Vector3;
  rightEyePos?: Point3;
  leftEyePos?: Point3;
  rightEarPos?: Point3;
  leftEarPos?: Point3;
}): Vector3 {
  let forward = new Vector3();

  if (rightEyePos && leftEyePos && rightEarPos && leftEarPos) {
    const eyeCenter = toVector(rightEyePos).add(toVector(leftEyePos)).multiplyScalar(0.5);
    const earCenter = toVector(rightEarPos).add(toVector(leftEarPos)).multiplyScalar(0.5);
    forward = eyeCenter.sub(earCenter);
  } else if (rightEyePos && leftEyePos) {
    forward = toVector(rightEyePos)
      .add(toVector(leftEyePos))
      .multiplyScalar(0.5)
      .sub(nose);
  }

  if (forward.lengthSq() >= 1e-8) {
    forward.addScaledVector(yAxis, -forward.dot(yAxis));
  }
  if (forward.lengthSq() < 1e-8) {
    forward.copy(fallbackForward);
  }

  return forward.normalize();
}

function getPitchArcWorldDirection(sweep: number, orientation: Quaternion): Vector3 {
  const endAngle = Math.PI / 2 + sweep;
  const tangentSign = sweep >= 0 ? 1 : -1;
  const localTangent = new Vector3(
    -Math.sin(endAngle) * tangentSign,
    Math.cos(endAngle) * tangentSign,
    0,
  );
  const pitchPlaneRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
  return localTangent
    .applyQuaternion(pitchPlaneRotation)
    .applyQuaternion(orientation)
    .normalize();
}

function getRollArcWorldDirection(sweep: number, orientation: Quaternion): Vector3 {
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

function getPerpendicularAxis(axis: Vector3): Vector3 {
  const base = Math.abs(axis.y) < 0.9
    ? new Vector3(0, 1, 0)
    : new Vector3(1, 0, 0);
  return base.cross(axis).normalize();
}
