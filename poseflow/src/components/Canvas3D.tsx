import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Skeleton3D } from './skeleton/Skeleton3D';
import { CameraControls, CameraController } from './controls/CameraControls';
import { ExportFrame, ExportFrameData, AspectRatio, Resolution } from './ExportFrame';
import { MiniView } from './MiniView';
import { PoseData } from '../lib/body25/body25-types';
import { canvasLogger } from '../lib/logger';
import { useAppSettings } from '../context/AppSettingsContext';
import { getCanvasSceneStyle } from '../lib/canvasColorSchemes';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { usePoseService, useSelectionService, useRigService } from '../context/ServiceContext';
import { ElementId, ELEMENT_LABELS } from '../lib/rig/elements';
import { Body25Index } from '../lib/body25/body25-types';
import { PelvisController } from './controllers/PelvisController';
import { SpineController } from './controllers/SpineController';
import { NeckController } from './controllers/NeckController';
import './Canvas3D.css';

interface Canvas3DProps {
  modelsCount?: number;
  onCameraChange?: (camera: THREE.Camera) => void;
  onExportFrame?: (frameData: ExportFrameData, camera: THREE.Camera) => void;
}

// Внутренний компонент для установки камеры в ref
const CameraRefSetter: React.FC<{
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  onCameraChange?: (camera: THREE.Camera) => void;
}> = ({ cameraRef, onCameraChange }) => {
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

// Компонент для осей
function AxesHelper({ size = 2 }: { size?: number }) {
  const helperRef = useRef<THREE.LineSegments>(null);

  const axesHelper = useMemo(() => {
    return new THREE.AxesHelper(size);
  }, [size]);

  useFrame(() => {});

  return <primitive object={axesHelper} ref={helperRef} />;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({ modelsCount = 0, onCameraChange, onExportFrame }) => {
  const { settings, effectiveTheme } = useAppSettings();
  const poseService = usePoseService();
  const selectionService = useSelectionService();
  const rigService = useRigService();

  const [poseData, setPoseData] = useState<PoseData>(() => poseService.getPoseData());
  const [spineSegmentPositions, setSpineSegmentPositions] = useState(
    () => rigService.getVirtualPositions().spine.map(v => ({ x: v.x, y: v.y, z: v.z })),
  );
  const [neckSegmentPositions, setNeckSegmentPositions] = useState(
    () => rigService.getVirtualPositions().neck.map(v => ({ x: v.x, y: v.y, z: v.z })),
  );
  const [selectedElement, setSelectedElement] = useState<ElementId | null>(
    () => selectionService.getSelected()
  );
  const [isPointerInsideFrame, setIsPointerInsideFrame] = useState(false);
  const [showExportFrame, setShowExportFrame] = useState(false);
  const isMiniViewEnabled = useFeatureFlag('USE_MINI_VIEW');
  const currentCameraRef = useRef<THREE.Camera | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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
      const vp = rigService.getVirtualPositions();
      setSpineSegmentPositions(vp.spine.map(v => ({ x: v.x, y: v.y, z: v.z })));
      setNeckSegmentPositions(vp.neck.map(v => ({ x: v.x, y: v.y, z: v.z })));
    });
    return () => {
      canvasLogger.info('Canvas3D unmounting');
      unsubscribe();
    };
  }, [poseService, rigService]);

  // Подписываемся на изменения выделения
  useEffect(() => {
    const unsubscribe = selectionService.subscribe((element) => {
      setSelectedElement(element);
    });
    return unsubscribe;
  }, [selectionService]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y — undo/redo; M — mirror
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          poseService.mirrorPose();
          return;
        }
      }
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
  }, [poseService]);

  // Клик по суставу → выделить элемент
  const handleElementSelect = useCallback((element: ElementId | null) => {
    selectionService.setSelected(element);
  }, [selectionService]);

  // Отслеживаем pointer внутри рамки экспорта
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
    <div
      className="canvas3d-container"
      ref={viewportRef}
    >
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
        style={{ background: sceneStyle.background }}
        onPointerMissed={() => {
          // Клик мимо скелета → снять выделение
          selectionService.setSelected(null);
        }}
      >
        {/* Освещение */}
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
          selectedElement={selectedElement}
          onElementSelect={handleElementSelect}
          spineSegmentPositions={spineSegmentPositions}
          neckSegmentPositions={neckSegmentPositions}
        />

        {/* Контроллеры гизмо — рендерятся только для выделенного элемента */}
        {selectedElement === 'pelvis' && poseData[Body25Index.MID_HIP] && (
          <PelvisController
            rootPos={poseData[Body25Index.MID_HIP]!}
            rigService={rigService}
          />
        )}
        {selectedElement === 'neck' && poseData[Body25Index.NECK] && (
          <NeckController
            neckPos={poseData[Body25Index.NECK]!}
            rigService={rigService}
          />
        )}
        {selectedElement === 'spine' && poseData[Body25Index.MID_HIP] && poseData[Body25Index.NECK] && (
          <SpineController
            spineMiddle={{
              x: (poseData[Body25Index.MID_HIP]!.x + poseData[Body25Index.NECK]!.x) / 2,
              y: (poseData[Body25Index.MID_HIP]!.y + poseData[Body25Index.NECK]!.y) / 2,
              z: (poseData[Body25Index.MID_HIP]!.z + poseData[Body25Index.NECK]!.z) / 2,
            }}
            rigService={rigService}
          />
        )}

        {/* Модели (если есть) */}
        {Array.from({ length: modelsCount }).map((_, i) => (
          <group key={i} position={[i * 2 - modelsCount, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.5, 1.5, 0.5]} />
              <meshStandardMaterial color="#4a9eff" />
            </mesh>
          </group>
        ))}

        {/* Управление камерой */}
        <OrbitControls
          makeDefault
          enabled={!isPointerInsideFrame}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          enablePan={true}
          panSpeed={settings.orbitPanSpeed}
          rotateSpeed={settings.orbitRotateSpeed}
          zoomSpeed={settings.orbitZoomSpeed}
          mouseButtons={{
            LEFT: undefined,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
        />

        <CameraController />
        <CameraRefSetter cameraRef={currentCameraRef} onCameraChange={onCameraChange} />
      </Canvas>

      <CameraControls />

      {/* Мини-вид (Step 8) */}
      {isMiniViewEnabled && (
        <div className="mini-view-container">
          <MiniView
            poseData={poseData}
            manipulationMode="fk"
            unlinkedJoints={new Set()}
            mainCameraRef={currentCameraRef}
          />
        </div>
      )}

      {settings.showViewportOverlay && (
        <div className="canvas3d-info">
          <span>3D Viewport - BODY_25</span>
          <span>25 joints</span>
          {selectedElement && (
            <span className="selected-element-info">
              ● {ELEMENT_LABELS[selectedElement]}
            </span>
          )}
          {showExportFrame && !isPointerInsideFrame && (
            <span className="drag-indicator">🎯 Edit pose outside frame</span>
          )}
          {showExportFrame && isPointerInsideFrame && (
            <span className="drag-indicator">📐 Frame edit mode</span>
          )}
        </div>
      )}
    </div>
  );
};
