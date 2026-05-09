// src/components/controllers/KneeController.tsx
//
// Knee-node controller: a single drag handle at the knee position that drives
// hip-first leg posing through `RigService.applyLegFromKneeTarget`.
//
// Coexists with `LegController` (ankle-driven IK) for the same leg. The user
// chooses which handle to grab. Used for poses where ankle-driven IK is
// awkward (e.g. deep hip flexion / knees-to-belly): the artist sets the
// femur direction directly via the knee handle, hip and knee anatomical
// limits clamp under the hood, ankle follows on the shin sphere.
//
// Wired in `Canvas3D.tsx` behind the `ENABLE_KNEE_NODE_CONTROLLER` feature
// flag (slice 3 of the knee-layer plan).

import { useCallback, useEffect, useState } from 'react';
import { Vector3 } from 'three';
import { RigService } from '../../services/RigService';
import { useCameraPlaneWorldDrag } from '../../hooks/useCameraPlaneWorldDrag';
import { useAppSettings } from '../../context/AppSettingsContext';

const KNEE_SPHERE_R = 0.045;
// Distinct from the ankle handle's cyan (`#00ccff` in LegController) so the
// two coexisting handles on a selected leg are visually unambiguous.
const COLOR_KNEE_NODE = '#ff9900';

interface KneeHandleProps {
  kneePos: { x: number; y: number; z: number };
  side: 'r' | 'l';
  rigService: RigService;
  dragSensitivity: number;
  hitZoneScale: number;
}

function KneeHandle({
  kneePos,
  side,
  rigService,
  dragSensitivity,
  hitZoneScale,
}: KneeHandleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const getCurrentPos = useCallback(
    () => new Vector3(kneePos.x, kneePos.y, kneePos.z),
    [kneePos.x, kneePos.y, kneePos.z],
  );
  const handleDragEnd = useCallback(() => {
    document.body.style.cursor = 'default';
  }, []);

  const { handlePointerDown } = useCameraPlaneWorldDrag(
    getCurrentPos,
    () => rigService.beginDrag(),
    (newPos) => rigService.applyLegFromKneeTarget(side, newPos.x, newPos.y, newPos.z),
    handleDragEnd,
    dragSensitivity,
  );

  const handlePointerOver = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = 'grab';
  }, []);

  const handlePointerOut = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setIsHovered(false);
    document.body.style.cursor = 'default';
  }, []);

  const handleKneePointerDown = useCallback(
    (e: Parameters<typeof handlePointerDown>[0]) => {
      document.body.style.cursor = 'grabbing';
      handlePointerDown(e);
    },
    [handlePointerDown],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);

  return (
    <group name={`knee-node-controller-${side}`} position={[kneePos.x, kneePos.y, kneePos.z]}>
      <mesh renderOrder={19}>
        <sphereGeometry args={[KNEE_SPHERE_R * 1.45, 16, 16]} />
        <meshBasicMaterial
          color={COLOR_KNEE_NODE}
          transparent
          opacity={isHovered ? 0.28 : 0.16}
          depthTest={false}
        />
      </mesh>
      <mesh renderOrder={20}>
        <sphereGeometry args={[KNEE_SPHERE_R, 12, 12]} />
        <meshBasicMaterial color={isHovered ? '#ffbf40' : COLOR_KNEE_NODE} depthTest={false} />
      </mesh>
      <mesh
        renderOrder={21}
        onPointerDown={handleKneePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[KNEE_SPHERE_R * hitZoneScale, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} />
      </mesh>
    </group>
  );
}

interface KneeControllerProps {
  side: 'r' | 'l';
  kneePos: { x: number; y: number; z: number };
  rigService: RigService;
}

export function KneeController({
  side,
  kneePos,
  rigService,
}: KneeControllerProps) {
  const { settings } = useAppSettings();
  return (
    <KneeHandle
      kneePos={kneePos}
      side={side}
      rigService={rigService}
      dragSensitivity={settings.gizmoDragSensitivity}
      hitZoneScale={settings.gizmoHitZoneScale}
    />
  );
}
