# Reference Pose Manifest

Created: 2026-05-06.

This manifest records the current user-supplied image set. Do not rename source files casually:
the original names are useful user context, even when they are informal.

## Current Images

| File | Initial group | Intended use |
| --- | --- | --- |
| `arabesque1.jpg` | Ballet / arabesque | Hip extension, standing balance, raised rear leg. |
| `arabesque2.jpg` | Ballet / arabesque | Hip extension and torso/leg line variation. |
| `arabesque3.webp` | Ballet / arabesque | Additional arabesque reference. |
| `Attitude1.jpg` | Ballet / attitude | Hip extension with bent knee. |
| `attitude2.png` | Ballet / attitude | Hip extension with bent knee; likely useful for knee orientation. |
| `attitude3.jpg` | Ballet / attitude | Additional attitude reference. |
| `Hands-over-head1.png` | Arms / overhead | Shoulder range and torso/head alignment. |
| `Hands-over-head2.png` | Arms / overhead | Larger overhead-arm reference. |
| `happy_baby_from_above.jpg` | Supine / happy baby | Deep hip flexion, abduction, bent knees; top-view cue. |
| `Happy_baby_front.jpg` | Supine / happy baby | Deep hip flexion and abduction; front-view cue. |
| `happy_baby_third_quarter.jpg` | Supine / happy baby | Deep hip flexion; three-quarter cue. |
| `lotos1.jpg` | Seated / lotus | Hip external rotation and knee fold. |
| `lotos2.png` | Seated / lotus | Lotus variation. |
| `lotos3-side.jpg` | Seated / lotus | Side-view lotus cue. |
| `lotos4-back.png` | Seated / lotus | Back-view lotus cue. |
| `retire.jpg` | Ballet / retire | Hip turnout and knee-side position. |
| `Seated pose with one leg bent.png` | Seated pose | Asymmetric hip/knee flexion reference. |
| `Side-sitting.png` | Seated / side sitting | Hip rotation, knee fold, side-sitting constraints. |
| `sleep-baby1.jpg` | Baby / sleep | Natural relaxed limb fold. |
| `sleep-baby2.jpg` | Baby / sleep | Natural relaxed limb fold variation. |

## Near-Term Scenario Candidates

1. Deep front hip flexion / knees toward belly:
   - `happy_baby_from_above.jpg`
   - `Happy_baby_front.jpg`
   - `happy_baby_third_quarter.jpg`

2. Hip extension with controlled knee orientation:
   - `arabesque1.jpg`
   - `arabesque2.jpg`
   - `arabesque3.webp`
   - `Attitude1.jpg`
   - `attitude2.png`
   - `attitude3.jpg`

3. Hip external rotation and seated folding:
   - `lotos1.jpg`
   - `lotos2.png`
   - `lotos3-side.jpg`
   - `lotos4-back.png`
   - `Side-sitting.png`
   - `Seated pose with one leg bent.png`

4. Shoulder/arm reference for later arm-limit work:
   - `Hands-over-head1.png`
   - `Hands-over-head2.png`

5. Relaxed anatomical folds:
   - `sleep-baby1.jpg`
   - `sleep-baby2.jpg`

## Notes

- Treat all images as orientation references, not exact targets.
- Prefer extracting a small number of repeatable PoseFlow scenarios from each group.
- When a scenario becomes important, add a separate scenario entry with expected joints, controller path, and pass/fail criteria.
