# Arm natural limits implementation

## Goal

Add natural arm limits in small, testable layers so wrist IK, shoulder FK, and elbow twist cannot create anatomically impossible arm poses.

## Current-State Probe

- `git status --short`: clean at task start.
- Latest commit: `22b678b feat: polish viewport tools and gizmo testing`.
- Relevant docs:
  - `PLAN.md`: `Future — Arm natural limits`.
  - `STATUS.md`: `Session note 2026-05-04 / Arm limits planning`.
  - `ai/tasks/arm-natural-limits-research.md`.
- Relevant code:
  - `poseflow/src/lib/rig/armIK.ts`
  - `poseflow/src/lib/rig/shoulderFK.ts`
  - `poseflow/src/services/RigService.ts`
  - `poseflow/src/lib/rig/legIK.ts` as stop-at-limit reference.

## Boundaries

In scope:

- Build pure math first in `poseflow/src/lib/rig/armLimits.ts`.
- Add unit tests for every new pure function.
- Integrate one limit layer at a time.
- Stop for manual checks before changing more controller behavior.

Out of scope for the first slice:

- Full hand controller.
- Mesh import / retargeting.
- Scene save/load.
- UI indicators for limit hits.

## Mechanical Contract

- Right/left are mannequin-relative.
- Right arm is BODY_25 `2-3-4`; left arm is `5-6-7`.
- Do not treat the arm as one clamp.
- Split:
  - shoulder girdle;
  - upper-arm direction;
  - upper-arm axial twist;
  - elbow flexion;
  - elbow swivel;
  - forearm axial twist.
- Use skeleton/mannequin-local coordinates for final checks.
- At a violated limit, keep the last valid pose; do not snap to a corrected pose.

## Implementation Order

1. Pure math: elbow flexion measurement and swing-twist decomposition. **Done.**
2. Wrist IK elbow flexion stop-at-limit. **Done.**
3. Upper-arm direction limits. **Done.**
4. Upper-arm axial twist limits for bones `2-3` / `5-6`. **Done.**
5. Forearm axial twist limits for bones `3-4` / `6-7`. **Done.**
6. Elbow twist checks. **Done.**
7. Shoulder FK compatibility checks. **Done.**

## Acceptance Criteria For First Slice

- `armLimits.ts` exists with pure functions only.
- Unit tests cover happy path and edge cases.
- Focused arm limits tests pass.

## Slice 1 Result

- Added `armLimits.ts` with elbow flexion measurement, angle normalization, swing-twist decomposition, axial twist checks, and arm IK stop-at-limit wrapper.
- `RigService.applyArmIK` now rejects candidate wrist IK chains that would bend the elbow past 150 degrees and keeps the last valid pose.
- Verification:
  - `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/armLimits.test.ts src/services/__tests__/RigService.stage4.test.ts`
  - `npm run typecheck`

## Manual Check Before Slice 2

- Drag a wrist toward the same-side shoulder until the elbow is strongly folded.
- Expected: movement stops near the natural end range; elbow/wrist do not jump or fold through the arm.
- Check both mannequin-right and mannequin-left arms.

## Slice 2 Result

- Added mannequin-relative upper-arm direction measurement in the shoulder local frame.
- `RigService.applyArmIK` passes the accumulated shoulder frame into the limit check, so the limit follows the skeleton instead of world axes.
- Current wide first-pass limits:
  - elevation: `-100..135` degrees;
  - forward/back: `-70..140` degrees.
- Verification:
  - `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/armLimits.test.ts src/services/__tests__/RigService.stage4.test.ts src/lib/rig/__tests__/shoulderFK.test.ts src/services/__tests__/RigService.stage4-2.test.ts`
  - `npm run typecheck`

## Manual Check Before Slice 3

- Drag each wrist with IK into extreme shoulder directions: far back, far up, across/forward.
- Expected: ordinary motion remains smooth; only clearly impossible shoulder directions stop at the last valid pose.
- Rotate the whole mannequin with the root gizmo and repeat one or two wrist drags.
- Expected: the limit behavior stays attached to the mannequin, not to world up/front.

## Slice 3 Result

- Added axial twist measurement for local rotations around the rest bone direction.
- Added checks for:
  - upper arm: BODY_25 `2-3` / `5-6`, stored on local rotations of joints `3` / `6`;
  - forearm: BODY_25 `3-4` / `6-7`, stored on local rotations of joints `4` / `7`.
- Current first-pass axial limits are `-90..90` degrees for both upper arm and forearm.
- `applyElbowTwist` now checks the candidate elbow position against the same upper-arm direction limits before applying it.
- Added a compatibility regression test: root rotation + shoulder FK + wrist IK still works, proving the check follows the mannequin frame.
- Verification:
  - `npx vitest run --config vitest.config.ts src/lib/rig/__tests__/armLimits.test.ts src/services/__tests__/RigService.stage4.test.ts src/lib/rig/__tests__/shoulderFK.test.ts src/services/__tests__/RigService.stage4-2.test.ts`
  - `npm run typecheck`

## Manual Check Before Documentation Update

- Bend an arm with wrist IK, then rotate the elbow gizmo around the shoulder-wrist axis.
- Expected: normal elbow swivel still works; if the elbow is pushed into an extreme shoulder direction, it stops instead of jumping.
- Repeat for both arms and after rotating the whole mannequin with the root gizmo.
