# Reference Pose Trial - Наклон вперед

Created: 2026-05-10.

## Goal

Create a first likeness-based BODY_25 preset from `наклон вперед.png`.

The target is visual readability: the pose should look like a standing forward
fold from the side, not match a measured clinical angle table.

## Reference

- `ai/reference-poses/images/наклон вперед.png`

## Current Slice

Add a BODY_25 preset named `Наклон вперед`:

- both feet stay on the floor;
- legs are straight-ish with a high pelvis;
- torso folds forward/down from the hips;
- hands reach near the floor in front of the feet;
- head follows the folded spine line.

Reviewer note from manual inspection: this first BODY_25-only preset reads as
spine/neck flexion because PoseData is loaded through inverseFK, which stores
`MID_HIP -> NECK` direction in the spine chain.

Follow-up slice: add a separate rig-native preset named
`Наклон от тазобедренных`:

- preserves the existing `Наклон вперед` preset unchanged for comparison;
- applies the fold through pelvis/root rotation and hip compensation;
- keeps `spineAngles` neutral;
- adds slight neck extension relative to the folded torso.

## Out Of Scope

- No new controller mechanics.
- No numeric joint-limit changes.
- No image-to-skeleton automation.
- No exact hand/finger matching because BODY_25 only has wrists for this area.

## Acceptance

- Preset appears in the sidebar list.
- Selecting it gives an immediately recognizable side-view standing forward fold.
- Manual adjustment remains possible with existing controllers.
- Unit test protects the coarse likeness anchors.

## Result

- Added `forward-fold` preset in `poseflow/src/lib/presets/body25-presets.ts`.
- Added `forward-fold-hip-hinge` rig-native preset in the same file.
- Added preset regression in
  `poseflow/src/lib/presets/__tests__/body25-presets.test.ts`.
- Added optional `PosePreset.createRig` / `PoseService.setRig` path so this
  preset does not round-trip through inverseFK.
- Checks passed: `npm run typecheck`, focused preset regression (6 tests),
  `npm run lint:unused`, `npm run build`.
- Manual viewport review URL: `http://127.0.0.1:5173`.
