// src/lib/services/interfaces/IExportService.ts
// Интерфейс сервиса экспорта данных

import { PoseData } from '../../body25/body25-types';
import { Camera } from 'three';

export interface ExportOptions {
  format: 'png' | 'json';
  quality?: number;
  includeMetadata?: boolean;
  timestamp?: boolean;
  filename?: string;
  resolution?: number;
}

export interface IExportService {
  // ─── Экспорт в файлы ──────────────────────────────────────────────────────
  
  /** Экспортировать позу в PNG */
  exportToPNG(
    poseData: PoseData,
    size: number | { width: number; height: number },
    camera?: Camera
  ): Promise<string>;
  
  /** Экспортировать позу в JSON (OpenPose формат) */
  exportToJSON(
    poseData: PoseData,
    camera?: Camera,
    resolution?: number
  ): string;
  
  /** Скачать JSON файл */
  downloadJSON(
    poseData: PoseData,
    filename?: string,
    camera?: Camera,
    resolution?: number
  ): void;
  
  /** Экспортировать позу в BODY_25 формат (массив [x,y,c]...) */
  exportToBody25Format(poseData: PoseData): number[];
  
  /** Экспортировать в OpenPose JSON формат */
  exportToOpenPoseJSON(
    poseData: PoseData,
    resolution?: number,
    camera?: Camera
  ): any;
  
  /** Скачать PNG с кадрированием (для ExportFrame) */
  downloadPNGWithCrop?(
    poseData: PoseData,
    camera: Camera,
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
    filename?: string
  ): Promise<void>;
  
  // ─── Вспомогательные методы ───────────────────────────────────────────────
  
  /** Проецировать 3D точку в 2D через камеру */
  projectTo2D(
    joint: { x: number; y: number; z: number },
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number
  ): [number, number] | null;
  
  /** Сгенерировать имя файла на основе текущего времени */
  generateFilename(prefix?: string, extension?: string): string;
  
  /** Скачать blob как файл */
  downloadBlob(blob: Blob, filename: string): void;
  
  /** Копировать JSON в буфер обмена */
  copyToClipboard(json: string): Promise<boolean>;
  
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  
  /** Очистить ресурсы (опционально) */
  dispose?(): void;
}
