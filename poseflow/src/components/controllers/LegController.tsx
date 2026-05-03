import { useCallback, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { RigService } from '../../services/RigService';
import { useAngularGizmoDrag } from '../../hooks/useAngularGizmoDrag';
import { useCameraPlaneWorldDrag } from '../../hooks/useCameraPlaneWorldDrag';
import { useAppSettings } from '../../context/AppSettingsContext';

const ANKLE_SPHERE_R = 0.045;
const ARC_TUBE = 0.006;
const ARC_HIT_TUBE = 0.045;
const CONE_R = 0.016;
const CONE_H = 0.042;
const COLOR_LEG = '#00ccff';

interface AnkleHandleProps {
  anklePos: { x: number; y: number; z: number };
  side: 'r' | 'l';
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}

interface KneeTwistArcProps {
  hipPos: { x: number; y: number; z: number };
  kneePos: { x: number; y: number; z: number };
  anklePos: { x: number; y: number; z: number };
  side: 'r' | 'l';
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}

function KneeTwistArc({
  hipPos,
  kneePos,
  anklePos,
  side,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: KneeTwistArcProps) {
  const { camera } = useThree();
  const arcParams = useMemo(() => {
    const hip = new Vector3(hipPos.x, hipPos.y, hipPos.z);
    const knee = new Vector3(kneePos.x, kneePos.y, kneePos.z);
    const ankle = new Vector3(anklePos.x, anklePos.y, anklePos.z);
    const axis = ankle.clone().sub(hip);
    if (axis.lengthSq() < 0.000001) return null;
    axis.normalize();

    const t = knee.clone().sub(hip).dot(axis);
    const center = hip.clone().addScaledVector(axis, t);
    const kneeDir = knee.clone().sub(center);
    const radius = kneeDir.length();
    if (radius < 0.001) return null;
    kneeDir.normalize();

    const arcX = kneeDir.clone();
    const arcZ = axis.clone();
    const arcY = new Vector3().crossVectors(arcZ, arcX).normalize();
    const mat = new Matrix4().makeBasis(arcX, arcY, arcZ);
    const quat = new Quaternion().setFromRotationMatrix(mat);

    return { axis, center, radius, quat };
  }, [hipPos, kneePos, anklePos]);

  const getViewSign = () => {
    if (!arcParams) return 1;
    const cameraFromCenter = camera.position.clone().sub(arcParams.center);
    if (cameraFromCenter.lengthSq() < 0.000001) return 1;
    return cameraFromCenter.normalize().dot(arcParams.axis) >= 0 ? 1 : -1;
  };

  const { groupRef, handlePointerDown } = useAngularGizmoDrag(
    () => rigService.beginDrag(),
    (delta) => rigService.applyKneeTwist(side, -delta * getViewSign() * dragSensitivity),
  );

  if (!arcParams) return null;
  const { center, radius, quat } = arcParams;

  function arrowAt(angle: number, dir: 1 | -1): [pos: [number, number, number], rotZ: number] {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const tx = -dir * Math.sin(angle);
    const ty = dir * Math.cos(angle);
    const rotZ = Math.atan2(-tx, ty);
    return [[x, y, 0], rotZ];
  }

  const [startPos, startRot] = arrowAt(-Math.PI / 4, -1);
  const [endPos, endRot] = arrowAt(Math.PI / 4, 1);

  return (
    <group
      ref={groupRef}
      position={center.toArray() as [number, number, number]}
      quaternion={[quat.x, quat.y, quat.z, quat.w]}
    >
      <group rotation={[0, 0, -Math.PI / 4]}>
        <mesh>
          <torusGeometry args={[radius, ARC_TUBE, 8, 32, Math.PI / 2]} />
          <meshBasicMaterial color={COLOR_LEG} depthTest={false} />
        </mesh>
      </group>

      <mesh position={endPos} rotation={[0, 0, endRot]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={COLOR_LEG} depthTest={false} />
      </mesh>

      <mesh position={startPos} rotation={[0, 0, startRot]}>
        <coneGeometry args={[CONE_R, CONE_H, 8]} />
        <meshBasicMaterial color={COLOR_LEG} depthTest={false} />
      </mesh>

      <mesh onPointerDown={handlePointerDown}>
        <torusGeometry args={[radius, ARC_HIT_TUBE * hitZoneScale, 8, 32]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

function AnkleHandle({
  anklePos,
  side,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: AnkleHandleProps) {
  const getCurrentPos = useCallback(
    () => new Vector3(anklePos.x, anklePos.y, anklePos.z),
    [anklePos.x, anklePos.y, anklePos.z],
  );

  const { handlePointerDown } = useCameraPlaneWorldDrag(
    getCurrentPos,
    () => rigService.beginDrag(),
    (newPos) => rigService.applyLegIK(side, newPos.x, newPos.y, newPos.z),
    undefined,
    dragSensitivity,
  );

  return (
    <group position={[anklePos.x, anklePos.y, anklePos.z]}>
      <mesh>
        <sphereGeometry args={[ANKLE_SPHERE_R, 12, 12]} />
        <meshBasicMaterial color={COLOR_LEG} depthTest={false} />
      </mesh>
      <mesh onPointerDown={handlePointerDown}>
        <sphereGeometry args={[ANKLE_SPHERE_R * hitZoneScale, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

interface LegControllerProps {
  side: 'r' | 'l';
  hipPos: { x: number; y: number; z: number };
  kneePos: { x: number; y: number; z: number };
  anklePos: { x: number; y: number; z: number };
  rigService: RigService;
}

export function LegController({
  side,
  hipPos,
  kneePos,
  anklePos,
  rigService,
}: LegControllerProps) {
  const { settings } = useAppSettings();
  return (
    <>
      <AnkleHandle
        anklePos={anklePos}
        side={side}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
      <KneeTwistArc
        hipPos={hipPos}
        kneePos={kneePos}
        anklePos={anklePos}
        side={side}
        rigService={rigService}
        dragSensitivity={settings.gizmoDragSensitivity}
        hitZoneScale={settings.gizmoHitZoneScale}
      />
    </>
  );
}
