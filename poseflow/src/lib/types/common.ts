// src/lib/types/common.ts
// Общие типы данных для сервисов

import { Vector3 } from 'three';

export type Body25Index = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;

export interface JointPosition {
  x: number;
  y: number;
  z: number;
}

export type PoseData = Record<Body25Index, JointPosition>;

export type ManipulationMode = 'fk' | 'ik';

export interface CameraState {
  position: Vector3;
  target: Vector3;
  fov: number;
}

export interface ExportOptions {
  format: 'png' | 'json';
  quality?: number;
  includeMetadata?: boolean;
  timestamp?: boolean;
}

export interface UserContext {
  userId: string;
  role?: 'admin' | 'user' | 'guest';
  permissions?: string[];
}

export interface FeatureFlagState {
  key: string;
  enabled: boolean;
  activatedForUser: boolean;
  rolloutPercentage?: number;
  canaryUsers?: string[];
  dependsOn?: string[];
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export type ServiceResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ServiceError };