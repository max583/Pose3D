import { RefObject, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';

interface AngularGizmoDragHandlers {
  groupRef: RefObject<Group>;
  handlePointerDown: (e: { button?: number; clientX: number; clientY: number; stopPropagation: () => void }) => void;
}

export function useAngularGizmoDrag(
  onDragStart: () => void,
  onAngleDrag: (deltaAngle: number) => void,
): AngularGizmoDragHandlers {
  const { camera, controls, gl } = useThree();
  const groupRef = useRef<Group>(null);

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
      onDragStart();

      const moveHandler = (ev: PointerEvent) => {
        const nextAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
        let delta = nextAngle - prevAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        prevAngle = nextAngle;

        if (delta !== 0) onAngleDrag(delta);
      };

      const upHandler = () => {
        if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
      };

      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    },
    [camera, controls, gl, onAngleDrag, onDragStart],
  );

  return { groupRef, handlePointerDown };
}
