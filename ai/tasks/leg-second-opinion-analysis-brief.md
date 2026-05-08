# Leg model second-opinion analysis brief

## Context

Repository: `D:\ai\QwenCoder`

Current fixed checkpoint: commit `08773a9` (`chore: зафиксировать текущее состояние ног`).

PoseFlow Editor is an offline desktop 3D pose editor for ControlNet / Stable Diffusion. It creates, edits, and exports human poses in OpenPose BODY_25 format.

Primary language for UI, docs, commits, and user communication is Russian.

Current disputed area: anatomical leg model, ankle IK, knee behavior, and hip limits.

## Read First

1. `AGENTS.md`
2. `STATUS.md`
3. `PLAN.md`
4. `ai/tasks/leg-limits-refinement-analysis.md`
5. `ai/tasks/leg-hierarchical-solver-design.md`
6. `ai/docs/controller-debug-protocol.md`

## Key Code

- `poseflow/src/lib/rig/legIK.ts`
- `poseflow/src/lib/rig/legAnatomy.ts`
- `poseflow/src/lib/rig/legHip.ts`
- `poseflow/src/lib/rig/legLimits.ts`
- `poseflow/src/services/RigService.ts`

## Key Tests

- `poseflow/src/lib/rig/__tests__/legIK.test.ts`
- `poseflow/src/lib/rig/__tests__/legAnatomy.test.ts`
- `poseflow/src/lib/rig/__tests__/legHip.test.ts`
- `poseflow/src/lib/rig/__tests__/legLimits.test.ts`
- `poseflow/src/services/__tests__/RigService.stage6.test.ts`

## Diagnostic Log

- `debug-logs/Прыжки при управлении за лодыжку вверх-вниз.txt`

## Problem

Current leg IK is partially fixed, but not manually accepted.

Observed or recently debugged failures:

- Ankle drag could make the knee jump to another IK branch.
- Some high-front poses returned `solver-null` or created user-visible sticking.
- Deep front hip flexion, such as a "knees to belly" / happy-baby pose, remains suspect.
- The next pass should not be another sign flip or threshold-tuning attempt.

The accepted direction in active docs is:

- Replace the current heuristic with a hip-first / hierarchical solver.
- Solve hip first in pelvis/mannequin frame.
- Solve knee second as hinge flexion plus patella/anterior validity.
- Solve ankle/reach last.
- Measure and tightly limit tibia axial twist explicitly.

## Current Implementation Notes

- `legAnatomy.ts` contains `kneeAnterior`, true knee flexion, tibia axial twist, and knee swivel helpers.
- `legHip.ts` contains the first hip-only layer. H1-H12 hip-only tests were added.
- `legIK.ts` partially connects the hip layer and still contains temporary bridge/fallback logic.
- Debug trace UI and log export exist.
- According to `STATUS.md`, latest focused checks passed, but manual validation has not accepted the model as final.

## Analysis Task

Perform an independent architecture and math review of the current leg model.

Do not start with code edits. First produce a diagnosis:

1. Where the current model is conceptually wrong or fragile.
2. Whether `legHip.ts`, `legAnatomy.ts`, and `legIK.ts` contradict each other.
3. Whether the following are currently defined and measured correctly:
   - pelvis/mannequin frame;
   - hip flexion/extension;
   - hip abduction/adduction;
   - knee anterior / patella side;
   - true knee flexion;
   - tibia axial twist;
   - branch continuity for small ankle drags.
4. Why jerk / branch switching occurs during ankle movement.
5. Why high-front poses cause sticking or `solver-null`.
6. Whether the current FABRIK/post-limit approach should remain as fallback or whether the solver contract should be replaced.
7. Which smallest next step gives the best chance of improving behavior without another trial-and-error cycle.

## Expected Output

- Short diagnosis.
- Specific suspicious files/functions.
- Proposed solver contract if the current one is flawed.
- Minimal implementation plan for one or two sessions.
- Tests to add or rewrite.
- Clearly separate "confident" from "hypothesis, needs verification".

## Constraints

- Do not suggest random sign flips or limit tweaks.
- Do not copy clinical ROM values directly into code constants without translating them into PoseFlow angle conventions.
- Right/left means mannequin side, not camera-view side.
- `rootRotation` must stay correct: limits are relative to the mannequin, not world axes.
- The side-escape regression must stay fixed: sideways movement must not create broken leg poses.

## Suggested Starting Point

Start with `poseflow/src/lib/rig/legIK.ts` and `debug-logs/Прыжки при управлении за лодыжку вверх-вниз.txt`.

The likely key question is the gap between "mathematically valid chain" and "continuous UI control".
