import { Camera, Quaternion, Vector2, Vector3 } from 'three';

export interface RootTransform {
  rootPosition: Vector3;
  rootRotation: Quaternion;
}

export interface ScreenViewport {
  width: number;
  height: number;
}

export function skeletonPointToWorld(point: Vector3, transform: RootTransform): Vector3 {
  return point.clone()
    .applyQuaternion(transform.rootRotation)
    .add(transform.rootPosition);
}

export function worldPointToSkeleton(point: Vector3, transform: RootTransform): Vector3 {
  return point.clone()
    .sub(transform.rootPosition)
    .applyQuaternion(transform.rootRotation.clone().invert());
}

export function skeletonDirToWorld(direction: Vector3, transform: RootTransform): Vector3 {
  return direction.clone().applyQuaternion(transform.rootRotation);
}

export function worldDirToSkeleton(direction: Vector3, transform: RootTransform): Vector3 {
  return direction.clone().applyQuaternion(transform.rootRotation.clone().invert());
}

export function skeletonQuatToWorld(rotation: Quaternion, transform: RootTransform): Quaternion {
  return transform.rootRotation.clone().multiply(rotation);
}

export function worldQuatToSkeleton(rotation: Quaternion, transform: RootTransform): Quaternion {
  return transform.rootRotation.clone().invert().multiply(rotation);
}

export function projectWorldPointToScreen(
  point: Vector3,
  camera: Camera,
  viewport: ScreenViewport,
): Vector2 {
  const ndc = point.clone().project(camera);
  return new Vector2(
    (ndc.x * 0.5 + 0.5) * viewport.width,
    (-ndc.y * 0.5 + 0.5) * viewport.height,
  );
}

export function projectWorldDirectionToScreen(
  origin: Vector3,
  direction: Vector3,
  camera: Camera,
  viewport: ScreenViewport,
  sampleLength = 1,
): Vector2 {
  const dir = direction.clone();
  if (dir.lengthSq() < 1e-12) return new Vector2(0, 0);

  const start = projectWorldPointToScreen(origin, camera, viewport);
  const end = projectWorldPointToScreen(
    origin.clone().add(dir.normalize().multiplyScalar(sampleLength)),
    camera,
    viewport,
  );
  return end.sub(start);
}

export function screenDragAlongWorldDirection(
  screenDelta: Vector2,
  origin: Vector3,
  direction: Vector3,
  camera: Camera,
  viewport: ScreenViewport,
): number {
  const projected = projectWorldDirectionToScreen(origin, direction, camera, viewport);
  if (projected.lengthSq() < 1e-12) return 0;
  return screenDelta.dot(projected.normalize());
}

export function screenDragAlongSkeletonDirection(
  screenDelta: Vector2,
  skeletonOrigin: Vector3,
  skeletonDirection: Vector3,
  transform: RootTransform,
  camera: Camera,
  viewport: ScreenViewport,
): number {
  return screenDragAlongWorldDirection(
    screenDelta,
    skeletonPointToWorld(skeletonOrigin, transform),
    skeletonDirToWorld(skeletonDirection, transform),
    camera,
    viewport,
  );
}
