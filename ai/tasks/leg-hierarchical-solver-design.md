# Leg Hierarchical Solver Design

Status: draft, hip layer integrated into leg IK; knee layer designed (slice 1 not yet implemented).
Created: 2026-05-06.
Last updated: 2026-05-09 (knee-layer design extension: model, limits, K1–K14 scenarios, code shape, slice plan).

This document designs the replacement for the current heuristic leg IK. The new solver must be built
from the anatomy hierarchy:

```text
hip -> knee -> ankle/reach
```

Do not validate the hip model through ankle drag first. The hip must have its own model, checks, and
tests before knee and ankle behavior are layered on top.

## Current Problem

The current implementation starts from ankle target / FABRIK behavior and then tries to repair the
result with hip and knee constraints. This mixes three separate problems:

- what directions the femur may take from the hip socket;
- where the knee may fold and where the patella/anterior side should face;
- which ankle positions are reachable after the first two decisions are valid.

This makes deep front flexion hard to represent and encourages threshold tuning around symptoms.

## Coordinate Frame

All primary leg anatomy calculations must happen in the mannequin/pelvis frame, not world axes.

Derived axes:

- `pelvisUp`: mannequin up, from `rootRotation * (0, 1, 0)`;
- `pelvisForward`: mannequin front, from `rootRotation * (0, 0, 1)`;
- `pelvisRight`: `pelvisUp x pelvisForward`;
- `legOutward`: `pelvisRight` for right leg, `-pelvisRight` for left leg;
- `legDown`: `-pelvisUp`.

The solver may accept world-space points, but it should immediately convert vectors to this frame or
use equivalent dot products against these axes.

## Hip Joint Model

The hip is a ball-and-socket joint. For PoseFlow 1.0, model the femur direction first and treat
femur axial rotation as a separate later concern.

Primary hip state:

```text
HipPose {
  direction: normalized hip -> knee direction;
  flexion: signed sagittal angle, neutral down = 0;
  abduction: signed frontal/lateral angle, outward positive;
}
```

Interpretation:

- `flexion > 0`: thigh moves forward/up toward belly.
- `flexion < 0`: thigh moves backward into extension.
- `abduction > 0`: thigh moves outward away from body midline.
- `abduction < 0`: thigh moves inward across body.

First-pass limits:

| Movement | First-pass limit | Notes |
| --- | --- | --- |
| Hip flexion | up to 135-150 deg, with optional dancer/extreme allowance toward 160 deg | Needed for `happy baby`, knees-to-belly, and dance poses. |
| Hip extension | 20-30 deg | Needed for arabesque/attitude without forcing broken pelvis compensation. |
| Abduction | 45-60 deg normally, with optional extreme/dance allowance | Needed for happy baby and side raise. |
| Adduction | 25-35 deg | Should prevent crossing into impossible side-collapse. |

The limit surface should not be a rectangle. At high flexion, lateral motion may narrow or widen based
on the anatomical scenario:

- high front flexion plus moderate abduction must be allowed for happy baby;
- extreme high flexion plus extreme side escape should still be blocked;
- extension plus large abduction should be conservative unless a reference scenario justifies it.

Do not encode this as scattered `if targetHighFront` checks. Prefer one hip-limit function:

```text
limitHipPose(requestedHipPose, side) -> limitedHipPose + reason
```

## Hip-Only Validation

Before solving knee or ankle:

1. Build a requested femur direction from a target knee direction or controller input.
2. Convert it to `HipPose`.
3. Clamp it through `limitHipPose`.
4. Rebuild `hip -> knee` from the limited direction and thigh length.

This should be testable without an ankle point.

Expected hip-only checks:

- neutral down direction remains unchanged;
- front flexion to knees-to-belly range is allowed;
- impossible front-overhead direction clamps smoothly;
- backward extension clamps near the configured extension limit;
- outward abduction clamps to side limit;
- inward adduction clamps to inward limit;
- root-rotated mannequin produces the same pelvis-frame angles;
- right/left legs mirror correctly.

## Hip-Only Scenario Set

These scenarios are the first target for `legHip.ts` unit tests. They intentionally do not use the
ankle point.

Assume:

- `hip = (0, 0, 0)` in pelvis-local reasoning;
- `thighLength = 1` for pure geometry tests;
- neutral femur direction is `legDown`;
- right/left means mannequin side;
- tolerances may be around `0.5-1 deg`.

| ID | Scenario | Requested direction / pose | Expected result |
| --- | --- | --- | --- |
| H1 | Neutral standing thigh | `flexion = 0`, `abduction = 0` | Direction remains `legDown`; no clamp reason. |
| H2 | Deep front flexion | `flexion = 135 deg`, `abduction = 0` | Allowed. This is the minimum needed for knees-to-belly. |
| H3 | Extreme front flexion | `flexion = 175 deg`, `abduction = 0` | Clamps smoothly to configured front limit, likely 150-160 deg. |
| H4 | Happy-baby front/outward | `flexion = 120-140 deg`, `abduction = 35-50 deg` | Allowed or only lightly clamped; this must not be treated as side escape. |
| H5 | Impossible high-side escape | `flexion = 140-160 deg`, `abduction = 80-90 deg` | Clamps lateral component; should not create broken side-up leg pose. |
| H6 | Hip extension | `flexion = -20 deg`, `abduction = 0` | Allowed; supports arabesque/attitude baseline. |
| H7 | Extreme backward extension | `flexion = -60 deg`, `abduction = 0` | Clamps to extension limit, likely 20-30 deg. |
| H8 | Outward abduction | `flexion = 0`, `abduction = 50 deg` | Allowed or clamps near outward limit. |
| H9 | Extreme outward abduction | `flexion = 0`, `abduction = 90 deg` | Clamps to outward limit. |
| H10 | Inward adduction | `flexion = 0`, `abduction = -30 deg` | Allowed or clamps near inward limit. |
| H11 | Mirror right/left | Same numeric `flexion/abduction` for both sides | World/local directions mirror across pelvis midline; measured angles match. |
| H12 | Root-rotated mannequin | Apply arbitrary `rootRotation` to pelvis axes and requested direction | Measured pelvis-frame `HipPose` matches non-rotated case. |

First implementation should make H1-H12 pass before connecting ankle IK to the new layer.

## Manual Hip Reference Checks

Manual checks should be phrased as thigh/knee direction first, not ankle drag:

1. Neutral:
   - move or inspect the knee so the thigh points down from the hip;
   - expected: no limit hit, both sides symmetrical.

2. Knees toward belly:
   - reference family: `happy_baby_*`;
   - expected hip behavior: high front flexion is possible without using the ankle as proof.

3. Happy-baby side opening:
   - reference family: `happy_baby_*`;
   - expected hip behavior: front flexion plus outward opening is possible within a natural range.

4. Arabesque:
   - reference family: `arabesque*`;
   - expected hip behavior: backward extension reaches a useful dance/reference pose but clamps before impossible over-extension.

5. Side escape block:
   - no direct reference; this is a negative check based on the failed viewport case;
   - expected hip behavior: thigh cannot go into a high front-plus-side direction that would later force the knee/patella backward.

6. Root rotation:
   - rotate/tilt the whole mannequin;
   - expected hip behavior: the same local hip pose remains valid relative to the pelvis frame.

## First-Pass Limit Decision

Use one default range set for PoseFlow 1.0, not a separate user-facing dancer mode yet. The editor is
a pose tool and should support expressive references, but invalid collapses must still be blocked.

Recommended first-pass defaults:

| Limit | Default |
| --- | --- |
| `flexion.max` | `150 deg` |
| `extension.max` | `25 deg` |
| `abduction.max` | `55 deg` |
| `adduction.max` | `30 deg` |
| `highFlexionAbduction.max` | at least `45 deg` around `120-140 deg` flexion |
| `extremeHighSide.max` | clamp hard before `70-90 deg` abduction at high flexion |

These defaults are intentionally practical rather than medical-exact. If manual checks show dance
references need more range, adjust the limit surface in one named function instead of adding special
case signs in IK.

## Knee Layer Contract

Only after the hip layer is stable, solve the knee.

The knee layer receives a fixed hip direction and thigh length. It must decide:

- knee flexion/extension angle;
- patella / knee bend-plane direction;
- very limited tibia axial twist.

Important rule: knee validity must not change the already-approved hip direction except through an
explicit failure/no-op result. The knee layer is internal to the femur-fixed frame.

## Knee Joint Model

The knee is a hinge with very limited additional axial freedom. Primary state:

```text
KneePose {
  flexion:      unsigned hinge angle between thigh and tibia;
                // 0 = leg straight, > 0 = bent
  patellaAngle: signed angle around the femur axis;
                // 0 = bend plane is sagittal (patella faces pelvisForward);
                // positive = bend plane rotates outward by mannequin side
                //   (right leg positive = bend opens outward-right);
                // sign is normalized per side so both legs read the same value for the same anatomy
  tibiaTwist:   signed axial twist of the tibia around its own (knee->ankle) axis;
                // measured at the ankle joint's local rotation around the tibia rest direction;
                // anatomically only available when the knee is meaningfully bent
}
```

Knee frame derived from the femur direction (output of the hip layer):

- `femurAxis`: unit `hip -> knee`, fixed input.
- `kneeForward`: `pelvisForward` projected onto the plane perpendicular to `femurAxis`, normalized.
  Fallbacks if degenerate (`femurAxis ≈ ±pelvisForward`): try `pelvisRight` projected, then `pelvisUp` projected.
- `kneeSide`: `kneeForward × femurAxis` (right-handed; on rest pose with `femurAxis = legDown` and
  `kneeForward = pelvisForward`, this points to mannequin's right side).
- `kneeOutward`: per-leg signed outward direction. For the right leg `kneeOutward = +kneeSide`;
  for the left leg `kneeOutward = -kneeSide`. So a positive `patellaAngle` always means
  "patella rotates outward" in the leg's anatomy, regardless of side.

Patella direction and tibia direction:

```text
patellaDir = cos(patellaAngle) * kneeForward + sin(patellaAngle) * kneeOutward
tibiaDir   = cos(flexion) * femurAxis − sin(flexion) * patellaDir
```

Reasoning: at `flexion = 0` the tibia continues the femur (`tibiaDir = +femurAxis`).
At `flexion = π/2` the tibia points opposite to the patella (e.g., a standing knee bent 90° has
the heel going backward while the patella stays facing forward).
At `patellaAngle = 0` the patella faces `kneeForward ≈ pelvisForward`.

Tibia axial twist is a post-rotation around `tibiaDir`. It changes the foot orientation but not
the ankle position; therefore it does not affect ankle reachability and can be solved last.

This convention matches `measureKneeAnteriorAlignment` (existing helper): the dot product of
`patellaDir` against `pelvisForward` equals `cos(patellaAngle)` in the non-degenerate case where
`kneeForward ≈ pelvisForward`.

## Knee First-Pass Limits

| Movement | First-pass limit | Notes |
|---|---|---|
| `flexion.min` | 0° | No hyperextension. |
| `flexion.max` | 150° | Heel-to-butt natural fold. Current `LEG_ANATOMY_LIMITS.kneeFlexion.max` is 130°; raise to 150° as part of slice 2 after reference-set verification (do not raise in slice 1). |
| `patellaAngle.outward.max` (positive) | +45° | Natural Q-angle plus pose-style outward turnout. |
| `patellaAngle.inward.max` (negative) | −20° | Inward-facing patella is anatomically rare; very tight. |
| `tibiaTwist` at `flexion >= 30°` | ±15° | Matches current `LEG_ANATOMY_LIMITS.tibiaAxialTwist`. |
| `tibiaTwist` at `flexion < 10°` | ±3° | Knee locks near extension; twist must collapse. |
| `tibiaTwist` for `10° <= flexion < 30°` | linear interpolation between the two | Smooth transition. |

These defaults are practical, not medical-exact. Adjust the limit *surface* inside `limitKneePose`
rather than scattering signs/thresholds into the IK code path.

Existing helpers to reuse, do not duplicate:

- `measureTrueKneeFlexion` (`legAnatomy.ts`) — same as `flexion`.
- `measureTibiaAxialTwist` (`legAnatomy.ts`) — same as `tibiaTwist`, measured at the ankle joint.
- `measureUpperLegKneePlaneTwist` / `measureKneePlaneTwistDelta` (`legLimits.ts`) — these measure
  twist around the `hip -> ankle` axis, which is **not** the same as `patellaAngle` (which is around
  the femur axis). They remain useful for branch-continuity preservation during ankle drag, but
  `legKnee.ts` should expose `patellaAngle` as the canonical bend-plane parameter.

## Knee-Only Validation

Before connecting ankle/reach IK to the knee layer, verify the helpers in isolation:

1. Build a `KneePose` request directly from numeric `flexion`, `patellaAngle`, `tibiaTwist`.
2. Clamp it through `limitKneePose`.
3. Compute knee/ankle positions from `posFromKneePose(hipPos, femurDir, limitedPose, boneLengths)`.
4. Round-trip: `measureKneePose` on the resulting points must reproduce the limited input
   within tolerance.

Expected knee-only checks:

- straight pose round-trips to `flexion = 0`, no clamp;
- deep-fold pose stays under the configured `flexion.max` after clamp;
- excessive outward/inward `patellaAngle` clamps smoothly;
- tibia twist near full extension collapses to ~0 regardless of requested value;
- right/left mirror is symmetric in pelvis-frame parameters;
- root-rotated mannequin produces the same pelvis-frame `KneePose`.

## Knee-Only Scenario Set

Inputs assume:

- `hip = (0, 0, 0)` in pelvis-local reasoning;
- `thighLength = shinLength = 1`;
- pelvis frame from `pelvisUp = (0, 1, 0)`, `pelvisForward = (0, 0, 1)`;
- right leg unless noted;
- tolerances ~0.5–1 deg.

| ID | Scenario | Inputs (`flexion`, `patellaAngle`, `tibiaTwist`, `femurDir`) | Expected |
|---|---|---|---|
| K1 | Neutral straight | `0°, 0°, 0°, legDown` | `tibiaDir = legDown`; ankle directly below hip; no clamp. |
| K2 | Natural deep fold | `140°, 0°, 0°, legDown` | Allowed; ankle lifts toward hip inside the sagittal plane. |
| K3 | Hyperextension request | `-10°, 0°, 0°, legDown` | `flexion` clamps to 0. |
| K4 | Beyond max fold | `170°, 0°, 0°, legDown` | `flexion` clamps to `flexion.max`. |
| K5 | Q-angle outward | `90°, 25°, 0°, legDown` | Allowed; ankle shifts laterally outward of the sagittal plane. |
| K6 | Excessive outward patella | `90°, 70°, 0°, legDown` | `patellaAngle` clamps to +45°. |
| K7 | Mild inward patella | `90°, -10°, 0°, legDown` | Allowed. |
| K8 | Excessive inward patella | `90°, -40°, 0°, legDown` | `patellaAngle` clamps to −20°. |
| K9 | Tibia twist at deep fold | `90°, 0°, 10°, legDown` | Allowed. |
| K10 | Excessive tibia twist at fold | `90°, 0°, 25°, legDown` | `tibiaTwist` clamps to ±15°. |
| K11 | Tibia twist near extension | `5°, 0°, 10°, legDown` | `tibiaTwist` clamps to small value (knee locked). |
| K12 | Mirror right/left | same numeric params for both sides | Symmetric in pelvis frame: left ankle position is the mirror of right ankle. |
| K13 | Femur-tilt invariance | `90°, 0°, 0°, femurDir = forward-flexed thigh` | Measured `KneePose` from result equals input; ankle position rotates with the femur. |
| K14 | Root-rotated mannequin | apply arbitrary `rootRotation` to pelvis axes and `femurDir` | Pelvis-frame `KneePose` matches the non-rotated case. |

First implementation should make K1–K14 pass before integrating with `legIK.ts`.

## Knee Code Shape

Likely new pure helper module:

```text
src/lib/rig/legKnee.ts
```

Candidate exports (analogous to `legHip.ts`):

```text
buildKneeFrame(femurDir, pelvisFrame)                                    -> KneeFrame
measureKneePose(femurDir, kneePos, anklePos, tibiaTwist, frame)          -> KneePose
posFromKneePose(hipPos, femurDir, kneePose, boneLengths, frame)          -> { knee, ankle }
limitKneePose(kneePose, options)                                         -> { pose, reasons }
solveKneePose(femurDir, requestedAnkleOrParameters, frame, options)      -> KneePose | null
```

Reuse `measureTrueKneeFlexion` and `measureTibiaAxialTwist` from `legAnatomy.ts`. Avoid duplicating
`buildPelvisLegFrame` (it is the pelvis-side frame, while `KneeFrame` is femur-relative).

`legIK.ts` integration (slice 2): the current `constrainKneeFlexionWithFixedThigh` becomes a wrapper
around `solveKneePose`. The high-front and branch-continuity rules currently encoded inline in
`legIK.ts` should move into the `KneePose` clamp surface or into `solveKneePose` heuristics.

## Knee First Implementation Slice

**Slice 1 — pure helpers and tests, no runtime change.**

1. Add `legKnee.ts` with `buildKneeFrame`, `measureKneePose`, `posFromKneePose`, `limitKneePose`.
   Follow the patterns established in `legHip.ts`.
2. Add `legKnee.test.ts` with K1–K14.
3. Do **not** modify `legIK.ts` or `RigService` in this slice.
4. Do **not** raise `LEG_ANATOMY_LIMITS.kneeFlexion.max` from 130° to 150° yet — first verify the
   reference set in slice 2.
5. Run `npm run typecheck`, `npm run lint:unused`, focused vitest for the new file.

**Slice 2 — runtime integration.**

1. Replace `constrainKneeFlexionWithFixedThigh` and the in-place knee math in `legIK.ts` with
   `solveKneePose` calls.
2. ✅ Done 2026-05-09: raised `LEG_ANATOMY_LIMITS.kneeFlexion.max` 130° → 150° to match
   `legKnee.ts` `DEFAULT_KNEE_LIMITS.flexionMax`. Two boundary-asserting tests in `legIK.test.ts`
   updated; full leg + service regression: 253 tests pass.
3. ❌ Dropped — femur-axial-twist preservation in `applyLegChainToRig` is a structural no-op.
   `worldPosToLocalRot` uses `setFromUnitVectors` (shortest-arc), whose quaternion has its vector
   part along `restDir × actualDir`, hence perpendicular to `restDir`. In `decomposeSwingTwist`
   that gives `vec.dot(restDir) = 0`, so the twist component is identically zero after every
   `applyLegChainToRig`. Preserving "always zero" is meaningless. The user-visible "knee swivel
   erased on ankle drag" is about geometric `kneePlaneTwist` (radial angle around the
   `hip→ankle` axis, not local-rotation twist), which is already partially handled by
   branch-continuity in `solveLegIKWithinLimits` (2026-05-08 fix). If branch-continuity proves
   insufficient in further manual checks, fix it there, not in `applyLegChainToRig`. The
   symmetric arm "fix" is dropped for the same reason.
4. Run focused leg regression and manual viewport checks; verify deep-front "knees-to-belly"
   actually reaches 150° in the viewport now that the limit is raised.

**Slice 3 — additional knee-node control.**

Add a direct knee-target control path through the knee node, sharing the same hip-limit and
knee-limit surfaces as ankle IK.

## Ankle / Reach Layer Contract

The ankle/reach layer is last.

It receives:

- fixed hip position;
- validated femur direction and knee position;
- knee flexion limits;
- shin length;
- target ankle position.

It returns:

- reachable ankle point, or
- no-op/limited result when the target requires invalid hip or knee behavior.

The ankle target should not silently drag the knee into a different hip pose that contradicts the hip
layer.

## Additional Knee-Node Control

Keep current ankle-driven leg posing because it is often natural. Add a second control path through
the knee node for direct posing:

```text
knee target -> hip layer -> knee node position
```

This path is useful when the artist wants to set the thigh/knee direction directly before adjusting
the ankle. It must use the same hip-limit model as ankle IK.

## Reference Pose Families

Use images from `ai/reference-poses/images/` as orientation aids:

| Family | Files | Hip behavior to extract |
| --- | --- | --- |
| Happy baby | `happy_baby_from_above.jpg`, `Happy_baby_front.jpg`, `happy_baby_third_quarter.jpg` | Deep flexion with abduction; knees toward torso without broken kneecap direction. |
| Arabesque / attitude | `arabesque*.jpg`, `arabesque3.webp`, `Attitude1.jpg`, `attitude2.png`, `attitude3.jpg` | Hip extension; attitude also checks bent-knee orientation after the hip layer. |
| Lotus / retire | `lotos*.jpg`, `retire.jpg`, `Side-sitting.png` | External rotation / turnout and seated folding; likely needs later femur axial/turnout design. |

These photos are not exact numeric targets. They define scenario families and naturalness checks.

## Proposed Code Shape

Likely new or reshaped pure helper module:

```text
src/lib/rig/legHip.ts
```

Candidate exports:

```text
buildPelvisLegFrame(bodyForward, bodyUp, side)
measureHipPose(direction, frame)
directionFromHipPose(hipPose, frame)
limitHipPose(hipPose, options)
solveHipDirection(hipPos, requestedKneeOrDirection, thighLength, frame, options)
```

Then `legIK.ts` should call this layer instead of embedding hip thresholds directly in the ankle IK path.

## First Implementation Slice

Do not implement full ankle IK first.

Slice 1 should be:

1. Add pure hip helpers. Done: `src/lib/rig/legHip.ts`.
2. Add hip-only unit tests. Done: `src/lib/rig/__tests__/legHip.test.ts`.
3. Keep current runtime behavior unchanged until helper tests are accepted. Done for the first helper slice.
4. Connect the hip layer to `legIK.ts` in a small integration slice. Done.
5. Review runtime behavior with the user before deeper knee/ankle rewrite.

Technical check, 2026-05-06:

- `npm run typecheck` passed.
- Focused leg regression passed with 63 tests:
  - `legHip.test.ts`;
  - `legAnatomy.test.ts`;
  - `legIK.test.ts`;
  - `legLimits.test.ts`;
  - `RigService.stage6.test.ts`.

Integration notes:

- `legIK.ts` now delegates hip/femur direction measurement and clamping to `legHip.ts`.
- The old local hip-angle math in `legIK.ts` was removed.
- This is not the full hierarchical solver yet. The knee layer and ankle/reach layer still need separate passes.

## Temporary Leg IK Trace

Temporary diagnostic logging is available during the leg refactor. It is off by default.

Preferred UI path:

- open Settings;
- enable "Показывать отладку";
- use the left sidebar Debug section;
- toggle "Leg IK Trace";
- use "Export Logs" to download the current log buffer for analysis;
- use "Clear Logs" before reproducing a short problem movement.

Enable in the browser console:

```js
localStorage.setItem('poseflow-debug-leg-ik', 'true')
```

Disable:

```js
localStorage.removeItem('poseflow-debug-leg-ik')
```

When enabled, `RigService.applyLegIK` and `RigService.applyKneeTwist` write `LegIKTrace` records to
the browser console and the regular PoseFlow localStorage log buffer.

Implementation note: the UI toggle and logger must use `globalThis.localStorage`. A plain `localStorage`
reference can leave the button visually enabled while `RigService` still reads the trace flag as disabled.

Trace records include:

- operation: ankle IK or knee twist;
- side: mannequin right/left;
- input target or delta;
- hip/knee/ankle before and candidate/result points;
- target distance;
- candidate diagnostics:
  - hip flexion/abduction in degrees;
  - hip clamp state and clamp reasons;
  - knee flexion in degrees;
  - patella/anterior validity;
  - high-front mode;
  - reject reasons when available.

This trace is for development only and should be removed or hidden behind a formal debug UI before a
release build.

## Current Implementation Slice

First hip-first fallback slice, 2026-05-06:

- Trigger: old post-limit `solveLegIKWithinLimits` would return `solver-null`.
- Step 1: try the current thigh direction with fixed-thigh knee flexion.
- Step 2: build a reachable ankle along `hip -> target`.
- Step 3: choose the knee point from a hip-limited preferred thigh direction, not from the old
  high-front `up` radial.
- Step 4: scan from the requested target outward and use the nearest valid reachable ankle.
- Regression source: captured `LegIKTrace` coordinates from `poseflow/logs/console.log`.

Knee-layer follow-up:

- Added `trueKneeFlexion`: unsigned hinge angle between thigh and tibia.
- Knee limits use `trueKneeFlexion`.
- Signed `bodyForward`-based knee flexion is kept only as diagnostic data.
- Removed the temporary target-high-front acceptance exception.

Important caveat: this is still a bridge, not the final solver. The knee layer is cleaner now, but
ankle-driven IK still needs manual validation and likely a follow-up pass for knee-plane choice.

Branch-continuity fix, 2026-05-08:

- User-supplied `debug-logs/*` traces showed that the worst ankle-drag jerk was not primarily a
  target-distance or hip-limit problem.
- In the largest jumps, the ankle stayed close to the requested target, but the knee switched between
  the high-front and low branch for nearly the same ankle position.
- Rule added for the bridge solver:
  - small continuous ankle-drag steps preserve the current knee radial/high-front branch;
  - larger posing moves can still select the high-front branch automatically;
  - reach fallback keeps its anterior-correction behavior so it can still build valid limited poses.
- Regression added from the logged coordinates:
  - `solveLegIKWithinLimits keeps the logged high-front knee branch during ankle drag`.
- Technical checks passed:
  - `npm run typecheck`;
  - `npm run lint:unused`;
  - focused leg regression: 67 tests.

Follow-up sticking fix, 2026-05-08:

- A new bottom-to-top ankle-drag log showed frequent `solver-null` rejections while the current pose
  was already valid near high-front hip flexion.
- The failing candidate could reach the target and keep the knee branch, but was rejected only for
  `hip:adduction` around 26 degrees.
- Decision:
  - keep high-front abduction conservative because it protects against the known side-escape case;
  - relax high-front adduction from 20 degrees to the normal 30 degrees because inward motion in
    deep flexion is needed for natural compact poses;
  - treat outside-target ankle IK as movement to a valid limit boundary instead of a hard no-op when
    the boundary pose improves distance to the target.
- Added regression:
  - `solveLegIKWithinLimits returns a boundary pose instead of sticking near the logged hip limit`.
- Technical checks passed:
  - `npm run typecheck`;
  - `npm run lint:unused`;
  - focused leg regression: 68 tests.

## Second-Opinion Diagnosis — 2026-05-08

Independent architecture and math review. Source: `ai/tasks/leg-second-opinion-analysis-brief.md`.

### D1 — `buildKneeOnAxisWithPreferredRadial` uses `hipToAnkleDir` for high-front detection (confirmed)

File: `legIK.ts` function `buildKneeOnAxisWithPreferredRadial`, variable `targetAngles`.

`hipToAnkleDir` is the averaged direction of the whole chain, not the femur direction.
For "knees to belly" the ankle is roughly at hip height → `hipToAnkleDir.flexion ≈ 90–110°`, below
the 120° high-front threshold → `preferHighFrontBranch = false` → the knee radial falls back to the
current (standing/downward) thigh direction instead of going upward-forward.

Fix: replace `measureHipPose(hipToAnkleDir)` with `solveHipDirection(hipPos, hip + hipToAnkleDir * hipToKnee, ...)`,
which gives the hip-limited thigh direction for the ankle target. Use that pose's flexion for
`preferHighFrontBranch`.

### D2 — `constrainKneeFlexionWithFixedThigh` requires `targetAboveHip` for extended knee range (confirmed)

File: `legIK.ts` function `constrainKneeFlexionWithFixedThigh`, variable `targetAboveHip`.

```typescript
const targetAboveHip = desiredAnklePos.clone().sub(hipPos).dot(bodyUp) > 0;
const highFrontPose = targetAboveHip && hipAngles.forward > ...
```

For "knees to belly" with ankle at or below hip level, `targetAboveHip = false` → `highFrontPose = false`
→ signed knee flexion range is `[0, 130°]` instead of `[-130°, +130°]` → tibia cannot fold backward.

`hipAngles.forward` is already computed from the thigh direction (correct source). `targetAboveHip`
is the wrong guard and should be removed entirely from the `highFrontPose` condition.

### D3 — `solveLegIKHipFirst` is the third fallback, not the primary path (confirmed)

Both D1 and D2 affect `solveLegIKHipFirst` as well: its third branch also calls
`constrainKneeFlexionWithFixedThigh` with the ankle target as `desiredAnklePos`.
Fixing D2 first makes the hip-first fallback more reliable before it is promoted to the primary path.

### D4 — Duplicate frame functions (minor)

`legAnatomy.ts::buildLegFrame` and `legHip.ts::buildPelvisLegFrame` are mathematically identical.
`legIK.ts` uses only `buildPelvisLegFrame`. No active bug, but a maintenance hazard.

### D5 — `isKneeAnteriorValid` threshold too weak (minor)

Threshold `>= -EPS` allows the knee to face almost exactly sideways. Not causing visible failures yet.

## Session 1 Plan — 2026-05-08

Goal: fix D1 and D2. Both are surgical changes with no architectural rewrite.

Steps:

1. Fix D2 in `constrainKneeFlexionWithFixedThigh`: remove `targetAboveHip` from `highFrontPose` condition.
2. Fix D1 in `buildKneeOnAxisWithPreferredRadial`: replace `targetAngles` (from `hipToAnkleDir`) with
   the pose from `solveHipDirection(hipPos, hipPos + hipToAnkleDir * hipToKnee, hipToKnee, frame)`.
3. Add regression tests DK1–DK3:
   - DK1: hip flexion 140°, ankle at hip level → extended signed knee flexion range is active.
   - DK2: hip flexion 140°, ankle below hip → tibia folds backward correctly.
   - DK3: ankle drag upward through hip level → no knee branch jump.
4. Run `npm run typecheck`, `npm run lint:unused`, focused leg regression.
5. Manual viewport check: knees-to-belly for both legs.

Not in this session: promoting `solveLegIKHipFirst` to primary path (D3).

## Session 2 — 2026-05-09

Goal: finish D3, D4, D5 — maintenance and structural improvements identified in the second-opinion diagnosis.

### D4 implemented

`buildLegFrame` in `legAnatomy.ts` was identical to `buildPelvisLegFrame` in `legHip.ts`.
Removed the duplicate body and `LegFrame` interface; `legAnatomy.ts` now re-exports
`buildPelvisLegFrame as buildLegFrame` and `PelvisLegFrame as LegFrame` from `legHip.ts`.
No behaviour change; test imports are unchanged.

### D5 implemented

`isKneeAnteriorValid` threshold changed from `>= -EPS` (≈ 90°, any non-backward orientation) to
`>= -0.1` (≈ 96°, patella must be at most ~96° from body forward).
Prevents purely sideways-facing knees from passing the validity check.

### D3 implemented

`solveLegIKHipFirst` is now tried **before** `solveLegFABRIK` in the fallback cascade inside
`solveLegIKWithinLimits`.  `isHighFrontTarget` is computed once before the fallback block.

New cascade order:
1. FABRIK + `constrainKneeBendPreserveTwist` + `constrainHipDirection` (kneeLimited, fast path)
2. If kneeLimited invalid: `hipLimited` quick correction
3. `solveLegIKHipFirst` — primary anatomical path (now promoted from position 4)
4. `solveLegFABRIK` — FABRIK with full constraints (fallback)
5. null

All regression tests (152) passed; typecheck and lint:unused clean.

## Open Questions

- Should hip `flexion.max = 150 deg` be enough for the reference set, or should the first implementation allow `160 deg`?
- How should hip external/internal rotation be represented before full mesh/rig import exists?
- Knee-node dragging (slice 3) lands after ankle IK is reconnected to the knee layer (slice 2), not before.
  Confirmed by knee-layer design 2026-05-09.
- Should `kneeFlexion.max` be raised to 150° in slice 2, or wait for reference-set verification first?
