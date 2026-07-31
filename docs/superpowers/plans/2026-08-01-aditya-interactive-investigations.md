# Aditya Interactive Investigations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish five net-new interactive investigations and one net-new sorting class, while enhancing the canonical Solubility lab with the useful PR #8 content, using pure domain models, evidence-gated mastery, and the shared runtime/input/audio stack.

**Architecture:** Each class is a canonical `ImplementedSimulationDefinition` in `@xr-school/simulation-content`, a deterministic reducer in `@xr-school/simulation-runtime`, and a projection-only scene adapter hosted by `@xr-school/simulation-web`. A shared interactive-investigation session is the sole bridge from normalized learner actions to domain state, lesson evidence, assessment evidence, and mastery; scenes dispatch actions but cannot record educational evidence directly. The existing Solubility solver moves from `apps/web` into the runtime, retains its quantitative behavior, and gains the PR's sawdust/fair-test contribution without creating a second module or route.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 15, Three.js 0.170, WebXR, Vitest 2, Playwright 1.61, npm workspaces.

---

## Execution context and dependency order

This plan runs after the shared schema/content/runtime/web-library plan has created these contracts:

- `ImplementedSimulationDefinition` and the expanded `SimulationModuleRecord` in `packages/simulation-schema/src/`.
- `packages/simulation-content/src/implemented/registry.ts`.
- `SimulationSceneAdapter`, `SimulationSceneContext`, and `SimulationSceneHandle` in `packages/simulation-web/src/scene/types.ts`.
- `createSimulationHost` and `SimulationHost` in `packages/simulation-web/src/host/createSimulationHost.ts`.
- the canonical viewer registry in `apps/web/lib/simulations/viewerRegistry.ts`.
- canonical assets under `apps/web/public/simulations/<canonical-slug>/`.

Before Task 1, run:

```bash
npm run verify
```

Expected: exit 0 on the shared-library integration head. If this baseline fails, stop and repair that earlier plan rather than folding unrelated failures into these commits.

## File map

### Shared interactive runtime

- Create `packages/simulation-runtime/src/experience/interactiveInvestigation.ts`: atomically applies normalized actions to a pure reducer, lesson evidence, assessment evidence, feedback, and mastery.
- Modify `packages/simulation-runtime/src/index.ts`: export the interactive session contracts.
- Create `tests/unit/interactive-investigation-session.test.ts`: behavioral proof that inputs are equivalent and renderer code cannot fabricate evidence.

### Canonical content

- Create `packages/simulation-content/src/implemented/interactive/shared.ts`: typed helpers for common release metadata, narration URLs, and PR provenance.
- Create `packages/simulation-content/src/implemented/interactive/floatOrSink.ts`.
- Create `packages/simulation-content/src/implemented/interactive/solubility.ts`.
- Create `packages/simulation-content/src/implemented/interactive/lipidTest.ts`.
- Create `packages/simulation-content/src/implemented/interactive/mineralSources.ts`.
- Create `packages/simulation-content/src/implemented/interactive/vitaminDeficiencies.ts`.
- Create `packages/simulation-content/src/implemented/interactive/shapeSorting.ts`.
- Create `packages/simulation-content/src/implemented/interactive/index.ts`.
- Modify `packages/simulation-content/src/implemented/registry.ts`: register the six canonical definitions exactly once.
- Create `tests/unit/interactive-simulation-definitions.test.ts`: validate identities, aliases, stages, assessment/mastery, narration, assets, and contribution metadata.

### Pure domain models

- Create `packages/simulation-runtime/src/models/floatOrSinkModel.ts`.
- Create `packages/simulation-runtime/src/models/solubilityModel.ts` by moving and enhancing `apps/web/lib/world-builder/solubilityModel.ts`.
- Create `packages/simulation-runtime/src/models/lipidTestModel.ts`.
- Create `packages/simulation-runtime/src/models/nutritionMatchModel.ts`.
- Create `packages/simulation-runtime/src/models/shapeSortingModel.ts`.
- Create or replace the five corresponding model tests under `tests/unit/`.

### Browser/WebXR composition

- Create `apps/web/components/simulations/InteractiveInvestigationViewer.tsx`: common React composition using `SimulationExperienceShell` and `createSimulationHost`.
- Create `apps/web/lib/simulations/interactive/types.ts`: typed registrations and projectable adapter extension.
- Create `apps/web/lib/simulations/interactive/sceneKit.ts`: disposable workbench, labels, action targets, and environment fallback primitives.
- Create six adapters in `apps/web/lib/simulations/interactive/*.scene.ts`.
- Modify `apps/web/lib/simulations/viewerRegistry.ts`: map all six `viewerKey` values to their session and adapter factories.
- Delete the superseded private Solubility viewer/model/experience/scene files only after the canonical route passes.

### Assets and acceptance

- Create canonical browser/Quest environment and fallback files under each module's `apps/web/public/simulations/<slug>/` directory; narration uses captioned shared `browserTts` fallback until reviewed MP3s are committed.
- Create `tests/unit/interactive-viewer-registry.test.ts` and `tests/unit/interactive-scene-adapters.test.ts`.
- Create `tests/e2e/interactive-investigations.spec.ts` with a representative deep flow per interactive family and smoke coverage for all six routes.

---

### Task 1: Add the evidence-safe interactive investigation session

**Files:**

- Create: `packages/simulation-runtime/src/experience/interactiveInvestigation.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/interactive-investigation-session.test.ts`

- [ ] **Step 1: Write the failing behavioral tests**

Create `tests/unit/interactive-investigation-session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type {
  AssessmentSequence,
  ExperienceDefinition,
  NormalizedAction,
  NormalizedInputSource,
} from "../../packages/simulation-schema/src/index";
import {
  createInteractiveInvestigationSession,
  type InvestigationReducer,
} from "../../packages/simulation-runtime/src/index";

interface TestState {
  observations: number;
}

const experience: ExperienceDefinition = {
  id: "experience-interactive-test",
  gradeTone: "class6To8",
  objective: "Use observation, misconception, and transfer evidence.",
  stages: [
    {
      id: "observe",
      title: "Observe",
      cue: "Run the trial.",
      requiredActionIds: ["trial.observe"],
      completionEvidenceIds: ["trial-observed"],
    },
    {
      id: "misconception",
      title: "Resolve",
      cue: "Reject the misconception.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["misconception-resolved"],
    },
    {
      id: "transfer",
      title: "Transfer",
      cue: "Apply the idea to a new case.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["transfer-solved"],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: "assessment-interactive-test",
  objectiveId: experience.id,
  prompts: [
    {
      id: "misconception-prompt",
      kind: "misconception",
      stageId: "misconception",
      question: "Does appearance alone determine the result?",
      options: [
        { id: "appearance-only", label: "Yes" },
        { id: "measured-evidence", label: "No" },
      ],
      acceptedEvidenceIds: ["measured-evidence"],
      hint: "Use the observed trial.",
      explanation:
        "The measured trial, not appearance alone, determines the result.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "transfer-prompt",
      kind: "transfer",
      stageId: "transfer",
      question: "Which new case follows the observed rule?",
      options: [
        { id: "same-rule", label: "The case with the same measured evidence" },
        { id: "same-colour", label: "The case with the same colour" },
      ],
      acceptedEvidenceIds: ["same-rule"],
      hint: "Transfer the evidence rule.",
      explanation: "The new case must match the evidence pattern.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 2,
    requiredKinds: ["misconception", "transfer"],
    allowHintedMastery: false,
  },
};

const reducer: InvestigationReducer<TestState> = (state, action) => {
  if (action.actionId !== "trial.observe") {
    throw new Error(`Unsupported test action ${action.actionId}`);
  }
  return {
    state: { observations: state.observations + 1 },
    lessonActionId: "trial.observe",
    evidenceIds: ["trial-observed"],
    feedback: { tone: "success", message: "The trial was observed." },
  };
};

function action(
  actionId: string,
  stageId: string,
  source: NormalizedInputSource = "mouse",
  targetEntityId = "trial",
  value?: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId,
    source,
    phase: "commit",
    stageId,
    timestampMs: 100,
    value,
  };
}

function createSession() {
  return createInteractiveInvestigationSession({
    experience,
    assessment,
    initialState: { observations: 0 },
    reducer,
    assessmentBindings: {
      "misconception-prompt": {
        lessonActionId: "assessment.answer",
        lessonEvidenceId: "misconception-resolved",
      },
      "transfer-prompt": {
        lessonActionId: "assessment.answer",
        lessonEvidenceId: "transfer-solved",
      },
    },
  });
}

describe("interactive investigation session", () => {
  it("records lesson evidence only after a valid domain transition", () => {
    const session = createSession();

    const result = session.dispatch(action("trial.observe", "observe"));

    expect(result.domain.observations).toBe(1);
    expect(result.lesson).toMatchObject({
      stageComplete: true,
      performedActionIds: ["trial.observe"],
      recordedEvidenceIds: ["trial-observed"],
    });
  });

  it("rejects stale-stage actions before mutating domain or lesson state", () => {
    const session = createSession();

    expect(() => session.dispatch(action("trial.observe", "transfer"))).toThrow(
      /current stage observe/i,
    );
    expect(session.snapshot()).toMatchObject({
      domain: { observations: 0 },
      lesson: { performedActionIds: [], recordedEvidenceIds: [] },
    });
  });

  it("does not award evidence or mastery for a wrong assessment answer", () => {
    const session = createSession();
    session.dispatch(action("trial.observe", "observe"));
    session.next();

    const wrong = session.dispatch(
      action(
        "assessment.answer",
        "misconception",
        "keyboard",
        "misconception-prompt",
        "appearance-only",
      ),
    );

    expect(wrong.lesson.stageComplete).toBe(false);
    expect(wrong.lesson.recordedEvidenceIds).not.toContain(
      "misconception-resolved",
    );
    expect(wrong.mastery.mastered).toBe(false);
    expect(wrong.feedback).toMatchObject({
      tone: "retry",
      message: "Use the observed trial.",
    });
  });

  it("keeps completion separate from unhinted mastery", () => {
    const session = createSession();
    session.dispatch(action("trial.observe", "observe"));
    session.next();
    session.dispatch(
      action(
        "assessment.answer",
        "misconception",
        "mouse",
        "misconception-prompt",
        "measured-evidence",
      ),
    );
    session.next();

    expect(session.snapshot().lesson.lessonComplete).toBe(false);
    expect(session.snapshot().mastery.mastered).toBe(false);

    const completed = session.dispatch(
      action(
        "assessment.answer",
        "transfer",
        "touch",
        "transfer-prompt",
        "same-rule",
      ),
    );
    expect(completed.lesson.lessonComplete).toBe(true);
    expect(completed.mastery.mastered).toBe(true);
  });

  it.each<NormalizedInputSource>([
    "mouse",
    "touch",
    "keyboard",
    "xr-controller",
  ])("maps %s to the same domain and evidence result", (source) => {
    const session = createSession();
    const result = session.dispatch(action("trial.observe", "observe", source));
    expect(result.domain).toEqual({ observations: 1 });
    expect(result.lesson.recordedEvidenceIds).toEqual(["trial-observed"]);
  });

  it("restarts lesson, assessment, feedback, and domain state together", () => {
    const session = createSession();
    session.dispatch(action("trial.observe", "observe"));
    session.restart();

    expect(session.snapshot()).toMatchObject({
      domain: { observations: 0 },
      lesson: { stageId: "observe", recordedEvidenceIds: [] },
      mastery: { mastered: false, evidenceCount: 0 },
      feedback: undefined,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify the missing export fails**

Run:

```bash
npm test -- tests/unit/interactive-investigation-session.test.ts
```

Expected: FAIL because `createInteractiveInvestigationSession` and `InvestigationReducer` are not exported by `@xr-school/simulation-runtime`.

- [ ] **Step 3: Implement the atomic interactive session**

Create `packages/simulation-runtime/src/experience/interactiveInvestigation.ts`:

```ts
import {
  validateNormalizedAction,
  type AssessmentSequence,
  type ExperienceDefinition,
  type NormalizedAction,
} from "../../../simulation-schema/src/index";
import { createAssessmentSession } from "../world/assessment";
import { createLessonSession, type LessonSnapshot } from "./lessonSession";

export interface InvestigationFeedback {
  tone: "information" | "success" | "retry" | "error";
  message: string;
}

export interface InvestigationTransition<State> {
  state: State;
  lessonActionId: string;
  evidenceIds: readonly string[];
  feedback?: InvestigationFeedback;
}

export type InvestigationReducer<State> = (
  state: Readonly<State>,
  action: NormalizedAction,
) => InvestigationTransition<State>;

export interface AssessmentBinding {
  lessonActionId: string;
  lessonEvidenceId: string;
}

export interface InteractiveInvestigationConfig<State> {
  experience: ExperienceDefinition;
  assessment: AssessmentSequence;
  initialState: State;
  reducer: InvestigationReducer<State>;
  assessmentBindings: Record<string, AssessmentBinding>;
}

export interface InteractiveInvestigationSnapshot<State> {
  lesson: LessonSnapshot;
  domain: State;
  mastery: ReturnType<ReturnType<typeof createAssessmentSession>["mastery"]>;
  feedback?: InvestigationFeedback;
}

export interface InteractiveInvestigationSession<State> {
  dispatch(action: NormalizedAction): InteractiveInvestigationSnapshot<State>;
  next(): InteractiveInvestigationSnapshot<State>;
  previous(): InteractiveInvestigationSnapshot<State>;
  restart(): InteractiveInvestigationSnapshot<State>;
  snapshot(): InteractiveInvestigationSnapshot<State>;
}

function clone<State>(value: State): State {
  return structuredClone(value);
}

export function createInteractiveInvestigationSession<State>(
  config: InteractiveInvestigationConfig<State>,
): InteractiveInvestigationSession<State> {
  const lesson = createLessonSession(config.experience);
  const assessment = createAssessmentSession(config.assessment);
  let domain = clone(config.initialState);
  let feedback: InvestigationFeedback | undefined;

  const currentStage = () =>
    config.experience.stages[lesson.snapshot().stageIndex];

  const snapshot = (): InteractiveInvestigationSnapshot<State> => ({
    lesson: lesson.snapshot(),
    domain: clone(domain),
    mastery: assessment.mastery(),
    feedback: feedback ? { ...feedback } : undefined,
  });

  const assertCurrentAction = (action: NormalizedAction) => {
    const errors = validateNormalizedAction(action);
    if (errors.length > 0) throw new Error(errors.join("; "));
    if (action.phase !== "commit") {
      throw new Error(
        `Interactive action ${action.actionId} must use the commit phase`,
      );
    }
    if (action.stageId !== currentStage().id) {
      throw new Error(
        `Action ${action.actionId} targets ${action.stageId}; current stage ${currentStage().id}`,
      );
    }
  };

  const assertLessonTransition = (
    lessonActionId: string,
    evidenceIds: readonly string[],
  ) => {
    const stage = currentStage();
    if (!stage.requiredActionIds.includes(lessonActionId)) {
      throw new Error(
        `Action ${lessonActionId} is not permitted in current stage ${stage.id}`,
      );
    }
    for (const evidenceId of evidenceIds) {
      if (!stage.completionEvidenceIds.includes(evidenceId)) {
        throw new Error(
          `Evidence ${evidenceId} does not belong to current stage ${stage.id}`,
        );
      }
    }
  };

  return {
    dispatch(action) {
      assertCurrentAction(action);

      if (action.actionId === "assessment.answer") {
        const binding = config.assessmentBindings[action.targetEntityId];
        if (!binding) {
          throw new Error(
            `Assessment prompt ${action.targetEntityId} has no lesson binding`,
          );
        }
        if (typeof action.value !== "string" || !action.value.trim()) {
          throw new Error(
            `Assessment prompt ${action.targetEntityId} requires an answer ID`,
          );
        }
        assertLessonTransition(binding.lessonActionId, [
          binding.lessonEvidenceId,
        ]);
        const answer = assessment.answer(action.targetEntityId, action.value);
        lesson.performAction(binding.lessonActionId);
        if (answer.correct) {
          lesson.recordEvidence(binding.lessonEvidenceId);
          feedback = {
            tone: "success",
            message: answer.explanation ?? "Evidence accepted.",
          };
        } else {
          feedback = {
            tone: "retry",
            message: answer.hint ?? "Observe again and retry.",
          };
        }
        return snapshot();
      }

      const transition = config.reducer(clone(domain), action);
      assertLessonTransition(transition.lessonActionId, transition.evidenceIds);
      lesson.performAction(transition.lessonActionId);
      for (const evidenceId of transition.evidenceIds) {
        lesson.recordEvidence(evidenceId);
      }
      domain = clone(transition.state);
      feedback = transition.feedback ? { ...transition.feedback } : undefined;
      return snapshot();
    },

    next() {
      lesson.next();
      feedback = undefined;
      return snapshot();
    },

    previous() {
      lesson.previous();
      feedback = undefined;
      return snapshot();
    },

    restart() {
      lesson.restart();
      assessment.reset();
      domain = clone(config.initialState);
      feedback = undefined;
      return snapshot();
    },

    snapshot,
  };
}
```

Append these exports to `packages/simulation-runtime/src/index.ts`:

```ts
export { createInteractiveInvestigationSession } from "./experience/interactiveInvestigation";
export type {
  AssessmentBinding,
  InteractiveInvestigationConfig,
  InteractiveInvestigationSession,
  InteractiveInvestigationSnapshot,
  InvestigationFeedback,
  InvestigationReducer,
  InvestigationTransition,
} from "./experience/interactiveInvestigation";
```

- [ ] **Step 4: Run the focused test and runtime type-check**

Run:

```bash
npm test -- tests/unit/interactive-investigation-session.test.ts
npm --workspace packages/simulation-runtime run type-check
```

Expected: the Vitest file reports 6 passing tests and the runtime type-check exits 0.

- [ ] **Step 5: Commit the shared evidence boundary**

```bash
git add packages/simulation-runtime/src/experience/interactiveInvestigation.ts packages/simulation-runtime/src/index.ts tests/unit/interactive-investigation-session.test.ts
git commit -m "feat(runtime): add evidence-safe interactive investigations"
```

### Task 2: Define the six canonical interactive modules and their mastery contracts

**Files:**

- Create: `packages/simulation-content/src/implemented/interactive/shared.ts`
- Create: `packages/simulation-content/src/implemented/interactive/floatOrSink.ts`
- Create: `packages/simulation-content/src/implemented/interactive/solubility.ts`
- Create: `packages/simulation-content/src/implemented/interactive/lipidTest.ts`
- Create: `packages/simulation-content/src/implemented/interactive/mineralSources.ts`
- Create: `packages/simulation-content/src/implemented/interactive/vitaminDeficiencies.ts`
- Create: `packages/simulation-content/src/implemented/interactive/shapeSorting.ts`
- Create: `packages/simulation-content/src/implemented/interactive/index.ts`
- Modify: `packages/simulation-content/src/implemented/registry.ts`
- Test: `tests/unit/interactive-simulation-definitions.test.ts`

- [ ] **Step 1: Write the failing content-contract test**

Create `tests/unit/interactive-simulation-definitions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { INTERACTIVE_SIMULATIONS } from "../../packages/simulation-content/src/implemented/interactive/index";

const expected = [
  {
    slug: "c5-ch07-a01-a-concept-about-what-floats-what-sinks",
    legacyPath: "/simulations/experiments-with-water-float-or-sink",
  },
  {
    slug: "c5-ch07-a03-soluble-and-insoluble-substances",
    legacyPath: "/simulations/experiments-with-water-soluble-insoluble",
  },
  {
    slug: "c6-ch02-a03-test-the-presence-of-lipids",
    legacyPath: "/simulations/components-of-food-lipid-test",
  },
  {
    slug: "c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies",
    legacyPath: "/simulations/components-of-food-vitamins-deficiencies",
  },
  {
    slug: "c6-ch02-a05-the-sources-of-minerals-in-food",
    legacyPath: "/simulations/components-of-food-mineral-sources",
  },
  {
    slug: "c6-ch04-a01-sorting-materials-according-to-their-shape",
    legacyPath: "/simulations/sorting-materials-by-shape",
  },
] as const;

describe("interactive simulation definitions", () => {
  it("defines every canonical identity and PR compatibility path exactly once", () => {
    expect(
      INTERACTIVE_SIMULATIONS.map((item) => item.module.slug).sort(),
    ).toEqual(expected.map((item) => item.slug).sort());
    expect(
      new Set(INTERACTIVE_SIMULATIONS.map((item) => item.module.id)).size,
    ).toBe(6);
    expect(
      new Set(INTERACTIVE_SIMULATIONS.flatMap((item) => item.legacyPaths)).size,
    ).toBe(6);
    for (const item of expected) {
      const definition = INTERACTIVE_SIMULATIONS.find(
        (candidate) => candidate.module.slug === item.slug,
      );
      expect(definition?.legacyPaths).toContain(item.legacyPath);
    }
  });

  it("separates public release from evidence maturity", () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.kind).toBe("interactive");
      expect(definition.module.publicationStatus).toBe("released");
      expect(definition.module.evidenceMaturity).toBe("internalQA");
      expect(definition.module.status).toBe("released");
      expect(definition.module.releaseMaturity).toBe("internalQA");
    }
  });

  it("requires action plus domain evidence at every lesson stage", () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.experience.stages.length).toBeGreaterThanOrEqual(4);
      for (const stage of definition.experience.stages) {
        expect(stage.requiredActionIds.length).toBeGreaterThan(0);
        expect(stage.completionEvidenceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("requires observation, misconception, and transfer for mastery", () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(
        definition.assessment.prompts.map((prompt) => prompt.kind),
      ).toEqual(
        expect.arrayContaining(["observation", "misconception", "transfer"]),
      );
      expect(definition.assessment.masteryRule.requiredKinds).toEqual([
        "observation",
        "misconception",
        "transfer",
      ]);
      expect(definition.assessment.masteryRule.allowHintedMastery).toBe(false);
    }
  });

  it("uses captioned shared narration without claiming absent MP3 files", () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.narration.fallback).toBe("browserTts");
      expect(
        definition.narration.cues.map((cue) => cue.stageId).sort(),
      ).toEqual(definition.experience.stages.map((stage) => stage.id).sort());
      for (const cue of definition.narration.cues) {
        expect(cue.caption).toBe(cue.text);
        expect(cue.audioUrl).toBeUndefined();
      }
    }
  });

  it("records exact PR provenance and explicit visual fallbacks", () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.contribution).toMatchObject({
        source: "pr-8",
        contributor: "Aditya Kumar Pandey",
      });
      expect(definition.contribution.sourcePath).toMatch(/Viewer\.tsx$/);
      const assetIds = definition.assets.assets.map((asset) => asset.id);
      expect(assetIds).toContain(
        `${definition.module.slug}-environment-browser`,
      );
      expect(assetIds).toContain(`${definition.module.slug}-environment-quest`);
      expect(assetIds).toContain(
        `${definition.module.slug}-environment-fallback`,
      );
      expect(
        definition.assets.assets.every(
          (asset) => asset.source.trim().length > 0,
        ),
      ).toBe(true);
      expect(
        definition.assets.assets.every(
          (asset) => asset.license.trim().length > 0,
        ),
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module fails**

Run:

```bash
npm test -- tests/unit/interactive-simulation-definitions.test.ts
```

Expected: FAIL because `packages/simulation-content/src/implemented/interactive/index.ts` does not exist.

- [ ] **Step 3: Add the common release, narration, and asset helpers**

Create `packages/simulation-content/src/implemented/interactive/shared.ts`:

```ts
import type {
  AssetManifest,
  NarrationCueDefinition,
  SimulationModuleRecord,
  SimulationNarrationManifest,
} from "../../../../simulation-schema/src/index";

type CommonModuleFields =
  | "applicableBoards"
  | "evidenceConfidenceLevel"
  | "releaseMaturity"
  | "publicationStatus"
  | "evidenceMaturity"
  | "targetFrameRateFps"
  | "minQuestStorageGb"
  | "status";

export type ReleasedInteractiveModuleInput = Omit<
  SimulationModuleRecord,
  CommonModuleFields
>;

export function releasedInteractiveModule(
  input: ReleasedInteractiveModuleInput,
): SimulationModuleRecord {
  return {
    ...input,
    applicableBoards: ["cbse", "icse"],
    evidenceConfidenceLevel: "expertDesigned",
    releaseMaturity: "internalQA",
    publicationStatus: "released",
    evidenceMaturity: "internalQA",
    targetFrameRateFps: 72,
    minQuestStorageGb: 1,
    status: "released",
  };
}

export function captionedNarration(
  slug: string,
  cues: readonly NarrationCueDefinition[],
): SimulationNarrationManifest {
  return {
    id: `narration-${slug}`,
    cues: cues.map((cue) => ({ ...cue, caption: cue.text })),
    fallback: "browserTts",
  };
}

export function contributedEnvironmentAssets(input: {
  slug: string;
  sourcePath: string;
  sourceSha256: string;
}): AssetManifest {
  const source = `GitHub PR #8 at 621dfb61: ${input.sourcePath}; SHA-256 ${input.sourceSha256}`;
  const author =
    "Aditya Kumar Pandey (PR #8 contributor); external generator metadata unavailable";
  const license =
    "Contribution accepted under repository terms; upstream generation license undocumented";
  return {
    id: `assets-${input.slug}`,
    assets: [
      {
        id: `${input.slug}-environment-browser`,
        url: `/simulations/${input.slug}/environment-browser.webp`,
        kind: "environment",
        source,
        license,
        author,
        width: 1774,
        height: 887,
        channels: ["rgb"],
        compression: "WebP quality 82",
        fallbackAssetId: `${input.slug}-environment-fallback`,
      },
      {
        id: `${input.slug}-environment-quest`,
        url: `/simulations/${input.slug}/environment-quest.webp`,
        kind: "environment",
        source,
        license,
        author,
        width: 1024,
        height: 512,
        channels: ["rgb"],
        compression: "WebP quality 72",
        fallbackAssetId: `${input.slug}-environment-fallback`,
      },
      {
        id: `${input.slug}-environment-fallback`,
        url: `/simulations/${input.slug}/environment-fallback.svg`,
        kind: "environment",
        source: "Repository-authored deterministic gradient fallback",
        license: "XR School project asset",
        author: "XR School",
        width: 1024,
        height: 512,
        channels: ["rgb"],
        compression: "SVG",
      },
    ],
  };
}

export const PR8_CONTRIBUTOR = "Aditya Kumar Pandey";
```

- [ ] **Step 4: Add the Float or Sink and enhanced Solubility definitions**

Create `packages/simulation-content/src/implemented/interactive/floatOrSink.ts`:

```ts
import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
} from "../../../../simulation-schema/src/index";
import {
  captionedNarration,
  contributedEnvironmentAssets,
  PR8_CONTRIBUTOR,
  releasedInteractiveModule,
} from "./shared";

const slug = "c5-ch07-a01-a-concept-about-what-floats-what-sinks";

const experience: ExperienceDefinition = {
  id: "experience-float-or-sink",
  gradeTone: "class3To5",
  objective:
    "Predict, test, and explain floating using material, shape, trapped air, weight, and displaced water.",
  stages: [
    {
      id: "predict",
      title: "Predict six objects",
      cue: "Predict before each object touches the water.",
      requiredActionIds: ["float-sink.predict"],
      completionEvidenceIds: [
        "prediction-leaf-recorded",
        "prediction-stone-recorded",
        "prediction-cork-recorded",
        "prediction-spoon-recorded",
        "prediction-bottle-recorded",
        "prediction-marble-recorded",
      ],
    },
    {
      id: "observe",
      title: "Test in water",
      cue: "Release each object and observe its final position before classifying it.",
      requiredActionIds: ["float-sink.test"],
      completionEvidenceIds: [
        "observation-leaf-float",
        "observation-stone-sink",
        "observation-cork-float",
        "observation-spoon-sink",
        "observation-bottle-float",
        "observation-marble-sink",
      ],
    },
    {
      id: "explain",
      title: "Read the evidence",
      cue: "Choose the observation pair that proves size alone cannot decide.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["float-sink-observation-explained"],
    },
    {
      id: "misconception",
      title: "Resolve the size rule",
      cue: "Decide whether every large object floats and every small object sinks.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["float-sink-misconception-resolved"],
    },
    {
      id: "transfer",
      title: "Transfer to a foil boat",
      cue: "Apply displacement and trapped-air evidence to the same foil in a new shape.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["float-sink-transfer-solved"],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: "assessment-float-or-sink",
  objectiveId: experience.id,
  prompts: [
    {
      id: "float-sink-observation",
      kind: "observation",
      stageId: "explain",
      question:
        "Which pair best shows that size alone does not decide floating?",
      options: [
        {
          id: "bottle-floats-marble-sinks",
          label: "The large empty bottle floats while the small marble sinks",
        },
        { id: "leaf-and-cork-float", label: "The leaf and cork both float" },
      ],
      acceptedEvidenceIds: ["bottle-floats-marble-sinks"],
      hint: "Compare one large object with one small object.",
      explanation:
        "The large bottle floats because trapped air lowers average density; the small glass marble sinks.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "float-sink-misconception",
      kind: "misconception",
      stageId: "misconception",
      question: "Is “large floats and small sinks” a reliable rule?",
      options: [
        { id: "size-decides", label: "Yes, size decides" },
        {
          id: "balance-decides",
          label: "No, weight and displaced-water support must balance",
        },
      ],
      acceptedEvidenceIds: ["balance-decides"],
      hint: "Use the bottle and marble evidence.",
      explanation:
        "Material, shape, trapped air, weight, and displaced volume determine the balance.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "float-sink-transfer",
      kind: "transfer",
      stageId: "transfer",
      question:
        "The same sheet of foil sinks as a tight ball. What can make it float?",
      options: [
        { id: "paint-it-blue", label: "Paint it blue" },
        {
          id: "shape-wide-boat",
          label: "Shape it into a wide boat that displaces more water",
        },
      ],
      acceptedEvidenceIds: ["shape-wide-boat"],
      hint: "Change displaced volume without changing foil mass.",
      explanation:
        "A wide boat shape displaces enough water for buoyant support to balance its weight.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ["observation", "misconception", "transfer"],
    allowHintedMastery: false,
  },
};

export const FLOAT_OR_SINK: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: "sim-c05-ch07-a01-a-concept-about-what-floats-what-sinks",
    slug,
    viewerKey: "interactive-float-or-sink",
    legacyAliases: ["experiments-with-water-float-or-sink"],
    title: "What Floats, What Sinks?",
    summary:
      "Predict and test six familiar objects, then explain floating through weight, displaced water, shape, material, and trapped air.",
    gradeBands: ["class3To5"],
    subjects: ["environmentalScience", "science"],
    curriculumMapIds: ["cm-cbse-c5-ch07-water-experiments"],
    conceptIds: ["concept-buoyancy", "concept-density", "concept-displacement"],
    simulationFormat: "interactive3d",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "A resettable transparent tank makes the complete motion and displaced-water relationship visible from multiple viewpoints.",
    learningObjective: experience.objective,
    scientificConceptExplanation:
      "An object floats when the upward buoyant force from displaced water can balance its weight before it is fully submerged. Average density, shape, and trapped air change that balance.",
    misconceptionsAddressed: [
      "Large objects always float.",
      "Small objects always sink.",
      "Only weight matters; shape and trapped air do not.",
    ],
    visualizationStrategy:
      "Use a transparent tank, waterline, force arrows, ripples, and final-position markers.",
    interactionStrategy:
      "Learners select an object, record a prediction, release it, and cite the observed final position.",
    imaginationHelperStrategy:
      "Visible force arrows represent weight and buoyant support; arrows are illustrative and not to scale.",
    practicalUseCase:
      "Connects boats, life jackets, bottles, stones, and household water observations.",
    cueCardIds: experience.stages.map((stage) => `cue-${stage.id}`),
    revisionCardIds: ["rev-float-sink-foil-boat"],
    assessmentHookIds: assessment.prompts.map((prompt) => prompt.id),
    instructorScript:
      "Before launch, collect six predictions. During the headset turn, require the learner to release every object and name its final position. Debrief with the bottle-versus-marble comparison and the foil-boat transfer.",
    batchActivityPrompt:
      "Record object, prediction, final position, and one explanation clue for all six trials.",
    expectedDurationMinutes: 8,
    maxSessionDurationMinutes: 10,
    comfortRiskLevel: "low",
    safetyNotes: [
      "Use stationary tank mode.",
      "Force arrows are explanatory representations, not measured to scale.",
    ],
    offlineContentPackId: "pack-evs-water-experiments-class5-v1",
    estimatedPackageSizeMb: 150,
    stages: experience.stages.length,
  }),
  kind: "interactive",
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: "float-sink-predict",
      stageId: "predict",
      text: "Predict whether each object will float or sink before releasing it. Size alone is not a rule.",
      caption: "",
    },
    {
      id: "float-sink-observe",
      stageId: "observe",
      text: "Release each object and wait for its final position. Watch the surface, middle, and bottom.",
      caption: "",
    },
    {
      id: "float-sink-explain",
      stageId: "explain",
      text: "Compare the large empty bottle with the small glass marble. Which observation challenges the size rule?",
      caption: "",
    },
    {
      id: "float-sink-misconception",
      stageId: "misconception",
      text: "Floating depends on the balance between weight and support from displaced water, not size alone.",
      caption: "",
    },
    {
      id: "float-sink-transfer",
      stageId: "transfer",
      text: "Apply the evidence to foil. A wide boat shape can displace more water than the same foil pressed into a ball.",
      caption: "",
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: "apps/web/public/environments/float-sink-school-lab-360.png",
    sourceSha256:
      "3d6dab260c2695634e6160ce91724f91dbd8fe22e184786f60a247b4561ea92d",
  }),
  legacyPaths: ["/simulations/experiments-with-water-float-or-sink"],
  contribution: {
    source: "pr-8",
    contributor: PR8_CONTRIBUTOR,
    sourcePath: "apps/web/components/simulations/FloatOrSinkViewer.tsx",
  },
};
```

Create `packages/simulation-content/src/implemented/interactive/solubility.ts`:

```ts
import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
} from "../../../../simulation-schema/src/index";
import {
  captionedNarration,
  contributedEnvironmentAssets,
  PR8_CONTRIBUTOR,
  releasedInteractiveModule,
} from "./shared";

const slug = "c5-ch07-a03-soluble-and-insoluble-substances";

const experience: ExperienceDefinition = {
  id: "experience-solubility-physics-lab",
  gradeTone: "class3To5",
  objective:
    "Use a fair test and measured evidence to distinguish solutions, suspensions, sediments, floating solids, and immiscible layers.",
  stages: [
    {
      id: "predict",
      title: "Predict six substances",
      cue: "Classify salt, sugar, sand, chalk, oil, and sawdust before mixing.",
      requiredActionIds: ["solubility.predict"],
      completionEvidenceIds: [
        "prediction-salt",
        "prediction-sugar",
        "prediction-sand",
        "prediction-chalk",
        "prediction-oil",
        "prediction-sawdust",
      ],
    },
    {
      id: "fair-test",
      title: "Run equal trials",
      cue: "Use 200 g water, a 5 g sample, equal stirring, and equal settling time.",
      requiredActionIds: ["solubility.run-fair-trial"],
      completionEvidenceIds: [
        "trial-salt-solution",
        "trial-sugar-solution",
        "trial-sand-sediment",
        "trial-chalk-suspension",
        "trial-oil-separated-layer",
        "trial-sawdust-floating-solid",
      ],
    },
    {
      id: "investigate-rate",
      title: "Change one variable",
      cue: "Compare sugar with and without stirring, then compare equal samples at two temperatures.",
      requiredActionIds: ["solubility.compare-rate"],
      completionEvidenceIds: [
        "stirring-rate-compared",
        "temperature-rate-compared",
      ],
    },
    {
      id: "misconception",
      title: "Resolve disappearing matter",
      cue: "Explain whether dissolved salt is still present.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["solubility-misconception-resolved"],
    },
    {
      id: "transfer",
      title: "Classify an unknown",
      cue: "Use clouding and settling evidence to classify flour in water.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["solubility-transfer-solved"],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: "assessment-solubility",
  objectiveId: experience.id,
  prompts: [
    {
      id: "solubility-observation",
      kind: "observation",
      stageId: "investigate-rate",
      question: "What did stirring change for sugar?",
      options: [
        {
          id: "rate-not-capacity",
          label: "It increased the dissolving rate, not equilibrium capacity",
        },
        { id: "created-more-sugar", label: "It created more sugar" },
      ],
      acceptedEvidenceIds: ["rate-not-capacity"],
      hint: "Compare equal water, mass, and temperature.",
      explanation:
        "Stirring exposes fresh liquid to the solid and changes rate; it does not create matter or change the fixed-temperature capacity.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "solubility-misconception",
      kind: "misconception",
      stageId: "misconception",
      question: "Salt grains are no longer visible. What happened?",
      options: [
        { id: "salt-vanished", label: "The salt vanished" },
        {
          id: "salt-dispersed",
          label: "Salt particles remain dispersed through the solution",
        },
      ],
      acceptedEvidenceIds: ["salt-dispersed"],
      hint: "Use the mass balance and molecular lens.",
      explanation:
        "Dissolved matter remains present even when individual grains cannot be seen.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "solubility-transfer",
      kind: "transfer",
      stageId: "transfer",
      question:
        "Flour makes water cloudy and slowly settles. How should it be classified?",
      options: [
        { id: "clear-solution", label: "A clear solution" },
        {
          id: "insoluble-suspension",
          label: "An insoluble suspension that can settle",
        },
      ],
      acceptedEvidenceIds: ["insoluble-suspension"],
      hint: "Visible particles and settling are not solution evidence.",
      explanation:
        "Clouding followed by settling is evidence of an insoluble suspension.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ["observation", "misconception", "transfer"],
    allowHintedMastery: false,
  },
};

export const SOLUBILITY: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: "sim-c05-ch07-a03-soluble-and-insoluble-substances",
    slug,
    viewerKey: "interactive-solubility",
    legacyAliases: ["experiments-with-water-soluble-insoluble"],
    title: "Soluble and Insoluble Substances Lab",
    summary:
      "Run equal water-mixing trials and observe dissolving, suspension, settling, floating particles, and separated oil.",
    gradeBands: ["class3To5"],
    subjects: ["environmentalScience", "science"],
    curriculumMapIds: ["cm-cbse-c5-ch07-water-experiments"],
    conceptIds: [
      "concept-solubility",
      "concept-solution",
      "concept-mixture-observation",
    ],
    simulationFormat: "practicalLabSimulation",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "A resettable bench makes equal trials repeatable and exposes particle, mass-balance, and phase evidence that is hard to inspect in one classroom demonstration.",
    learningObjective: experience.objective,
    scientificConceptExplanation:
      "Soluble particles disperse uniformly up to a temperature-dependent capacity. Insoluble solids may settle, remain suspended, or float; immiscible oil forms a separate layer.",
    misconceptionsAddressed: [
      "Dissolving means disappearing.",
      "Every powder dissolves.",
      "Floating and dissolving are the same.",
    ],
    visualizationStrategy:
      "Use measured mass readouts, turbidity, sediment, floating sawdust, oil layers, and an illustrative molecular lens.",
    interactionStrategy:
      "Learners predict, use equal samples, stir for equal time, wait, compare one changed variable, and classify an unknown.",
    imaginationHelperStrategy:
      "The molecular lens enlarges representative particles and explicitly states that it is not to scale.",
    practicalUseCase:
      "Connects cooking, washing, muddy water, filtration, and separating mixtures.",
    cueCardIds: experience.stages.map((stage) => `cue-${stage.id}`),
    revisionCardIds: ["rev-solubility-fair-test"],
    assessmentHookIds: assessment.prompts.map((prompt) => prompt.id),
    instructorScript:
      "Collect predictions for six substances. Require equal water, sample, stirring, and waiting conditions. Debrief the different insoluble behaviors and the conserved dissolved mass.",
    batchActivityPrompt:
      "Complete a predict-observe-explain table and identify which variable must stay fixed in a fair comparison.",
    expectedDurationMinutes: 8,
    maxSessionDurationMinutes: 10,
    comfortRiskLevel: "low",
    safetyNotes: [
      "Use stationary lab mode.",
      "Only teacher-approved materials belong in a real water experiment.",
    ],
    offlineContentPackId: "pack-evs-water-experiments-class5-v1",
    estimatedPackageSizeMb: 135,
    stages: experience.stages.length,
  }),
  kind: "interactive",
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: "solubility-predict",
      stageId: "predict",
      text: "Predict soluble or insoluble for salt, sugar, sand, chalk, oil, and sawdust before mixing.",
      caption: "",
    },
    {
      id: "solubility-fair-test",
      stageId: "fair-test",
      text: "Keep water, sample mass, stirring time, and waiting time equal so the comparison is fair.",
      caption: "",
    },
    {
      id: "solubility-rate",
      stageId: "investigate-rate",
      text: "Change one variable. Stirring changes rate; warmer water can change both rate and capacity for sugar.",
      caption: "",
    },
    {
      id: "solubility-misconception",
      stageId: "misconception",
      text: "Dissolved salt remains in the water. The mass balance and molecular lens show that it did not vanish.",
      caption: "",
    },
    {
      id: "solubility-transfer",
      stageId: "transfer",
      text: "Use visible particles, clouding, settling, floating, or layering to classify a new mixture.",
      caption: "",
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: "apps/web/public/environments/float-sink-school-lab-360.png",
    sourceSha256:
      "3d6dab260c2695634e6160ce91724f91dbd8fe22e184786f60a247b4561ea92d",
  }),
  legacyPaths: ["/simulations/experiments-with-water-soluble-insoluble"],
  contribution: {
    source: "pr-8",
    contributor: PR8_CONTRIBUTOR,
    sourcePath: "apps/web/components/simulations/SolubleInsolubleViewer.tsx",
  },
};
```

- [ ] **Step 5: Add the Lipid Test definition**

Create `packages/simulation-content/src/implemented/interactive/lipidTest.ts`:

```ts
import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
} from "../../../../simulation-schema/src/index";
import {
  captionedNarration,
  contributedEnvironmentAssets,
  PR8_CONTRIBUTOR,
  releasedInteractiveModule,
} from "./shared";

const slug = "c6-ch02-a03-test-the-presence-of-lipids";

const experience: ExperienceDefinition = {
  id: "experience-lipid-paper-test",
  gradeTone: "class6To8",
  objective:
    "Perform a fair paper test and use a persistent translucent patch as evidence for lipids.",
  stages: [
    {
      id: "predict",
      title: "Predict the samples",
      cue: "Predict which samples will leave a lasting translucent patch.",
      requiredActionIds: ["lipid.predict"],
      completionEvidenceIds: [
        "prediction-peanut",
        "prediction-coconut",
        "prediction-rice",
      ],
    },
    {
      id: "procedure",
      title: "Run the paper test",
      cue: "Place, fold, crush, remove, dry, and hold each paper against light in that order.",
      requiredActionIds: ["lipid.advance-procedure"],
      completionEvidenceIds: [
        "procedure-peanut-complete",
        "procedure-coconut-complete",
        "procedure-rice-complete",
      ],
    },
    {
      id: "observe",
      title: "Compare dry papers",
      cue: "Identify the samples whose translucent patches persist after drying.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["lipid-observation-explained"],
    },
    {
      id: "misconception",
      title: "Separate water from lipid evidence",
      cue: "Decide why drying is essential before reading the paper.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["lipid-misconception-resolved"],
    },
    {
      id: "transfer",
      title: "Predict sesame seed evidence",
      cue: "Apply the procedure to an untested oil-rich seed.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["lipid-transfer-solved"],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: "assessment-lipid-paper-test",
  objectiveId: experience.id,
  prompts: [
    {
      id: "lipid-observation",
      kind: "observation",
      stageId: "observe",
      question: "Which dry papers provide positive lipid evidence?",
      options: [
        { id: "peanut-coconut", label: "Peanut and dry coconut" },
        { id: "rice-only", label: "Rice only" },
      ],
      acceptedEvidenceIds: ["peanut-coconut"],
      hint: "Look for a patch that remains translucent after drying.",
      explanation:
        "Peanut and dry coconut leave persistent translucent patches; rice leaves little or no lasting patch.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "lipid-misconception",
      kind: "misconception",
      stageId: "misconception",
      question: "Why must the paper dry before the result is read?",
      options: [
        { id: "all-wet-marks-prove-fat", label: "Every wet mark proves lipid" },
        {
          id: "water-fades-lipid-persists",
          label: "A water mark fades while a lipid patch persists",
        },
      ],
      acceptedEvidenceIds: ["water-fades-lipid-persists"],
      hint: "Compare the mark before and after drying.",
      explanation:
        "Drying removes transient moisture evidence; a lasting translucent patch supports the lipid conclusion.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "lipid-transfer",
      kind: "transfer",
      stageId: "transfer",
      question:
        "What result should oil-rich sesame seeds produce after the same complete paper test?",
      options: [
        { id: "persistent-patch", label: "A persistent translucent patch" },
        { id: "blue-paper", label: "The paper turns blue" },
      ],
      acceptedEvidenceIds: ["persistent-patch"],
      hint: "Transfer the evidence pattern from peanut and coconut.",
      explanation:
        "Oil-rich seeds should leave a persistent translucent patch when the same fair procedure is followed.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ["observation", "misconception", "transfer"],
    allowHintedMastery: false,
  },
};

export const LIPID_TEST: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: "sim-c06-ch02-a03-test-the-presence-of-lipids",
    slug,
    viewerKey: "interactive-lipid-test",
    legacyAliases: ["components-of-food-lipid-test"],
    title: "Test the Presence of Lipids",
    summary:
      "Crush peanut, dry coconut, and rice on clean paper, dry each sheet, and compare persistent translucent patches.",
    gradeBands: ["class6To8"],
    subjects: ["science", "biology"],
    curriculumMapIds: ["cm-cbse-c6-ch02-components-of-food"],
    conceptIds: [
      "concept-lipids",
      "concept-food-tests",
      "concept-fair-comparison",
    ],
    simulationFormat: "practicalLabSimulation",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "The virtual bench makes the complete comparison repeatable, keeps paper state visible, and supports side-by-side evidence inspection.",
    learningObjective: experience.objective,
    scientificConceptExplanation:
      "Lipids soak into paper and can leave a translucent patch that persists after moisture dries. The result is comparative evidence, not a quantitative measure of fat content.",
    misconceptionsAddressed: [
      "Any wet mark proves fat.",
      "A darker patch means an exact lipid quantity.",
      "The drying step can be skipped.",
    ],
    visualizationStrategy:
      "Show clean paper, crushed sample, drying state, back-light transmission, and side-by-side result cards.",
    interactionStrategy:
      "Learners predict, follow the ordered procedure for all samples, and compare only fully dried papers.",
    imaginationHelperStrategy:
      "A light-transmission meter makes translucency visible while stating that it is a qualitative indicator.",
    practicalUseCase:
      "Connects school food tests to ingredient comparison and balanced-diet discussions.",
    cueCardIds: experience.stages.map((stage) => `cue-${stage.id}`),
    revisionCardIds: ["rev-lipid-sesame-transfer"],
    assessmentHookIds: assessment.prompts.map((prompt) => prompt.id),
    instructorScript:
      "Use equal sample amounts and fresh paper. Require the full place-fold-crush-remove-dry-light sequence for all three foods. Debrief why the test is qualitative.",
    batchActivityPrompt:
      "Make a three-row evidence table with prediction, dry-paper observation, and lipid conclusion.",
    expectedDurationMinutes: 10,
    maxSessionDurationMinutes: 12,
    comfortRiskLevel: "low",
    safetyNotes: [
      "Use stationary bench mode.",
      "Real food tests require allergy-aware teacher supervision and no tasting of test samples.",
    ],
    offlineContentPackId: "pack-science-components-food-class6-v1",
    estimatedPackageSizeMb: 225,
    stages: experience.stages.length,
  }),
  kind: "interactive",
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: "lipid-predict",
      stageId: "predict",
      text: "Predict which foods will leave a lasting translucent patch after the paper is completely dry.",
      caption: "",
    },
    {
      id: "lipid-procedure",
      stageId: "procedure",
      text: "Use a fresh paper and equal sample. Place, fold, crush, remove, dry, then inspect against light.",
      caption: "",
    },
    {
      id: "lipid-observe",
      stageId: "observe",
      text: "Compare only dry papers. Peanut and dry coconut leave persistent translucent patches; rice leaves little or none.",
      caption: "",
    },
    {
      id: "lipid-misconception",
      stageId: "misconception",
      text: "A temporary water mark is not lipid evidence. Drying separates moisture from a persistent lipid patch.",
      caption: "",
    },
    {
      id: "lipid-transfer",
      stageId: "transfer",
      text: "Apply the same fair procedure to sesame seeds and predict the persistent-patch evidence.",
      caption: "",
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: "apps/web/public/environments/nutrition-lab-360.png",
    sourceSha256:
      "e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee",
  }),
  legacyPaths: ["/simulations/components-of-food-lipid-test"],
  contribution: {
    source: "pr-8",
    contributor: PR8_CONTRIBUTOR,
    sourcePath: "apps/web/components/simulations/LipidTestViewer.tsx",
  },
};
```

- [ ] **Step 6: Add the Mineral Sources and Vitamin Deficiencies definitions**

Create `packages/simulation-content/src/implemented/interactive/mineralSources.ts`:

```ts
import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
} from "../../../../simulation-schema/src/index";
import {
  captionedNarration,
  contributedEnvironmentAssets,
  PR8_CONTRIBUTOR,
  releasedInteractiveModule,
} from "./shared";

const slug = "c6-ch02-a05-the-sources-of-minerals-in-food";
const experience: ExperienceDefinition = {
  id: "experience-mineral-sources",
  gradeTone: "class6To8",
  objective:
    "Match calcium, iodine, and iron to representative sources and evidence-based body functions.",
  stages: [
    {
      id: "match",
      title: "Build three mineral links",
      cue: "Match each mineral to one source and its body function.",
      requiredActionIds: ["nutrition.submit-match"],
      completionEvidenceIds: [
        "mineral-calcium-matched",
        "mineral-iodine-matched",
        "mineral-iron-matched",
      ],
    },
    {
      id: "observe",
      title: "Read the body evidence",
      cue: "Identify the mineral whose body job involves haemoglobin and oxygen transport.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["mineral-observation-explained"],
    },
    {
      id: "misconception",
      title: "Resolve the single-food idea",
      cue: "Decide whether one food supplies every needed mineral.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["mineral-misconception-resolved"],
    },
    {
      id: "transfer",
      title: "Transfer to a meal",
      cue: "Choose a meal change that adds an iron source.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["mineral-transfer-solved"],
    },
  ],
};
const assessment: AssessmentSequence = {
  id: "assessment-mineral-sources",
  objectiveId: experience.id,
  prompts: [
    {
      id: "mineral-observation",
      kind: "observation",
      stageId: "observe",
      question: "Which mineral supports haemoglobin and oxygen transport?",
      options: [
        { id: "iron", label: "Iron" },
        { id: "calcium", label: "Calcium" },
      ],
      acceptedEvidenceIds: ["iron"],
      hint: "Use the red-blood-cell link.",
      explanation:
        "Iron is needed to make haemoglobin, which carries oxygen in blood.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "mineral-misconception",
      kind: "misconception",
      stageId: "misconception",
      question:
        "Can one representative source supply every mineral the body needs?",
      options: [
        { id: "one-source-enough", label: "Yes, one source is enough" },
        {
          id: "varied-diet",
          label: "No, a varied diet supplies different minerals",
        },
      ],
      acceptedEvidenceIds: ["varied-diet"],
      hint: "Compare the calcium, iodine, and iron source sets.",
      explanation:
        "Different foods contribute different minerals, so variety matters.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "mineral-transfer",
      kind: "transfer",
      stageId: "transfer",
      question:
        "Which addition supplies a representative plant source of iron?",
      options: [
        { id: "leafy-greens", label: "Green leafy vegetables" },
        { id: "plain-sugar", label: "Plain sugar" },
      ],
      acceptedEvidenceIds: ["leafy-greens"],
      hint: "Transfer the iron-source match.",
      explanation:
        "Green leafy vegetables are a representative iron source in this lesson.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ["observation", "misconception", "transfer"],
    allowHintedMastery: false,
  },
};

export const MINERAL_SOURCES: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: "sim-c06-ch02-a05-the-sources-of-minerals-in-food",
    slug,
    viewerKey: "interactive-mineral-sources",
    legacyAliases: ["components-of-food-mineral-sources"],
    title: "The Sources of Minerals in Food",
    summary:
      "Link calcium, iodine, and iron to representative sources and distinct body functions.",
    gradeBands: ["class6To8"],
    subjects: ["science", "biology"],
    curriculumMapIds: ["cm-cbse-c6-ch02-components-of-food"],
    conceptIds: [
      "concept-minerals",
      "concept-balanced-diet",
      "concept-haemoglobin",
    ],
    simulationFormat: "interactive3d",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "A spatial link board makes source-to-function relationships inspectable and lets learners revise incorrect links without being shown the answer.",
    learningObjective: experience.objective,
    scientificConceptExplanation:
      "Calcium supports bones and teeth, iodine supports thyroid function and growth, and iron supports haemoglobin and oxygen transport. Each has multiple dietary sources.",
    misconceptionsAddressed: [
      "All minerals do the same job.",
      "One food supplies every mineral.",
      "Minerals are needed only for bones.",
    ],
    visualizationStrategy:
      "Use three mineral nodes, food-source tokens, body-system targets, and visible connection lines.",
    interactionStrategy:
      "Learners submit both a source and a body function; a case completes only when both links are correct.",
    imaginationHelperStrategy:
      "Body targets highlight the organ or system role while avoiding literal claims that minerals travel as glowing crystals.",
    practicalUseCase:
      "Supports meal planning and interpretation of iodized salt, dairy, pulses, greens, and other source examples.",
    cueCardIds: experience.stages.map((stage) => `cue-${stage.id}`),
    revisionCardIds: ["rev-minerals-balanced-meal"],
    assessmentHookIds: assessment.prompts.map((prompt) => prompt.id),
    instructorScript:
      "Require both links for each mineral and ask learners to name a second source during debrief. State that the lesson examples are representative, not exhaustive.",
    batchActivityPrompt:
      "Draw three source-to-mineral-to-body-function chains and add one different source to each.",
    expectedDurationMinutes: 10,
    maxSessionDurationMinutes: 12,
    comfortRiskLevel: "low",
    safetyNotes: [
      "Use stationary discovery-wall mode.",
      "Do not turn nutrient information into diagnosis or supplement advice.",
    ],
    offlineContentPackId: "pack-science-components-food-class6-v1",
    estimatedPackageSizeMb: 250,
    stages: experience.stages.length,
  }),
  kind: "interactive",
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: "mineral-match",
      stageId: "match",
      text: "Match calcium, iodine, and iron to one representative source and the correct body function.",
      caption: "",
    },
    {
      id: "mineral-observe",
      stageId: "observe",
      text: "Use the completed links to identify the mineral needed for haemoglobin and oxygen transport.",
      caption: "",
    },
    {
      id: "mineral-misconception",
      stageId: "misconception",
      text: "No single source supplies every mineral in the required pattern. A varied diet matters.",
      caption: "",
    },
    {
      id: "mineral-transfer",
      stageId: "transfer",
      text: "Apply the source evidence to improve a new meal with a representative iron source.",
      caption: "",
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: "apps/web/public/environments/nutrition-lab-360.png",
    sourceSha256:
      "e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee",
  }),
  legacyPaths: ["/simulations/components-of-food-mineral-sources"],
  contribution: {
    source: "pr-8",
    contributor: PR8_CONTRIBUTOR,
    sourcePath: "apps/web/components/simulations/MineralSourcesViewer.tsx",
  },
};
```

Create `packages/simulation-content/src/implemented/interactive/vitaminDeficiencies.ts`:

```ts
import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
} from "../../../../simulation-schema/src/index";
import {
  captionedNarration,
  contributedEnvironmentAssets,
  PR8_CONTRIBUTOR,
  releasedInteractiveModule,
} from "./shared";

const slug = "c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies";
const experience: ExperienceDefinition = {
  id: "experience-vitamin-deficiencies",
  gradeTone: "class6To8",
  objective:
    "Match vitamins A, B1, C, and D to representative sources, body roles, and characteristic long-term deficiency conditions.",
  stages: [
    {
      id: "match",
      title: "Build four vitamin cases",
      cue: "Match each vitamin to one source and one characteristic deficiency condition.",
      requiredActionIds: ["nutrition.submit-match"],
      completionEvidenceIds: [
        "vitamin-a-matched",
        "vitamin-b1-matched",
        "vitamin-c-matched",
        "vitamin-d-matched",
      ],
    },
    {
      id: "observe",
      title: "Read the symptom evidence",
      cue: "Identify the case involving bleeding gums and slow wound healing.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["vitamin-observation-explained"],
    },
    {
      id: "misconception",
      title: "Resolve the instant-deficiency idea",
      cue: "Decide whether missing one serving immediately causes a deficiency disease.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["vitamin-misconception-resolved"],
    },
    {
      id: "transfer",
      title: "Transfer to a new case",
      cue: "Choose a source linked to vitamin D for a growing child.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["vitamin-transfer-solved"],
    },
  ],
};
const assessment: AssessmentSequence = {
  id: "assessment-vitamin-deficiencies",
  objectiveId: experience.id,
  prompts: [
    {
      id: "vitamin-observation",
      kind: "observation",
      stageId: "observe",
      question:
        "Which deficiency case includes bleeding gums and slow wound healing?",
      options: [
        { id: "vitamin-c-scurvy", label: "Vitamin C deficiency and scurvy" },
        { id: "vitamin-d-rickets", label: "Vitamin D deficiency and rickets" },
      ],
      acceptedEvidenceIds: ["vitamin-c-scurvy"],
      hint: "Review the vitamin C case.",
      explanation:
        "Long-term vitamin C deficiency can cause scurvy, including bleeding gums and poor wound healing.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "vitamin-misconception",
      kind: "misconception",
      stageId: "misconception",
      question:
        "Does missing one serving immediately cause a deficiency disease?",
      options: [
        { id: "instant-disease", label: "Yes, immediately" },
        {
          id: "long-term-lack",
          label:
            "No, deficiency disease follows sustained inadequate intake or availability",
        },
      ],
      acceptedEvidenceIds: ["long-term-lack"],
      hint: "Focus on the phrase long-term deficiency.",
      explanation:
        "Deficiency diseases are associated with sustained inadequate nutrient intake or availability, not one missed serving.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "vitamin-transfer",
      kind: "transfer",
      stageId: "transfer",
      question:
        "Which is a representative vitamin D source or exposure in this lesson?",
      options: [
        { id: "safe-sunlight", label: "Safe sunlight exposure" },
        { id: "plain-rice", label: "Plain rice" },
      ],
      acceptedEvidenceIds: ["safe-sunlight"],
      hint: "Transfer the vitamin D source link.",
      explanation:
        "Safe sunlight exposure supports vitamin D production; food sources can also contribute.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ["observation", "misconception", "transfer"],
    allowHintedMastery: false,
  },
};

export const VITAMIN_DEFICIENCIES: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: "sim-c06-ch02-a04-the-sources-of-vitamins-and-their-deficiencies",
    slug,
    viewerKey: "interactive-vitamin-deficiencies",
    legacyAliases: ["components-of-food-vitamins-deficiencies"],
    title: "Sources of Vitamins and Their Deficiencies",
    summary:
      "Match vitamins A, B1, C, and D to sources and characteristic deficiency evidence.",
    gradeBands: ["class6To8"],
    subjects: ["science", "biology"],
    curriculumMapIds: ["cm-cbse-c6-ch02-components-of-food"],
    conceptIds: [
      "concept-vitamins",
      "concept-deficiency-diseases",
      "concept-balanced-diet",
    ],
    simulationFormat: "interactive3d",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "A spatial case board keeps source, role, and deficiency evidence visible together while allowing repeated classification.",
    learningObjective: experience.objective,
    scientificConceptExplanation:
      "Vitamins support different functions; sustained deficiency can cause characteristic conditions such as night blindness, beriberi, scurvy, or rickets.",
    misconceptionsAddressed: [
      "All vitamins have the same role.",
      "One missed serving immediately causes disease.",
      "Sunlight is a vitamin food.",
    ],
    visualizationStrategy:
      "Use source tokens, body-role panels, symptom evidence cards, and explicit long-term deficiency labels.",
    interactionStrategy:
      "Learners submit a source and deficiency match for all four vitamins, then solve evidence and transfer questions.",
    imaginationHelperStrategy:
      "Body highlights show the affected function without depicting a diagnosis or guaranteeing a single cause.",
    practicalUseCase:
      "Supports balanced-diet reasoning and recognition of textbook deficiency examples.",
    cueCardIds: experience.stages.map((stage) => `cue-${stage.id}`),
    revisionCardIds: ["rev-vitamins-new-case"],
    assessmentHookIds: assessment.prompts.map((prompt) => prompt.id),
    instructorScript:
      "Require all four matches, distinguish sources from body production, and explain that symptoms need professional assessment and can have multiple causes.",
    batchActivityPrompt:
      "Complete a vitamin-source-role-deficiency table, then mark which claims describe long-term deficiency rather than instant effects.",
    expectedDurationMinutes: 10,
    maxSessionDurationMinutes: 12,
    comfortRiskLevel: "low",
    safetyNotes: [
      "Use stationary case-board mode.",
      "The activity is educational and must not be used for diagnosis or supplement dosing.",
    ],
    offlineContentPackId: "pack-science-components-food-class6-v1",
    estimatedPackageSizeMb: 250,
    stages: experience.stages.length,
  }),
  kind: "interactive",
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: "vitamin-match",
      stageId: "match",
      text: "Match vitamins A, B one, C, and D to a representative source and characteristic long-term deficiency condition.",
      caption: "",
    },
    {
      id: "vitamin-observe",
      stageId: "observe",
      text: "Use symptom evidence to identify the case involving bleeding gums and slow wound healing.",
      caption: "",
    },
    {
      id: "vitamin-misconception",
      stageId: "misconception",
      text: "A deficiency disease does not appear after one missed serving. The lesson concerns sustained inadequate intake or availability.",
      caption: "",
    },
    {
      id: "vitamin-transfer",
      stageId: "transfer",
      text: "Apply the vitamin D source link to a new growing-child case without turning the lesson into medical advice.",
      caption: "",
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: "apps/web/public/environments/nutrition-lab-360.png",
    sourceSha256:
      "e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee",
  }),
  legacyPaths: ["/simulations/components-of-food-vitamins-deficiencies"],
  contribution: {
    source: "pr-8",
    contributor: PR8_CONTRIBUTOR,
    sourcePath: "apps/web/components/simulations/VitaminDeficiencyViewer.tsx",
  },
};
```

- [ ] **Step 7: Add the Shape Sorting definition**

Create `packages/simulation-content/src/implemented/interactive/shapeSorting.ts`:

```ts
import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
} from "../../../../simulation-schema/src/index";
import {
  captionedNarration,
  contributedEnvironmentAssets,
  PR8_CONTRIBUTOR,
  releasedInteractiveModule,
} from "./shared";

const slug = "c6-ch04-a01-sorting-materials-according-to-their-shape";
const experience: ExperienceDefinition = {
  id: "experience-shape-sorting",
  gradeTone: "class6To8",
  objective:
    "Classify everyday objects by observable three-dimensional shape and explain why material does not determine shape group.",
  stages: [
    {
      id: "sort",
      title: "Sort eight objects",
      cue: "Inspect faces, curved surfaces, edges, and points before placing each object.",
      requiredActionIds: ["shape.assign"],
      completionEvidenceIds: [
        "shape-ball-sphere",
        "shape-orange-sphere",
        "shape-can-cylinder",
        "shape-chalk-cylinder",
        "shape-book-cuboid",
        "shape-block-cuboid",
        "shape-party-hat-cone",
        "shape-traffic-cone-cone",
      ],
    },
    {
      id: "observe",
      title: "Compare object features",
      cue: "Identify the feature shared by the tin can and chalk.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["shape-observation-explained"],
    },
    {
      id: "misconception",
      title: "Separate shape from material",
      cue: "Decide whether two objects made from different materials can share a shape.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["shape-misconception-resolved"],
    },
    {
      id: "transfer",
      title: "Sort a new object",
      cue: "Classify a dice using observable faces, edges, and corners.",
      requiredActionIds: ["assessment.answer"],
      completionEvidenceIds: ["shape-transfer-solved"],
    },
  ],
};
const assessment: AssessmentSequence = {
  id: "assessment-shape-sorting",
  objectiveId: experience.id,
  prompts: [
    {
      id: "shape-observation",
      kind: "observation",
      stageId: "observe",
      question:
        "What feature makes both a tin can and a straight piece of chalk cylindrical?",
      options: [
        {
          id: "two-circular-curved",
          label: "Two circular ends joined by a curved surface",
        },
        { id: "same-material", label: "They are made from the same material" },
      ],
      acceptedEvidenceIds: ["two-circular-curved"],
      hint: "Inspect faces and surfaces, not material.",
      explanation:
        "Both have two circular ends and one curved surface, despite different materials.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "shape-misconception",
      kind: "misconception",
      stageId: "misconception",
      question: "Can different materials belong to the same shape group?",
      options: [
        { id: "material-decides", label: "No, material decides shape group" },
        {
          id: "features-decide",
          label: "Yes, observable geometric features decide the group",
        },
      ],
      acceptedEvidenceIds: ["features-decide"],
      hint: "Compare the rubber ball with the orange.",
      explanation:
        "The rubber ball and orange are both approximately spherical although their materials differ.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "shape-transfer",
      kind: "transfer",
      stageId: "transfer",
      question: "A dice has six flat square faces. Which group fits best?",
      options: [
        { id: "cuboid", label: "Cuboid" },
        { id: "sphere", label: "Sphere" },
      ],
      acceptedEvidenceIds: ["cuboid"],
      hint: "Count flat faces and corners.",
      explanation: "A cube is a special cuboid with six square faces.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ["observation", "misconception", "transfer"],
    allowHintedMastery: false,
  },
};

export const SHAPE_SORTING: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: "sim-c06-ch04-a01-sorting-materials-according-to-their-shape",
    slug,
    viewerKey: "interactive-shape-sorting",
    legacyAliases: ["sorting-materials-by-shape"],
    title: "Sorting Materials According to Their Shape",
    summary:
      "Inspect and sort eight familiar objects as spheres, cylinders, cuboids, or cones.",
    gradeBands: ["class6To8"],
    subjects: ["science"],
    curriculumMapIds: ["cm-cbse-c6-ch04-sorting-materials"],
    conceptIds: [
      "concept-material-properties",
      "concept-three-dimensional-shapes",
      "concept-classification",
    ],
    simulationFormat: "interactive3d",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "Learners can rotate objects, inspect surfaces, and place them spatially by observable shape rather than memorizing names from flat pictures.",
    learningObjective: experience.objective,
    scientificConceptExplanation:
      "Classification uses a stated observable property. Shape groups depend on faces, curved surfaces, edges, and vertices; material is a separate property.",
    misconceptionsAddressed: [
      "Material determines shape group.",
      "Every round-looking object is a sphere.",
      "A cube is not a kind of cuboid.",
    ],
    visualizationStrategy:
      "Use rotatable objects, feature highlights, labeled bins, and persistent correct placements.",
    interactionStrategy:
      "Learners choose a bin; wrong choices retain the object and reveal a feature clue without selecting the correct bin.",
    imaginationHelperStrategy:
      "Feature outlines highlight faces and curved surfaces while preserving the familiar object form.",
    practicalUseCase:
      "Connects package shapes, cans, balls, books, chalk, and road-safety objects to classification.",
    cueCardIds: experience.stages.map((stage) => `cue-${stage.id}`),
    revisionCardIds: ["rev-shape-dice-transfer"],
    assessmentHookIds: assessment.prompts.map((prompt) => prompt.id),
    instructorScript:
      "Ask learners to name the observed feature before each placement. During debrief compare pairs with the same shape but different materials.",
    batchActivityPrompt:
      "Sort eight classroom objects by shape and write one feature that supports each category.",
    expectedDurationMinutes: 9,
    maxSessionDurationMinutes: 11,
    comfortRiskLevel: "low",
    safetyNotes: [
      "Use stationary sorting-table mode.",
      "Keep all targets within seated reach and provide keyboard-equivalent placement.",
    ],
    offlineContentPackId: "pack-science-sorting-materials-class6-v1",
    estimatedPackageSizeMb: 140,
    stages: experience.stages.length,
  }),
  kind: "interactive",
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: "shape-sort",
      stageId: "sort",
      text: "Inspect faces, curved surfaces, edges, and points, then place each object in a shape group.",
      caption: "",
    },
    {
      id: "shape-observe",
      stageId: "observe",
      text: "Compare the tin can and chalk. Their materials differ, but both have two circular ends joined by a curved surface.",
      caption: "",
    },
    {
      id: "shape-misconception",
      stageId: "misconception",
      text: "Material and shape are different properties. Different materials can share the same shape.",
      caption: "",
    },
    {
      id: "shape-transfer",
      stageId: "transfer",
      text: "Apply face, edge, and corner evidence to classify a dice.",
      caption: "",
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: "apps/web/public/environments/materials-classroom-360.png",
    sourceSha256:
      "d3620b5d71eaac1b41343c004fbb8705838cca1965e3562fc1605be6625ba53c",
  }),
  legacyPaths: ["/simulations/sorting-materials-by-shape"],
  contribution: {
    source: "pr-8",
    contributor: PR8_CONTRIBUTOR,
    sourcePath: "apps/web/components/simulations/ShapeSortingViewer.tsx",
  },
};
```

- [ ] **Step 8: Export and register the definitions once**

Create `packages/simulation-content/src/implemented/interactive/index.ts`:

```ts
export { FLOAT_OR_SINK } from "./floatOrSink";
export { SOLUBILITY } from "./solubility";
export { LIPID_TEST } from "./lipidTest";
export { MINERAL_SOURCES } from "./mineralSources";
export { VITAMIN_DEFICIENCIES } from "./vitaminDeficiencies";
export { SHAPE_SORTING } from "./shapeSorting";

import { FLOAT_OR_SINK } from "./floatOrSink";
import { SOLUBILITY } from "./solubility";
import { LIPID_TEST } from "./lipidTest";
import { MINERAL_SOURCES } from "./mineralSources";
import { VITAMIN_DEFICIENCIES } from "./vitaminDeficiencies";
import { SHAPE_SORTING } from "./shapeSorting";

export const INTERACTIVE_SIMULATIONS = [
  FLOAT_OR_SINK,
  SOLUBILITY,
  LIPID_TEST,
  VITAMIN_DEFICIENCIES,
  MINERAL_SOURCES,
  SHAPE_SORTING,
] as const;
```

In `packages/simulation-content/src/implemented/registry.ts`, import the array and include it in the locked canonical list:

```ts
import { INTERACTIVE_SIMULATIONS } from "./interactive/index";

export const IMPLEMENTED_SIMULATIONS = [
  ...GUIDED_SIMULATIONS,
  ...INTERACTIVE_SIMULATIONS,
] as const satisfies readonly ImplementedSimulationDefinition[];
```

Extend the content-contract test to call the locked registry APIs: `routeForSimulation(definition)` must return `/simulations/${definition.module.slug}`; `findImplementedSimulation(idOrSlugOrPath)` must return the same object for ID, slug, canonical path, and legacy path; and `resolveSimulationPath(legacyPath)` must return `{ definition, canonicalPath, redirect:true }` while a canonical path returns `redirect:false`.

Do not leave `SOLUBLE_INSOLUBLE_MODULE` in a second registry. The old `packages/simulation-content/src/modules.ts` export may remain temporarily for unmigrated consumers, but its Solubility object must either re-export `SOLUBILITY.module` or be removed in the final cleanup task.

- [ ] **Step 9: Run content tests and registry validation**

Run:

```bash
npm test -- tests/unit/interactive-simulation-definitions.test.ts tests/unit/simulation-modules.test.ts
npm --workspace packages/simulation-content run type-check
npm run catalog:validate
```

Expected: both Vitest files pass, content type-check exits 0, and catalog validation reports no duplicate ID, slug, alias, path, or viewer key.

- [ ] **Step 10: Commit the canonical interactive content**

```bash
git add packages/simulation-content/src/implemented/interactive packages/simulation-content/src/implemented/registry.ts tests/unit/interactive-simulation-definitions.test.ts
git commit -m "feat(content): define interactive investigation modules"
```

### Task 3: Implement the pure Float or Sink model

**Files:**

- Create: `packages/simulation-runtime/src/models/floatOrSinkModel.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/float-or-sink-model.test.ts`

- [ ] **Step 1: Write failing scientific and evidence tests**

Create `tests/unit/float-or-sink-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { NormalizedAction } from "../../packages/simulation-schema/src/index";
import {
  FLOAT_OR_SINK_OBJECTS,
  evaluateBuoyancy,
  initialFloatOrSinkState,
  reduceFloatOrSink,
} from "../../packages/simulation-runtime/src/index";

function action(
  actionId: string,
  targetEntityId: string,
  value?: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId,
    value,
    source: "mouse",
    phase: "commit",
    stageId: actionId.endsWith("predict") ? "predict" : "observe",
    timestampMs: 1,
  };
}

describe("float or sink model", () => {
  it.each([
    ["leaf", "float"],
    ["stone", "sink"],
    ["cork", "float"],
    ["spoon", "sink"],
    ["bottle", "float"],
    ["marble", "sink"],
  ] as const)(
    "classifies %s as %s from mass and maximum displaced volume",
    (id, outcome) => {
      expect(evaluateBuoyancy(FLOAT_OR_SINK_OBJECTS[id])).toMatchObject({
        outcome,
      });
    },
  );

  it("shows how shape can change the result without changing foil mass", () => {
    const ball = evaluateBuoyancy({
      massG: 8,
      maximumDisplacedVolumeMl: 3,
      waterDensityGPerMl: 1,
    });
    const boat = evaluateBuoyancy({
      massG: 8,
      maximumDisplacedVolumeMl: 120,
      waterDensityGPerMl: 1,
    });
    expect(ball.outcome).toBe("sink");
    expect(boat.outcome).toBe("float");
    expect(ball.weightN).toBeCloseTo(boat.weightN, 8);
  });

  it("requires a prediction before a test can generate observation evidence", () => {
    expect(() =>
      reduceFloatOrSink(
        initialFloatOrSinkState,
        action("float-sink.test", "stone"),
      ),
    ).toThrow(/prediction.*stone/i);
  });

  it("records prediction and observed outcome without mutating the previous state", () => {
    const predicted = reduceFloatOrSink(
      initialFloatOrSinkState,
      action("float-sink.predict", "stone", "float"),
    );
    const tested = reduceFloatOrSink(
      predicted.state,
      action("float-sink.test", "stone"),
    );

    expect(initialFloatOrSinkState.predictions).toEqual({});
    expect(predicted).toMatchObject({
      lessonActionId: "float-sink.predict",
      evidenceIds: ["prediction-stone-recorded"],
    });
    expect(tested).toMatchObject({
      state: { observations: { stone: "sink" } },
      lessonActionId: "float-sink.test",
      evidenceIds: ["observation-stone-sink"],
      feedback: { tone: "information" },
    });
  });

  it("rejects non-finite and non-positive scientific inputs", () => {
    expect(() =>
      evaluateBuoyancy({
        massG: Number.NaN,
        maximumDisplacedVolumeMl: 3,
        waterDensityGPerMl: 1,
      }),
    ).toThrow(/mass/i);
    expect(() =>
      evaluateBuoyancy({
        massG: 8,
        maximumDisplacedVolumeMl: 0,
        waterDensityGPerMl: 1,
      }),
    ).toThrow(/volume/i);
  });
});
```

- [ ] **Step 2: Verify the model export is missing**

Run:

```bash
npm test -- tests/unit/float-or-sink-model.test.ts
```

Expected: FAIL because the Float or Sink model exports do not exist.

- [ ] **Step 3: Implement buoyancy evaluation and the immutable reducer**

Create `packages/simulation-runtime/src/models/floatOrSinkModel.ts`:

```ts
import type { NormalizedAction } from "../../../simulation-schema/src/index";
import type { InvestigationReducer } from "../experience/interactiveInvestigation";

export type FloatSinkOutcome = "float" | "sink";
export type FloatSinkObjectId =
  | "leaf"
  | "stone"
  | "cork"
  | "spoon"
  | "bottle"
  | "marble";

export interface BuoyancyInput {
  massG: number;
  maximumDisplacedVolumeMl: number;
  waterDensityGPerMl: number;
}

export interface FloatSinkObject extends BuoyancyInput {
  id: FloatSinkObjectId;
  label: string;
  material: string;
  clue: string;
}

export interface BuoyancyResult {
  outcome: FloatSinkOutcome;
  averageDensityGPerMl: number;
  weightN: number;
  maximumBuoyantForceN: number;
  supportMarginN: number;
}

const NEWTONS_PER_GRAM_FORCE = 0.00980665;

export const FLOAT_OR_SINK_OBJECTS: Record<FloatSinkObjectId, FloatSinkObject> =
  {
    leaf: {
      id: "leaf",
      label: "Dry leaf",
      material: "plant material",
      clue: "Broad, light, and dry",
      massG: 0.4,
      maximumDisplacedVolumeMl: 3,
      waterDensityGPerMl: 1,
    },
    stone: {
      id: "stone",
      label: "Stone",
      material: "rock",
      clue: "Compact and heavy for its size",
      massG: 120,
      maximumDisplacedVolumeMl: 45,
      waterDensityGPerMl: 1,
    },
    cork: {
      id: "cork",
      label: "Cork",
      material: "cork with air spaces",
      clue: "Contains many tiny air spaces",
      massG: 10,
      maximumDisplacedVolumeMl: 40,
      waterDensityGPerMl: 1,
    },
    spoon: {
      id: "spoon",
      label: "Steel spoon",
      material: "solid steel",
      clue: "Solid metal with little enclosed air",
      massG: 55,
      maximumDisplacedVolumeMl: 8,
      waterDensityGPerMl: 1,
    },
    bottle: {
      id: "bottle",
      label: "Closed empty bottle",
      material: "plastic and trapped air",
      clue: "Cap traps a large volume of air",
      massG: 35,
      maximumDisplacedVolumeMl: 500,
      waterDensityGPerMl: 1,
    },
    marble: {
      id: "marble",
      label: "Glass marble",
      material: "solid glass",
      clue: "Small, compact, and without trapped air",
      massG: 20,
      maximumDisplacedVolumeMl: 8,
      waterDensityGPerMl: 1,
    },
  };

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${label} must be positive and finite`);
  return value;
}

export function evaluateBuoyancy(input: BuoyancyInput): BuoyancyResult {
  const massG = positiveFinite(input.massG, "mass");
  const volumeMl = positiveFinite(
    input.maximumDisplacedVolumeMl,
    "maximum displaced volume",
  );
  const waterDensity = positiveFinite(
    input.waterDensityGPerMl,
    "water density",
  );
  const weightN = massG * NEWTONS_PER_GRAM_FORCE;
  const maximumBuoyantForceN = waterDensity * volumeMl * NEWTONS_PER_GRAM_FORCE;
  return {
    outcome: maximumBuoyantForceN >= weightN ? "float" : "sink",
    averageDensityGPerMl: massG / volumeMl,
    weightN,
    maximumBuoyantForceN,
    supportMarginN: maximumBuoyantForceN - weightN,
  };
}

export interface FloatOrSinkState {
  predictions: Partial<Record<FloatSinkObjectId, FloatSinkOutcome>>;
  observations: Partial<Record<FloatSinkObjectId, FloatSinkOutcome>>;
  lastObjectId?: FloatSinkObjectId;
}

export const initialFloatOrSinkState: FloatOrSinkState = {
  predictions: {},
  observations: {},
};

function objectFor(action: NormalizedAction): FloatSinkObject {
  const id = action.targetEntityId as FloatSinkObjectId;
  const object = FLOAT_OR_SINK_OBJECTS[id];
  if (!object)
    throw new Error(`Unknown Float or Sink object ${action.targetEntityId}`);
  return object;
}

export const reduceFloatOrSink: InvestigationReducer<FloatOrSinkState> = (
  state,
  action,
) => {
  const object = objectFor(action);
  if (action.actionId === "float-sink.predict") {
    if (action.value !== "float" && action.value !== "sink") {
      throw new Error(`Prediction for ${object.id} must be float or sink`);
    }
    return {
      state: {
        ...state,
        predictions: { ...state.predictions, [object.id]: action.value },
        lastObjectId: object.id,
      },
      lessonActionId: "float-sink.predict",
      evidenceIds: [`prediction-${object.id}-recorded`],
      feedback: {
        tone: "information",
        message: `Prediction recorded for ${object.label}. Release it to observe.`,
      },
    };
  }
  if (action.actionId === "float-sink.test") {
    const prediction = state.predictions[object.id];
    if (!prediction)
      throw new Error(`Record a prediction for ${object.id} before testing`);
    const result = evaluateBuoyancy(object);
    return {
      state: {
        ...state,
        observations: { ...state.observations, [object.id]: result.outcome },
        lastObjectId: object.id,
      },
      lessonActionId: "float-sink.test",
      evidenceIds: [`observation-${object.id}-${result.outcome}`],
      feedback: {
        tone: prediction === result.outcome ? "success" : "information",
        message: `${object.label} ${result.outcome}s. Its maximum water support is ${result.maximumBuoyantForceN.toFixed(2)} N and its weight is ${result.weightN.toFixed(2)} N.`,
      },
    };
  }
  throw new Error(`Unsupported Float or Sink action ${action.actionId}`);
};
```

Append to `packages/simulation-runtime/src/index.ts`:

```ts
export {
  FLOAT_OR_SINK_OBJECTS,
  evaluateBuoyancy,
  initialFloatOrSinkState,
  reduceFloatOrSink,
} from "./models/floatOrSinkModel";
export type {
  BuoyancyInput,
  BuoyancyResult,
  FloatOrSinkState,
  FloatSinkObject,
  FloatSinkObjectId,
  FloatSinkOutcome,
} from "./models/floatOrSinkModel";
```

- [ ] **Step 4: Run focused tests and type-check**

Run:

```bash
npm test -- tests/unit/float-or-sink-model.test.ts
npm --workspace packages/simulation-runtime run type-check
```

Expected: 5 passing model tests and a clean runtime type-check.

- [ ] **Step 5: Commit the Float or Sink model**

```bash
git add packages/simulation-runtime/src/models/floatOrSinkModel.ts packages/simulation-runtime/src/index.ts tests/unit/float-or-sink-model.test.ts
git commit -m "feat(runtime): model float and sink evidence"
```

### Task 4: Move and enhance the canonical Solubility model

**Files:**

- Move: `apps/web/lib/world-builder/solubilityModel.ts` -> `packages/simulation-runtime/src/models/solubilityModel.ts`
- Modify: `packages/simulation-runtime/src/models/solubilityModel.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Replace: `tests/unit/solubility-model.test.ts`

- [ ] **Step 1: Replace the test imports and add PR sawdust/fair-test coverage**

Replace `tests/unit/solubility-model.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { NormalizedAction } from "../../packages/simulation-schema/src/index";
import {
  createSolubilityModel,
  initialSolubilityInvestigationState,
  reduceSolubilityInvestigation,
  runFairSolubilityTrial,
  type MixtureSnapshot,
} from "../../packages/simulation-runtime/src/index";

function total(snapshot: MixtureSnapshot) {
  return (
    snapshot.dissolvedMassG +
    snapshot.suspendedMassG +
    snapshot.settledMassG +
    snapshot.separatedMassG +
    snapshot.floatingMassG
  );
}

function advance(
  model: ReturnType<typeof createSolubilityModel>,
  seconds: number,
) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60)
    model.step(1 / 60);
  return model.snapshot();
}

function action(
  actionId: string,
  targetEntityId: string,
  value?: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId,
    value,
    source: "mouse",
    phase: "commit",
    stageId:
      actionId === "solubility.predict"
        ? "predict"
        : actionId === "solubility.compare-rate"
          ? "investigate-rate"
          : "fair-test",
    timestampMs: 1,
  };
}

describe("solubility domain model", () => {
  it("conserves every gram across all mixture pools", () => {
    const model = createSolubilityModel({ substanceId: "salt" });
    model.addSolute(25);
    model.setStirring(true);
    const result = advance(model, 18);
    expect(total(result)).toBeCloseTo(result.addedMassG, 3);
  });

  it("reaches saturation and leaves excess salt visible", () => {
    const model = createSolubilityModel({
      substanceId: "salt",
      waterMassG: 100,
    });
    model.addSolute(50);
    model.setStirring(true);
    const result = advance(model, 120);
    expect(result.saturationCapacityG).toBeCloseTo(36, 0);
    expect(result.dissolvedMassG).toBeCloseTo(result.saturationCapacityG, 1);
    expect(result.settledMassG).toBeGreaterThan(10);
    expect(result.saturationState).toBe("saturated");
  });

  it("changes sugar rate with stirring and temperature without creating mass", () => {
    const still = createSolubilityModel({
      substanceId: "sugar",
      temperatureC: 15,
    });
    const stirredWarm = createSolubilityModel({
      substanceId: "sugar",
      temperatureC: 55,
    });
    still.addSolute(40);
    stirredWarm.addSolute(40);
    stirredWarm.setStirring(true);
    const stillResult = advance(still, 8);
    const warmResult = advance(stirredWarm, 8);
    expect(warmResult.dissolvedMassG).toBeGreaterThan(
      stillResult.dissolvedMassG,
    );
    expect(total(warmResult)).toBeCloseTo(40, 3);
  });

  it("distinguishes sediment, suspension, separated oil, and floating sawdust", () => {
    expect(runFairSolubilityTrial("sand").phaseState).toBe("sediment");
    expect(runFairSolubilityTrial("chalk").phaseState).toBe("suspension");
    expect(runFairSolubilityTrial("oil").phaseState).toBe("separated-layer");
    const sawdust = runFairSolubilityTrial("sawdust");
    expect(sawdust.phaseState).toBe("floating-solid");
    expect(sawdust.floatingMassG).toBeGreaterThan(4.5);
    expect(sawdust.dissolvedMassG).toBe(0);
  });

  it("requires a prediction before returning fair-trial evidence", () => {
    expect(() =>
      reduceSolubilityInvestigation(
        initialSolubilityInvestigationState,
        action("solubility.run-fair-trial", "salt"),
      ),
    ).toThrow(/prediction.*salt/i);
  });

  it("emits measured evidence for all six fair trials", () => {
    const predicted = reduceSolubilityInvestigation(
      initialSolubilityInvestigationState,
      action("solubility.predict", "sawdust", "insoluble"),
    );
    const tested = reduceSolubilityInvestigation(
      predicted.state,
      action("solubility.run-fair-trial", "sawdust"),
    );
    expect(tested).toMatchObject({
      lessonActionId: "solubility.run-fair-trial",
      evidenceIds: ["trial-sawdust-floating-solid"],
      state: { trials: { sawdust: { phaseState: "floating-solid" } } },
    });
  });

  it("records both one-variable rate comparisons", () => {
    const stirring = reduceSolubilityInvestigation(
      initialSolubilityInvestigationState,
      action("solubility.compare-rate", "stirring"),
    );
    const temperature = reduceSolubilityInvestigation(
      stirring.state,
      action("solubility.compare-rate", "temperature"),
    );
    expect(stirring.evidenceIds).toEqual(["stirring-rate-compared"]);
    expect(temperature.evidenceIds).toEqual(["temperature-rate-compared"]);
    expect(temperature.state.rateComparisons).toEqual({
      stirring: true,
      temperature: true,
    });
  });

  it("resets deterministically and rejects non-finite input", () => {
    const model = createSolubilityModel({ substanceId: "chalk" });
    model.addSolute(10);
    model.setStirring(true);
    advance(model, 3);
    model.reset("chalk");
    expect(model.snapshot()).toMatchObject({
      addedMassG: 0,
      dissolvedMassG: 0,
      suspendedMassG: 0,
      settledMassG: 0,
      separatedMassG: 0,
      floatingMassG: 0,
    });
    expect(() => model.addSolute(Number.NaN)).toThrow(/finite/i);
    expect(() => model.step(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});
```

- [ ] **Step 2: Move the solver and verify the new import plus sawdust tests fail**

Run:

```bash
git mv apps/web/lib/world-builder/solubilityModel.ts packages/simulation-runtime/src/models/solubilityModel.ts
npm test -- tests/unit/solubility-model.test.ts
```

Expected: FAIL because the runtime index does not export the solver and the moved model does not define sawdust, `floatingMassG`, the fair-trial function, or the investigation reducer.

- [ ] **Step 3: Extend the solver with the PR's scientifically distinct sawdust behavior**

In `packages/simulation-runtime/src/models/solubilityModel.ts`, make these exact final type changes:

```ts
export type SubstanceId =
  | "salt"
  | "sugar"
  | "sand"
  | "chalk"
  | "oil"
  | "sawdust";
export type MixtureClass =
  | "solution"
  | "suspension"
  | "sediment"
  | "emulsion"
  | "separated-layer"
  | "floating-solid"
  | "clear-water";

export interface SubstanceDefinition {
  id: SubstanceId;
  label: string;
  formula: string;
  kind:
    | "soluble-solid"
    | "insoluble-solid"
    | "immiscible-liquid"
    | "floating-solid";
  color: string;
  densityGPerMl: number;
  particleRadiusMm: number;
  solubilityAt25GPer100GWater: number;
  solubilityTemperatureSlope: number;
  dissolutionRatePerSecond: number;
  suspensionFractionWhenStirred: number;
  settlingRatePerSecond: number;
  turbidityStrength: number;
  explanation: string;
}
```

Add this entry to `SOLUBILITY_SUBSTANCES`:

```ts
sawdust: {
  id: 'sawdust', label: 'Dry sawdust', formula: 'cellulose-rich wood particles',
  kind: 'floating-solid', color: '#9a6337', densityGPerMl: 0.35,
  particleRadiusMm: 1.1, solubilityAt25GPer100GWater: 0,
  solubilityTemperatureSlope: 0, dissolutionRatePerSecond: 0,
  suspensionFractionWhenStirred: 0.62, settlingRatePerSecond: 0.22,
  turbidityStrength: 0.36,
  explanation: 'Dry sawdust is insoluble. Many particles float because their average density is below water and they may trap air.',
},
```

Add `floatingMassG` to `MixtureSnapshot`, initialize it beside the other mass pools, include it in `snapshot()`, and clear it in `reset()`:

```ts
export interface MixtureSnapshot {
  substanceId: SubstanceId;
  elapsedSeconds: number;
  waterMassG: number;
  temperatureC: number;
  stirring: boolean;
  addedMassG: number;
  dissolvedMassG: number;
  suspendedMassG: number;
  settledMassG: number;
  separatedMassG: number;
  floatingMassG: number;
  concentrationGPer100Ml: number;
  saturationCapacityG: number;
  saturationPercent: number;
  saturationState: SaturationState;
  turbidityPercent: number;
  phaseState: MixtureClass;
}

let floatingMassG = 0;
```

Replace `phaseState()` with:

```ts
function phaseState(): MixtureClass {
  const item = definition();
  if (addedMassG < 0.0001) return "clear-water";
  if (item.kind === "soluble-solid")
    return settledMassG > 0.05 ? "sediment" : "solution";
  if (item.kind === "immiscible-liquid")
    return suspendedMassG > addedMassG * 0.12 ? "emulsion" : "separated-layer";
  if (item.kind === "floating-solid")
    return floatingMassG > addedMassG * 0.5 ? "floating-solid" : "suspension";
  return suspendedMassG > addedMassG * 0.08 ? "suspension" : "sediment";
}
```

Use this complete mass allocation in `addSolute()`:

```ts
addSolute(massG) {
  finite(massG, 'solute mass');
  if (massG <= 0 || addedMassG + massG > 500) {
    throw new Error('solute mass must keep the mixture within 0–500 g');
  }
  addedMassG += massG;
  if (definition().kind === 'immiscible-liquid') separatedMassG += massG;
  else if (definition().kind === 'floating-solid') floatingMassG += massG;
  else settledMassG += massG;
  return snapshot();
},
```

Add this `floating-solid` branch in `step()` after the insoluble-solid branch and before the immiscible-liquid branch:

```ts
} else if (item.kind === 'floating-solid') {
  const targetSuspended = stirring ? addedMassG * item.suspensionFractionWhenStirred : 0;
  const rate = stirring ? 1.05 : item.settlingRatePerSecond;
  suspendedMassG = approach(suspendedMassG, targetSuspended, rate, deltaSeconds);
  floatingMassG = addedMassG - suspendedMassG;
} else {
```

Finally, make the fail-closed conservation block account for all five pools:

```ts
const pools = [
  dissolvedMassG,
  suspendedMassG,
  settledMassG,
  separatedMassG,
  floatingMassG,
];
if (pools.some((value) => !Number.isFinite(value) || value < -0.001)) {
  reset(substanceId);
  throw new Error(
    "Mixture solver produced an invalid mass state and was reset",
  );
}
const massError = addedMassG - pools.reduce((sum, value) => sum + value, 0);
if (Math.abs(massError) > 0.001) {
  reset(substanceId);
  throw new Error("Mixture solver violated mass conservation and was reset");
}
```

- [ ] **Step 4: Add pure fair-trial and investigation-reducer exports**

Append to `packages/simulation-runtime/src/models/solubilityModel.ts`:

```ts
import type { NormalizedAction } from "../../../simulation-schema/src/index";
import type { InvestigationReducer } from "../experience/interactiveInvestigation";

export type SolubilityPrediction = "soluble" | "insoluble";

export interface SolubilityInvestigationState {
  predictions: Partial<Record<SubstanceId, SolubilityPrediction>>;
  trials: Partial<Record<SubstanceId, MixtureSnapshot>>;
  rateComparisons: { stirring: boolean; temperature: boolean };
  lastSubstanceId?: SubstanceId;
}

export const initialSolubilityInvestigationState: SolubilityInvestigationState =
  {
    predictions: {},
    trials: {},
    rateComparisons: { stirring: false, temperature: false },
  };

function advanceFor(model: SolubilityModel, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60)
    model.step(1 / 60);
}

export function runFairSolubilityTrial(
  substanceId: SubstanceId,
): MixtureSnapshot {
  const model = createSolubilityModel({
    substanceId,
    waterMassG: 200,
    temperatureC: 25,
  });
  model.addSolute(5);
  model.setStirring(true);
  advanceFor(model, 30);
  model.setStirring(false);
  advanceFor(model, 20);
  return model.snapshot();
}

function substanceFor(action: NormalizedAction): SubstanceId {
  const id = action.targetEntityId as SubstanceId;
  if (!SOLUBILITY_SUBSTANCES[id])
    throw new Error(`Unknown solubility substance ${action.targetEntityId}`);
  return id;
}

export const reduceSolubilityInvestigation: InvestigationReducer<
  SolubilityInvestigationState
> = (state, action) => {
  if (action.actionId === "solubility.predict") {
    const id = substanceFor(action);
    if (action.value !== "soluble" && action.value !== "insoluble")
      throw new Error(`Prediction for ${id} must be soluble or insoluble`);
    return {
      state: {
        ...state,
        predictions: { ...state.predictions, [id]: action.value },
        lastSubstanceId: id,
      },
      lessonActionId: "solubility.predict",
      evidenceIds: [`prediction-${id}`],
      feedback: {
        tone: "information",
        message: `Prediction recorded for ${SOLUBILITY_SUBSTANCES[id].label}.`,
      },
    };
  }
  if (action.actionId === "solubility.run-fair-trial") {
    const id = substanceFor(action);
    if (!state.predictions[id])
      throw new Error(
        `Record a prediction for ${id} before running its fair trial`,
      );
    const result = runFairSolubilityTrial(id);
    return {
      state: {
        ...state,
        trials: { ...state.trials, [id]: result },
        lastSubstanceId: id,
      },
      lessonActionId: "solubility.run-fair-trial",
      evidenceIds: [`trial-${id}-${result.phaseState}`],
      feedback: {
        tone: "success",
        message: `${SOLUBILITY_SUBSTANCES[id].label}: ${result.phaseState}; ${result.addedMassG.toFixed(1)} g accounted for.`,
      },
    };
  }
  if (action.actionId === "solubility.compare-rate") {
    if (
      action.targetEntityId !== "stirring" &&
      action.targetEntityId !== "temperature"
    )
      throw new Error(`Unknown rate comparison ${action.targetEntityId}`);
    const comparison = action.targetEntityId;
    return {
      state: {
        ...state,
        rateComparisons: { ...state.rateComparisons, [comparison]: true },
      },
      lessonActionId: "solubility.compare-rate",
      evidenceIds: [`${comparison}-rate-compared`],
      feedback: {
        tone: "success",
        message:
          comparison === "stirring"
            ? "Equal sugar samples dissolved faster while stirred."
            : "The warmer equal sugar sample dissolved faster and had greater capacity.",
      },
    };
  }
  throw new Error(`Unsupported solubility action ${action.actionId}`);
};
```

Append to `packages/simulation-runtime/src/index.ts`:

```ts
export {
  SOLUBILITY_SUBSTANCES,
  createSolubilityModel,
  initialSolubilityInvestigationState,
  reduceSolubilityInvestigation,
  runFairSolubilityTrial,
} from "./models/solubilityModel";
export type {
  MixtureClass,
  MixtureSnapshot,
  SaturationState,
  SolubilityInvestigationState,
  SolubilityModel,
  SolubilityModelConfig,
  SolubilityPrediction,
  SubstanceDefinition,
  SubstanceId,
} from "./models/solubilityModel";
```

- [ ] **Step 5: Run focused regression coverage**

Run:

```bash
npm test -- tests/unit/solubility-model.test.ts
npm --workspace packages/simulation-runtime run type-check
```

Expected: 8 passing tests, including the existing conservation/saturation behavior and new floating-sawdust evidence.

- [ ] **Step 6: Commit the canonical solver migration**

```bash
git add packages/simulation-runtime/src/models/solubilityModel.ts packages/simulation-runtime/src/index.ts tests/unit/solubility-model.test.ts
git commit -m "feat(runtime): enhance canonical solubility model"
```

### Task 5: Implement the ordered Lipid Test model

**Files:**

- Create: `packages/simulation-runtime/src/models/lipidTestModel.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/lipid-test-model.test.ts`

- [ ] **Step 1: Write failing procedure and evidence tests**

Create `tests/unit/lipid-test-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { NormalizedAction } from "../../packages/simulation-schema/src/index";
import {
  initialLipidTestState,
  reduceLipidTest,
} from "../../packages/simulation-runtime/src/index";

function action(
  actionId: string,
  sampleId: string,
  value?: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId: sampleId,
    value,
    source: "mouse",
    phase: "commit",
    stageId: actionId === "lipid.predict" ? "predict" : "procedure",
    timestampMs: 1,
  };
}

function predictAndRun(
  sampleId: "peanut" | "coconut" | "rice",
  prediction: "present" | "absent",
) {
  let transition = reduceLipidTest(
    initialLipidTestState,
    action("lipid.predict", sampleId, prediction),
  );
  for (const step of ["place", "fold", "crush", "remove", "dry", "inspect"]) {
    transition = reduceLipidTest(
      transition.state,
      action("lipid.advance-procedure", sampleId, step),
    );
  }
  return transition;
}

describe("lipid paper-test model", () => {
  it("enforces place, fold, crush, remove, dry, inspect order", () => {
    const predicted = reduceLipidTest(
      initialLipidTestState,
      action("lipid.predict", "peanut", "present"),
    );
    expect(() =>
      reduceLipidTest(
        predicted.state,
        action("lipid.advance-procedure", "peanut", "inspect"),
      ),
    ).toThrow(/expected place/i);
  });

  it("does not expose a result before the paper is dry and inspected", () => {
    let transition = reduceLipidTest(
      initialLipidTestState,
      action("lipid.predict", "peanut", "present"),
    );
    for (const step of ["place", "fold", "crush", "remove", "dry"]) {
      transition = reduceLipidTest(
        transition.state,
        action("lipid.advance-procedure", "peanut", step),
      );
    }
    expect(transition.state.records.peanut?.observation).toBeUndefined();
    expect(transition.evidenceIds).toEqual([]);
  });

  it.each([
    ["peanut", "persistent"],
    ["coconut", "persistent"],
    ["rice", "none"],
  ] as const)(
    "returns qualitative dry-paper evidence for %s",
    (sampleId, observation) => {
      const result = predictAndRun(
        sampleId,
        sampleId === "rice" ? "absent" : "present",
      );
      expect(result.state.records[sampleId]?.observation).toBe(observation);
      expect(result.evidenceIds).toEqual([`procedure-${sampleId}-complete`]);
    },
  );

  it("does not mutate the initial record map", () => {
    reduceLipidTest(
      initialLipidTestState,
      action("lipid.predict", "rice", "absent"),
    );
    expect(initialLipidTestState.records).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test and verify the model is missing**

Run:

```bash
npm test -- tests/unit/lipid-test-model.test.ts
```

Expected: FAIL because the Lipid Test exports do not exist.

- [ ] **Step 3: Implement the immutable ordered procedure**

Create `packages/simulation-runtime/src/models/lipidTestModel.ts`:

```ts
import type { NormalizedAction } from "../../../simulation-schema/src/index";
import type { InvestigationReducer } from "../experience/interactiveInvestigation";

export type LipidSampleId = "peanut" | "coconut" | "rice";
export type LipidPrediction = "present" | "absent";
export type LipidObservation = "persistent" | "none";
export type LipidProcedureStep =
  | "place"
  | "fold"
  | "crush"
  | "remove"
  | "dry"
  | "inspect";

export interface LipidSampleDefinition {
  id: LipidSampleId;
  label: string;
  expectedObservation: LipidObservation;
  explanation: string;
}

export const LIPID_SAMPLES: Record<LipidSampleId, LipidSampleDefinition> = {
  peanut: {
    id: "peanut",
    label: "Peanut",
    expectedObservation: "persistent",
    explanation:
      "Peanut lipids leave a persistent translucent patch after drying.",
  },
  coconut: {
    id: "coconut",
    label: "Dry coconut",
    expectedObservation: "persistent",
    explanation:
      "Dry coconut lipids leave a persistent translucent patch after drying.",
  },
  rice: {
    id: "rice",
    label: "Rice grain",
    expectedObservation: "none",
    explanation:
      "This equal rice sample leaves little or no lasting translucent patch in the qualitative test.",
  },
};

export const LIPID_PROCEDURE: readonly LipidProcedureStep[] = [
  "place",
  "fold",
  "crush",
  "remove",
  "dry",
  "inspect",
];

export interface LipidSampleRecord {
  prediction?: LipidPrediction;
  completedSteps: LipidProcedureStep[];
  observation?: LipidObservation;
}

export interface LipidTestState {
  records: Partial<Record<LipidSampleId, LipidSampleRecord>>;
  lastSampleId?: LipidSampleId;
}

export const initialLipidTestState: LipidTestState = { records: {} };

function sampleFor(action: NormalizedAction): LipidSampleDefinition {
  const sample = LIPID_SAMPLES[action.targetEntityId as LipidSampleId];
  if (!sample) throw new Error(`Unknown lipid sample ${action.targetEntityId}`);
  return sample;
}

function recordFor(
  state: Readonly<LipidTestState>,
  id: LipidSampleId,
): LipidSampleRecord {
  const existing = state.records[id];
  return existing
    ? { ...existing, completedSteps: [...existing.completedSteps] }
    : { completedSteps: [] };
}

export const reduceLipidTest: InvestigationReducer<LipidTestState> = (
  state,
  action,
) => {
  const sample = sampleFor(action);
  const record = recordFor(state, sample.id);

  if (action.actionId === "lipid.predict") {
    if (action.value !== "present" && action.value !== "absent") {
      throw new Error(
        `Lipid prediction for ${sample.id} must be present or absent`,
      );
    }
    const nextRecord = { ...record, prediction: action.value };
    return {
      state: {
        ...state,
        records: { ...state.records, [sample.id]: nextRecord },
        lastSampleId: sample.id,
      },
      lessonActionId: "lipid.predict",
      evidenceIds: [`prediction-${sample.id}`],
      feedback: {
        tone: "information",
        message: `Prediction recorded for ${sample.label}.`,
      },
    };
  }

  if (action.actionId === "lipid.advance-procedure") {
    if (!record.prediction)
      throw new Error(
        `Record a prediction for ${sample.id} before beginning the paper test`,
      );
    const expectedStep = LIPID_PROCEDURE[record.completedSteps.length];
    if (!expectedStep)
      throw new Error(`${sample.label} paper test is already complete`);
    if (action.value !== expectedStep) {
      throw new Error(
        `Lipid procedure expected ${expectedStep}, received ${String(action.value)}`,
      );
    }
    const completedSteps = [...record.completedSteps, expectedStep];
    const complete = expectedStep === "inspect";
    const observation = complete ? sample.expectedObservation : undefined;
    const nextRecord: LipidSampleRecord = {
      ...record,
      completedSteps,
      observation,
    };
    return {
      state: {
        ...state,
        records: { ...state.records, [sample.id]: nextRecord },
        lastSampleId: sample.id,
      },
      lessonActionId: "lipid.advance-procedure",
      evidenceIds: complete ? [`procedure-${sample.id}-complete`] : [],
      feedback: {
        tone: complete ? "success" : "information",
        message: complete
          ? `${sample.label}: ${sample.explanation}`
          : `${sample.label}: ${expectedStep} complete.`,
      },
    };
  }

  throw new Error(`Unsupported lipid-test action ${action.actionId}`);
};
```

Append to `packages/simulation-runtime/src/index.ts`:

```ts
export {
  LIPID_PROCEDURE,
  LIPID_SAMPLES,
  initialLipidTestState,
  reduceLipidTest,
} from "./models/lipidTestModel";
export type {
  LipidObservation,
  LipidPrediction,
  LipidProcedureStep,
  LipidSampleDefinition,
  LipidSampleId,
  LipidSampleRecord,
  LipidTestState,
} from "./models/lipidTestModel";
```

- [ ] **Step 4: Run focused tests and type-check**

Run:

```bash
npm test -- tests/unit/lipid-test-model.test.ts
npm --workspace packages/simulation-runtime run type-check
```

Expected: 5 passing tests and no type errors.

- [ ] **Step 5: Commit the Lipid Test model**

```bash
git add packages/simulation-runtime/src/models/lipidTestModel.ts packages/simulation-runtime/src/index.ts tests/unit/lipid-test-model.test.ts
git commit -m "feat(runtime): model ordered lipid paper tests"
```

### Task 6: Implement Mineral, Vitamin, and Shape classification models

**Files:**

- Create: `packages/simulation-runtime/src/models/nutritionMatchModel.ts`
- Create: `packages/simulation-runtime/src/models/shapeSortingModel.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/nutrition-match-model.test.ts`
- Test: `tests/unit/shape-sorting-model.test.ts`

- [ ] **Step 1: Write failing representative-vector tests**

Create `tests/unit/nutrition-match-model.test.ts` with these exact assertions:

```ts
import { describe, expect, it } from "vitest";
import {
  createNutritionMatchReducer,
  MINERAL_CASES,
  VITAMIN_CASES,
} from "../../packages/simulation-runtime/src/index";

const action = (targetEntityId: string, value: string) => ({
  actionId: "nutrition.submit-match",
  targetEntityId,
  value,
  source: "mouse" as const,
  phase: "commit" as const,
  stageId: "match",
  timestampMs: 1,
});

describe("nutrition match model", () => {
  it.each([
    [
      MINERAL_CASES,
      "calcium",
      "milk-curd::bones-teeth",
      "mineral-calcium-matched",
    ],
    [
      MINERAL_CASES,
      "iodine",
      "iodized-salt::thyroid-growth",
      "mineral-iodine-matched",
    ],
    [
      MINERAL_CASES,
      "iron",
      "leafy-greens::red-blood-cells",
      "mineral-iron-matched",
    ],
    [VITAMIN_CASES, "a", "carrot::night-blindness", "vitamin-a-matched"],
    [VITAMIN_CASES, "b1", "whole-grains::beriberi", "vitamin-b1-matched"],
    [VITAMIN_CASES, "c", "orange::scurvy", "vitamin-c-matched"],
    [VITAMIN_CASES, "d", "sunlight::rickets", "vitamin-d-matched"],
  ] as const)(
    "accepts the reference match for %s",
    (cases, id, value, evidenceId) => {
      const result = createNutritionMatchReducer(cases)(
        { completedIds: [], attempts: {} },
        action(id, value),
      );
      expect(result.evidenceIds).toEqual([evidenceId]);
      expect(result.state.completedIds).toContain(id);
    },
  );

  it("keeps an incorrect pair unresolved and returns a directional hint", () => {
    const result = createNutritionMatchReducer(MINERAL_CASES)(
      { completedIds: [], attempts: {} },
      action("iron", "milk-curd::red-blood-cells"),
    );
    expect(result.evidenceIds).toEqual([]);
    expect(result.state.completedIds).toEqual([]);
    expect(result.feedback).toMatchObject({ tone: "retry" });
  });
});
```

Create `tests/unit/shape-sorting-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  SHAPE_ITEMS,
  initialShapeSortingState,
  reduceShapeSorting,
} from "../../packages/simulation-runtime/src/index";

const action = (id: string, shape: string) => ({
  actionId: "shape.assign",
  targetEntityId: id,
  value: shape,
  source: "xr-controller" as const,
  phase: "commit" as const,
  stageId: "sort",
  timestampMs: 1,
});

describe("shape sorting model", () => {
  it.each([
    ["ball", "sphere"],
    ["orange", "sphere"],
    ["can", "cylinder"],
    ["chalk", "cylinder"],
    ["book", "cuboid"],
    ["block", "cuboid"],
    ["party-hat", "cone"],
    ["traffic-cone", "cone"],
  ] as const)(
    "records evidence only for the correct %s placement",
    (id, shape) => {
      const result = reduceShapeSorting(
        initialShapeSortingState,
        action(id, shape),
      );
      expect(result.evidenceIds).toEqual([`shape-${id}-${shape}`]);
    },
  );

  it("keeps a wrong object available and never reveals the correct bin", () => {
    const result = reduceShapeSorting(
      initialShapeSortingState,
      action("ball", "cuboid"),
    );
    expect(result.evidenceIds).toEqual([]);
    expect(result.state.assignments).toEqual({});
    expect(result.feedback?.message).toContain(SHAPE_ITEMS.ball.clue);
    expect(result.feedback?.message).not.toContain("sphere");
  });
});
```

- [ ] **Step 2: Verify both model modules are missing**

Run:

```bash
npm test -- tests/unit/nutrition-match-model.test.ts tests/unit/shape-sorting-model.test.ts
```

Expected: FAIL on missing runtime exports.

- [ ] **Step 3: Implement the generic nutrition reducer and exact case vectors**

Create `packages/simulation-runtime/src/models/nutritionMatchModel.ts` with this public contract and data; the reducer must split `action.value` on `::`, reject unknown IDs, increment `attempts[id]`, return no evidence on either wrong half, and immutably add the ID plus `case.evidenceId` only when both halves match:

```ts
export interface NutritionCase {
  id: string;
  label: string;
  acceptedSourceIds: readonly string[];
  acceptedRelationId: string;
  evidenceId: string;
  sourceHint: string;
  relationHint: string;
}
export interface NutritionMatchState {
  completedIds: string[];
  attempts: Record<string, number>;
}
export const MINERAL_CASES: readonly NutritionCase[] = [
  {
    id: "calcium",
    label: "Calcium",
    acceptedSourceIds: ["milk-curd", "ragi", "sesame", "leafy-greens"],
    acceptedRelationId: "bones-teeth",
    evidenceId: "mineral-calcium-matched",
    sourceHint: "Choose a calcium source.",
    relationHint: "Connect calcium to bones and teeth.",
  },
  {
    id: "iodine",
    label: "Iodine",
    acceptedSourceIds: ["iodized-salt", "sea-fish", "seaweed"],
    acceptedRelationId: "thyroid-growth",
    evidenceId: "mineral-iodine-matched",
    sourceHint: "Choose an iodine source.",
    relationHint: "Connect iodine to thyroid function and growth.",
  },
  {
    id: "iron",
    label: "Iron",
    acceptedSourceIds: ["leafy-greens", "beans", "jaggery", "meat"],
    acceptedRelationId: "red-blood-cells",
    evidenceId: "mineral-iron-matched",
    sourceHint: "Choose an iron source.",
    relationHint: "Connect iron to haemoglobin and red blood cells.",
  },
];
export const VITAMIN_CASES: readonly NutritionCase[] = [
  {
    id: "a",
    label: "Vitamin A",
    acceptedSourceIds: ["carrot", "papaya", "mango", "leafy-greens"],
    acceptedRelationId: "night-blindness",
    evidenceId: "vitamin-a-matched",
    sourceHint: "Choose a vitamin A source.",
    relationHint: "Connect long-term vitamin A deficiency to night blindness.",
  },
  {
    id: "b1",
    label: "Vitamin B1",
    acceptedSourceIds: ["whole-grains", "pulses", "nuts-seeds"],
    acceptedRelationId: "beriberi",
    evidenceId: "vitamin-b1-matched",
    sourceHint: "Choose a vitamin B1 source.",
    relationHint: "Connect long-term vitamin B1 deficiency to beriberi.",
  },
  {
    id: "c",
    label: "Vitamin C",
    acceptedSourceIds: ["amla", "guava", "orange", "tomato"],
    acceptedRelationId: "scurvy",
    evidenceId: "vitamin-c-matched",
    sourceHint: "Choose a vitamin C source.",
    relationHint: "Connect long-term vitamin C deficiency to scurvy.",
  },
  {
    id: "d",
    label: "Vitamin D",
    acceptedSourceIds: ["sunlight", "egg-yolk", "fish", "fortified-milk"],
    acceptedRelationId: "rickets",
    evidenceId: "vitamin-d-matched",
    sourceHint: "Choose a vitamin D source or exposure.",
    relationHint: "Connect long-term vitamin D deficiency to rickets.",
  },
];
export function createNutritionMatchReducer(
  cases: readonly NutritionCase[],
): InvestigationReducer<NutritionMatchState>;
```

The successful return is exactly:

```ts
return {
  state: {
    completedIds: [...new Set([...state.completedIds, current.id])],
    attempts,
  },
  lessonActionId: "nutrition.submit-match",
  evidenceIds: [current.evidenceId],
  feedback: {
    tone: "success",
    message: `${current.label}: both links are supported.`,
  },
};
```

- [ ] **Step 4: Implement the shape reducer and exact object vectors**

Create `packages/simulation-runtime/src/models/shapeSortingModel.ts` with `ShapeId = 'sphere'|'cylinder'|'cuboid'|'cone'`, immutable `assignments`/`attempts`, and these records:

```ts
export const SHAPE_ITEMS = {
  ball: {
    id: "ball",
    label: "Rubber ball",
    shape: "sphere",
    clue: "It is round in every direction and has no flat face.",
  },
  orange: {
    id: "orange",
    label: "Orange",
    shape: "sphere",
    clue: "Its overall form is round in every direction.",
  },
  can: {
    id: "can",
    label: "Tin can",
    shape: "cylinder",
    clue: "It has two circular faces joined by a curved surface.",
  },
  chalk: {
    id: "chalk",
    label: "Piece of chalk",
    shape: "cylinder",
    clue: "It has two circular ends and one curved surface.",
  },
  book: {
    id: "book",
    label: "Book",
    shape: "cuboid",
    clue: "It has six flat rectangular faces.",
  },
  block: {
    id: "block",
    label: "Wooden block",
    shape: "cuboid",
    clue: "Its flat faces meet along edges at corners.",
  },
  "party-hat": {
    id: "party-hat",
    label: "Party hat",
    shape: "cone",
    clue: "It has one circular base and narrows to a point.",
  },
  "traffic-cone": {
    id: "traffic-cone",
    label: "Traffic cone",
    shape: "cone",
    clue: "Its broad circular base tapers toward a point.",
  },
} as const satisfies Record<string, ShapeItem>;
```

`reduceShapeSorting` must accept only `shape.assign`, return `lessonActionId:'shape.assign'`, return no evidence and only the clue on a wrong bin, and return `shape-${id}-${shape}` evidence plus an immutable assignment on a correct bin. Do not implement the PR shortcut that calls `sortInto(OBJECTS[current].shape)` from the A button.

Export both model modules from `packages/simulation-runtime/src/index.ts`.

- [ ] **Step 5: Run tests, type-check, and commit**

```bash
npm test -- tests/unit/nutrition-match-model.test.ts tests/unit/shape-sorting-model.test.ts
npm --workspace packages/simulation-runtime run type-check
git add packages/simulation-runtime/src/models/nutritionMatchModel.ts packages/simulation-runtime/src/models/shapeSortingModel.ts packages/simulation-runtime/src/index.ts tests/unit/nutrition-match-model.test.ts tests/unit/shape-sorting-model.test.ts
git commit -m "feat(runtime): model nutrition and shape classifications"
```

Expected: 10 representative nutrition vectors and 10 shape behaviors pass; type-check exits 0.

### Task 7: Compose all six classes through the shared host, shell, input, and audio

**Files:**

- Create: `apps/web/lib/simulations/interactive/types.ts`
- Create: `apps/web/components/simulations/InteractiveInvestigationViewer.tsx`
- Create: `apps/web/lib/simulations/interactive/sceneKit.ts`
- Create: `apps/web/lib/simulations/interactive/float-or-sink.scene.ts`
- Create: `apps/web/lib/simulations/interactive/solubility.scene.ts`
- Create: `apps/web/lib/simulations/interactive/lipid-test.scene.ts`
- Create: `apps/web/lib/simulations/interactive/mineral-sources.scene.ts`
- Create: `apps/web/lib/simulations/interactive/vitamin-deficiencies.scene.ts`
- Create: `apps/web/lib/simulations/interactive/shape-sorting.scene.ts`
- Modify: `apps/web/lib/simulations/viewerRegistry.ts`
- Test: `tests/unit/interactive-scene-adapters.test.ts`
- Test: `tests/unit/interactive-viewer-registry.test.ts`

- [ ] **Step 1: Write failing registry and scene-boundary tests**

`tests/unit/interactive-viewer-registry.test.ts` must resolve these exact mappings and invoke every session factory without importing Three.js into the runtime:

| `viewerKey`                        | definition             | reducer/session state                      | scene factory                           |
| ---------------------------------- | ---------------------- | ------------------------------------------ | --------------------------------------- |
| `interactive-float-or-sink`        | `FLOAT_OR_SINK`        | `FloatOrSinkState`                         | `createFloatOrSinkSceneAdapter`         |
| `interactive-solubility`           | `SOLUBILITY`           | `SolubilityInvestigationState`             | `createSolubilitySceneAdapter`          |
| `interactive-lipid-test`           | `LIPID_TEST`           | `LipidTestState`                           | `createLipidTestSceneAdapter`           |
| `interactive-mineral-sources`      | `MINERAL_SOURCES`      | `NutritionMatchState` with `MINERAL_CASES` | `createMineralSourcesSceneAdapter`      |
| `interactive-vitamin-deficiencies` | `VITAMIN_DEFICIENCIES` | `NutritionMatchState` with `VITAMIN_CASES` | `createVitaminDeficienciesSceneAdapter` |
| `interactive-shape-sorting`        | `SHAPE_SORTING`        | `ShapeSortingState`                        | `createShapeSortingSceneAdapter`        |

Assert that `findViewerRegistration('unknown-viewer')` returns `undefined`, that every known entry creates a fresh adapter instance, and that its assessment bindings cover every prompt ID.

In `tests/unit/interactive-scene-adapters.test.ts`, create a fake `SimulationSceneContext` with a real `THREE.Scene`, fake resources, and a recording `SimulationInteractionRegistry`. For every adapter assert:

```ts
expect(registeredTargets.length).toBeGreaterThan(0);
expect(
  registeredTargets.every((target) => target.accessibilityLabel.trim()),
).toBe(true);
expect(
  registeredTargets.every(
    (target) => target.inputSources?.includes("xr-controller") ?? true,
  ),
).toBe(true);
expect(recordEvidence).not.toHaveBeenCalled();
handle.applySnapshot(lessonSnapshot);
adapter.projectDomain(domainSnapshot);
await handle.dispose();
expect(unregister).toHaveBeenCalledTimes(registeredTargets.length);
```

Also activate an unregistered mesh ID through the fake registry and expect `Unknown interaction target` rather than a dispatch.

Run:

```bash
npm test -- tests/unit/interactive-viewer-registry.test.ts tests/unit/interactive-scene-adapters.test.ts
```

Expected: FAIL because the viewer registrations and six adapters do not exist.

- [ ] **Step 2: Define the projectable adapter/registration contract**

Create `apps/web/lib/simulations/interactive/types.ts`:

```ts
import type {
  ImplementedSimulationDefinition,
  NormalizedAction,
} from "../../../../../packages/simulation-schema/src/index";
import type {
  InteractiveInvestigationSession,
  InteractiveInvestigationSnapshot,
} from "../../../../../packages/simulation-runtime/src/index";
import type { SimulationSceneAdapter } from "../../../../../packages/simulation-web/src/scene/types";

export interface ProjectableSceneAdapter<State> extends SimulationSceneAdapter {
  projectDomain(state: Readonly<State>): void;
}

export interface InteractiveChoice {
  id: string;
  label: string;
  action: Omit<NormalizedAction, "source" | "stageId" | "timestampMs">;
}

export interface InteractiveViewerRegistration<State> {
  definition: ImplementedSimulationDefinition;
  createSession(): InteractiveInvestigationSession<State>;
  createAdapter(): ProjectableSceneAdapter<State>;
  choices(
    snapshot: InteractiveInvestigationSnapshot<State>,
  ): readonly InteractiveChoice[];
  primaryAction?(
    snapshot: InteractiveInvestigationSnapshot<State>,
  ): InteractiveChoice | undefined;
}
```

Choice target IDs encode their learner-selected values so scene, mouse, touch, keyboard, and XR all dispatch the same meaning: `leaf::float`, `sawdust::insoluble`, `peanut::place`, `iron::leafy-greens::red-blood-cells`, and `ball::sphere`. Update each reducer's parsing helper to accept `action.value` when supplied by DOM tests or the encoded suffix when supplied by a registered 3D target. Add one encoded-XR vector to each model test.

- [ ] **Step 3: Build a disposal-safe scene kit and six projection-only adapters**

`apps/web/lib/simulations/interactive/sceneKit.ts` must export:

```ts
export function addInteractiveWorkbench(
  context: SimulationSceneContext,
  options: {
    slug: string;
    environmentBrowserUrl: string;
    environmentQuestUrl: string;
    environmentFallbackUrl: string;
    accent: THREE.ColorRepresentation;
  },
): { root: THREE.Group; bench: THREE.Mesh; dispose(): void };

export function registerActionTarget(
  context: SimulationSceneContext,
  input: Omit<SimulationInteractionTarget, "inputSources">,
): () => void;

export function disposeObjectTree(root: THREE.Object3D): void;
```

`registerActionTarget` supplies `['mouse','touch','keyboard','xr-controller']`, delegates only to `context.interactions.register`, and returns its unregister callback. `disposeObjectTree` disposes every geometry, material, and texture once. The workbench selects `environment-quest.webp` only for `questBaseline`, falls back to the declared SVG on load failure, and registers all loaders/root objects with `context.resources`.

Each adapter implements `id`, `create(context)`, `projectDomain(state)`, `applySnapshot(snapshot)`, `focusTarget()`, and idempotent `dispose()`. Use these exact projections:

- `float-or-sink.scene.ts`: transparent tank, waterline, six objects, prediction targets, release target, final float/sink Y positions, illustrative weight/support arrows.
- `solubility.scene.ts`: retain the canonical graduated beaker, measured pools, instanced particles, sediment, oil layer, molecular lens disclosure, and add floating sawdust particles; import `MixtureSnapshot` from the runtime, never from `apps/web`.
- `lipid-test.scene.ts`: three equal sample tokens, paper states for place/fold/crush/remove/dry/inspect, lamp, and qualitative persistent/no-patch projection.
- `mineral-sources.scene.ts`: calcium/iodine/iron nodes and full-pair choice cards; wrong cards remain selectable and no target embeds the accepted answer outside its learner-visible label.
- `vitamin-deficiencies.scene.ts`: A/B1/C/D nodes, source/deficiency pair cards, long-term qualifier on every symptom panel, and no medical diagnosis language.
- `shape-sorting.scene.ts`: eight rotatable objects, four bins, feature highlights, and persistent correct placements; there is no primary/A action that derives `SHAPE_ITEMS[id].shape`.

Every mesh that causes a learning action must be registered through `context.interactions`; decorative meshes remain unregistered. Adapters call `context.dispatch` only through the registry and never call `context.recordEvidence`.

- [ ] **Step 4: Implement the shared React composition without another overlay**

Create `apps/web/components/simulations/InteractiveInvestigationViewer.tsx`. Its only rendered composition is the locked shared shell plus canvas host:

```tsx
<SimulationExperienceShell
  simulationId={definition.module.id}
  snapshot={snapshot.lesson}
  started={started}
  primaryAction={
    primaryAction && {
      label: primaryAction.label,
      onActivate: () => activateChoice(primaryAction, "keyboard"),
    }
  }
  assessment={assessmentControl}
  feedback={snapshot.feedback?.message}
  caption={currentCue.caption}
  onReplayNarration={() => void hostRef.current?.narration.replay()}
  onRestart={restart}
  helpText="Mouse, touch, keyboard, and Quest targets perform the same action. Observe before continuing."
  completed={snapshot.lesson.lessonComplete}
  completionBody={
    snapshot.mastery.mastered
      ? "Mastery evidence complete."
      : "Activity complete; mastery evidence is still incomplete."
  }
>
  <SimulationCanvasHost ref={canvasHostRef} data-testid="simulation-canvas" />
</SimulationExperienceShell>
```

On mount, resolve `definition.module.viewerKey`, create one session and adapter, then call `createSimulationHost({ mount, adapter, preferences, narration:definition.narration, onAction, onEvidence })`. `onAction` dispatches through the interactive session, updates React state, calls `host.applySnapshot(next.lesson)`, and calls `adapter.projectDomain(next.domain)`. `onEvidence` throws `Scene adapters cannot record educational evidence directly`. When stage ID changes, play the cue whose `stageId` matches. `restart` resets session, applies both snapshots, stops current audio, and plays the first cue. Completion and `snapshot.mastery.mastered` remain separate labels.

Use shell `assessment` for the current registration choices and shell `primaryAction` for a procedure/test action. Do not create `InteractiveActionPanel.tsx`, renderer lifecycle code, controller listeners, audio elements, or a second launch/completion overlay.

- [ ] **Step 5: Register all six viewer factories**

In `apps/web/lib/simulations/viewerRegistry.ts`, add six entries. Each `createSession` calls `createInteractiveInvestigationSession` with its content `experience`, `assessment`, initial domain state/reducer, and these bindings:

```ts
const bindings = (prefix: string) => ({
  [`${prefix}-observation`]: {
    lessonActionId: "assessment.answer",
    lessonEvidenceId: `${prefix}-observation-explained`,
  },
  [`${prefix}-misconception`]: {
    lessonActionId: "assessment.answer",
    lessonEvidenceId: `${prefix}-misconception-resolved`,
  },
  [`${prefix}-transfer`]: {
    lessonActionId: "assessment.answer",
    lessonEvidenceId: `${prefix}-transfer-solved`,
  },
});
```

Use `float-sink`, `solubility`, `lipid`, `mineral`, `vitamin`, and `shape` prefixes. The Solubility observation prompt belongs to `investigate-rate`; its binding records `stirring-rate-compared`/`temperature-rate-compared` through the reducer and `solubility-observation-explained` through assessment, so add that evidence ID to the content stage's `completionEvidenceIds`.

- [ ] **Step 6: Run component/scene tests, type-check, and commit**

```bash
npm test -- tests/unit/interactive-viewer-registry.test.ts tests/unit/interactive-scene-adapters.test.ts tests/unit/interactive-investigation-session.test.ts
npm --workspace apps/web run type-check
git add apps/web/components/simulations/InteractiveInvestigationViewer.tsx apps/web/lib/simulations/interactive apps/web/lib/simulations/viewerRegistry.ts packages/simulation-runtime/src/models packages/simulation-content/src/implemented/interactive tests/unit/interactive-viewer-registry.test.ts tests/unit/interactive-scene-adapters.test.ts
git commit -m "feat(web): compose interactive investigations on shared host"
```

Expected: all focused tests pass; web type-check exits 0; source search finds no new `new THREE.WebGLRenderer`, `setAnimationLoop`, `getController`, `new Audio`, or `speechSynthesis` outside `packages/simulation-web`.

### Task 8: Prepare canonical Quest/browser assets and validate shared narration

**Files:**

- Create: `scripts/prepare-pr8-interactive-assets.mjs`
- Modify: `package.json`
- Create: `apps/web/public/simulations/<each-interactive-slug>/environment-browser.webp`
- Create: `apps/web/public/simulations/<each-interactive-slug>/environment-quest.webp`
- Create: `apps/web/public/simulations/<each-interactive-slug>/environment-fallback.svg`
- Test: `tests/unit/interactive-assets.test.ts`

- [ ] **Step 1: Write the missing/corrupt asset test**

Create `tests/unit/interactive-assets.test.ts` to iterate `INTERACTIVE_SIMULATIONS`, resolve each manifest URL under `apps/web/public`, and assert:

```ts
expect(existsSync(path)).toBe(true);
expect(statSync(path).size).toBeGreaterThan(
  asset.kind === "environment" ? 256 : 0,
);
expect(["52494646", "3c737667"]).toContain(
  readFileSync(path).subarray(0, 4).toString("hex"),
);
```

Also assert every narration cue has a caption, no cue declares an absent `audioUrl`, and `fallback === 'browserTts'`.

Run `npm test -- tests/unit/interactive-assets.test.ts`; expected FAIL because the canonical files do not exist.

- [ ] **Step 2: Add the reproducible opt-in asset authoring script**

Create `scripts/prepare-pr8-interactive-assets.mjs`. It must use `execFileSync('/opt/homebrew/bin/cwebp', ...)`, fail if the source SHA-256 differs from the values in Task 2, create the six canonical directories, encode browser at quality 82 and Quest at 1024x512 quality 72, and write this exact 2:1 fallback into every directory:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">
  <defs><linearGradient id="lab" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#12324a"/><stop offset="1" stop-color="#06111d"/></linearGradient></defs>
  <rect width="1024" height="512" fill="url(#lab)"/>
  <path d="M0 350h1024v162H0z" fill="#172b35"/>
  <path d="M0 350h1024" stroke="#5eead4" stroke-opacity=".35" stroke-width="4"/>
</svg>
```

Use this exact source mapping in the script:

```js
const assets = [
  [
    "c5-ch07-a01-a-concept-about-what-floats-what-sinks",
    "float-sink-school-lab-360.png",
    "3d6dab260c2695634e6160ce91724f91dbd8fe22e184786f60a247b4561ea92d",
  ],
  [
    "c5-ch07-a03-soluble-and-insoluble-substances",
    "float-sink-school-lab-360.png",
    "3d6dab260c2695634e6160ce91724f91dbd8fe22e184786f60a247b4561ea92d",
  ],
  [
    "c6-ch02-a03-test-the-presence-of-lipids",
    "nutrition-lab-360.png",
    "e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee",
  ],
  [
    "c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies",
    "nutrition-lab-360.png",
    "e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee",
  ],
  [
    "c6-ch02-a05-the-sources-of-minerals-in-food",
    "nutrition-lab-360.png",
    "e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee",
  ],
  [
    "c6-ch04-a01-sorting-materials-according-to-their-shape",
    "materials-classroom-360.png",
    "d3620b5d71eaac1b41343c004fbb8705838cca1965e3562fc1605be6625ba53c",
  ],
];
```

Add only this opt-in script to root `package.json`:

```json
"assets:author:interactive": "node scripts/prepare-pr8-interactive-assets.mjs"
```

It must not be referenced by `prepare`, `prebuild`, `build`, `quality`, or `verify`.

- [ ] **Step 3: Generate and validate committed assets**

```bash
npm run assets:author:interactive
npm test -- tests/unit/interactive-assets.test.ts
npm run assets:validate
npm run narration:validate
```

Expected: six browser WebPs, six Quest WebPs, and six SVG fallbacks are created; asset validation passes; narration validation reports captioned `browserTts` fallback with no falsely declared MP3.

Do not run `npm run narration:author` for these modules unless a human explicitly opts in and reviews the voice output. If that separate authoring occurs, add `audioUrl` only after each MP3 is committed and `npm run narration:validate` verifies it.

- [ ] **Step 4: Commit assets and provenance script**

```bash
git add scripts/prepare-pr8-interactive-assets.mjs package.json package-lock.json apps/web/public/simulations tests/unit/interactive-assets.test.ts
git commit -m "feat(assets): add interactive investigation environments"
```

### Task 9: Prove complete flows, routes, redirects, and remove duplicate Solubility scaffolding

**Files:**

- Create: `tests/unit/interactive-investigation-flows.test.ts`
- Create: `tests/e2e/interactive-investigations.spec.ts`
- Delete: `apps/web/components/simulations/SolubilityLabViewer.tsx`
- Delete: `apps/web/lib/world-builder/solubilityExperience.ts`
- Delete: `apps/web/lib/world-builder/solubilityScene.ts`
- Delete: `tests/unit/solubility-experience.test.ts`
- Delete: `tests/unit/solubility-viewer-feedback.test.ts`
- Delete: `apps/web/app/simulations/c5-ch07-a03-soluble-and-insoluble-substances/page.tsx` after the canonical dynamic route test is green

- [ ] **Step 1: Add full headless behavioral flows**

In `tests/unit/interactive-investigation-flows.test.ts`, drive every registration only through normalized actions. Assert these exact outcomes:

- Float/Sink: all six predictions plus tests complete stages 1-2; a wrong misconception answer records no evidence; correct observation/misconception/foil-boat transfer produces unhinted mastery.
- Solubility: six equal trials produce `solution`, `solution`, `sediment`, `suspension`, `separated-layer`, and `floating-solid`; both rate comparisons are required; dissolved-matter and flour-transfer answers produce mastery.
- Lipid: every sample follows all six procedure actions; skipping dry throws; peanut/coconut persist and rice does not; water-mark misconception and sesame transfer produce mastery.
- Minerals: all three double matches are required; an incorrect source with a correct body function stays unresolved; observation/misconception/meal transfer produce mastery.
- Vitamins: all four double matches are required; long-term deficiency wording is preserved; observation/misconception/vitamin-D transfer produce mastery.
- Shape Sorting: one wrong bin yields only a clue, all eight learner-selected correct bins are required, and observation/material misconception/dice transfer produce mastery.

For each flow, assert `lesson.lessonComplete` and `mastery.mastered` separately. Run:

```bash
npm test -- tests/unit/interactive-investigation-flows.test.ts
```

Expected: six passing end-to-end domain/session flows.

- [ ] **Step 2: Add representative browser acceptance without source-text assertions**

Create `tests/e2e/interactive-investigations.spec.ts` with the six canonical paths and six legacy paths from Task 2. For every canonical path:

1. capture `pageerror`, failed requests, and 4xx/5xx asset responses;
2. open the route and click `Explore in browser`;
3. assert `[data-testid="simulation-canvas"] canvas` is visible;
4. perform the first enabled learner choice and assert the stage feedback region changes;
5. click `Replay narration`, assert the caption remains visible, click `Restart`, and assert stage 1 returns;
6. assert no collected errors.

Add deep flows for Float/Sink, Lipid Test, Mineral Sources, and Shape Sorting using the visible option labels defined in Tasks 2-7. In Shape Sorting, choose `Cuboid` for the rubber ball first, assert the clue remains and stage does not advance, then choose `Sphere`. Complete each deep flow and assert both `Activity complete` and `Mastery evidence complete` are visible.

For every legacy path, call `page.goto`, assert the final URL equals the canonical path, and assert the same `simulationId` root attribute. Required redirects are:

```ts
const legacyRoutes = {
  "/simulations/experiments-with-water-float-or-sink":
    "/simulations/c5-ch07-a01-a-concept-about-what-floats-what-sinks",
  "/simulations/experiments-with-water-soluble-insoluble":
    "/simulations/c5-ch07-a03-soluble-and-insoluble-substances",
  "/simulations/components-of-food-lipid-test":
    "/simulations/c6-ch02-a03-test-the-presence-of-lipids",
  "/simulations/components-of-food-vitamins-deficiencies":
    "/simulations/c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies",
  "/simulations/components-of-food-mineral-sources":
    "/simulations/c6-ch02-a05-the-sources-of-minerals-in-food",
  "/simulations/sorting-materials-by-shape":
    "/simulations/c6-ch04-a01-sorting-materials-according-to-their-shape",
};
```

Run the web server in terminal 1:

```bash
npm --workspace apps/web run dev
```

Run acceptance in terminal 2:

```bash
npx playwright test tests/e2e/interactive-investigations.spec.ts --reporter=line
```

Expected: all route, redirect, primary-action, replay, restart, asset, and representative completion tests pass without console errors.

- [ ] **Step 3: Remove only the superseded Solubility implementation**

After Step 2 is green, remove the six files listed under **Delete**. Confirm the new dynamic canonical route still resolves `SOLUBILITY`, the runtime import is the only `solubilityModel` implementation, and the committed existing Solubility audio files remain untouched.

Run:

```bash
rg -n "SolubilityLabViewer|world-builder/solubility(Model|Experience|Scene)" apps packages tests
npm test -- tests/unit/solubility-model.test.ts tests/unit/interactive-investigation-flows.test.ts
```

Expected: `rg` returns no stale implementation imports; both behavioral suites pass.

- [ ] **Step 4: Run repository gates and commit**

```bash
npx prettier --write packages/simulation-content/src/implemented/interactive packages/simulation-runtime/src/experience/interactiveInvestigation.ts packages/simulation-runtime/src/models apps/web/components/simulations/InteractiveInvestigationViewer.tsx apps/web/lib/simulations/interactive apps/web/lib/simulations/viewerRegistry.ts tests/unit/interactive-*.test.ts tests/unit/float-or-sink-model.test.ts tests/unit/solubility-model.test.ts tests/unit/lipid-test-model.test.ts tests/unit/nutrition-match-model.test.ts tests/unit/shape-sorting-model.test.ts tests/e2e/interactive-investigations.spec.ts
npm test -- tests/unit/interactive-investigation-session.test.ts tests/unit/interactive-simulation-definitions.test.ts tests/unit/float-or-sink-model.test.ts tests/unit/solubility-model.test.ts tests/unit/lipid-test-model.test.ts tests/unit/nutrition-match-model.test.ts tests/unit/shape-sorting-model.test.ts tests/unit/interactive-viewer-registry.test.ts tests/unit/interactive-scene-adapters.test.ts tests/unit/interactive-assets.test.ts tests/unit/interactive-investigation-flows.test.ts
npm --workspace packages/simulation-runtime run build
npm --workspace packages/simulation-content run build
npm --workspace packages/simulation-web run build
npm --workspace apps/web run type-check
npm --workspace apps/web run build
npm run narration:validate
npm run assets:validate
npm run verify
git diff --check
```

Expected: every command exits 0; the focused suite passes; Next.js builds all six canonical routes; root verification finds no missing assets, narration claims, duplicate routes, or generated drift; `git diff --check` is silent.

```bash
git add packages/simulation-content packages/simulation-runtime apps/web packages/simulation-web tests scripts package.json package-lock.json
git commit -m "test: verify interactive investigation release flows"
```

## Plan self-review

- Spec coverage: Float/Sink, enhanced canonical Solubility, Lipid Test, Mineral Sources, Vitamin Deficiencies, and Shape Sorting each have content, domain, scene, input, evidence, mastery, narration, asset, unit, and browser work.
- Contribution accounting: five new investigations plus Shape Sorting publish under canonical identities; Solubility keeps its existing identity while `contribution.sourcePath` records the PR enhancement.
- Evidence integrity: domain reducers alone emit stage evidence; wrong choices, scene callbacks, controller buttons, completion, and hints cannot fabricate mastery.
- Shared ownership: renderer/session/resize/fixed loop/input/audio/resources stay in `@xr-school/simulation-web`; React composes `SimulationExperienceShell` and `SimulationCanvasHost`.
- Honest release state: every module is publicly `released` and remains `internalQA`; no Quest or classroom acceptance is asserted.
- Type consistency: stage IDs, evidence IDs, prompt IDs, bindings, reducer action IDs, viewer keys, scene factories, routes, and asset IDs use the same spelling throughout this plan.

Plan complete and saved to `docs/superpowers/plans/2026-08-01-aditya-interactive-investigations.md`.
