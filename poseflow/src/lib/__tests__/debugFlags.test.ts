import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isLegIKTraceEnabled,
  LEG_IK_TRACE_FLAG,
  setLegIKTraceEnabled,
} from '../debugFlags';

describe('debugFlags', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
      } as Storage,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists Leg IK trace flag through globalThis storage', () => {
    expect(isLegIKTraceEnabled()).toBe(false);

    setLegIKTraceEnabled(true);

    expect(store[LEG_IK_TRACE_FLAG]).toBe('true');
    expect(isLegIKTraceEnabled()).toBe(true);
  });

  it('removes Leg IK trace flag when disabled', () => {
    store[LEG_IK_TRACE_FLAG] = 'true';

    setLegIKTraceEnabled(false);

    expect(store[LEG_IK_TRACE_FLAG]).toBeUndefined();
    expect(isLegIKTraceEnabled()).toBe(false);
  });
});
