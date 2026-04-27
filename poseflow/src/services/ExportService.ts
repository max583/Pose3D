// ExportService - экспорт в форматы OpenPose
import * as THREE from 'three';
import { PoseData, Body25Index, JointPosition, OpenPoseJSON } from '../lib/body25/body25-types';
import { BODY25_CONNECTIONS } from '../lib/body25/body25-connections';
import { KEYPOINT_MAP } from '../lib/body25/body25-keypoints';
import { exportLogger, errorLogger } from '../lib/logger';
import { clipLineToRect } from '../lib/utils/geometry';

export class ExportService {
  exportToPNG(
    poseData: PoseData,
    size: number | { width: number; height: number } = 512,
    camera?: THREE.Camera,
  ): Promise<string> {
    return ExportService.exportToPNG(poseData, size, camera);
  }

  exportToJSON(poseData: PoseData, camera?: THREE.Camera, resolution?: number): string {
    return ExportService.exportToJSONString(poseData, camera, resolution);
  }

  downloadJSON(
    poseData: PoseData,
    filename: string = 'pose.json',
    camera?: THREE.Camera,
    resolution?: number,
  ): void {
    ExportService.downloadJSON(poseData, filename, camera, resolution);
  }

  exportToBody25Format(poseData: PoseData): number[] {
    return ExportService.exportToBody25Format(poseData);
  }

  exportToOpenPoseJSON(
    poseData: PoseData,
    resolution: number = 512,
    camera?: THREE.Camera,
  ): OpenPoseJSON {
    return ExportService.exportToOpenPoseJSON(poseData, resolution, camera);
  }

  downloadPNGWithCrop(
    poseData: PoseData,
    camera: THREE.Camera,
    frameData: {
      x: number;
      y: number;
      width: number;
      height: number;
      pixelAspectRatio?: number;
      viewportWidth: number;
      viewportHeight: number;
    },
    resolution: number,
    filename: string = 'pose_cropped.png',
  ): Promise<void> {
    return ExportService.downloadPNGWithCrop(poseData, camera, frameData, resolution, filename);
  }

  projectTo2D(
    joint: JointPosition,
    camera: THREE.Camera,
    canvasWidth: number,
    canvasHeight: number,
  ): [number, number] | null {
    return ExportService.projectTo2D(joint, camera, canvasWidth, canvasHeight);
  }

  generateFilename(prefix: string = 'pose_export', extension: string = 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}.${extension}`;
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async copyToClipboard(json: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch (error) {
      exportLogger.error('Failed to copy JSON to clipboard', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  dispose(): void {}

  /**
   * Проецирует 3D точку в 2D через камеру
   */
  static projectTo2D(
    joint: JointPosition,
    camera: THREE.Camera,
    canvasWidth: number,
    canvasHeight: number,
  ): [number, number] | null {
    try {
      // Обновляем матрицы камеры перед использованием
      camera.updateMatrixWorld();
      if ('updateProjectionMatrix' in camera) {
        (camera as THREE.PerspectiveCamera | THREE.OrthographicCamera).updateProjectionMatrix();
      }

      const point = new THREE.Vector3(joint.x, joint.y, joint.z);
      
      // Проецируем точку через камеру используя встроенный метод Three.js
      point.project(camera);

      // point теперь в NDC координатах (-1 до 1)
      const ndcX = point.x;
      const ndcY = point.y;

      // Проверяем, что точка в пределах видимости
      if (Math.abs(ndcX) > 2 || Math.abs(ndcY) > 2) {
        exportLogger.warn(`Point out of NDC view: (${ndcX.toFixed(2)}, ${ndcY.toFixed(2)})`);
        return null;
      }

      // NDC → пиксели: ширина и высота canvas должны совпадать с aspect камеры (как у WebGL viewport)
      const x = (ndcX + 1) / 2 * canvasWidth;
      const y = (1 - ndcY) / 2 * canvasHeight;

      return [x, y];
    } catch (error) {
      exportLogger.error('Error in projectTo2D', {
        error: error instanceof Error ? error.message : String(error),
        joint,
        canvasWidth,
        canvasHeight,
      });
      // Возвращаем null при ошибке, будет использован fallback
      return null;
    }
  }

  /**
   * Экспорт позы в OpenPose JSON формат для ControlNet
   * Формат: {version: 1.3, people: [{pose_keypoints_2d: [x0,y0,c0, ...]}]}
   */
  static exportToOpenPoseJSON(
    poseData: PoseData,
    resolution: number = 512,
    camera?: THREE.Camera,
  ): OpenPoseJSON {
    // Конвертируем 3D координаты в 2D
    const keypoints2d: number[] = [];

    for (let i = 0; i < 25; i++) {
      const joint = poseData[i as Body25Index];
      if (!joint) {
        // Если точки нет, добавляем нули
        keypoints2d.push(0, 0, 0);
        continue;
      }

      let x: number, y: number;
      
      if (camera) {
        // Используем камеру для проекции (квадратный холст JSON — упрощение)
        const projected = this.projectTo2D(joint, camera, resolution, resolution);
        if (!projected) {
          keypoints2d.push(0, 0, 0);
          continue;
        }
        [x, y] = projected;
      } else {
        // Fallback: проекция на плоскость XY (вид спереди)
        x = (joint.x + 1) * 0.5 * resolution;
        y = (1 - (joint.y / 2)) * resolution;
      }

      const confidence = joint.confidence ?? 1;

      keypoints2d.push(
        Math.round(x * 100) / 100,
        Math.round(y * 100) / 100,
        confidence
      );
    }

    return {
      version: 1.3,
      people: [{
        pose_keypoints_2d: keypoints2d,
      }],
    };
  }

  /**
   * Экспорт в строку JSON
   */
  static exportToJSONString(poseData: PoseData, camera?: THREE.Camera, resolution?: number): string {
    const data = this.exportToOpenPoseJSON(poseData, resolution, camera);
    return JSON.stringify(data, null, 2);
  }

  static exportToBody25Format(poseData: PoseData): number[] {
    const result: number[] = [];
    for (let i = 0; i < 25; i++) {
      const joint = poseData[i as Body25Index];
      if (!joint) {
        result.push(0, 0, 0);
      } else {
        result.push(joint.x, joint.y, joint.confidence ?? 1);
      }
    }
    return result;
  }

  /**
   * Скачать JSON файл
   */
  static downloadJSON(poseData: PoseData, filename: string = 'pose.json', camera?: THREE.Camera, resolution?: number): void {
    try {
      exportLogger.info(`Downloading JSON: ${filename}`, { camera: !!camera, resolution });
      
      if (!camera) {
        exportLogger.warn('No camera provided, using default front projection');
      }
      
      const jsonString = this.exportToJSONString(poseData, camera, resolution);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportLogger.info('JSON download initiated successfully');
    } catch (error) {
      errorLogger.error('Failed to download JSON', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        filename,
      });
      throw error;
    }
  }

  /**
   * Экспорт в PNG (рендеринг скелета на Canvas)
   * Чёрный фон, цветные точки и линии.
   * `size` — число (квадрат) или { width, height } в пикселях; с камерой высота/ширина
   * должны повторять aspect WebGL viewport, иначе проекция не совпадёт с экраном.
   */
  static async exportToPNG(
    poseData: PoseData,
    size: number | { width: number; height: number } = 512,
    camera?: THREE.Camera,
  ): Promise<string> {
    const canvasWidth = typeof size === 'number' ? size : size.width;
    const canvasHeight = typeof size === 'number' ? size : size.height;

    // Создаём canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Чёрный фон
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Сначала вычисляем bounding box всех точек для правильного масштабирования
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < 25; i++) {
      const joint = poseData[i as Body25Index];
      if (!joint) continue;
      if (joint.x < minX) minX = joint.x;
      if (joint.x > maxX) maxX = joint.x;
      if (joint.y < minY) minY = joint.y;
      if (joint.y > maxY) maxY = joint.y;
    }

    // Добавляем отступы 10%
    const paddingX = (maxX - minX) * 0.1 || 0.2;
    const paddingY = (maxY - minY) * 0.1 || 0.2;
    minX -= paddingX;
    maxX += paddingX;
    minY -= paddingY;
    maxY += paddingY;

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const scale = Math.min(canvasWidth / rangeX, canvasHeight / rangeY) * 0.9;

    /**
     * С камерой: только перспективная проекция (без bbox-fallback).
     * Иначе точки вне кадра получали бы координаты из другой системы — «ломаный» скелет.
     * Без камеры: ортографическая подгонка по bbox (как раньше).
     */
    const projectJointCamera = (joint: JointPosition): [number, number] | null => {
      if (!camera) return null;
      try {
        return this.projectTo2D(joint, camera, canvasWidth, canvasHeight);
      } catch (error) {
        exportLogger.error('projectTo2D threw an error', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const projectJointBbox = (joint: JointPosition): [number, number] => {
      const x = (joint.x - minX) * scale + (canvasWidth - rangeX * scale) / 2;
      const y = canvasHeight - ((joint.y - minY) * scale + (canvasHeight - rangeY * scale) / 2);
      return [x, y];
    };

    const clipMaxX = canvasWidth - 1e-6;
    const clipMaxY = canvasHeight - 1e-6;

    // Рисуем линии (кости)
    ctx.lineWidth = Math.max(2, Math.min(canvasWidth, canvasHeight) / 256);
    ctx.lineCap = 'round';

    let linesDrawn = 0;
    for (const connection of BODY25_CONNECTIONS) {
      const fromJoint = poseData[connection.from];
      const toJoint = poseData[connection.to];

      if (!fromJoint || !toJoint) continue;

      let x1: number, y1: number, x2: number, y2: number;

      if (camera) {
        const a = projectJointCamera(fromJoint);
        const b = projectJointCamera(toJoint);
        if (!a || !b) continue;
        [x1, y1] = a;
        [x2, y2] = b;
        const clipped = clipLineToRect(x1, y1, x2, y2, 0, 0, clipMaxX, clipMaxY);
        if (!clipped) continue;
        [x1, y1, x2, y2] = clipped;
      } else {
        [x1, y1] = projectJointBbox(fromJoint);
        [x2, y2] = projectJointBbox(toJoint);
      }

      ctx.strokeStyle = connection.color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      linesDrawn++;
    }

    exportLogger.info(`Lines drawn: ${linesDrawn}`);

    // Рисуем точки (суставы)
    const jointRadius = Math.max(3, Math.min(canvasWidth, canvasHeight) / 128);
    let jointsDrawn = 0;

    for (let i = 0; i < 25; i++) {
      const joint = poseData[i as Body25Index];
      if (!joint) continue;

      let x: number;
      let y: number;
      if (camera) {
        const p = projectJointCamera(joint);
        if (!p) continue;
        [x, y] = p;
        if (x < 0 || x > clipMaxX || y < 0 || y > clipMaxY) continue;
      } else {
        [x, y] = projectJointBbox(joint);
      }

      // Цвет точки из метаданных ключевых точек
      const keypoint = KEYPOINT_MAP.get(i as Body25Index);
      ctx.fillStyle = keypoint?.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, jointRadius, 0, Math.PI * 2);
      ctx.fill();
      jointsDrawn++;
    }

    exportLogger.info(`Joints drawn: ${jointsDrawn}`);

    // Возвращаем как data URL
    return canvas.toDataURL('image/png');
  }

  /**
   * Скачать PNG файл
   */
  static async downloadPNG(
    poseData: PoseData,
    filename: string = 'pose.png',
    camera?: THREE.Camera,
    resolution?: number,
  ): Promise<void> {
    try {
      exportLogger.info(`Downloading PNG: ${filename}`, { camera: !!camera, resolution });
      
      if (!camera) {
        exportLogger.warn('No camera provided, using default front projection');
      }
      
      const dataUrl = await this.exportToPNG(poseData, resolution, camera);

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      exportLogger.info('PNG download initiated successfully');
    } catch (error) {
      errorLogger.error('Failed to download PNG', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        filename,
      });
      throw error;
    }
  }

  /**
   * Скачать PNG с crop по рамке: рендер в том же aspect, что viewport, затем вырезка 2D —
   * совпадает с тем, что видно под синей рамкой (без виртуальной камеры).
   */
  static async downloadPNGWithCrop(
    poseData: PoseData,
    camera: THREE.Camera,
    frameData: {
      x: number;
      y: number;
      width: number;
      height: number;
      pixelAspectRatio?: number;
      viewportWidth: number;
      viewportHeight: number;
    },
    resolution: number,
    filename: string = 'pose_cropped.png',
  ): Promise<void> {
    try {
      const pixelAR = frameData.pixelAspectRatio || 1.0;
      const targetWidth = Math.round(resolution * pixelAR);
      const targetHeight = resolution;

      const vw = frameData.viewportWidth;
      const vh = frameData.viewportHeight;
      if (!(vw > 0 && vh > 0)) {
        throw new Error('viewportWidth/viewportHeight required for aligned crop export');
      }

      // Масштаб так, чтобы область рамки в пикселях ≥ целевого размера (потом drawImage ужмет)
      const upscale = Math.max(
        targetWidth / Math.max(frameData.width * vw, 1e-6),
        targetHeight / Math.max(frameData.height * vh, 1e-6),
        1,
      );
      const renderW = Math.max(1, Math.ceil(vw * upscale));
      const renderH = Math.max(1, Math.ceil(vh * upscale));

      exportLogger.info('Crop export (viewport-aligned)', {
        targetWidth,
        targetHeight,
        renderW,
        renderH,
        frame: { x: frameData.x, y: frameData.y, w: frameData.width, h: frameData.height },
      });

      const dataUrl = await this.exportToPNG(
        poseData,
        { width: renderW, height: renderH },
        camera,
      );

      const finalDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const sx = Math.round(frameData.x * renderW);
          const sy = Math.round(frameData.y * renderH);
          const sw = Math.max(1, Math.round(frameData.width * renderW));
          const sh = Math.max(1, Math.round(frameData.height * renderH));

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = targetWidth;
          cropCanvas.height = targetHeight;
          const ctx = cropCanvas.getContext('2d')!;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
          resolve(cropCanvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load rendered PNG'));
        img.src = dataUrl;
      });

      const a = document.createElement('a');
      a.href = finalDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      exportLogger.info('Cropped PNG exported', { resolution: `${targetWidth}x${targetHeight}` });
    } catch (error) {
      errorLogger.error('Failed to download cropped PNG', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        filename,
      });
      throw error;
    }
  }
}
