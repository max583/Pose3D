import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Skeleton3D } from './skeleton/Skeleton3D';
import { CameraControls, CameraController } from './controls/CameraControls';
import { ExportFrame, ExportFrameData, AspectRatio, Resolution } from './ExportFrame';
import { MiniView } from './MiniView';
import { ControllerVisual } from './experimental/ControllerVisual';
import { PoseData, Body25Index, JointPosition } from '../lib/body25/body25-types';
import { canvasLogger } from '../lib/logger';
import { useAppSettings } from '../context/AppSettingsContext';
import { getCanvasSceneStyle } from '../lib/canvasColorSchemes';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { useDesignDollControllers, useFeatureFlagIntegration, useIsDesignDollControllersEnabled } from '../hooks/useFeatureFlagIntegration';
import { usePoseService } from '../context/ServiceContext';
import './Canvas3D.css';

interface Canvas3DProps {
  modelsCount?: number;
  onCameraChange?: (camera: THREE.Camera) => void;
  onExportFrame?: (frameData: ExportFrameData, camera: THREE.Camera) => void;
}

// Внутренний компонент для установки камеры в ref
const CameraRefSetter: React.FC<{ cameraRef: React.MutableRefObject<THREE.Camera | null>; onCameraChange?: (camera: THREE.Camera) => void }> = ({
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
  const poseService = usePoseService();
  const [poseData, setPoseData] = useState<PoseData>(() => poseService.getPoseData());
  const [manipulationMode, setManipulationMode] = useState<ReturnType<typeof poseService.getManipulationMode>>(() => poseService.getManipulationMode());
  const [unlinkedJoints, setUnlinkedJoints] = useState<Set<Body25Index>>(() => poseService.getUnlinkedJoints());
  const [isDragging, setIsDragging] = useState(false);
  const [isControllerDragging, setIsControllerDragging] = useState(false);
  const [isPointerInsideFrame, setIsPointerInsideFrame] = useState(false);
  const [showExportFrame, setShowExportFrame] = useState(false);
  const isMiniViewEnabled = useFeatureFlag('USE_MINI_VIEW');
  const controllers = useDesignDollControllers();
  const featureFlagIntegration = useFeatureFlagIntegration();
  const isDesignDollControllersEnabled = useIsDesignDollControllersEnabled();
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
      setManipulationMode(poseService.getManipulationMode());
      setUnlinkedJoints(poseService.getUnlinkedJoints());
      // Skeleton → Controllers: синхронизируем контроллеры при каждом изменении позы
      featureFlagIntegration.syncControllersFromPose(data);
    });
    return () => {
      canvasLogger.info('Canvas3D unmounting');
      unsubscribe();
    };
  }, []);

  // Привязка контроллеров к PoseService (выполняется один раз при монтировании)
  useEffect(() => {
    // Controllers → Skeleton: при перемещении контроллера обновляем сустав
    featureFlagIntegration.onJointUpdate = (index, pos) => {
      poseService.updateJoint(index, pos);
    };
    // Инициализация: ставим контроллеры на текущие позиции суставов
    featureFlagIntegration.syncControllersFromPose(poseService.getPoseData());
    return () => {
      featureFlagIntegration.onJointUpdate = undefined;
    };
  }, [featureFlagIntegration, poseService]);

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
  }, []);

  // Test: Add raw click event listener to verify events reach the canvas
  useEffect(() => {
    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas) {
      console.log('Canvas3D: No canvas element found for click test');
      return;
    }
    
    const handleClick = (e: MouseEvent) => {
      console.log('Canvas3D RAW CLICK TEST:', {
        type: e.type,
        button: e.button,
        buttons: e.buttons,
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.target,
        currentTarget: e.currentTarget,
        timeStamp: e.timeStamp,
        isTrusted: e.isTrusted
      });
      // Prevent default to see if it helps
      e.preventDefault();
      e.stopPropagation();
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      console.log('Canvas3D RAW POINTERDOWN TEST:', {
        type: e.type,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        button: e.button,
        buttons: e.buttons,
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.target,
        currentTarget: e.currentTarget
      });
      // Capture left button clicks and prevent OrbitControls from handling them
      if (e.button === 0) {
        console.log('RAW POINTERDOWN left button - attempting to prevent default');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    
    // Use capture phase to intercept before OrbitControls
    canvas.addEventListener('click', handleClick, { capture: true });
    canvas.addEventListener('pointerdown', handlePointerDown, { capture: true });
    
    return () => {
      canvas.removeEventListener('click', handleClick, { capture: true });
      canvas.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  // Обработчик изменения позиции сустава
  const handleJointPositionChange = useCallback((
    index: Body25Index,
    position: JointPosition,
  ) => {
    canvasLogger.debug(`Joint ${index} position changed`, position);
    poseService.updateJoint(index, position);
  }, []);

  // Переключение FK-связи (правая кнопка мыши на суставе)
  const handleToggleJointLink = useCallback((index: Body25Index) => {
    poseService.toggleJointLink(index);
  }, []);

  // Обработчик выбора контроллера DesignDoll
  const handleControllerSelect = useCallback((controllerId: string) => {
    canvasLogger.debug(`Controller selected: ${controllerId}`);
    // TODO: Implement controller selection logic
    // This could activate the controller in MainControllers
    if (featureFlagIntegration.getMainControllers()) {
      featureFlagIntegration.getMainControllers()?.setActiveController(controllerId);
    }
  }, [featureFlagIntegration]);

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

  // Обработчики pointer событий для DesignDoll контроллеров
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    console.log('=== CANVAS POINTER DOWN START ===', {
      button: e.button,
      buttons: e.buttons,
      clientX: e.clientX,
      clientY: e.clientY,
      target: e.target,
      currentTarget: e.currentTarget,
      timeStamp: e.timeStamp,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      isTrusted: e.isTrusted
    });
    
    // Only handle left mouse button (button === 0)
    if (e.button !== 0) {
      console.log('Canvas3D handlePointerDown: Ignoring non-left button (button =', e.button, ')');
      return;
    }
    
    console.log('Canvas3D handlePointerDown processing left button click');
    
    if (!featureFlagIntegration.isDesignDollControllersEnabled()) {
      console.log('Canvas3D handlePointerDown: DesignDoll controllers not enabled');
      return;
    }

    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas || !currentCameraRef.current) return;

    const rect = canvas.getBoundingClientRect();
    // Pass pixel coordinates (relative to canvas) instead of NDC
    const screenPosition = new THREE.Vector2(
      e.clientX - rect.left,  // X in pixels
      e.clientY - rect.top     // Y in pixels
    );

    console.log('Canvas3D screenPosition (pixels)', {
      x: screenPosition.x,
      y: screenPosition.y,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      canvasClientSize: { width: canvas.clientWidth, height: canvas.clientHeight },
      canvasDrawingBuffer: { width: canvas.width, height: canvas.height },
      devicePixelRatio: window.devicePixelRatio
    });

    const dragEvent = {
      type: 'start' as const,
      screenPosition,
      controllerId: null,
    };

    const canvasSize = { width: rect.width, height: rect.height };
    const handled = featureFlagIntegration.handleDragEvent(dragEvent, currentCameraRef.current, canvasSize);
    
    console.log('Canvas3D drag event handled:', handled);
    
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      canvas.setPointerCapture(e.pointerId);
      setIsControllerDragging(true);
      console.log('Controller drag started, setting isControllerDragging = true');
    }
  }, [featureFlagIntegration, setIsControllerDragging]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    console.log('=== CANVAS POINTER MOVE START ===', {
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.button,
      buttons: e.buttons,
      target: e.target,
      currentTarget: e.currentTarget,
      pointerId: e.pointerId,
      pointerType: e.pointerType
    });
    
    if (!featureFlagIntegration.isDesignDollControllersEnabled()) {
      console.log('Canvas3D handlePointerMove: DesignDoll controllers not enabled');
      return;
    }

    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas || !currentCameraRef.current) return;

    const rect = canvas.getBoundingClientRect();
    // Use pixel coordinates for consistency with handlePointerDown
    const screenPosition = new THREE.Vector2(
      e.clientX - rect.left,  // X in pixels
      e.clientY - rect.top     // Y in pixels
    );

    console.log('Canvas3D handlePointerMove screenPosition (pixels)', { x: screenPosition.x, y: screenPosition.y });

    const dragEvent = {
      type: 'drag' as const,
      screenPosition,
      controllerId: null,
    };

    const canvasSize = { width: rect.width, height: rect.height };
    const handled = featureFlagIntegration.handleDragEvent(dragEvent, currentCameraRef.current, canvasSize);
    
    console.log('Canvas3D handlePointerMove drag event handled:', handled);
    
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [featureFlagIntegration]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    console.log('Canvas3D handlePointerUp', { clientX: e.clientX, clientY: e.clientY, button: e.button });
    if (!featureFlagIntegration.isDesignDollControllersEnabled()) {
      return;
    }

    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas || !currentCameraRef.current) return;

    const rect = canvas.getBoundingClientRect();
    // Use pixel coordinates for consistency with handlePointerDown
    const screenPosition = new THREE.Vector2(
      e.clientX - rect.left,  // X in pixels
      e.clientY - rect.top     // Y in pixels
    );

    console.log('Canvas3D handlePointerUp screenPosition (pixels)', { x: screenPosition.x, y: screenPosition.y });

    const dragEvent = {
      type: 'end' as const,
      screenPosition,
      controllerId: null,
    };

    const canvasSize = { width: rect.width, height: rect.height };
    const handled = featureFlagIntegration.handleDragEvent(dragEvent, currentCameraRef.current, canvasSize);
    
    console.log('Canvas3D handlePointerUp drag event handled:', handled);
    
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      canvas.releasePointerCapture(e.pointerId);
      setIsControllerDragging(false);
      console.log('Controller drag ended, setting isControllerDragging = false');
    } else {
      // If no drag event was handled but we were dragging, still clear the flag
      // (e.g., click outside controller)
      if (isControllerDragging) {
        setIsControllerDragging(false);
        console.log('Controller drag flag cleared (no drag event handled)');
      }
    }
  }, [featureFlagIntegration, setIsControllerDragging, isControllerDragging]);

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
    <div
      className="canvas3d-container"
      ref={viewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
          onToggleJointLink={handleToggleJointLink}
          manipulationMode={manipulationMode}
          unlinkedJoints={unlinkedJoints}
        />

        {/* Контроллеры DesignDoll (если включены) */}
        {controllers.map((controller) => (
          <ControllerVisual
            key={controller.id}
            controller={controller}
            onSelect={handleControllerSelect}
            isInteractive={true}
          />
        ))}

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
          enabled={!isDragging && !isControllerDragging && !isPointerInsideFrame}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          enablePan={true}
          panSpeed={settings.orbitPanSpeed}
          rotateSpeed={settings.orbitRotateSpeed}
          zoomSpeed={settings.orbitZoomSpeed}
          mouseButtons={{
            LEFT: undefined,               // ЛКМ — только скелет, камера не вращается
            MIDDLE: THREE.MOUSE.PAN,       // СКМ (зажать) — панорамирование
            RIGHT: THREE.MOUSE.ROTATE,     // ПКМ (зажать) — вращение камеры
          }}
        />

        {/* Контролы камеры (внутри Canvas для доступа к useThree) */}
        <CameraController />

        {/* Устанавливаем камеру в ref */}
        <CameraRefSetter cameraRef={currentCameraRef} onCameraChange={onCameraChange} />
      </Canvas>

      {/* Кнопки управления камерой (вне Canvas) */}
      <CameraControls />

      {/* Мини-вид (Step 8) */}
      {isMiniViewEnabled && (
        <div className="mini-view-container">
          <MiniView
            poseData={poseData}
            manipulationMode={manipulationMode}
            unlinkedJoints={unlinkedJoints}
            mainCameraRef={currentCameraRef}
          />
        </div>
      )}

      {settings.showViewportOverlay && (
        <div className="canvas3d-info">
          <span>3D Viewport - BODY_25</span>
          <span>
            25 joints •
            {isDesignDollControllersEnabled
              ? ' DesignDoll Mode'
              : ` ${manipulationMode === 'fk' ? 'FK Mode' : 'IK Mode'}`}
          </span>
          {isDragging && <span className="drag-indicator">✋ Dragging joint...</span>}
          {showExportFrame && !isPointerInsideFrame && <span className="drag-indicator">🎯 Edit pose outside frame</span>}
          {showExportFrame && isPointerInsideFrame && <span className="drag-indicator">📐 Frame edit mode</span>}
        </div>
      )}
    </div>
  );
};
