# Collaboration Roles

Use one universal role system for PoseFlow work. Do not create separate role sets per feature area.
For each task type, apply the same roles with a task-specific checklist.

Roles are modes of work, not people or bureaucracy. The goal is to avoid mixing modeling,
implementation, verification, and documentation in one blurry pass.

For every new task, choose the workflow automatically:

- use the full role flow for complex, risky, cross-module, or geometry-heavy work;
- use lightweight mode for small UI, documentation, and low-risk local fixes;
- state the chosen mode briefly when it matters.

## Default Flow

```text
Architect -> Researcher -> Scenario Designer -> Engineer -> Tester -> Documenter
```

Use the full flow for complex or risky work. For small UI, documentation, or low-risk fixes,
run the relevant roles implicitly and keep the process lightweight.

## Roles

### Architect

Defines the problem model before implementation.

Typical outputs:

- task boundary and non-goals;
- data model and ownership;
- coordinate frames, pivots, axes, or API contracts when relevant;
- main risks and invariants;
- one-slice implementation strategy.

### Researcher

Investigates unknowns before design hardens.

Use this role when the task depends on external formats, libraries, anatomy, UI patterns,
rendering constraints, packaging behavior, or model/AI pipelines.

Typical outputs:

- options with tradeoffs;
- compatibility risks;
- recommended approach;
- source links or local references when external facts are used.

### Scenario Designer

Turns the model into concrete checks.

Typical outputs:

- reference poses or user flows;
- test files or sample inputs;
- expected behavior from key camera/view directions;
- edge cases and blocked invalid cases;
- focused test plan.

### Engineer

Implements one agreed slice.

Typical outputs:

- focused code changes;
- pure helpers in `src/lib/` or service-level logic when possible;
- tests for new logic;
- no unrelated refactors.

### Tester

Verifies behavior technically and manually.

Typical outputs:

- focused unit/service tests;
- typecheck/build/smoke checks as needed;
- Browser Use or Playwright checks for viewport behavior;
- concise list of passed/failed scenarios.

### Documenter

Records what became true.

Typical outputs:

- status update for active work;
- plan update for remaining work;
- task-brief update for accepted decisions and residual risks;
- archive update when work is complete.

## Task Profiles

### Skeleton / IK / FK / Gizmo

Role emphasis:

- Architect: coordinate frame, pivot, axis, motion plane, affected BODY_25 nodes, mannequin side convention.
- Scenario Designer: front/back/side/root-rotated checks, valid extremes, blocked invalid poses.
- Tester: focused vector/angle tests plus manual viewport checks.

Use `ai/docs/controller-debug-protocol.md` for the detailed mechanics protocol.

### UI / UX

Role emphasis:

- Architect: screen ownership, component boundaries, state ownership, keyboard/mouse behavior.
- Scenario Designer: primary workflow, collapsed/expanded states, small viewport behavior, focus mode.
- Tester: browser smoke, layout overlap checks, hotkeys, persistence when relevant.

### Import / Mesh / Rigging

Role emphasis:

- Researcher: supported formats, coordinate axes, units, scale, bones, skinning, animation data.
- Architect: import pipeline, internal representation, fallback behavior, error handling.
- Scenario Designer: sample files, malformed files, rigged vs static mesh cases, round-trip expectations.

### Export / File Formats / Persistence

Role emphasis:

- Architect: stable schema, versioning, migrations, compatibility with OpenPose and future scene save/load.
- Scenario Designer: round-trip tests, old-file compatibility, invalid-file handling.
- Tester: export/import comparisons and regression fixtures.

### ComfyUI / Image-To-Skeleton R&D

Role emphasis:

- Researcher: pipeline options, model quality, local setup, data requirements.
- Scenario Designer: small reference image set and objective quality criteria.
- Engineer: prototypes isolated from release-critical code until accepted.

### Release / Packaging

Role emphasis:

- Tester: build, Electron packaging, startup, backend lifecycle, audit warnings, smoke checklist.
- Documenter: release notes, known limitations, technical debt.

## Lightweight Mode

For small changes, do not expand every role into a written section.
Instead, keep the implicit checklist:

```text
What is the intended behavior?
What is the smallest safe change?
How will it be checked?
What should be recorded?
```

## Agent Usage

Sub-agents are optional and should be used only for independent side work.

Good candidates:

- Researcher for external/library/format investigation;
- Tester for independent regression or code review;
- Engineer for a clearly bounded file/module slice.

Avoid agents when the next step depends tightly on the current reasoning, especially for delicate
controller signs, coordinate-frame math, and user-guided manual calibration.
