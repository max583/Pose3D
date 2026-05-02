import { Vector3 } from 'three';

export interface JointMarkerInput {
  parent: Vector3;
  joint: Vector3;
  child: Vector3;
  fallbackDirection: Vector3;
}

export function getJointOutsideBendDirection({
  parent,
  joint,
  child,
  fallbackDirection,
}: JointMarkerInput): Vector3 {
  const parentToChild = child.clone().sub(parent);
  const parentToJoint = joint.clone().sub(parent);
  const parentToChildLengthSq = parentToChild.lengthSq();
  let direction = new Vector3();

  if (parentToChildLengthSq > 1e-8) {
    const t = Math.min(1, Math.max(0, parentToJoint.dot(parentToChild) / parentToChildLengthSq));
    const closestPointOnLimbAxis = parent.clone().add(parentToChild.multiplyScalar(t));
    direction = joint.clone().sub(closestPointOnLimbAxis);
  }

  if (direction.lengthSq() > 1e-8) {
    return direction.normalize();
  }

  if (fallbackDirection.lengthSq() > 1e-8) {
    return fallbackDirection.clone().normalize();
  }

  return new Vector3(0, 0, 1);
}
