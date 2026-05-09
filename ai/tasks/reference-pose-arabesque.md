# Reference Pose Trial - Arabesque

Created: 2026-05-10.

## Goal

Try the reference-photo workflow on one pose family: arabesque.

The acceptance target is likeness, not exact anatomical measurement. The pose
should read as an arabesque in the viewport before any angle table or numeric
constraint work is added.

## References

- `ai/reference-poses/images/arabesque1.jpg`
- `ai/reference-poses/images/arabesque3.webp`
- `ai/reference-poses/images/arabesque2.jpg` is an extreme flexibility variant
  and is not the first baseline target.

## Current Slice

Add a BODY_25 preset named `Arabesque`:

- right leg is the supporting leg;
- left leg extends backward near hip height;
- torso inclines slightly forward;
- arms counterbalance along the forward/back axis;
- feet keep a readable ballet line.

## Out Of Scope

- No new controller mechanics.
- No numeric joint-limit changes.
- No attempt to match `arabesque2.jpg` yet.
- No image-to-skeleton automation.

## Acceptance

- Preset appears in the sidebar list.
- Selecting it gives an immediately recognizable side-view arabesque silhouette.
- Manual adjustment remains possible with existing controllers.
- Unit test protects the coarse likeness anchors.

## Result

- Added `arabesque` preset in `poseflow/src/lib/presets/body25-presets.ts`.
- Added preset regression in
  `poseflow/src/lib/presets/__tests__/body25-presets.test.ts`.
- Checks passed: `npm run typecheck`, focused preset regression, `npm run
  lint:unused`, `npm run build`.
- Manual viewport review URL: `http://127.0.0.1:5173`.
