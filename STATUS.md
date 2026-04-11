# PoseFlow Editor — Status

## Current version: v0.2.0

## Completed
- BODY_25 skeleton: 25 joints + 24 bones, OpenPose colors, drag-and-drop
- 10 pose presets (T-Pose, A-Pose, Standing, Sitting, Walking, Running, Jumping, Dancing, Waving, Arms Crossed)
- Camera compass: 9 views (Front, Back, Side L/R, 3/4 x4, Top) + Reset
- Export Frame: interactive crop with drag, 8-handle resize, aspect ratio (10 options), resolution (1K/2K/4K)
- PNG/JSON export aligned to viewport (Liang-Barsky clipping)
- Electron + Python FastAPI backend with IPC bridge
- App settings: theme, canvas colors, camera speeds, export defaults (localStorage)

## In progress
- DesignDoll-style controls (see CLAUDE.md implementation plan, Steps 1-11)
- Next: Development Process Improvements, then Step 1 (camera-plane drag)

## Known issues
- Drag is XY-only — broken from side/top camera views
- No joint hierarchy (moving shoulder doesn't move elbow/wrist)
- No bone length constraints
- No undo/redo
- No IK solver
