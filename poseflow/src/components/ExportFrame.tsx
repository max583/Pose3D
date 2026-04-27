// ExportFrame.tsx - Рамка кадра для экспорта с drag и resize
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { exportLogger } from '../lib/logger';
import './ExportFrame.css';

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '3:2' | '2:3' | '4:5' | '5:4' | 'free';
export type Resolution = '1K' | '2K' | '4K';

export interface ExportFrameData {
  x: number;      // 0-1 (относительно viewport)
  y: number;      // 0-1
  width: number;  // 0-1
  height: number; // 0-1
  aspectRatio: AspectRatio;
  resolution: Resolution;
  pixelAspectRatio?: number; // Реальный aspect ratio в пикселях (width/height)
  /** Размеры DOM-viewport (как у рамки) — нужны для выравнивания экспорта с экраном */
  viewportWidth: number;
  viewportHeight: number;
  viewportAspectRatio: number;
}

// Правильные aspect ratio (ширина / высота)
const ASPECT_RATIO_MAP: Record<Exclude<AspectRatio, 'free'>, number> = {
  '1:1': 1,
  '3:4': 3 / 4,    // 0.75 - портрет
  '4:3': 4 / 3,    // 1.333 - ландшафт
  '9:16': 9 / 16,  // 0.5625 - Stories/Reels
  '16:9': 16 / 9,  // 1.778 - Widescreen
  '3:2': 3 / 2,    // 1.5 - классическое фото
  '2:3': 2 / 3,    // 0.667 - портретное фото
  '4:5': 4 / 5,    // 0.8 - Instagram портрет
  '5:4': 5 / 4,    // 1.25 - квадратное фото
};

interface ExportFrameProps {
  viewportRef: React.RefObject<HTMLDivElement>;
  onExport: (frameData: ExportFrameData) => void;
  onClose: () => void;
  /** Из настроек приложения при открытии рамки */
  defaultAspectRatio?: AspectRatio;
  defaultResolution?: Resolution;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export const ExportFrame: React.FC<ExportFrameProps> = ({
  viewportRef,
  onExport,
  onClose,
  defaultAspectRatio = '1:1',
  defaultResolution = '1K',
}) => {
  // Начальная позиция рамки - центр viewport, 80% размера
  const [frame, setFrame] = useState({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(defaultAspectRatio);
  const [resolution, setResolution] = useState<Resolution>(defaultResolution);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const dragStartRef = useRef({ x: 0, y: 0, frameX: 0, frameY: 0, frameW: 0, frameH: 0 });
  const frameRef = useRef(frame);
  // Храним размеры рамки в пикселях (для сохранения aspect ratio при resize)
  const pixelSizeRef = useRef<{ width: number; height: number } | null>(null);

  // Обновляем ref при изменении frame
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  // При изменении aspect ratio - корректируем размеры
  useEffect(() => {
    if (aspectRatio === 'free') return;
    if (!viewportRef.current) return;

    const viewportRect = viewportRef.current.getBoundingClientRect();
    const viewportAR = viewportRect.width / viewportRect.height;
    const targetRatio = ASPECT_RATIO_MAP[aspectRatio as Exclude<AspectRatio, 'free'>];

    // Сохраняем начальные пиксельные размеры
    pixelSizeRef.current = {
      width: frame.width * viewportRect.width,
      height: frame.height * viewportRect.height,
    };

    const currentPixelRatio = pixelSizeRef.current.width / pixelSizeRef.current.height;

    if (Math.abs(currentPixelRatio - targetRatio) > 0.01) {
      const currentCenterX = frame.x + frame.width / 2;
      const currentCenterY = frame.y + frame.height / 2;

      let newHeight = frame.width * viewportAR / targetRatio;
      let newWidth = frame.width;

      if (frame.y + newHeight > 1) {
        newHeight = 1 - frame.y;
        newWidth = newHeight * targetRatio / viewportAR;
      }
      if (newWidth < 0.1) {
        newWidth = 0.1;
        newHeight = newWidth * viewportAR / targetRatio;
      }

      let newX = Math.max(0, Math.min(1 - newWidth, currentCenterX - newWidth / 2));
      let newY = Math.max(0, Math.min(1 - newHeight, currentCenterY - newHeight / 2));

      const newFrame = { x: newX, y: newY, width: newWidth, height: newHeight };
      setFrame(newFrame);
      pixelSizeRef.current = {
        width: newWidth * viewportRect.width,
        height: newHeight * viewportRect.height,
      };
    } else {
      // Сохраняем текущие пиксельные размеры
      pixelSizeRef.current = {
        width: frame.width * viewportRect.width,
        height: frame.height * viewportRect.height,
      };
    }
  }, [aspectRatio]);

  // При изменении размера viewport - пересчитываем проценты чтобы сохранить пиксельные размеры
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!viewportRef.current || !pixelSizeRef.current) return;

        const viewportRect = viewportRef.current.getBoundingClientRect();
        const targetRatio = aspectRatio === 'free' ? null : ASPECT_RATIO_MAP[aspectRatio as Exclude<AspectRatio, 'free'>];
        const pixelSize = pixelSizeRef.current;

        // Если aspect ratio задан — сохраняем его
        if (targetRatio) {
          // Пересчитываем ширину/высоту в процентах на основе пиксельных размеров
          let newWidth = pixelSize.width / viewportRect.width;
          let newHeight = pixelSize.height / viewportRect.height;

          // Проверяем и корректируем границы
          if (newWidth > 1) newWidth = 1;
          if (newHeight > 1) newHeight = 1;
          if (newWidth < 0.1) newWidth = 0.1;
          if (newHeight < 0.1) newHeight = 0.1;

          const currentFrame = frameRef.current;
          // Сохраняем позицию (центрируем если вышла за границы)
          let newX = currentFrame.x;
          let newY = currentFrame.y;
          if (newX + newWidth > 1) newX = 1 - newWidth;
          if (newY + newHeight > 1) newY = 1 - newHeight;
          if (newX < 0) newX = 0;
          if (newY < 0) newY = 0;

          setFrame({ x: newX, y: newY, width: newWidth, height: newHeight });
        } else {
          // free mode — просто масштабируем
          // Проценты остаются теми же — CSS сделает масштабирование
        }
      }, 50);
    };

    const observer = new ResizeObserver(handleResize);
    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimeout);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [aspectRatio]);

  // Конвертирует пиксели в нормализованные координаты (0-1)
  const pixelsToNormalized = useCallback((px: number, py: number) => {
    if (!viewportRef.current) return { x: 0, y: 0 };
    const rect = viewportRef.current.getBoundingClientRect();
    return {
      x: px / rect.width,
      y: py / rect.height,
    };
  }, [viewportRef]);

  // Определяет, находится ли pointer внутри рамки (для экспорта координат)
  const isPointerInsideFrame = useCallback((clientX: number, clientY: number): boolean => {
    if (!viewportRef.current) return false;
    const rect = viewportRef.current.getBoundingClientRect();
    const frameLeft = rect.left + frame.x * rect.width;
    const frameTop = rect.top + frame.y * rect.height;
    const frameRight = frameLeft + frame.width * rect.width;
    const frameBottom = frameTop + frame.height * rect.height;
    return clientX >= frameLeft && clientX <= frameRight && 
           clientY >= frameTop && clientY <= frameBottom;
  }, [frame, viewportRef]);

  // Экспортируем функцию для проверки (чтобы Canvas3D мог решать блокировать или нет)
  useEffect(() => {
    (window as any).__exportFrameChecker = {
      isInside: isPointerInsideFrame,
      isActive: true
    };
    return () => {
      delete (window as any).__exportFrameChecker;
    };
  }, [isPointerInsideFrame]);

  // Обработчик начала drag
  const handlePointerDown = useCallback((e: React.PointerEvent, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      frameX: frame.x,
      frameY: frame.y,
      frameW: frame.width,
      frameH: frame.height,
    };
  }, [frame]);

  // Обработчик движения мыши
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = dragStartRef.current.x - e.clientX;
      const dy = dragStartRef.current.y - e.clientY;
      const { x: ndx, y: ndy } = pixelsToNormalized(-dx, -dy);

      const start = dragStartRef.current;
      let newX = start.frameX;
      let newY = start.frameY;
      let newW = start.frameW;
      let newH = start.frameH;

      if (dragHandle === 'move') {
        newX = Math.max(0, Math.min(1 - newW, start.frameX + ndx));
        newY = Math.max(0, Math.min(1 - newH, start.frameY + ndy));
      } else {
        // Resize - учитываем направление для каждого handles
        if (dragHandle?.includes('e')) {
          // Правая сторона - dx увеличивает ширину
          newW = Math.max(0.1, Math.min(1 - newX, start.frameW + ndx));
        }
        if (dragHandle?.includes('w')) {
          // Левая сторона - dx уменьшает ширину при движении вправо
          newW = Math.max(0.1, start.frameW - ndx);
          newX = Math.max(0, start.frameX + ndx);
          // Корректируем если вышли за границу
          if (newX + newW > 1) {
            newW = 1 - newX;
          }
        }
        if (dragHandle?.includes('s')) {
          // Нижняя сторона - dy увеличивает высоту
          newH = Math.max(0.1, Math.min(1 - newY, start.frameH + ndy));
        }
        if (dragHandle?.includes('n')) {
          // Верхняя сторона - dy уменьшает высоту при движении вниз
          newH = Math.max(0.1, start.frameH - ndy);
          newY = Math.max(0, start.frameY + ndy);
          // Корректируем если вышли за границу
          if (newY + newH > 1) {
            newH = 1 - newY;
          }
        }

        // Сохраняем aspect ratio если выбран — ТОЛЬКО для угловых handles
        if (aspectRatio !== 'free' && newW > 0 && newH > 0) {
          if (!viewportRef.current) return;

          const viewportRect = viewportRef.current.getBoundingClientRect();
          const viewportAR = viewportRect.width / viewportRect.height;

          // Определяем, какой handles используется
          const isLeft = dragHandle?.includes('w');
          const isTop = dragHandle?.includes('n');
          const isRight = dragHandle?.includes('e');
          const isBottom = dragHandle?.includes('s');

          // Корнер (угловой) handles — только для них сохраняем aspect ratio
          const isCorner = (isLeft || isRight) && (isTop || isBottom);

          if (!isCorner) {
            // Для боковых handles (n, s, e, w) НЕ сохраняем aspect ratio
            // Просто выходим, оставляя newW и newH как есть
          } else {
            // Угловой handles - используем ТЕКУЩИЙ ratio рамки (из pixelSizeRef)
            // а не preset, потому что пользователь мог изменить пропорции через боковые handles
            const currentPixelRatio = pixelSizeRef.current
              ? pixelSizeRef.current.width / pixelSizeRef.current.height
              : (start.frameW * viewportRect.width) / (start.frameH * viewportRect.height);

            const effectiveRatio = currentPixelRatio; // Используем текущий, а не preset

            // Угловой handles - выбираем доминирующую ось
            const startPixelW = start.frameW * viewportRect.width;
            const startPixelH = start.frameH * viewportRect.height;
            const newPixelW = newW * viewportRect.width;
            const newPixelH = newH * viewportRect.height;

            const ratioW = Math.abs(newPixelW - startPixelW) / startPixelW;
            const ratioH = Math.abs(newPixelH - startPixelH) / startPixelH;

            if (ratioW > ratioH) {
              // Ширина изменена больше - подстраиваем высоту под ТЕКУЩИЙ ratio
              newH = (newW * viewportAR) / effectiveRatio;
              if (isTop) {
                newY = start.frameY + start.frameH - newH;
              }
            } else {
              // Высота изменена больше - подстраиваем ширину под ТЕКУЩИЙ ratio
              newW = (newH * effectiveRatio) / viewportAR;
              if (isLeft) {
                newX = start.frameX + start.frameW - newW;
              }
            }

            // Проверяем границы для угловых handles
            if (newY < 0) {
              newY = 0;
              newH = Math.min(1, start.frameY + start.frameH);
              newW = (newH * effectiveRatio) / viewportAR;
              if (isLeft) {
                newX = start.frameX + start.frameW - newW;
              }
            }
            if (newY + newH > 1) {
              newH = 1 - newY;
              newW = (newH * effectiveRatio) / viewportAR;
              if (isLeft) {
                newX = start.frameX + start.frameW - newW;
              }
            }
            if (newX < 0) {
              newX = 0;
              newW = Math.min(1, start.frameX + start.frameW);
              newH = (newW * viewportAR) / effectiveRatio;
              if (isTop) {
                newY = start.frameY + start.frameH - newH;
              }
            }
            if (newX + newW > 1) {
              newW = 1 - newX;
              newH = (newW * viewportAR) / effectiveRatio;
              if (isTop) {
                newY = start.frameY + start.frameH - newH;
              }
            }

            // Минимальный размер для угловых handles
            if (newW < 0.1) {
              newW = 0.1;
              newH = (newW * viewportAR) / effectiveRatio;
              if (isLeft) {
                newX = start.frameX + start.frameW - newW;
              }
            }
            if (newH < 0.1) {
              newH = 0.1;
              newW = (newH * effectiveRatio) / viewportAR;
              if (isTop) {
                newY = start.frameY + start.frameH - newH;
              }
            }
          }
        }
      }

      setFrame({ x: newX, y: newY, width: newW, height: newH });
      
      // Обновляем пиксельные размеры
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        pixelSizeRef.current = {
          width: newW * rect.width,
          height: newH * rect.height,
        };
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setDragHandle(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragHandle, aspectRatio, pixelsToNormalized]);

  // Обработчик экспорта
  const handleExport = () => {
    if (!viewportRef.current) {
      exportLogger.error('Viewport not available for export');
      return;
    }

    const viewportRect = viewportRef.current.getBoundingClientRect();
    const viewportPixelAR = viewportRect.width / viewportRect.height;

    // Вычисляем реальный pixel aspect ratio рамки
    const pixelWidth = frame.width * viewportRect.width;
    const pixelHeight = frame.height * viewportRect.height;
    const pixelAR = pixelWidth / pixelHeight;

    const frameData: ExportFrameData = {
      ...frame,
      aspectRatio,
      resolution,
      pixelAspectRatio: pixelAR,
      viewportWidth: viewportRect.width,
      viewportHeight: viewportRect.height,
      viewportAspectRatio: viewportPixelAR,
    };
    exportLogger.info('Exporting with frame', { ...frameData, viewportPixelAR, pixelWidth, pixelHeight });
    onExport(frameData);
  };

  // Стили рамки
  const frameStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${frame.x * 100}%`,
    top: `${frame.y * 100}%`,
    width: `${frame.width * 100}%`,
    height: `${frame.height * 100}%`,
    border: '2px dashed #4a9eff',
    backgroundColor: 'rgba(74, 158, 255, 0.05)',
    cursor: isDragging && dragHandle === 'move' ? 'grabbing' : 'grab',
    zIndex: 100,
  };

  // Стили handles для resize
  const handleSize = 12;
  const createHandleStyle = (cursor: string, position: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: handleSize,
    height: handleSize,
    backgroundColor: '#4a9eff',
    borderRadius: '50%',
    cursor,
    zIndex: 101,
    ...position,
  });

  return (
    <div className="export-frame-overlay">
      {/* Затемнение за пределами рамки */}
      <div className="export-frame-backdrop" />

      {/* Панель управления - вверху экрана */}
      <div className="export-frame-top-bar">
        <div className="top-bar-section">
          <span className="top-bar-label">Aspect</span>
          <div className="top-bar-buttons">
            {(['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '4:5', '5:4', 'free'] as AspectRatio[]).map(ratio => (
              <button
                key={ratio}
                className={`top-bar-btn ${aspectRatio === ratio ? 'active' : ''}`}
                onClick={() => setAspectRatio(ratio)}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <div className="top-bar-divider" />

        <div className="top-bar-section">
          <span className="top-bar-label">Resolution</span>
          <div className="top-bar-buttons">
            {(['1K', '2K', '4K'] as Resolution[]).map(res => (
              <button
                key={res}
                className={`top-bar-btn ${resolution === res ? 'active' : ''}`}
                onClick={() => setResolution(res)}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        <div className="top-bar-divider" />

        <div className="top-bar-section top-bar-actions">
          <button className="btn-export-top" onClick={handleExport}>
            📥 Export PNG
          </button>
          <button className="btn-cancel-top" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {/* Рамка */}
      <div
        className="export-frame"
        style={frameStyle}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      >
        {/* Handles для resize */}
        <div
          style={createHandleStyle('nwse-resize', { top: -handleSize / 2, left: -handleSize / 2 })}
          onPointerDown={(e) => handlePointerDown(e, 'nw')}
        />
        <div
          style={createHandleStyle('nesw-resize', { top: -handleSize / 2, right: -handleSize / 2 })}
          onPointerDown={(e) => handlePointerDown(e, 'ne')}
        />
        <div
          style={createHandleStyle('nesw-resize', { bottom: -handleSize / 2, left: -handleSize / 2 })}
          onPointerDown={(e) => handlePointerDown(e, 'sw')}
        />
        <div
          style={createHandleStyle('nwse-resize', { bottom: -handleSize / 2, right: -handleSize / 2 })}
          onPointerDown={(e) => handlePointerDown(e, 'se')}
        />

        {/* Стороны */}
        <div
          style={createHandleStyle('ns-resize', { top: -handleSize / 2, left: '50%', transform: 'translateX(-50%)' })}
          onPointerDown={(e) => handlePointerDown(e, 'n')}
        />
        <div
          style={createHandleStyle('ns-resize', { bottom: -handleSize / 2, left: '50%', transform: 'translateX(-50%)' })}
          onPointerDown={(e) => handlePointerDown(e, 's')}
        />
        <div
          style={createHandleStyle('ew-resize', { top: '50%', left: -handleSize / 2, transform: 'translateY(-50%)' })}
          onPointerDown={(e) => handlePointerDown(e, 'w')}
        />
        <div
          style={createHandleStyle('ew-resize', { top: '50%', right: -handleSize / 2, transform: 'translateY(-50%)' })}
          onPointerDown={(e) => handlePointerDown(e, 'e')}
        />

        {/* Информация о рамке */}
        <div className="export-frame-info">
          <span className="frame-info-text">
            {aspectRatio} • {resolution}
          </span>
        </div>
      </div>
    </div>
  );
};
