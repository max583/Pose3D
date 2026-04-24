// src/lib/feature-flags/__tests__/registry.test.ts

import { describe, it, expect } from 'vitest';
import {
  FEATURE_FLAGS,
  getFlagDefinition,
  getAllFlagDefinitions,
  getFlagsByType,
  flagExists,
} from '../registry';

describe('Feature Flag Registry', () => {
  describe('FEATURE_FLAGS', () => {
    it('should contain all feature flags', () => {
      expect(Object.keys(FEATURE_FLAGS).length).toBeGreaterThan(0);
    });

    it('should have correct structure for each flag', () => {
      Object.values(FEATURE_FLAGS).forEach((flag) => {
        expect(flag).toHaveProperty('key');
        expect(flag).toHaveProperty('type');
        expect(flag).toHaveProperty('description');
        expect(flag).toHaveProperty('defaultValue');
        expect(typeof flag.key).toBe('string');
        expect(typeof flag.description).toBe('string');
        expect(typeof flag.defaultValue).toBe('boolean');
      });
    });

    it('should have USE_FIXED_LENGTHS flag', () => {
      expect(FEATURE_FLAGS.USE_FIXED_LENGTHS).toBeDefined();
      expect(FEATURE_FLAGS.USE_FIXED_LENGTHS.key).toBe('USE_FIXED_LENGTHS');
      expect(FEATURE_FLAGS.USE_FIXED_LENGTHS.type).toBe('release');
      expect(FEATURE_FLAGS.USE_FIXED_LENGTHS.defaultValue).toBe(false);
    });

    it('should have USE_DI_CONTAINER flag', () => {
      expect(FEATURE_FLAGS.USE_DI_CONTAINER).toBeDefined();
      expect(FEATURE_FLAGS.USE_DI_CONTAINER.key).toBe('USE_DI_CONTAINER');
      expect(FEATURE_FLAGS.USE_DI_CONTAINER.defaultValue).toBe(false);
    });

    it('should have dependencies defined correctly', () => {
      expect(FEATURE_FLAGS.USE_ZUSTAND_STORE.dependsOn).toContain('USE_DI_CONTAINER');
      expect(FEATURE_FLAGS.USE_RIGID_SKULL.dependsOn).toContain('USE_FIXED_LENGTHS');
    });

    it('should have experiment flags with rollout percentages', () => {
      expect(FEATURE_FLAGS.USE_MINI_VIEW.type).toBe('experiment');
      expect(FEATURE_FLAGS.USE_MINI_VIEW.rolloutPercentage).toBe(30);
      
      expect(FEATURE_FLAGS.USE_DIRECTION_B_MODE.type).toBe('experiment');
      expect(FEATURE_FLAGS.USE_DIRECTION_B_MODE.rolloutPercentage).toBe(20);
    });

    it('should have operational flags with dev defaults', () => {
      expect(FEATURE_FLAGS.ENABLE_DEBUG_OVERLAY.type).toBe('operational');
      // defaultValue зависит от import.meta.env.DEV, но мы можем проверить что это boolean
      expect(typeof FEATURE_FLAGS.ENABLE_DEBUG_OVERLAY.defaultValue).toBe('boolean');
    });
  });

  describe('getFlagDefinition', () => {
    it('should return flag definition for existing flag', () => {
      const definition = getFlagDefinition('USE_FIXED_LENGTHS');
      expect(definition).toBeDefined();
      expect(definition?.key).toBe('USE_FIXED_LENGTHS');
    });

    it('should return undefined for non-existent flag', () => {
      const definition = getFlagDefinition('NON_EXISTENT_FLAG');
      expect(definition).toBeUndefined();
    });
  });

  describe('getAllFlagDefinitions', () => {
    it('should return all flag definitions', () => {
      const definitions = getAllFlagDefinitions();
      expect(definitions.length).toBe(Object.keys(FEATURE_FLAGS).length);
      expect(definitions.every(def => def.key in FEATURE_FLAGS)).toBe(true);
    });
  });

  describe('getFlagsByType', () => {
    it('should return release flags', () => {
      const releaseFlags = getFlagsByType('release');
      expect(releaseFlags.length).toBeGreaterThan(0);
      expect(releaseFlags.every(flag => flag.type === 'release')).toBe(true);
    });

    it('should return experiment flags', () => {
      const experimentFlags = getFlagsByType('experiment');
      expect(experimentFlags.length).toBeGreaterThan(0);
      expect(experimentFlags.every(flag => flag.type === 'experiment')).toBe(true);
    });

    it('should return operational flags', () => {
      const operationalFlags = getFlagsByType('operational');
      expect(operationalFlags.length).toBeGreaterThan(0);
      expect(operationalFlags.every(flag => flag.type === 'operational')).toBe(true);
    });

    it('should return permission flags', () => {
      const permissionFlags = getFlagsByType('permission');
      expect(permissionFlags.length).toBeGreaterThan(0);
      expect(permissionFlags.every(flag => flag.type === 'permission')).toBe(true);
    });

    it('should return empty array for unknown type', () => {
      const unknownFlags = getFlagsByType('unknown');
      expect(unknownFlags).toEqual([]);
    });
  });

  describe('flagExists', () => {
    it('should return true for existing flag', () => {
      expect(flagExists('USE_FIXED_LENGTHS')).toBe(true);
      expect(flagExists('USE_DI_CONTAINER')).toBe(true);
    });

    it('should return false for non-existent flag', () => {
      expect(flagExists('NON_EXISTENT_FLAG')).toBe(false);
    });
  });
});