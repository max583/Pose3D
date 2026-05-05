# Unit Testing Policy

This file holds the detailed unit-test rules referenced by `CLAUDE.md` and `AGENTS.md`.

## Required Rule

Every new piece of non-trivial logic must ship with unit tests in the same change.

## What To Test

Test pure functions, algorithms, solver logic, data transformations, service-level state transitions, and anything in:

- `poseflow/src/lib/`
- `poseflow/src/services/`

At minimum cover:

- happy path;
- one likely edge case or regression case;
- no-op/invalid input when relevant.

## What Not To Unit Test

Do not unit-test React/R3F rendering details directly:

- Three.js scene rendering;
- hooks that depend on `useThree()`;
- visual-only component layout.

Verify these with manual checks or Playwright/Browser Use smoke tests.

## Test Location

Co-locate tests in `__tests__/` near the module under test.

Examples:

- `poseflow/src/lib/rig/legIK.ts`
- `poseflow/src/lib/rig/__tests__/legIK.test.ts`
- `poseflow/src/services/RigService.ts`
- `poseflow/src/services/__tests__/RigService.stage6.test.ts`

## Commands

Run from `poseflow/`:

```bash
npm test
npm run typecheck
npm run verify
```

Focused examples:

```bash
npx vitest run --config vitest.config.ts src/lib/rig/__tests__/legIK.test.ts
npx vitest run --config vitest.config.ts src/services/__tests__/RigService.stage6.test.ts
```

Optional cleanup:

```bash
npm run lint:unused
```

## Lite Exception

CSS tweaks, config constants, and single-line wrappers that delegate entirely to already-tested code may skip new unit tests. Manual verification still applies.
