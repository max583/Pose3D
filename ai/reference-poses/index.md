# Reference Poses Index

This folder stores visual pose references for building PoseFlow manual checks and regression scenarios.

Reference images are orientation aids, not mandatory exact targets. Use them to extract engineering checks:

- which joints are involved;
- what makes the pose natural or invalid;
- approximate hip/knee/ankle/torso/head relationships;
- which controller scenarios should reproduce or block the pose.

## Status

Active collection. The first user-supplied image batch was added on 2026-05-06.

Near-term purpose:

- collect live-model photo references for leg, arm, torso, head, and whole-body poses;
- use them to build a small release-1.0 reference pose table;
- revise existing built-in preset poses if the references show a better natural baseline.

## Folder Layout

| Path | Description |
| --- | --- |
| `images/` | Source visual references supplied by the user. |
| `manifest.md` | Inventory of current image files and first-pass grouping. |

## Suggested File Names

Use short descriptive ASCII names:

```text
leg-deep-front-flexion-01.jpg
leg-side-raise-01.png
seated-knee-to-chest-01.jpg
arm-overhead-reach-01.jpg
torso-twist-01.jpg
```

If there are multiple angles for one pose, keep the prefix and add the view:

```text
leg-deep-front-flexion-front-01.jpg
leg-deep-front-flexion-side-01.jpg
leg-deep-front-flexion-back-01.jpg
```

## Image Quality Notes

Preferred:

- JPG or PNG;
- clear full-body or relevant limb view;
- visible joints and limb outlines;
- neutral or tight clothing when possible;
- one pose per image;
- multiple angles for difficult 3D poses.

Avoid when possible:

- heavy perspective distortion;
- loose clothing hiding joints;
- cropped-off hips/knees/ankles for leg references;
- screenshots where the pose is too small to inspect.

## Usage Rule

Before implementing from a reference image, create a short scenario entry:

- image filename;
- target pose intent;
- key visible joint relationships;
- expected PoseFlow behavior;
- whether the check is manual-only or should become a unit/service regression.
