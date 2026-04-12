import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Skeleton3D } from './skeleton/Skeleton3D';
import { CameraControls, CameraController } from './controls/CameraControls';
import { ExportFrame, ExportFrameData, AspectRatio, Resolution } from './ExportFrame';
import { PoseData, Body25Index, JointPosition } from '../lib/body25/body25-types';
import { poseService } from '../services/PoseService';
import { canvasLogger } from '../lib/logger';
import { useAppSettings } from '../context/AppSettingsContext';
import { getCanvasSceneStyle } from '../lib/canvasColorSchemes';
import './Canvas3D.css';

interface Canvas3DProps {
  modelsCount?: number;
  onCameraChange?: (camera: THREE.Camera) => void;
  onExportFrame?: (frameData: ExportFrameData, camera: THREE.Camera) => void;
}

// Внутренний компонент для установки камеры в ref
const CameraRefSetter: React.FC<{ cameraRef: React.RefObject<THREE.Camera | null>; onCameraChange?: (camera: THREE.Camera) => void }> = ({ 
  cameraRef, 
  onCameraChange 
}) => {
  const { camera } = useThree();

  useEffect(() => {
    canvasLogger.info('Camera registered in ref');
    cameraRef.current = camera;
    if (onCameraChange) {
      onCameraChange(camera);
    }
  }, [camera, cameraRef, onCameraChange]);

  return null;
};

// Компонент для осей (использует THREE.AxesHelper напрямую)
function AxesHelper({ size = 2 }: { size?: number }) {
  const helperRef = useRef<THREE.LineSegments>(null);

  // Создаём AxesHelper через three.js напрямую
  const axesHelper = useMemo(() => {
    const helper = new THREE.AxesHelper(size);
    return helper;
  }, [size]);

  useFrame(() => {
    // AxesHelper не нуждается в обновлении каждый кадр
  });

  // primitive позволяет использовать three.js объекты напрямую
  return <primitive object={axesHelper} ref={helperRef} />;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({ modelsCount = 0, onCameraChange, onExportFrame }) => {
  const { settings, effectiveTheme } = useAppSettings();
  const [poseData, setPoseData] = useState<PoseData>(poseService.getPoseData());
  const [manipulationMode, setManipulationMode] = useState(poseService.manipulationMode);
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerInsideFrame, setIsPointerInsideFrame] = useState(false);
  const [showExportFrame, setShowExportFrame] = useState(false);
  const currentCameraRef = useRef<THREE.Camera | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const orbitControlsRef = useRef<any>(null);

  // Обновляем камеру через ref (без лишних ре-рендеров)
  const handleCameraChange = useCallback((camera: THREE.Camera) => {
    currentCameraRef.current = camera;
    if (onCameraChange) {
      onCameraChange(camera);
    }
  }, [onCameraChange]);

  // Подписываемся на изменения позы
  useEffect(() => {
    canvasLogger.info('Canvas3D mounted, subscribing to poseService');
    const unsubscribe = poseService.subscribe((data) => {
      setPoseData(data);
      setManipulationMode(poseService.manipulationMode);
    });
    return () => {
      canvasLogger.info('Canvas3D unmounting');
      unsubscribe();
    };
  }, []);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y — undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          poseService.redo();
        } else {
          poseService.undo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        poseService.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Обработчик изменения позиции сустава
  const handleJointPositionChange = useCallback((
    index: Body25Index,
    position: JointPosition,
  ) => {
    canvasLogger.debug(`Joint ${index} position changed`, position);
    poseService.updateJoint(index, position);
  }, []);

  // Callback для Skeleton3D - начало drag
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    canvasLogger.debug('Joint drag started, disabling OrbitControls');
  }, []);

  // Callback для Skeleton3D - окончание drag
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    canvasLogger.debug('Joint drag ended, enabling OrbitControls');
  }, []);

  // Отслеживаем, находится ли pointer внутри рамки экспорта
  useEffect(() => {
    if (!showExportFrame) {
      setIsPointerInsideFrame(false);
      return;
    }

    const checkPointerInside = (e: MouseEvent) => {
      const checker = (window as any).__exportFrameChecker;
      if (checker && checker.isActive && checker.isInside) {
        setIsPointerInsideFrame(checker.isInside(e.clientX, e.clientY));
      }
    };

    viewportRef.current?.addEventListener('pointermove', checkPointerInside);
    return () => {
      viewportRef.current?.removeEventListener('pointermove', checkPointerInside);
    };
  }, [showExportFrame]);

  const sceneStyle = useMemo(
    () => getCanvasSceneStyle(settings.canvasColorScheme, effectiveTheme),
    [settings.canvasColorScheme, effectiveTheme],
  );

  return (
    <div className="canvas3d-container" ref={viewportRef}>
      {/* Кнопка показа рамки экспорта */}
      {!showExportFrame && (
        <button
          className="btn-show-export-frame"
          onClick={() => setShowExportFrame(true)}
        >
          📐 Export Frame
        </button>
      )}

      {/* Рамка экспорта */}
      {showExportFrame && viewportRef.current && (
        <ExportFrame
          viewportRef={viewportRef as React.RefObject<HTMLDivElement>}
          defaultAspectRatio={settings.defaultExportAspect as AspectRatio}
          defaultResolution={settings.defaultExportResolution as Resolution}
          onExport={(frameData) => {
            const camera = currentCameraRef.current;
            canvasLogger.info('Export frame triggered', { hasCamera: !!camera, frameData });
            if (camera && onExportFrame) {
              onExportFrame(frameData, camera);
            } else {
              canvasLogger.error('No camera available for export');
              alert('Camera not ready. Please wait a moment and try again.');
            }
            setShowExportFrame(false);
          }}
          onClose={() => setShowExportFrame(false)}
        />
      )}

      <Canvas
        camera={{ position: [0, 2, 5], fov: 50 }}
        style={{
          background: sceneStyle.background,
        }}
      >
        {/* Освещение (подбирается под схему canvas) */}
        <ambientLight intensity={sceneStyle.ambientIntensity} />
        <pointLight position={[10, 10, 10]} intensity={sceneStyle.pointMainIntensity} />
        <pointLight position={[-10, 10, -10]} intensity={sceneStyle.pointFillIntensity} />

        {/* Сетка и оси */}
        {settings.showGrid && (
          <Grid
            infiniteGrid
            cellSize={0.5}
            cellThickness={sceneStyle.gridCellThickness}
            cellColor={sceneStyle.gridCellColor}
            sectionSize={2.5}
            sectionThickness={sceneStyle.gridSectionThickness}
            sectionColor={sceneStyle.gridSectionColor}
            fadeDistance={sceneStyle.gridFadeDistance}
          />
        )}
        {settings.showAxes && <AxesHelper size={2} />}

        {/* Скелет BODY_25 */}
        <Skeleton3D
          poseData={poseData}
          onJointPositionChange={handleJointPositionChange}
          manipulationMode={manipulationMode}
        />

        {/* Модели (если есть) */}
        {Array.from({ length: modelsCount }).map((_, i) => (
          <group key={i} position={[i * 2 - modelsCount, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.5, 1.5, 0.5]} />
              <meshStandardMaterial color="#4a9eff" />
            </mesh>
          </group>
        ))}

        {/* Управление камерой - отключаем во время drag joint ИЛИ когда pointer внутри рамки */}
        <OrbitControls
          ref={orbitControlsRef}
          makeDefault
          enabled={!isDragging && !isPointerInsideFrame}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          enablePan={true}
          panSpeed={settings.orbitPanSpeed}
          rotateSpeed={settings.orbitRotateSpeed}
          zoomSpeed={settings.orbitZoomSpeed}
        />

        {/* Контролы камеры (внутри Canvas для доступа к useThree) */}
        <CameraController />

        {/* Устанавливаем камеру в ref */}
        <CameraRefSetter cameraRef={currentCameraRef} onCameraChange={onCameraChange} />
      </Canvas>

      {/* Кнопки управления камерой (вне Canvas) */}
      <CameraControls />

      {settings.showViewportOverlay && (
        <div className="canvas3d-info">
          <span>3D Viewport - BODY_25</span>
          <span>25 joints • {manipulationMode === 'fk' ? 'FK Mode' : 'IK Mode'}</span>
          {isDragging && <span className="drag-indicator">✋ Dragging joint...</span>}
          {showExportFrame && !isPointerInsideFrame && <span className="drag-indicator">🎯 Edit pose outside frame</span>}
          {showExportFrame && isPointerInsideFrame && <span className="drag-indicator">📐 Frame edit mode</span>}
        </div>
      )}
    </div>
  );
};
