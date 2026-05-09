# CLAUDE.md

This file provides compact guidance for Claude Code when working in this repository. Keep it short; detailed references live in indexed docs.

## Project Overview

PoseFlow Editor is an offline desktop 3D pose editor for ControlNet / Stable Diffusion. It creates, edits, and exports human poses in OpenPose BODY_25 format.

Primary language: Russian for UI, docs, commit messages, and user communication.

## Fast Navigation

- Current status: `STATUS.md`
- Active unfinished work: `PLAN.md`
- Source module reference: `ai/docs/source-modules.md`
- Codebase map (DI, поток данных, параллельные механизмы): `ai/docs/codebase-map.md` — **актуализировать при структурных изменениях**
- Unit-test policy: `ai/docs/unit-testing.md`
- Feature task template: `ai/docs/feature-task-template.md`
- Controller/gizmo debug protocol: `ai/docs/controller-debug-protocol.md`
- Collaboration roles: `ai/docs/collaboration-roles.md`
- R3F/manual smoke checklist: `ai/docs/r3f-smoke-manual-checklist.md`
- Browser/Playwright calibration: `ai/docs/browser-use-poseflow-3d-calibration.md`, `ai/docs/playwright-poseflow-3d-smoke.md`
- ADR index: `ai/decisions/index.md`

## Documentation Indexes

Every documentation folder should contain an `index.md` with filename and a short description. Use these indexes first to avoid loading completed history into context.

Index purpose:

- `index.md` is the lightweight table of contents for a folder.
- `README.md` may remain for compatibility, but `index.md` is the preferred navigation entry.
- Archive folders must also have `index.md`; archived files are historical context, not active plans.
- Active docs should link to archives instead of copying long historical notes.

## Build And Run

All commands run from `poseflow/`:

```bash
npm install
npm run dev
npm run electron:dev
npm run backend
npm run typecheck
npm run lint:unused
npm run build
npm run verify
npm test
npx vitest run --config vitest.config.ts src/lib/solvers
```

## Architecture Summary

```text
React (Vite) <--IPC--> Electron <--HTTP--> Python FastAPI
```

Pose source of truth:

```text
React/R3F controllers
  -> RigService mutations
  -> SkeletonRig state
  -> resolveSkeleton()
  -> PoseData for rendering/export
```

`SkeletonRig` stores pose in mannequin/skeleton coordinates. `rootPosition` and `rootRotation` are the only mannequin transform relative to world space.

## Current Priority

After documentation cleanup, the next implementation work is the anatomical leg-model refactor. See `PLAN.md` and `ai/tasks/leg-limits-refinement-analysis.md`.

Do not continue fixing leg signs by trial and error. The next pass needs explicit `kneeAnterior`, true `kneeFlexion`, and tightly limited `tibiaAxialTwist`.

## Definition Of Done

Before every task:

1. Check `git status --short`.
2. Read `STATUS.md`, `PLAN.md`, and relevant indexed docs.
3. Inspect actual code files involved in the task.

For non-Lite feature tasks:

- create or update a short task brief using `ai/docs/feature-task-template.md`;
- keep non-trivial algorithms out of React components;
- add unit tests for new logic under `src/lib/` or `src/services/`;
- run appropriate technical checks;
- update `CHANGELOG.md` / `STATUS.md` for user-visible behavior changes.

For controller/gizmo changes:

- follow `ai/docs/controller-debug-protocol.md` for complex mechanics;
- write down pivot, rotation axis, motion plane, gizmo placement, affected joints/bones, mannequin side convention, and expected mouse direction before editing;
- right/left means the mannequin's side, not the camera-view side;
- avoid sign flipping by trial and error.

## Testing

Detailed rules: `ai/docs/unit-testing.md`.

Short version:

- pure logic and services need unit tests;
- React/R3F visuals are verified manually or with Playwright/Browser Use;
- run `npm run typecheck` and focused vitest checks for touched logic.

## Git Messages

Use prefixes:

- `feat:`
- `fix:`
- `test:`
- `docs:`
- `chore:`

Optional traceability trailer: `PLAN: ...` or task/ADR link.

## Model And Iteration Policy

Default to small completed steps. Avoid large rewrites in one session. Use higher-cost models only for complex architecture, large refactors, or broad code analysis.

For complex work, use the universal role flow from `ai/docs/collaboration-roles.md`: Architect -> Researcher -> Scenario Designer -> Engineer -> Tester -> Documenter.
