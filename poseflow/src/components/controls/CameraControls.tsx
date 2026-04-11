// CameraControls.tsx - Управление камерой (как posemy.art)
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { cameraService } from '../../services/cameraService';
import './CameraControls.css';

/**
 * Внутренний компонент для регистрации камеры в сервисе
 * Должен быть внутри Canvas
 */
export const CameraController: React.FC = () => {
  const { camera } = useThree();

  useEffect(() => {
    cameraService.registerCamera(camera);
  }, [camera]);

  return null;
};

/**
 * Внешний компонент с кнопками управления камерой
 * Может быть вне Canvas
 */
export const CameraControls: React.FC = () => {
  const handleFrontView = () => cameraService.switchTo('front');
  const handleBackView = () => cameraService.switchTo('back');
  const handleSideRight = () => cameraService.switchTo('side');
  const handleSideLeft = () => cameraService.switchTo('sideLeft');
  const handle3QFrontRight = () => cameraService.switchTo('threeQuarterFrontRight');
  const handle3QFrontLeft = () => cameraService.switchTo('threeQuarterFrontLeft');
  const handle3QBackRight = () => cameraService.switchTo('threeQuarterBackRight');
  const handle3QBackLeft = () => cameraService.switchTo('threeQuarterBackLeft');
  const handleTopView = () => cameraService.switchTo('top');
  const handleReset = () => cameraService.switchTo('reset');

  return (
    <div className="camera-controls">
      <div className="camera-controls-title">Camera</div>
      <div className="camera-grid">
        {/* Задний ряд (сверху) */}
        <button className="cam-btn cam-corner" onClick={handle3QBackLeft} title="3/4 Back Left">
          <span>↙</span>
        </button>
        <button className="cam-btn cam-edge" onClick={handleBackView} title="Back View">
          <span>↑</span>
        </button>
        <button className="cam-btn cam-corner" onClick={handle3QBackRight} title="3/4 Back Right">
          <span>↘</span>
        </button>

        {/* Средний ряд */}
        <button className="cam-btn cam-edge" onClick={handleSideLeft} title="Left Side">
          <span>←</span>
        </button>
        <button className="cam-btn cam-center" onClick={handleTopView} title="Top View">
          <span>Top</span>
        </button>
        <button className="cam-btn cam-edge" onClick={handleSideRight} title="Right Side">
          <span>→</span>
        </button>

        {/* Передний ряд (снизу) */}
        <button className="cam-btn cam-corner" onClick={handle3QFrontLeft} title="3/4 Front Left">
          <span>↖</span>
        </button>
        <button className="cam-btn cam-edge" onClick={handleFrontView} title="Front View">
          <span>↓</span>
        </button>
        <button className="cam-btn cam-corner" onClick={handle3QFrontRight} title="3/4 Front Right">
          <span>↗</span>
        </button>

        {/* Reset кнопка */}
        <button className="cam-btn cam-btn-reset" onClick={handleReset} title="Reset Camera">
          <span>↺ Reset</span>
        </button>
      </div>
    </div>
  );
};
