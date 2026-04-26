import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Skeleton3D } from './skeleton/Skeleton3D';
import { PoseData } from '../lib/body25/body25-types';
import { canvasLogger } from '../lib/logger';
import './Canvas3D.css';

interface MiniViewProps {
  poseData: PoseData;
  /** @deprecated Не используется в Stage 0 (манипуляций нет) */
  manipulationMode?: string;
  /** @deprecated Не используется в Stage 0 */
  unlinkedJoints?: Set<number>;
  mainCameraRef: React.RefObject<THREE.Camera | null>;
}

// Внутренний компонент для настройки камеры мини-вида
const MiniViewCamera: React.FC<{ mainCameraRef: React.RefObject<THREE.Camera | null> }> = ({ mainCameraRef }) => {
  const { camera } = useThree();
  const lastMainCameraPosition = useRef<THREE.Vector3 | null>(null);
  const lastMainCameraRotation = useRef<THREE.Quaternion | null>(null);

  useFrame(() => {
    if (!mainCameraRef.current) return;

    const mainCamera = mainCameraRef.current;
    const mainPosition = mainCamera.position.clone();
    const mainRotation = new THREE.Quaternion().setFromEuler(mainCamera.rotation);

    if (
      !lastMainCameraPosition.current ||
      !lastMainCameraPosition.current.equals(mainPosition) ||
      !lastMainCameraRotation.current ||
      !lastMainCameraRotation.current.equals(mainRotation)
    ) {
      const miniCameraPosition = mainPosition.clone();
      const miniCameraTarget = new THREE.Vector3(0, 0, 0);

      const rotationMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
      miniCameraPosition.applyMatrix4(rotationMatrix);

      camera.position.copy(miniCameraPosition);
      camera.lookAt(miniCameraTarget);
      camera.updateProjectionMatrix();

      lastMainCameraPosition.current = mainPosition.clone();
      lastMainCameraRotation.current = mainRotation.clone();
    }
  });

  return null;
};

const DisabledControls: React.FC = () => {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      controlsRef.current.enableRotate = false;
      controlsRef.current.enablePan = false;
      controlsRef.current.enableZoom = false;
    }
  }, []);

  return <OrbitControls ref={controlsRef} />;
};

export const MiniView: React.FC<MiniViewProps> = ({
  poseData,
  mainCameraRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    canvasLogger.info('MiniView component mounted');
    return () => {
      canvasLogger.info('MiniView component unmounted');
    };
  }, []);

  return (
    <div className="mini-view">
      <Canvas
        ref={canvasRef}
        camera={{ position: [5, 5, 5], fov: 50, near: 0.1, far: 1000 }}
        style={{ width: '200px', height: '200px' }}
        onCreated={({ gl }) => {
          gl.setSize(200, 200);
          gl.setPixelRatio(window.devicePixelRatio);
          gl.setClearColor(new THREE.Color(0x1a1a1a), 0.8);
        }}
      >
        <MiniViewCamera mainCameraRef={mainCameraRef} />
        <DisabledControls />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <gridHelper args={[10, 10, 0x444444, 0x222222]} />

        {/* Скелет только для просмотра (без обработчиков) */}
        <Skeleton3D poseData={poseData} />
      </Canvas>
    </div>
  );
};
