import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera, Quaternion, Vector2, Vector3 } from 'three';
import {
  projectWorldDirectionToScreen,
  screenDragAlongSkeletonDirection,
  screenDragAlongWorldDirection,
  skeletonDirToWorld,
  skeletonPointToWorld,
  skeletonQuatToWorld,
  worldDirToSkeleton,
  worldPointToSkeleton,
  worldQuatToSkeleton,
} from '../coordinateFrames';

describe('coordinateFrames', () => {
  it('identity root transform leaves points, directions and rotations unchanged', () => {
    const transform = {
      rootPosition: new Vector3(0, 0, 0),
      rootRotation: new Quaternion(),
    };
    const point = new Vector3(1, 2, 3);
    const direction = new Vector3(0, 1, 0);
    const rotation = new Quaternion().setFromEuler(new Euler(0.2, 0.3, 0.4));

    expectVectorClose(skeletonPointToWorld(point, transform), point);
    expectVectorClose(worldPointToSkeleton(point, transform), point);
    expectVectorClose(skeletonDirToWorld(direction, transform), direction);
    expectVectorClose(worldDirToSkeleton(direction, transform), direction);
    expectQuatClose(skeletonQuatToWorld(rotation, transform), rotation);
    expectQuatClose(worldQuatToSkeleton(rotation, transform), rotation);
  });

  it('round-trips through translated and rotated root transform', () => {
    const transform = {
      rootPosition: new Vector3(3, -2, 5),
      rootRotation: new Quaternion().setFromEuler(new Euler(0.4, Math.PI, -0.2)),
    };
    const skeletonPoint = new Vector3(0.25, 1.5, -0.75);
    const skeletonDirection = new Vector3(1, 2, 3).normalize();
    const skeletonRotation = new Quaternion().setFromEuler(new Euler(-0.3, 0.6, 0.1));

    const worldPoint = skeletonPointToWorld(skeletonPoint, transform);
    const worldDirection = skeletonDirToWorld(skeletonDirection, transform);
    const worldRotation = skeletonQuatToWorld(skeletonRotation, transform);

    expectVectorClose(worldPointToSkeleton(worldPoint, transform), skeletonPoint);
    expectVectorClose(worldDirToSkeleton(worldDirection, transform), skeletonDirection);
    expectQuatClose(worldQuatToSkeleton(worldRotation, transform), skeletonRotation);
  });

  it('handles upside-down mannequin root rotation without changing skeleton-local point', () => {
    const transform = {
      rootPosition: new Vector3(-1, 4, 2),
      rootRotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI),
    };
    const headLocalPoint = new Vector3(0, 1.6, 0.1);

    const worldPoint = skeletonPointToWorld(headLocalPoint, transform);

    expect(worldPoint.y).toBeLessThan(transform.rootPosition.y);
    expectVectorClose(worldPointToSkeleton(worldPoint, transform), headLocalPoint);
  });

  it('does not apply root translation to directions', () => {
    const transform = {
      rootPosition: new Vector3(100, 200, 300),
      rootRotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
    };
    const direction = new Vector3(0, 0, 1);

    const worldDirection = skeletonDirToWorld(direction, transform);

    expect(worldDirection.length()).toBeCloseTo(direction.length(), 5);
    expectVectorClose(worldDirToSkeleton(worldDirection, transform), direction);
  });

  it('projects world direction to screen drag sign', () => {
    const camera = createTestCamera();
    const viewport = { width: 1000, height: 1000 };
    const origin = new Vector3(0, 0, 0);

    const xProjection = projectWorldDirectionToScreen(
      origin,
      new Vector3(1, 0, 0),
      camera,
      viewport,
    );
    const yProjection = projectWorldDirectionToScreen(
      origin,
      new Vector3(0, 1, 0),
      camera,
      viewport,
    );

    expect(xProjection.x).toBeGreaterThan(0);
    expect(Math.abs(xProjection.y)).toBeLessThan(0.001);
    expect(yProjection.y).toBeLessThan(0);
    expect(Math.abs(yProjection.x)).toBeLessThan(0.001);
    expect(screenDragAlongWorldDirection(new Vector2(10, 0), origin, new Vector3(1, 0, 0), camera, viewport))
      .toBeGreaterThan(0);
    expect(screenDragAlongWorldDirection(new Vector2(0, -10), origin, new Vector3(0, 1, 0), camera, viewport))
      .toBeGreaterThan(0);
  });

  it('projects skeleton direction through upside-down root transform', () => {
    const camera = createTestCamera();
    const viewport = { width: 1000, height: 1000 };
    const transform = {
      rootPosition: new Vector3(0, 0, 0),
      rootRotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI),
    };

    const drag = screenDragAlongSkeletonDirection(
      new Vector2(0, 10),
      new Vector3(0, 0, 0),
      new Vector3(0, 1, 0),
      transform,
      camera,
      viewport,
    );

    expect(drag).toBeGreaterThan(0);
  });

  it('returns zero when a direction has no visible screen projection', () => {
    const camera = createTestCamera();
    const viewport = { width: 1000, height: 1000 };

    const drag = screenDragAlongWorldDirection(
      new Vector2(10, 0),
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 1),
      camera,
      viewport,
    );

    expect(drag).toBeCloseTo(0, 5);
  });
});

function createTestCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function expectVectorClose(actual: Vector3, expected: Vector3): void {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
  expect(actual.z).toBeCloseTo(expected.z, 5);
}

function expectQuatClose(actual: Quaternion, expected: Quaternion): void {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
  expect(actual.z).toBeCloseTo(expected.z, 5);
  expect(actual.w).toBeCloseTo(expected.w, 5);
}
