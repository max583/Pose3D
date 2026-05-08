export const LEG_IK_TRACE_FLAG = 'poseflow-debug-leg-ik';

export function isLegIKTraceEnabled(): boolean {
  return getBooleanFlag(LEG_IK_TRACE_FLAG);
}

export function setLegIKTraceEnabled(enabled: boolean): void {
  setBooleanFlag(LEG_IK_TRACE_FLAG, enabled);
}

function getBooleanFlag(key: string): boolean {
  try {
    const storage = getStorage();
    return storage?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function setBooleanFlag(key: string, enabled: boolean): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    if (enabled) {
      storage.setItem(key, 'true');
    } else {
      storage.removeItem(key);
    }
  } catch {
    /* ignore unavailable storage */
  }
}

function getStorage(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.localStorage ?? null;
}
