// diagnostic.ts - Проверка импортов
console.log('[DIAGNOSTIC] Starting import checks...');

try {
  console.log('[DIAGNOSTIC] Testing body25-types import...');
  const types = import('./lib/body25/body25-types');
  console.log('[DIAGNOSTIC] body25-types OK');
} catch (e) {
  console.error('[DIAGNOSTIC] body25-types FAILED:', e);
}

try {
  console.log('[DIAGNOSTIC] Testing logger import...');
  const logger = import('./lib/logger');
  console.log('[DIAGNOSTIC] logger OK');
} catch (e) {
  console.error('[DIAGNOSTIC] logger FAILED:', e);
}

try {
  console.log('[DIAGNOSTIC] Testing PoseService import...');
  const pose = import('./services/PoseService');
  console.log('[DIAGNOSTIC] PoseService OK');
} catch (e) {
  console.error('[DIAGNOSTIC] PoseService FAILED:', e);
}

try {
  console.log('[DIAGNOSTIC] Testing useTransformDrag import...');
  const drag = import('./hooks/useTransformDrag');
  console.log('[DIAGNOSTIC] useTransformDrag OK');
} catch (e) {
  console.error('[DIAGNOSTIC] useTransformDrag FAILED:', e);
}

console.log('[DIAGNOSTIC] Import checks complete.');
