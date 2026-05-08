# Controller Debug Protocol

Use this protocol for complex controller, gizmo, IK, FK, and anatomical-limit work.
The goal is to reduce sign-flipping iterations and make every correction traceable.

## When To Use

Use this protocol when a change affects:

- 3D gizmo placement or mouse direction;
- IK/FK math;
- anatomical joint limits;
- mannequin/world coordinate conversion;
- behavior that depends on camera angle, root rotation, or mannequin side.

Small UI-only changes do not need the full protocol.

## Protocol

1. Describe the motion model before editing.

Write down, in the task brief or working notes:

- affected joint, bones, and BODY_25 nodes;
- pivot point;
- rotation axis;
- motion plane;
- coordinate frame: mannequin/skeleton frame or world frame;
- side convention: right/left always means the mannequin's side;
- expected mouse behavior from key view directions.

2. Define reference poses.

For each non-trivial mechanic, define 3-5 concrete manual checks before changing code.
Prefer stable checks that can be repeated later:

- normal upright mannequin;
- root-rotated mannequin;
- front/back view;
- side view;
- an extreme but anatomical pose;
- a blocked invalid pose.

For leg/arm anatomy, include at least one valid deep-flexion pose and one invalid twist/backward-bend pose.

3. Add or update a focused regression test first when logic is testable.

Before the main fix, create a failing or expectation-locking test for pure logic or `RigService`.
Do not rely only on viewport testing when the behavior can be expressed as vectors, angles, or joint positions.

4. Implement one slice.

Keep the first implementation slice narrow:

- move math into `src/lib/` or service helpers, not React components;
- avoid trial sign flips;
- prefer named helper functions for frame conversion, axis selection, and angle measurement;
- keep temporary heuristics clearly isolated and remove them once the cleaner model replaces them.

5. Verify technically.

Run focused tests for touched logic and `npm run typecheck` when TypeScript behavior changed.
Record the exact checks in the task brief or status if the work remains active.

6. Verify manually with the user.

Ask the user to check one scenario at a time.
Each check should say:

- which gizmo or node to use;
- from which view direction;
- what mouse movement to try;
- what result should happen.

If the check fails, update the model before editing again. Do not patch signs by guessing.

7. Record the outcome.

When the slice is accepted, update active docs with:

- what was changed;
- which reference poses passed;
- known residual risks;
- next concrete step.

If the slice is not accepted, mark it as experimental and document the next preferred direction.

## Release 1.0 Reference Pose Table

Maintain a small table of repeatable manual poses for the release-1.0 path.
The table should grow slowly and only include poses that catch real regressions.

Initial candidates:

- upright neutral mannequin;
- root rotated and tilted mannequin;
- neck/head pitch, yaw, and roll in upright and root-rotated positions;
- shoulder shrug and shoulder forward/back movement;
- elbow flexion and elbow axial gizmo;
- ankle IK with knee facing forward;
- deep hip flexion: knees toward belly;
- invalid backward knee blocked;
- foot pitch/yaw/roll from toe and heel views;
- pelvis/root F11 focus-mode viewport recovery.

## Interaction Rule

For complex mechanics, switch from "fix behavior" to:

```text
model -> reference poses -> red/focused test -> one code slice -> focused checks -> manual scenario
```

For role sequencing and agent usage, see `ai/docs/collaboration-roles.md`.
