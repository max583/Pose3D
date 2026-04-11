/**
 * Цветовые схемы 3D viewport (фон + сетка + базовое освещение).
 * `poseflow` — текущий вид (синяя сетка, фон от темы приложения).
 * `studio-neutral` — нейтральный серый студийный вид (как в референсе pose-редакторов).
 */

export type CanvasColorSchemeId = 'poseflow' | 'studio-neutral';

export interface CanvasSceneStyle {
  background: string;
  gridCellColor: string;
  gridSectionColor: string;
  gridCellThickness: number;
  gridSectionThickness: number;
  gridFadeDistance: number;
  ambientIntensity: number;
  pointMainIntensity: number;
  pointFillIntensity: number;
}

export function getCanvasSceneStyle(
  schemeId: CanvasColorSchemeId,
  appTheme: 'dark' | 'light',
): CanvasSceneStyle {
  if (schemeId === 'studio-neutral') {
    return {
      background: '#9a9a9a',
      gridCellColor: '#5a5a5a',
      gridSectionColor: '#353535',
      gridCellThickness: 0.55,
      gridSectionThickness: 1.05,
      gridFadeDistance: 42,
      ambientIntensity: 0.72,
      pointMainIntensity: 0.5,
      pointFillIntensity: 0.32,
    };
  }

  if (appTheme === 'light') {
    return {
      background: '#f4f5f7',
      gridCellColor: '#6b9bd6',
      gridSectionColor: '#7c6fd6',
      gridCellThickness: 0.5,
      gridSectionThickness: 1,
      gridFadeDistance: 28,
      ambientIntensity: 0.55,
      pointMainIntensity: 0.85,
      pointFillIntensity: 0.45,
    };
  }

  return {
    background: '#0a0a0a',
    gridCellColor: '#4a9eff',
    gridSectionColor: '#6a5aff',
    gridCellThickness: 0.5,
    gridSectionThickness: 1,
    gridFadeDistance: 25,
    ambientIntensity: 0.5,
    pointMainIntensity: 1,
    pointFillIntensity: 0.5,
  };
}

export const CANVAS_SCHEME_LABELS: Record<CanvasColorSchemeId, string> = {
  poseflow: 'PoseFlow (по теме приложения)',
  'studio-neutral': 'Студийный серый',
};
