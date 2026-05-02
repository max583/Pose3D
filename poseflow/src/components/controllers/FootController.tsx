import { useCallback, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Group, Matrix4, Quaternion, Vector2, Vector3 } from 'three';
import { RigService } from '../../services/RigService';
import { useGizmoDrag } from '../../hooks/useGizmoDrag';
import { screenDragAlongWorldDirection } from '../../lib/rig/coordinateFrames';

const COLOR_FOOT = '#00ccff';
const ARC_R = 0.115;
const ARC_TUBE = 0.005;
const ARC_HIT_TUBE = 0.024;
const CONE_R = 0.014;
const CONE_H = 0.034;
const ROT_SENS = 0.008;
const PITCH_ARROW_LENGTH = 0.10;
const PITCH_ARROW_R = 0.006;
const PITCH_HIT_R = 0.035;
const YAW_ARROW_LENGTH = 0.085;
const YAW_ARROW_R = 0.006;
const YAW_HIT_R = 0.034;
const TOE_BRIDGE_R = 0.004;

type Point = { x: number; y: number; z: number };

interface FootControllerProps {
  side: 'r' | 'l';
  anklePos: Point;
  bigToePos: Point;
  smallToePos: Point;
  heelPos: Point;
  rigService: RigService;
}

interface FootRollRingProps {
  side: 'r' | 'l';
  position: Vector3;
  quaternion: Quaternion;
  toeCenterWorld: Vector3;
  heelWorld: Vector3;
  rigService: RigService;
}

interface FootPitchArrowsProps {
  side: 'r' | 'l';
  position: Vector3;
  positionWorld: Vector3;
  quaternion: Quaternion;
  rigService: RigService;
}

interface FootYawToeArrowsProps {
  side: 'r' | 'l';
  bigToePosition: Vector3;
  smallToePosition: Vector3;
  toeCenterWorld: Vector3;
  quaternion: Quaternion;
  rigService: RigService;
}

function FootRollRing({
  side,
  position,
  quaternion,
  toeCenterWorld,
  heelWorld,
  rigService,
}: FootRollRingProps) {
  const { camera, controls, gl } = useThree();
  const groupRef = useRef<Group>(null);

  const getViewSign = useCallback(() => {
    const heelToToe = toeCenterWorld.clone().sub(heelWorld);
    if (heelToToe.lengthSq() < 0.000001) return 1;
    heelToToe.normalize();

    const cameraFromToe = camera.position.clone().sub(toeCenterWorld);
    return cameraFromToe.dot(heelToToe) > 0 ? -1 : 1;
  }, [camera, heelWorld, toeCenterWorld]);

  const handlePointerDown = useCallback(
    (e: { button?: number; clientX: number; clientY: number; stopPropagation: () => void }) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.stopPropagation();

      const group = groupRef.current;
      if (!group) return;

      const centerWorld = new Vector3();
      group.getWorldPosition(centerWorld);
      const centerScreen = centerWorld.clone().project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      const centerX = rect.left + (centerScreen.x * 0.5 + 0.5) * rect.width;
      const centerY = rect.top + (-centerScreen.y * 0.5 + 0.5) * rect.height;

      let prevAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

      if (controls) (controls as unknown as { enabled: boolean }).enabled = false;
      rigService.beginDrag();

      const moveHandler = (ev: PointerEvent) => {
        const nextAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
        let delta = nextAngle - prevAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        prevAngle = nextAngle;

        if (delta !== 0) {
          rigService.applyFootRotation(side, 'roll', delta * getViewSign());
        }
      };

      const upHandler = () => {
        if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
      };

      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    },
    [camera, controls, getViewSign, gl, rigService, side],
  );

  return (
    <group
      ref={groupRef}
      position={position.toArray() as [number, number, number]}
      quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
    >
      <mesh>
        <torusGeometry args={[ARC_R, ARC_TUBE, 8, 56]} />
        <meshBasicMaterial color={COLOR_FOOT} depthTest={false} />
      </mesh>

      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[ARC_R, ARC_HIT_TUBE, 8, 56]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

function FootYawToeArrows({
  side,
  bigToePosition,
  smallToePosition,
  toeCenterWorld,
  quaternion,
  rigService,
}: FootYawToeArrowsProps) {
  const { camera, gl } = useThree();

  const getProjectedDrag = (dx: number, dy: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    return screenDragAlongWorldDirection(
      new Vector2(dx, dy),
      toeCenterWorld,
      new Vector3(1, 0, 0).applyQuaternion(quaternion),
      camera,
      { width: rect.width, height: rect.height },
    );
  };

  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx, dy) => rigService.applyFootRotation(
      side,
      'yaw',
      getProjectedDrag(dx, dy) * ROT_SENS * (side === 'r' ? -1 : 1),
    ),
  );

  const bridgeCenter = bigToePosition.clone().add(smallToePosition).multiplyScalar(0.5);
  const bridgeLength = bigToePosition.distanceTo(smallToePosition);

  return (
    <group>
      <YawToeArrow
        position={bigToePosition}
        direction="inner"
        onPointerDown={handlePointerDown}
      />
      <mesh position={bridgeCenter.toArray() as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[TOE_BRIDGE_R, TOE_BRIDGE_R, bridgeLength, 8]} />
        <meshBasicMaterial color={COLOR_FOOT} depthTest={false} />
      </mesh>
      <YawToeArrow
        position={smallToePosition}
        direction="outer"
        onPointerDown={handlePointerDown}
      />
    </group>
  );
}

function YawToeArrow({
  position,
  direction,
  onPointerDown,
}: {
  position: Vector3;
  direction: 'inner' | 'outer';
  onPointerDown: (e: { button?: number; clientX: number; clientY: number; stopPropagation: () => void }) => void;
}) {
  const shaftLength = YAW_ARROW_LENGTH - CONE_H;
  const rotation: [number, number, number] = direction === 'outer'
    ? [0, 0, -Math.PI / 2]
    : [0, 0, Math.PI / 2];

  return (
    <group position={position.toArray() as [number, number, number]} rotation={rotation}>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[YAW_ARROW_R, YAW_ARROW_R, shaftLength, 8]} />
        <meshBasicMaterial color={COLOR_FOOT} depthTest={false} />
      </mesh>

      <mesh position={[0, shaftLength + CONE_H / 2, 0]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={COLOR_FOOT} depthTest={false} />
      </mesh>

      <mesh
        position={[0, YAW_ARROW_LENGTH / 2, 0]}
        onPointerDown={onPointerDown}
      >
        <cylinderGeometry args={[YAW_HIT_R, YAW_HIT_R, YAW_ARROW_LENGTH, 8]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

function FootPitchArrows({
  side,
  position,
  positionWorld,
  quaternion,
  rigService,
}: FootPitchArrowsProps) {
  const { camera, gl } = useThree();
  const getProjectedDrag = (dx: number, dy: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    return screenDragAlongWorldDirection(
      new Vector2(dx, dy),
      positionWorld,
      new Vector3(0, 1, 0).applyQuaternion(quaternion),
      camera,
      { width: rect.width, height: rect.height },
    );
  };

  const { handlePointerDown } = useGizmoDrag(
    () => rigService.beginDrag(),
    (dx, dy) => {
      const sideSign = side === 'l' ? -1 : 1;
      rigService.applyFootRotation(side, 'pitch', getProjectedDrag(dx, dy) * ROT_SENS * sideSign);
    },
  );

  return (
    <group position={position.toArray() as [number, number, number]}>
      <PitchArrow direction="up" onPointerDown={handlePointerDown} />
      <PitchArrow direction="down" onPointerDown={handlePointerDown} />
    </group>
  );
}

function PitchArrow({
  direction,
  onPointerDown,
}: {
  direction: 'up' | 'down';
  onPointerDown: (e: { button?: number; clientX: number; clientY: number; stopPropagation: () => void }) => void;
}) {
  const shaftLength = PITCH_ARROW_LENGTH - CONE_H;
  const rotation: [number, number, number] = direction === 'up'
    ? [0, 0, 0]
    : [0, 0, Math.PI];

  return (
    <group rotation={rotation}>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[PITCH_ARROW_R, PITCH_ARROW_R, shaftLength, 8]} />
        <meshBasicMaterial color={COLOR_FOOT} depthTest={false} />
      </mesh>

      <mesh position={[0, shaftLength + CONE_H / 2, 0]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={COLOR_FOOT} depthTest={false} />
      </mesh>

      <mesh
        position={[0, PITCH_ARROW_LENGTH / 2, 0]}
        onPointerDown={onPointerDown}
      >
        <cylinderGeometry args={[PITCH_HIT_R, PITCH_HIT_R, PITCH_ARROW_LENGTH, 8]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

export function FootController({
  side,
  anklePos,
  bigToePos,
  smallToePos,
  heelPos,
  rigService,
}: FootControllerProps) {
  const basis = useMemo(() => {
    const ankle = toVec(anklePos);
    const toeCenterWorld = toVec(bigToePos).add(toVec(smallToePos)).multiplyScalar(0.5);
    const heelWorld = toVec(heelPos);

    let forward = toeCenterWorld.clone().sub(ankle);
    if (forward.lengthSq() < 0.000001) {
      forward = ankle.clone().sub(heelWorld);
    }
    if (forward.lengthSq() < 0.000001) {
      forward = new Vector3(0, 0, 1);
    }
    forward.normalize();

    let right = toVec(smallToePos).sub(toVec(bigToePos));
    right.addScaledVector(forward, -right.dot(forward));
    if (right.lengthSq() < 0.000001) {
      right = new Vector3(1, 0, 0);
    }
    right.normalize();

    let up = new Vector3().crossVectors(forward, right);
    if (up.lengthSq() < 0.000001) {
      up = new Vector3(0, 1, 0);
    }
    up.normalize();
    right = new Vector3().crossVectors(up, forward).normalize();

    const mat = new Matrix4().makeBasis(right, up, forward);
    const quat = new Quaternion().setFromRotationMatrix(mat);
    const toeCenterLocal = toVec(bigToePos)
      .add(toVec(smallToePos))
      .multiplyScalar(0.5)
      .sub(ankle)
      .applyQuaternion(quat.clone().invert());
    const bigToeLocal = toVec(bigToePos).sub(ankle).applyQuaternion(quat.clone().invert());
    const smallToeLocal = toVec(smallToePos).sub(ankle).applyQuaternion(quat.clone().invert());
    const heelLocal = heelWorld.clone().sub(ankle).applyQuaternion(quat.clone().invert());
    let rollNormal = toeCenterLocal.clone().sub(heelLocal);
    if (rollNormal.lengthSq() < 0.000001) {
      rollNormal = new Vector3(0, 0, 1);
    }
    rollNormal.normalize();
    const rollQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), rollNormal);

    return {
      quat,
      toeCenterLocal,
      toeCenterWorld,
      bigToeLocal,
      smallToeLocal,
      heelWorld,
      rollQuat,
    };
  }, [anklePos, bigToePos, smallToePos, heelPos]);

  return (
    <group
      position={[anklePos.x, anklePos.y, anklePos.z]}
      quaternion={[basis.quat.x, basis.quat.y, basis.quat.z, basis.quat.w]}
    >
      <FootPitchArrows
        side={side}
        position={basis.toeCenterLocal}
        positionWorld={basis.toeCenterWorld}
        quaternion={basis.quat}
        rigService={rigService}
      />
      <FootYawToeArrows
        side={side}
        bigToePosition={basis.bigToeLocal}
        smallToePosition={basis.smallToeLocal}
        toeCenterWorld={basis.toeCenterWorld}
        quaternion={basis.quat}
        rigService={rigService}
      />
      <FootRollRing
        side={side}
        position={basis.toeCenterLocal}
        quaternion={basis.rollQuat}
        toeCenterWorld={basis.toeCenterWorld}
        heelWorld={basis.heelWorld}
        rigService={rigService}
      />
    </group>
  );
}

function toVec(p: Point): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}
