import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Skeleton3D } from './skeleton/Skeleton3D';
import { PoseData, Body25Index, JointPosition, ManipulationMode } from '../lib/body25/body25-types';
import { canvasLogger } from '../lib/logger';
import './Canvas3D.css';

interface MiniViewProps {
  poseData: PoseData;
  manipulationMode: ManipulationMode;
  unlinkedJoints: Set<Body25Index>;
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

    // Проверяем, изменилась ли основная камера
    if (
      !lastMainCameraPosition.current ||
      !lastMainCameraPosition.current.equals(mainPosition) ||
      !lastMainCameraRotation.current ||
      !lastMainCameraRotation.current.equals(mainRotation)
    ) {
      // Обновляем мини-камеру: поворачиваем на 90° вокруг Y оси
      const miniCameraPosition = mainPosition.clone();
      const miniCameraTarget = new THREE.Vector3(0, 0, 0);
      
      // Поворачиваем позицию камеры на 90° вокруг Y оси
      const rotationMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
      miniCameraPosition.applyMatrix4(rotationMatrix);
      
      // Устанавливаем камеру мини-вида
      camera.position.copy(miniCameraPosition);
      camera.lookAt(miniCameraTarget);
      camera.updateProjectionMatrix();

      // Сохраняем текущее состояние основной камеры
      lastMainCameraPosition.current = mainPosition.clone();
      lastMainCameraRotation.current = mainRotation.clone();
    }
  });

  return null;
};

// Компонент для отключения взаимодействия в мини-виде
const DisabledControls: React.FC = () => {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      // Отключаем все взаимодействия
      controlsRef.current.enabled = false;
      controlsRef.current.enableRotate = false;
      controlsRef.current.enablePan = false;
      controlsRef.current.enableZoom = false;
    }
  }, []);

  return <OrbitControls ref={controlsRef} />;
};

// Простой компонент осей координат
const SimpleAxesHelper: React.FC<{ size?: number }> = ({ size = 2 }) => {
  const axesRef = useRef<THREE.LineSegments>(null);
  
  useEffect(() => {
    if (axesRef.current) {
      const axes = new THREE.AxesHelper(size);
      axesRef.current.add(axes);
      
      return () => {
        axesRef.current?.remove(axes);
      };
    }
  }, [size]);
  
  return <primitive ref={axesRef} object={new THREE.Group()} />;
};

// Пустой обработчик для суставов (мини-вид не интерактивный)
const noopJointPositionChange = (index: Body25Index, position: JointPosition) => {
  // Ничего не делаем - мини-вид только для просмотра
};

export const MiniView: React.FC<MiniViewProps> = ({
  poseData,
  manipulationMode,
  unlinkedJoints,
  mainCameraRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Логируем создание мини-вида
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
        camera={{
          position: [5, 5, 5],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        style={{
          width: '200px',
          height: '200px',
        }}
        onCreated={({ gl, camera }) => {
          // Настраиваем рендерер для мини-вида
          gl.setSize(200, 200);
          gl.setPixelRatio(window.devicePixelRatio);
          gl.setClearColor(new THREE.Color(0x1a1a1a), 0.8);
        }}
      >
        {/* Камера мини-вида, синхронизированная с основной */}
        <MiniViewCamera mainCameraRef={mainCameraRef} />
        
        {/* Отключенные контролы (только для структуры) */}
        <DisabledControls />
        
        {/* Сцена мини-вида */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        
        {/* Сетка для ориентации */}
        <gridHelper args={[10, 10, 0x444444, 0x222222]} />
        
        {/* Оси координат */}
        <SimpleAxesHelper size={2} />
        
        {/* Скелет (не интерактивный) */}
        <Skeleton3D
          poseData={poseData}
          onJointPositionChange={noopJointPositionChange}
          manipulationMode={manipulationMode}
          unlinkedJoints={unlinkedJoints}
        />
      </Canvas>
    </div>
  );
};