# Solubility Physics Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scripted soluble/insoluble animation with a quantitative, deterministic, Quest-safe scientific investigation and deploy it.

**Architecture:** A pure fixed-step domain model owns mixture physics and conservation. A focused Three.js scene maps model snapshots to instanced evidence visuals. The React viewer coordinates lesson state, shared runtime, parity controls, narration, and WebXR.

**Tech Stack:** TypeScript, React 19, Next.js 15, Three.js, shared XR School runtime, Vitest, Vercel.

---

### Task 1: Scientific model

**Files:**
- Create: `apps/web/lib/world-builder/solubilityModel.ts`
- Test: `tests/unit/solubility-model.test.ts`

- [ ] Write tests for conservation, saturation, stirring-rate independence, sedimentation, oil separation, temperature response, deterministic reset, and invalid-state rejection.
- [ ] Run the focused test and confirm it fails because the model module does not exist.
- [ ] Implement immutable substance data and a fixed-step model with explicit units and bounded inputs.
- [ ] Run the focused test and confirm all scientific behaviors pass.

### Task 2: Lesson contract

**Files:**
- Create: `apps/web/lib/world-builder/solubilityExperience.ts`
- Test: `tests/unit/solubility-experience.test.ts`

- [ ] Write failing tests for evidence-gated stage progress and transfer classification.
- [ ] Implement the authored Predict → Mix → Investigate → Explain → Transfer lesson session.
- [ ] Run the focused experience tests.

### Task 3: Scientific scene

**Files:**
- Create: `apps/web/lib/world-builder/solubilityScene.ts`

- [ ] Build the PBR bench, graduated beaker, animated liquid surface, stirrer, instrument panel, evidence layers, and instanced particles.
- [ ] Add adaptive physical/standard materials and deterministic macro/molecular presentation modes.
- [ ] Add a single update API and complete disposal.

### Task 4: Viewer integration

**Files:**
- Replace: `apps/web/components/simulations/SolubilityLabViewer.tsx`
- Modify: `tests/unit/solubility-viewer-feedback.test.ts`

- [ ] Write source contract tests for the shared runtime, instancing, model integration, measurement UI, molecular scale disclosure, and controller parity.
- [ ] Run the tests and confirm the legacy viewer fails the new contract.
- [ ] Integrate the scene/model with the shared fixed-step runtime and interaction system.
- [ ] Add responsive lab controls, quantitative evidence, narration preservation, VR actions, and accessible status feedback.
- [ ] Run focused tests and type-check.

### Task 5: Verification and deployment

**Files:**
- Modify only if verification exposes an issue.

- [ ] Run all unit tests.
- [ ] Run web type-check and production build.
- [ ] Inspect the route in a local browser and review the production bundle for runtime errors.
- [ ] Deploy the repository production configuration to Vercel.
- [ ] Fetch the live route and confirm a successful response before handing off the URL.

## Self-review

The plan covers every accepted scientific behavior, rendering constraint, learning stage, input mode, and deployment gate. It contains no implementation placeholders; scientific parameters and API names are established in the design and tests rather than duplicated as speculative code snippets here. Type ownership is directional: model → scene snapshot → viewer, while lesson state remains independent of rendering.
