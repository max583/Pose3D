# Phase 4 Implementation Plan - PoseFlow Editor

## Overview
Phase 4 completes the remaining Steps 8-11, integrates DesignDoll experimental features, consolidates architecture with DI container, and improves overall quality. This plan provides a detailed roadmap for implementation.

## Current State Analysis
- **Steps 1-7**: Completed (camera-plane drag, undo/redo, skeleton graph, FABRIK IK, etc.)
- **Feature Flags**: Fully implemented and operational
- **Experimental Modules**: FixedLengthSolver, MainControllers, DragAdapter, SkullGroup, SpineChain exist as prototypes
- **DI Container**: Implemented but not activated
- **State Management**: Zustand store exists alongside legacy PoseService singleton

## Phase 4 Goals

### 1. Complete Pending Steps 8-11
- **Step 8**: Mini-view (200×200 viewport, 90° rotation from main camera)
- **Step 9**: Multiple skeletons (support for multiple figures on scene)
- **Step 10**: Center of gravity (spheres for group manipulation)
- **Step 11**: Ring gizmos (toroids for rotation control)

### 2. Integrate DesignDoll Experimental Features
- Fixed bone lengths (no stretching)
- Rigid skull (non-deformable head group)
- Spine chain (virtual segments for smooth bending)
- 7 main controllers (DesignDoll-style manipulation)
- Drag adapter for backward compatibility

### 3. Architectural Consolidation
- Activate DI container with service interfaces
- Migrate from singleton PoseService to injected dependencies
- Implement proper state management with Zustand
- Performance optimization and code splitting

### 4. Quality and Documentation
- Increase test coverage to 80%+
- Comprehensive documentation
- Developer experience improvements
- Performance benchmarking

## Detailed Implementation Sequence

### Phase 4.1: Foundation Preparation (Week 1)

#### 4.1.1: Activate DI Container
- **Task**: Enable `USE_DI_CONTAINER` feature flag
- **Files**:
  - `poseflow/src/lib/di/setup.ts` - Update to register all services
  - `poseflow/src/context/ServiceContext.tsx` - Create DI provider
  - `poseflow/src/App.tsx` - Wrap app with ServiceProvider
- **Dependencies**: None
- **Acceptance Criteria**:
  - All existing tests pass with DI container enabled
  - No regression in functionality
  - Feature flag panel shows DI container as active

#### 4.1.2: Service Interface Implementation
- **Task**: Implement all service interfaces for DI
- **Files**:
  - `poseflow/src/services/DIPoseService.ts` - DI-compatible PoseService
  - `poseflow/src/services/DICameraService.ts` - DI-compatible CameraService
  - `poseflow/src/services/DIExportService.ts` - DI-compatible ExportService
- **Dependencies**: 4.1.1
- **Acceptance Criteria**:
  - All services implement their respective interfaces
  - Backward compatibility maintained with adapter pattern
  - Unit tests for each service interface

#### 4.1.3: State Management Migration
- **Task**: Migrate PoseService state to Zustand store
- **Files**:
  - `poseflow/src/lib/stores/poseStore.ts` - Extend with DesignDoll support
  - `poseflow/src/lib/stores/cameraStore.ts` - New camera state store
  - `poseflow/src/lib/stores/uiStore.ts` - New UI state store
- **Dependencies**: 4.1.2
- **Acceptance Criteria**:
  - All pose data accessible via Zustand store
  - Real-time synchronization between store and services
  - Undo/redo functionality preserved

### Phase 4.2: Steps 8-11 Implementation (Week 2-3)

#### 4.2.1: Step 8 - Mini-View Enhancement
- **Task**: Complete and polish mini-view component
- **Files**:
  - `poseflow/src/components/MiniView.tsx` - Add configuration options
  - `poseflow/src/components/MiniViewControls.tsx` - New control panel
  - `poseflow/src/hooks/useMiniView.ts` - Custom hook for mini-view logic
- **Features**:
  - Configurable size (200×200 default)
  - 90° rotation offset from main camera
  - Toggle visibility
  - Independent camera controls
  - Performance optimization (low-poly rendering)
- **Dependencies**: 4.1.3
- **Acceptance Criteria**:
  - Mini-view renders at 60 FPS
  - No performance impact on main viewport
  - Rotation correctly follows main camera
  - UI controls functional

#### 4.2.2: Step 9 - Multiple Skeletons
- **Task**: Implement multi-skeleton support
- **Files**:
  - `poseflow/src/lib/multi-skeleton/MultiSkeletonManager.ts` - New manager class
  - `poseflow/src/components/multi-skeleton/SkeletonSelector.tsx` - UI component
  - `poseflow/src/lib/multi-skeleton/types.ts` - Type definitions
- **Features**:
  - Support for 2-4 skeletons on scene
  - Individual selection and manipulation
  - Group operations (select all, mirror all)
  - Layer ordering (z-index)
  - Performance optimization for multiple renders
- **Dependencies**: 4.2.1
- **Acceptance Criteria**:
  - Can add/remove skeletons dynamically
  - Each skeleton maintains independent pose state
  - Selection highlighting works correctly
  - No performance degradation with 4 skeletons

#### 4.2.3: Step 10 - Center of Gravity
- **Task**: Implement COG manipulation spheres
- **Files**:
  - `poseflow/src/lib/cog/CenterOfGravitySolver.ts` - COG calculation
  - `poseflow/src/components/cog/COGSphere.tsx` - Visual component
  - `poseflow/src/hooks/useCOGDrag.ts` - Drag hook for COG
- **Features**:
  - COG calculation for each skeleton
  - Visual spheres at COG points
  - Group drag (move all selected skeletons)
  - Weight distribution visualization
  - Stability indicators
- **Dependencies**: 4.2.2
- **Acceptance Criteria**:
  - COG calculated correctly for all poses
  - Group drag moves all selected skeletons
  - Visual feedback during drag
  - Undo/redo support for group operations

#### 4.2.4: Step 11 - Ring Gizmos
- **Task**: Implement rotation ring gizmos
- **Files**:
  - `poseflow/src/lib/gizmos/RingGizmo.ts` - Gizmo logic
  - `poseflow/src/components/gizmos/RingGizmo3D.tsx` - 3D visual
  - `poseflow/src/hooks/useRingGizmo.ts` - Interaction hook
- **Features**:
  - XYZ ring gizmos for rotation
  - Screen-aligned rings (always face camera)
  - Visual feedback (color change on hover)
  - Snap-to-angle (15°, 30°, 45°)
  - Combined rotation (freeform)
- **Dependencies**: 4.2.3
- **Acceptance Criteria**:
  - Gizmos render correctly in 3D space
  - Rotation applies to selected joints/skeletons
  - Snap functionality works
  - Performance: < 2ms per frame with gizmos

### Phase 4.3: DesignDoll Integration (Week 4-5)

#### 4.3.1: Fixed Lengths Integration
- **Task**: Integrate FixedLengthSolver into main drag system
- **Files**:
  - `poseflow/src/lib/experimental/fixed-length/FixedLengthSolver.ts` - Enhance
  - `poseflow/src/hooks/useFixedLengthDrag.ts` - New drag hook
  - `poseflow/src/lib/drag/FixedLengthAdapter.ts` - Adapter for existing drag
- **Integration Points**:
  - Feature flag: `USE_FIXED_LENGTHS`
  - Modify `useTransformDrag` to use solver when flag enabled
  - Update PoseService to maintain bone lengths
- **Dependencies**: 4.2.4
- **Acceptance Criteria**:
  - Bones maintain fixed lengths during drag
  - Toggle between fixed/free lengths
  - No visual artifacts during transition
  - All existing tests pass

#### 4.3.2: Rigid Skull Integration
- **Task**: Integrate SkullGroup for non-deformable head
- **Files**:
  - `poseflow/src/lib/experimental/rigid/SkullGroup.ts` - Enhance
  - `poseflow/src/components/skeleton/RigidSkull.tsx` - Visual component
  - `poseflow/src/lib/rigid/RigidGroupManager.ts` - Manager for rigid groups
- **Integration Points**:
  - Feature flag: `USE_RIGID_SKULL`
  - Head joints (0, 15, 16, 17, 18) move as group
  - Individual joint drag disabled when rigid mode active
- **Dependencies**: 4.3.1
- **Acceptance Criteria**:
  - Head moves as rigid group
  - Toggle between rigid/free head
  - Visual indicator of rigid mode
  - Performance: no overhead

#### 4.3.3: Spine Chain Integration
- **Task**: Integrate SpineChain for virtual spine segments
- **Files**:
  - `poseflow/src/lib/experimental/spine/SpineChain.ts` - Enhance
  - `poseflow/src/components/spine/SpineVisualizer.tsx` - Visual component
  - `poseflow/src/lib/spine/SpineSolver.ts` - IK solver for spine
- **Integration Points**:
  - Feature flag: `USE_SPINE_CHAIN`
  - Replace individual spine joints with virtual chain
  - Smooth bending with curvature control
  - Backward mapping to BODY_25 joints
- **Dependencies**: 4.3.2
- **Acceptance Criteria**:
  - Smooth spine bending
  - Curvature controls functional
  - Real-time mapping to BODY_25
  - Performance: < 1ms per frame

#### 4.3.4: Main Controllers Integration
- **Task**: Integrate 7 DesignDoll-style controllers
- **Files**:
  - `poseflow/src/lib/experimental/controllers/MainControllers.ts` - Enhance
  - `poseflow/src/components/experimental/ControllerVisual.tsx` - Enhance
  - `poseflow/src/lib/controllers/ControllerManager.ts` - Manager class
- **Integration Points**:
  - Feature flag: `USE_DESIGNDOLL_CONTROLLERS`
  - 7 controllers: Head, Chest, Pelvis, L/R Hand, L/R Foot
  - Controller-based manipulation instead of joint-based
  - Visual controller widgets
- **Dependencies**: 4.3.3
- **Acceptance Criteria**:
  - All 7 controllers functional
  - Controller drag affects multiple joints
  - Visual feedback during manipulation
  - Toggle between controller/joint modes

#### 4.3.5: Drag Adapter Integration
- **Task**: Integrate DragAdapter for backward compatibility
- **Files**:
  - `poseflow/src/lib/experimental/controllers/DragAdapter.ts` - Enhance
  - `poseflow/src/lib/drag/UnifiedDragSystem.ts` - Unified drag system
  - `poseflow/src/hooks/useUnifiedDrag.ts` - Unified drag hook
- **Integration Points**:
  - Single drag system supporting all modes
  - Automatic mode detection (joint vs controller vs COG)
  - Feature flag-based behavior switching
- **Dependencies**: 4.3.4
- **Acceptance Criteria**:
  - All drag modes work through unified system
  - No regression in existing drag behavior
  - Smooth transitions between modes
  - Performance: < 3ms per drag operation

### Phase 4.4: Architectural Consolidation (Week 6)

#### 4.4.1: Performance Optimization
- **Task**: Optimize rendering and computation performance
- **Files**:
  - `poseflow/src/lib/performance/PerformanceMonitor.ts` - Monitoring
  - `poseflow/src/lib/performance/RenderOptimizer.ts` - Optimization
  - `poseflow/src/components/PerformancePanel.tsx` - UI panel
- **Optimizations**:
  - Level-of-detail rendering
  - Computation caching
  - Web Worker for heavy calculations
  - Memory leak prevention
- **Dependencies**: 4.3.5
- **Acceptance Criteria**:
  - 60 FPS maintained with all features enabled
  - Memory usage < 200MB
  - No memory leaks after 1 hour of use
  - CPU usage < 30% on mid-range hardware

#### 4.4.2: Code Splitting and Lazy Loading
- **Task**: Implement code splitting for better load times
- **Files**:
  - `poseflow/vite.config.ts` - Update build configuration
  - `poseflow/src/lib/code-splitting/` - Splitting utilities
  - Dynamic imports for heavy components
- **Splits**:
  - Experimental features as separate chunks
  - 3D rendering engine
  - Export functionality
  - Documentation/help system
- **Dependencies**: 4.4.1
- **Acceptance Criteria**:
  - Initial load time < 3 seconds
  - Chunks load on demand
  - No broken functionality during lazy loading
  - Build size reduced by 40%

#### 4.4.3: Error Handling and Recovery
- **Task**: Implement comprehensive error handling
- **Files**:
  - `poseflow/src/lib/error/ErrorBoundaryManager.ts` - Enhanced error boundaries
  - `poseflow/src/lib/error/RecoverySystem.ts` - State recovery
  - `poseflow/src/components/ErrorRecovery.tsx` - Recovery UI
- **Features**:
  - Graceful degradation
  - Automatic state recovery
  - User-friendly error messages
  - Error reporting (opt-in)
- **Dependencies**: 4.4.2
- **Acceptance Criteria**:
  - No unhandled exceptions
  - State recovery after errors
  - User can continue working after non-fatal errors
  - Error logging to file

### Phase 4.5: Quality and Documentation (Week 7)

#### 4.5.1: Test Coverage Improvement
- **Task**: Increase test coverage to 80%+
- **Files**:
  - Unit tests for all new components
  - Integration tests for feature interactions
  - E2E tests for critical user flows
  - Performance regression tests
- **Coverage Goals**:
  - Core algorithms: 95%
  - UI components: 80%
  - Services: 90%
  - Hooks: 85%
- **Dependencies**: 4.4.3
- **Acceptance Criteria**:
  - Overall coverage ≥ 80%
  - Critical paths 100% covered
  - Tests run in < 30 seconds
  - No flaky tests

#### 4.5.2: Documentation
- **Task**: Comprehensive documentation
- **Files**:
  - `poseflow/docs/` - New documentation directory
  - API documentation (TypeDoc)
  - User guide
  - Developer guide
  - Architecture decisions
- **Documentation Types**:
  - Inline code documentation
  - Component documentation
  - API reference
  - Tutorials and examples
- **Dependencies**: 4.5.1
- **Acceptance Criteria**:
  - All public APIs documented
  - User guide covers all features
  - Developer guide for extension
  - Searchable documentation

#### 4.5.3: Developer Experience
- **Task**: Improve DX with tooling and automation
- **Files**:
  - `poseflow/.vscode/` - VS Code configuration
  - `poseflow/scripts/` - Development scripts
  - `poseflow/CONTRIBUTING.md` - Contribution guide
- **Improvements**:
  - Hot reload for all file types
  - Debug configuration
  - Code generation templates
  - Automated code quality checks
- **Dependencies**: 4.5.2
- **Acceptance Criteria**:
  - New developer can setup in < 10 minutes
  - All common tasks automated
  - Consistent code style enforced
  - Easy debugging setup

## File Structure Changes

### New Directories
```
poseflow/src/
├── lib/
│   ├── multi-skeleton/          # Step 9
│   ├── cog/                     # Step 10
│   ├── gizmos/                  # Step 11
│   ├── rigid/                   # Enhanced rigid groups
│   ├── spine/                   # Enhanced spine chain
│   ├── controllers/             # Enhanced controllers
│   ├── drag/                    # Unified drag system
│   ├── performance/             # Performance optimization
│   ├── error/                   # Error handling
│   └── code-splitting/          # Code splitting utilities
├── components/
│   ├── multi-skeleton/          # Multi-skeleton UI
│   ├── cog/                     # COG visualization
│   ├── gizmos/                  # Gizmo components
│   ├── spine/                   # Spine visualization
│   └── performance/             # Performance UI
├── services/
│   ├── DIPoseService.ts         # DI-compatible PoseService
│   ├── DICameraService.ts       # DI-compatible CameraService
│   └── DIExportService.ts       # DI-compatible ExportService
└── stores/
    ├── cameraStore.ts           # Camera state
    └── uiStore.ts               # UI state
```

### Modified Files
- `poseflow/src/App.tsx` - Add ServiceProvider, PerformanceMonitor
- `poseflow/src/components/Canvas3D.tsx` - Support multi-skeleton, gizmos
- `poseflow/src/components/Sidebar.tsx` - Add new feature toggles
- `poseflow/src/components/FeatureFlagPanel.tsx` - Add new feature flags
- `poseflow/src/hooks/useTransformDrag.ts` - Integrate unified drag system
- `poseflow/src/lib/feature-flags/registry.ts` - Add new feature flags

## Feature Flag Activation Strategy

### Gradual Rollout Plan
1. **Phase 4.1**: `USE_DI_CONTAINER` (100% immediately)
2. **Phase 4.2**: `USE_MINI_VIEW`, `USE_MULTIPLE_SKELETONS`, `USE_CENTER_OF_GRAVITY`, `USE_RING_GIZMOS` (10% → 50% → 100%)
3. **Phase 4.3**: `USE_FIXED_LENGTHS`, `USE_RIGID_SKULL`, `USE_SPINE_CHAIN`, `USE_DESIGNDOLL_CONTROLLERS` (5% → 25% → 100%)
4. **Phase 4.4**: Performance features (100% immediately)
5. **Phase 4.5**: Quality features (100% immediately)

### Rollback Procedures
- Each feature flag independently toggleable
- Automatic rollback if error rate > 1%
- Manual rollback via feature flag panel
- State preservation during rollback

## Integration Points with Existing Code

### 1. PoseService Integration
- **Current**: Singleton with direct method calls
- **New**: DI-injected service with interface
- **Migration**: Adapter pattern for backward compatibility
- **Testing**: Mock services for unit tests

### 2. Drag System Integration
- **Current**: `useTransformDrag` hook
- **New**: `useUnifiedDrag` with mode detection
- **Migration**: Feature flag to switch implementations
- **Testing**: Both implementations tested

### 3. Rendering Pipeline
- **Current**: Single skeleton rendering
- **New**: Multi-skeleton with performance optimizations
- **Migration**: Progressive enhancement
- **Testing**: Visual regression tests

### 4. State Management
- **Current**: Mixed (PoseService + local state)
- **New**: Unified Zustand stores
- **Migration**: Gradual migration with feature flags
- **Testing**: State synchronization tests

## Testing Approach

### Unit Tests
- **Coverage**: 80% minimum
- **Framework**: Vitest + React Testing Library
- **Mocking**: DI services for isolation
- **Focus**: Algorithms, utilities, pure functions

### Integration Tests
- **Scope**: Feature interactions
- **Framework**: Vitest + @testing-library/react
- **Mocking**: Minimal, focus on real interactions
- **Focus**: User flows, feature combinations

### E2E Tests
- **Scope**: Critical user journeys
- **Framework**: Playwright
- **Environment**: Real Electron app
- **Focus**: Installation, basic editing, export

### Performance Tests
- **Metrics**: FPS, memory, CPU, load time
- **Tools**: Chrome DevTools, custom monitoring
- **Baseline**: Current performance metrics
- **Thresholds**: No regression > 10%

### Visual Regression Tests
- **Tool**: Percy or similar
- **Scope**: UI components, 3D rendering
- **Frequency**: Before each release
- **Tolerance**: Pixel difference threshold

## Performance Considerations

### Rendering Optimization
- Level-of-detail for distant skeletons
- Frustum culling for off-screen elements
- Instanced rendering for identical elements
- GPU memory management

### Computation Optimization
- Web Workers for heavy calculations (IK, COG)
- Computation caching (bone lengths, distances)
- Debounced updates for continuous operations
- Progressive computation for complex operations

### Memory Management
- Object pooling for frequently created objects
- Garbage collection optimization
- Memory leak detection
- Resource cleanup on component unmount

### Load Time Optimization
- Code splitting by feature
- Lazy loading of heavy dependencies
- Asset optimization (textures, models)
- Preloading critical resources

## Risk Assessment and Mitigation

### Technical Risks
1. **Performance degradation with multiple skeletons**
   - **Mitigation**: Progressive enhancement, performance monitoring
   - **Fallback**: Limit to 2 skeletons if performance issues

2. **Complexity of DesignDoll integration**
   - **Mitigation**: Feature flags, gradual rollout
   - **Fallback**: Keep legacy system as backup

3. **DI container breaking existing functionality**
   - **Mitigation**: Comprehensive testing, adapter pattern
   - **Fallback**: Feature flag to disable DI

4. **State management migration issues**
   - **Mitigation**: Dual-write during migration
   - **Fallback**: Rollback to previous state system

### Schedule Risks
1. **Underestimation of integration complexity**
   - **Mitigation**: Buffer time in schedule, prioritize MVP
   - **Contingency**: Defer non-critical features to Phase 5

2. **Dependency conflicts**
   - **Mitigation**: Regular dependency updates, lockfile management
   - **Contingency**: Isolate problematic dependencies

### Quality Risks
1. **Regression in existing functionality**
   - **Mitigation**: Comprehensive test suite, automated regression tests
   - **Contingency**: Quick rollback via feature flags

2. **User experience disruption**
   - **Mitigation**: User testing, gradual feature rollout
   - **Contingency**: User preference preservation

## Success Criteria

### Functional Success Criteria
1. All Steps 8-11 fully implemented and functional
2. DesignDoll features integrated and working
3. DI container active and all services migrated
4. Performance maintained or improved
5. Test coverage ≥ 80%

### Quality Success Criteria
1. No regression in existing functionality
2. All tests passing
3. Documentation complete and accurate
4. Code maintainability improved
5. Developer experience enhanced

### Performance Success Criteria
1. 60 FPS maintained with all features enabled
2. Memory usage < 200MB
3. Load time < 3 seconds
4. CPU usage < 30% on mid-range hardware
5. No memory leaks

### User Experience Success Criteria
1. Feature flags allow gradual adoption
2. Backward compatibility maintained
3. Error handling prevents data loss
4. Performance feels smooth to users
5. New features intuitive to use

## Acceptance Tests

### Step 8: Mini-View
1. Mini-view renders at 200×200 pixels
2. Camera rotates 90° from main view
3. Toggle visibility works
4. Performance: no impact on main view FPS
5. Synchronization: follows main camera changes

### Step 9: Multiple Skeletons
1. Can add up to 4 skeletons
2. Each skeleton independently selectable
3. Group operations work (select all, mirror all)
4. Performance: 60 FPS with 4 skeletons
5. State: each skeleton maintains independent pose

### Step 10: Center of Gravity
1. COG calculated correctly for all poses
2. COG spheres visible and draggable
3. Group drag moves all selected skeletons
4. Undo/redo works for group operations
5. Visual feedback during drag

### Step 11: Ring Gizmos
1. XYZ ring gizmos render correctly
2. Rotation applies to selected joints
3. Snap functionality works (15°, 30°, 45°)
4. Performance: < 2ms per frame with gizmos
5. Visual feedback (color change on hover)

### DesignDoll Integration
1. Fixed lengths: bones don't stretch during drag
2. Rigid skull: head moves as group
3. Spine chain: smooth bending with curvature control
4. Controllers: 7 main controllers functional
5. Drag adapter: unified drag system works

### Architectural Improvements
1. DI container: all services injectable
2. State management: Zustand stores functional
3. Performance: metrics meet success criteria
4. Error handling: graceful degradation
5. Code splitting: reduced bundle size

## Timeline and Milestones

### Week 1-2: Foundation
- DI container activation
- Service interface implementation
- State management migration

### Week 3-4: Steps 8-11
- Mini-view completion
- Multiple skeletons implementation
- Center of gravity
- Ring gizmos

### Week 5-6: DesignDoll Integration
- Fixed lengths integration
- Rigid skull integration
- Spine chain integration
- Main controllers integration
- Drag adapter integration

### Week 7: Quality and Polish
- Performance optimization
- Test coverage improvement
- Documentation
- Developer experience

## Conclusion

Phase 4 represents the completion of the core PoseFlow Editor functionality with the integration of professional-grade features inspired by DesignDoll. The plan balances innovation with stability, using feature flags to manage risk and ensure a smooth transition for users.

The implementation follows a modular, incremental approach that allows for continuous delivery and feedback. Each component is designed with testability, maintainability, and performance in mind, ensuring the long-term health of the codebase.

Upon completion of Phase 4, PoseFlow Editor will be a fully-featured, production-ready 3D pose editor suitable for professional use in AI art pipelines.