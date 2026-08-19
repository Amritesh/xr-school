import {
  createFungiExperimentSession,
  reduceFungiExperiment,
} from "@xr-school/simulation-runtime";
import type {
  FungalExperimentInput,
  FungalExperimentVariable,
  FungalTrialComparison,
  FungiExperimentSession,
} from "@xr-school/simulation-runtime";

export const FUNGI_MISSION_IDS = [
  "diagnose",
  "mycelium",
  "spore-flight",
  "growth-chamber",
  "useful-fungi",
  "safety",
  "recommendation",
] as const;

export type FungiMissionId = (typeof FUNGI_MISSION_IDS)[number];
export type FungiInputSource = "mouse" | "touch" | "keyboard" | "xr-controller";
export type FungiResetBoundary = "observation" | "experiment" | "mission";
export type FungiLandmarkId =
  | "triage-table"
  | "mycelium-log"
  | "growth-chamber"
  | "fungi-at-work-bench"
  | "safety-station"
  | "nursery-gate";
export type FungiToolId =
  | "classification-board"
  | "magnifying-lens"
  | "microscope-focus"
  | "branch-tracer"
  | "airflow-fan"
  | "spore-release"
  | "growth-controls"
  | "trial-notebook"
  | "yeast-pipette"
  | "role-router"
  | "safety-scanner"
  | "safety-sorter"
  | "storage-controls"
  | "evidence-notebook";

export const FUNGI_ACTION_IDS = [
  "diagnose.classify",
  "diagnose.inspect",
  "mycelium.trace",
  "mycelium.interpret",
  "spore.record-landing",
  "growth.predict",
  "growth.run-trial",
  "growth.save-trial",
  "growth.compare-trials",
  "growth.interpret",
  "growth.order-stages",
  "useful.observe-dough",
  "useful.match-role",
  "safety.scan",
  "safety.classify",
  "safety.explain",
  "recommendation.change-storage",
  "recommendation.cite-evidence",
  "recommendation.distinguish",
  "director.request-hint",
] as const;

export type FungiActionId = (typeof FUNGI_ACTION_IDS)[number];

/**
 * Input adapters may add the optional `type` marker, but all input modes share
 * this same source-neutral semantic payload.
 */
export interface FungiDirectorAction {
  readonly type?: "fungi-action";
  readonly actionId: FungiActionId;
  readonly source: FungiInputSource;
  readonly targetId?: unknown;
  readonly value?: unknown;
  readonly input?: unknown;
  readonly trialIds?: unknown;
  readonly pose?: unknown;
}

export interface FungiCameraPose {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
}

export interface FungiFocusBounds {
  readonly minimum: readonly [number, number, number];
  readonly maximum: readonly [number, number, number];
}

export interface DiagnoseEvidence {
  firstPrediction?: string;
  classificationAttempts: string[];
  lensCrossings: string[];
  sequence: Array<
    | {
        order: number;
        kind: "classification";
        classification: string;
      }
    | {
        order: number;
        kind: "lens-crossing";
        specimenId: string;
        accepted: boolean;
      }
  >;
}

export interface MyceliumEvidence {
  branchTraces: string[];
  interpretationAttempts: string[];
}

export interface SporeFlightEvidence {
  landingOutcomes: string[];
  currentLandingOutcome?: string;
}

/** The five development stages the script asks learners to sequence. */
export const FUNGAL_DEVELOPMENT_STAGES = [
  "spore-lands",
  "hypha-grows",
  "mycelium-spreads",
  "structures-form",
  "spores-release",
] as const;

export type FungalDevelopmentStage =
  (typeof FUNGAL_DEVELOPMENT_STAGES)[number];

export interface GrowthEvidence {
  orderAttempts: string[][];
  correctOrderObserved: boolean;
  comparisonHistory: FungalTrialComparison[];
  interpretationAttempts: string[];
  correctInterpretationObserved: boolean;
}

export interface UsefulRoleAttempt {
  actorId: string;
  role: string;
  correct: boolean;
}

export interface UsefulFungiEvidence {
  doughObservations: string[];
  roleAttempts: UsefulRoleAttempt[];
  roleByActor: Record<string, string>;
}

export interface SafetyEvidence {
  maximumScanDepth: number;
  classificationAttempts: Array<{
    itemId: string;
    classification: string;
    correct: boolean;
  }>;
  classificationByItem: Record<string, string>;
  explanationAttempts: string[];
}

export interface RecommendationEvidence {
  storageChanges: string[];
  citedTrialIds: string[];
  distinctionAttempts: string[];
}

export interface FungiDirectorEvidence {
  diagnose: DiagnoseEvidence;
  mycelium: MyceliumEvidence;
  sporeFlight: SporeFlightEvidence;
  growth: GrowthEvidence;
  usefulFungi: UsefulFungiEvidence;
  safety: SafetyEvidence;
  recommendation: RecommendationEvidence;
}

export interface FungiObservationRecord {
  id: string;
  missionId: FungiMissionId;
  actionId: FungiActionId;
  targetId?: string;
  value?: string | number;
}

export interface FungiDirectorFeedback {
  outcome: string;
  hint?: string;
}

export interface FungiDirectorSnapshot {
  missionId: FungiMissionId;
  missionIndex: number;
  visitedMissionIds: FungiMissionId[];
  completedMissionIds: FungiMissionId[];
  journeyComplete: boolean;
  hintLevel: 0 | 1 | 2 | 3;
  currentHint?: string;
  cameraRequestId: number;
  experimentResetRequestId: number;
  experiment: FungiExperimentSession;
  evidence: FungiDirectorEvidence;
  observationHistory: FungiObservationRecord[];
  feedback?: FungiDirectorFeedback;
}

export interface FungiMissionDescriptor {
  readonly id: FungiMissionId;
  readonly objective: string;
  readonly landmark: FungiLandmarkId;
  readonly persistentLandmarkId: FungiLandmarkId;
  readonly cameraPose: FungiCameraPose;
  readonly focusBounds: FungiFocusBounds;
  readonly tools: readonly FungiToolId[];
  readonly actions: readonly FungiActionId[];
  readonly resetBoundary: FungiResetBoundary;
  readonly hints: readonly [string, string, string];
  readonly entryMode: "guided-pan" | "bounded-reposition" | "anchored-lens";
  readonly exitMode: "guided-pan" | "comfort-fade" | "hold-position";
  readonly evidenceSatisfied: (snapshot: FungiDirectorSnapshot) => boolean;
}

export interface FungiExperienceDirector {
  dispatch(action: FungiDirectorAction): FungiDirectorSnapshot;
  snapshot(): FungiDirectorSnapshot;
  descriptor(): FungiMissionDescriptor;
  currentMission(): FungiMissionDescriptor;
  availableActions(): readonly FungiActionId[];
  resetExperiment(): FungiDirectorSnapshot;
  resetCameraRequest(): FungiDirectorSnapshot;
  restartJourney(): FungiDirectorSnapshot;
}

const CORRECT_DIAGNOSIS = "mushroom-and-bread-mould";
const REQUIRED_SPECIMENS = ["mushroom", "bread-mould", "green-plant"] as const;
const CORRECT_NETWORK_INTERPRETATION = "connected-feeding-network";
const REQUIRED_DOUGH_OBSERVATION = "yeast-expanded-more-than-control";
const CORRECT_SAFETY_EXPLANATION = "hidden-hyphae-extend-beyond-visible-patch";
const CORRECT_STORAGE_CHANGE = "cool-and-dry";
const CORRECT_DISTINCTION = "spoilage-harmful-decomposition-useful";
const HIDDEN_HYPHAE_DEPTH = 0.5;

const INPUT_SOURCES = {
  mouse: true,
  touch: true,
  keyboard: true,
  "xr-controller": true,
} as const;

const SPECIMENS = {
  mushroom: true,
  "bread-mould": true,
  "green-plant": true,
} as const;

const SPECIMEN_BOUNDS = {
  mushroom: { minimum: [-2.6, 0.4, -0.6], maximum: [-1.4, 1.6, 0.6] },
  "bread-mould": { minimum: [-0.6, 0.4, -0.6], maximum: [0.6, 1.6, 0.6] },
  "green-plant": { minimum: [1.4, 0.4, -0.6], maximum: [2.6, 1.6, 0.6] },
} as const;

const LANDING_OUTCOMES = {
  missed: true,
  dormant: true,
  germinating: true,
} as const;

const USEFUL_ROLE_BY_ACTOR = {
  yeast: "food",
  "antibiotic-producing-fungus": "medicine",
  "saprotrophic-fungus": "decomposer",
} as const;

const USEFUL_ROLES = {
  food: true,
  medicine: true,
  decomposer: true,
} as const;

const SAFETY_CLASSIFICATION_BY_ITEM = {
  "fresh-item": "check-use",
  "mouldy-item": "do-not-eat",
} as const;

const GROWTH_INTERPRETATIONS: Readonly<
  Record<FungalExperimentVariable, readonly string[]>
> = {
  temperatureC: ["temperature-changed-growth", "temperature-affects-growth"],
  moisturePercent: ["moisture-changed-growth", "moisture-affects-growth"],
  substrate: ["substrate-changed-growth", "substrate-affects-growth"],
  elapsedHours: ["time-changed-growth", "time-affects-growth"],
  inoculumViability: ["viability-changed-growth", "viability-affects-growth"],
};

function latest<T>(values: readonly T[]): T | undefined {
  return values[values.length - 1];
}

function hasAll(
  values: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((value) => values.includes(value));
}

function hasCanonicalUsefulRoles(evidence: UsefulFungiEvidence): boolean {
  return Object.entries(USEFUL_ROLE_BY_ACTOR).every(
    ([actorId, role]) => evidence.roleByActor[actorId] === role,
  );
}

function hasCorrectSafetyClassifications(evidence: SafetyEvidence): boolean {
  return Object.entries(SAFETY_CLASSIFICATION_BY_ITEM).every(
    ([itemId, classification]) =>
      evidence.classificationByItem[itemId] === classification,
  );
}

/**
 * The learner must predict before inspecting, look at all three specimens, and
 * end on the correct classification. Being right the first time is allowed:
 * requiring a second answer left a learner who never changed their mind stuck
 * with no way forward. Revision is still recorded when it happens.
 */
function hasChronologicalDiagnosis(evidence: DiagnoseEvidence): boolean {
  const prediction = evidence.sequence.find(
    (event) => event.kind === "classification",
  );
  if (prediction === undefined) return false;
  const inspectedAfterPredicting = REQUIRED_SPECIMENS.every((specimenId) =>
    evidence.sequence.some(
      (event) =>
        event.kind === "lens-crossing" &&
        event.accepted &&
        event.specimenId === specimenId &&
        event.order > prediction.order,
    ),
  );
  return (
    inspectedAfterPredicting &&
    latest(evidence.classificationAttempts) === CORRECT_DIAGNOSIS
  );
}

/**
 * Ending on the correct explanation is what counts. Demanding a wrong answer
 * first made the mission impossible to finish for a learner who understood it
 * immediately.
 */
function hasCorrectedSafetyExplanation(evidence: SafetyEvidence): boolean {
  return latest(evidence.explanationAttempts) === CORRECT_SAFETY_EXPLANATION;
}

function camera(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
): FungiCameraPose {
  return { position, target };
}

function bounds(
  minimum: readonly [number, number, number],
  maximum: readonly [number, number, number],
): FungiFocusBounds {
  return { minimum, maximum };
}

const missionDescriptors: FungiMissionDescriptor[] = [
  {
    id: "diagnose",
    objective:
      "Predict which specimens are fungi, then inspect all three before revising the classification.",
    landmark: "triage-table",
    persistentLandmarkId: "triage-table",
    cameraPose: camera([0, 2.8, 7.5], [0, 1.1, 0]),
    focusBounds: bounds([-3.2, 0, -1.8], [3.2, 2.7, 1.8]),
    tools: ["classification-board", "magnifying-lens"],
    actions: ["diagnose.classify", "diagnose.inspect"],
    resetBoundary: "observation",
    hints: [
      "Use observable structures to decide which specimens belong to the fungal kingdom.",
      "Move the magnifying lens across every specimen on the triage table.",
      "Look for gills or filaments and compare them with green leaf tissue before revising.",
    ],
    entryMode: "guided-pan",
    exitMode: "guided-pan",
    evidenceSatisfied: ({ evidence }) =>
      evidence.diagnose.firstPrediction !== undefined &&
      hasAll(evidence.diagnose.lensCrossings, REQUIRED_SPECIMENS) &&
      hasChronologicalDiagnosis(evidence.diagnose),
  },
  {
    id: "mycelium",
    objective:
      "Trace distinct hyphal branches and interpret how they form one feeding network.",
    landmark: "mycelium-log",
    persistentLandmarkId: "mycelium-log",
    cameraPose: camera([-5.2, 2.2, 4.8], [-4.4, 0.8, -0.6]),
    focusBounds: bounds([-6.8, 0, -2.4], [-2.2, 2.6, 1.8]),
    tools: ["microscope-focus", "branch-tracer"],
    actions: ["mycelium.trace", "mycelium.interpret"],
    resetBoundary: "observation",
    hints: [
      "Investigate how separate-looking hyphae contribute to a larger structure.",
      "Focus the log microscope and trace three different branch tips.",
      "Follow nutrient motion from the wood into the connected mycelium network.",
    ],
    entryMode: "anchored-lens",
    exitMode: "comfort-fade",
    evidenceSatisfied: ({ evidence }) =>
      evidence.mycelium.branchTraces.length >= 3 &&
      latest(evidence.mycelium.interpretationAttempts) ===
        CORRECT_NETWORK_INTERPRETATION,
  },
  {
    id: "spore-flight",
    objective:
      "Compare an unsuccessful or dormant spore landing with a landing that germinates.",
    landmark: "mycelium-log",
    persistentLandmarkId: "mycelium-log",
    cameraPose: camera([-2.8, 3.5, 6.2], [-1.5, 1.3, -1.2]),
    focusBounds: bounds([-5.8, 0, -3.6], [2.4, 4.2, 2.3]),
    tools: ["airflow-fan", "spore-release"],
    actions: ["spore.record-landing"],
    resetBoundary: "experiment",
    hints: [
      "Compare what happens to spores under suitable and unsuitable landing conditions.",
      "Use the fan to try a dry or unsuitable surface and the warm moist bread tray.",
      "Record a dormant landing, then guide another spore to conditions where it germinates.",
    ],
    entryMode: "bounded-reposition",
    exitMode: "guided-pan",
    evidenceSatisfied: ({ evidence }) =>
      (evidence.sporeFlight.landingOutcomes.includes("missed") ||
        evidence.sporeFlight.landingOutcomes.includes("dormant")) &&
      evidence.sporeFlight.landingOutcomes.includes("germinating"),
  },
  {
    id: "growth-chamber",
    objective:
      "Run and interpret a fair two-trial comparison in which exactly one variable changes.",
    landmark: "growth-chamber",
    persistentLandmarkId: "growth-chamber",
    cameraPose: camera([3.8, 2.9, 6.6], [4.1, 1.1, -0.2]),
    focusBounds: bounds([1.2, 0, -2.7], [7.1, 3.4, 2.2]),
    tools: ["growth-controls", "trial-notebook"],
    actions: [
      "growth.predict",
      "growth.run-trial",
      "growth.save-trial",
      "growth.compare-trials",
      "growth.interpret",
  "growth.order-stages",
    ],
    resetBoundary: "experiment",
    hints: [
      "Use controlled evidence to explain which condition changed fungal growth.",
      "Save two chamber trials and compare them in the trial notebook.",
      "Keep every setting except one identical, then interpret that changed variable.",
    ],
    entryMode: "guided-pan",
    exitMode: "guided-pan",
    evidenceSatisfied: ({ evidence }) => evidence.growth.correctOrderObserved,
  },
  {
    id: "useful-fungi",
    objective:
      "Observe yeast beside a control and map fungi to food, medicine, and decomposition roles.",
    landmark: "fungi-at-work-bench",
    persistentLandmarkId: "fungi-at-work-bench",
    cameraPose: camera([7.2, 2.7, 3.8], [7, 1, -1]),
    focusBounds: bounds([4.3, 0, -3.8], [9.7, 3.1, 1.7]),
    tools: ["yeast-pipette", "role-router"],
    actions: ["useful.observe-dough", "useful.match-role"],
    resetBoundary: "mission",
    hints: [
      "Use observations to distinguish several beneficial fungal roles.",
      "Compare the yeast dough with its no-yeast control, then route all three organisms.",
      "Yeast makes gas in food, one culture models medicine, and saprotrophs decompose litter.",
    ],
    entryMode: "guided-pan",
    exitMode: "guided-pan",
    evidenceSatisfied: ({ evidence }) =>
      evidence.usefulFungi.doughObservations.includes(
        REQUIRED_DOUGH_OBSERVATION,
      ) && hasCanonicalUsefulRoles(evidence.usefulFungi),
  },
  {
    id: "safety",
    objective:
      "Reveal hidden hyphae, classify both food samples, and correct the safety explanation.",
    landmark: "safety-station",
    persistentLandmarkId: "safety-station",
    cameraPose: camera([2.6, 2.5, -6], [2.3, 1, -8.1]),
    focusBounds: bounds([-0.2, 0, -10], [5.6, 3, -6.1]),
    tools: ["safety-scanner", "safety-sorter"],
    actions: ["safety.scan", "safety.classify", "safety.explain"],
    resetBoundary: "mission",
    hints: [
      "Base the food-safety decision on what fungal structures can extend beyond sight.",
      "Move the scanner deeper than the visible patch and classify both food samples.",
      "Revise the explanation to account for hidden hyphae extending through soft food.",
    ],
    entryMode: "bounded-reposition",
    exitMode: "guided-pan",
    evidenceSatisfied: ({ evidence }) =>
      evidence.safety.maximumScanDepth > HIDDEN_HYPHAE_DEPTH &&
      hasCorrectSafetyClassifications(evidence.safety) &&
      hasCorrectedSafetyExplanation(evidence.safety),
  },
  {
    id: "recommendation",
    objective:
      "Recommend a storage change, cite saved trial evidence, and distinguish harmful from useful fungi.",
    landmark: "nursery-gate",
    persistentLandmarkId: "nursery-gate",
    cameraPose: camera([0, 3.1, -9.6], [0, 1.4, -12]),
    focusBounds: bounds([-3.6, 0, -13.8], [3.6, 4, -9.4]),
    tools: ["storage-controls", "evidence-notebook"],
    actions: [
      "recommendation.change-storage",
      "recommendation.cite-evidence",
      "recommendation.distinguish",
    ],
    resetBoundary: "mission",
    hints: [
      "Apply evidence from the nursery investigation to the new storage problem.",
      "Choose a storage change and cite one of your saved chamber trials.",
      "Reduce warmth or moisture, then contrast harmful spoilage with useful decomposition.",
    ],
    entryMode: "guided-pan",
    exitMode: "hold-position",
    evidenceSatisfied: ({ evidence, experiment }) =>
      latest(evidence.recommendation.storageChanges) ===
        CORRECT_STORAGE_CHANGE &&
      evidence.recommendation.citedTrialIds.some((trialId) =>
        experiment.savedTrials.some(({ id }) => id === trialId),
      ) &&
      latest(evidence.recommendation.distinctionAttempts) ===
        CORRECT_DISTINCTION,
  },
];

function deepFreeze<T>(value: T): T {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function") ||
    Object.isFrozen(value)
  ) {
    return value;
  }
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

export const FUNGI_MISSIONS: readonly FungiMissionDescriptor[] =
  deepFreeze(missionDescriptors);

const ACTION_IDS = Object.fromEntries(
  FUNGI_ACTION_IDS.map((actionId) => [actionId, true]),
) as Record<FungiActionId, true>;

function initialEvidence(): FungiDirectorEvidence {
  return {
    diagnose: { classificationAttempts: [], lensCrossings: [], sequence: [] },
    mycelium: { branchTraces: [], interpretationAttempts: [] },
    sporeFlight: { landingOutcomes: [] },
    growth: {
      comparisonHistory: [],
      interpretationAttempts: [],
      correctInterpretationObserved: false,
      orderAttempts: [],
      correctOrderObserved: false,
    },
    usefulFungi: {
      doughObservations: [],
      roleAttempts: [],
      roleByActor: {},
    },
    safety: {
      maximumScanDepth: 0,
      classificationAttempts: [],
      classificationByItem: {},
      explanationAttempts: [],
    },
    recommendation: {
      storageChanges: [],
      citedTrialIds: [],
      distinctionAttempts: [],
    },
  };
}

function initialState(): FungiDirectorSnapshot {
  return {
    missionId: "diagnose",
    missionIndex: 0,
    visitedMissionIds: ["diagnose"],
    completedMissionIds: [],
    journeyComplete: false,
    hintLevel: 0,
    cameraRequestId: 0,
    experimentResetRequestId: 0,
    experiment: createFungiExperimentSession(),
    evidence: initialEvidence(),
    observationHistory: [],
  };
}

function copyAndFreeze(state: FungiDirectorSnapshot): FungiDirectorSnapshot {
  return deepFreeze(structuredClone(state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownValue(record: Record<string, unknown>, field: string): unknown {
  if (!Object.hasOwn(record, field)) {
    throw new Error(`fungi action ${field} is required`);
  }
  return record[field];
}

function ownString(record: Record<string, unknown>, field: string): string {
  const value = ownValue(record, field);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`fungi action ${field} must be a non-empty string`);
  }
  return value;
}

function ownFiniteNumber(
  record: Record<string, unknown>,
  field: string,
): number {
  const value = ownValue(record, field);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`fungi action ${field} must be a finite number`);
  }
  return value;
}

function lensPosition(
  action: Record<string, unknown>,
): readonly [number, number, number] {
  const pose = ownValue(action, "pose");
  if (!isRecord(pose)) throw new Error("fungi action pose must be an object");
  const position = ownValue(pose, "position");
  if (
    !Array.isArray(position) ||
    position.length !== 3 ||
    [0, 1, 2].some(
      (index) =>
        !Object.hasOwn(position, index) ||
        typeof position[index] !== "number" ||
        !Number.isFinite(position[index]),
    )
  ) {
    throw new Error(
      "fungi action pose position must contain three finite numbers",
    );
  }
  return position as unknown as readonly [number, number, number];
}

function crossesSpecimenBounds(
  specimen: keyof typeof SPECIMEN_BOUNDS,
  position: readonly [number, number, number],
): boolean {
  const { minimum, maximum } = SPECIMEN_BOUNDS[specimen];
  return (
    position[0] >= minimum[0] &&
    position[0] <= maximum[0] &&
    position[1] >= minimum[1] &&
    position[1] <= maximum[1] &&
    position[2] >= minimum[2] &&
    position[2] <= maximum[2]
  );
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) values.push(value);
}

function validateAction(action: unknown): {
  record: Record<string, unknown>;
  actionId: FungiActionId;
  source: FungiInputSource;
} {
  if (!isRecord(action)) throw new Error("fungi action must be an object");
  if (Object.hasOwn(action, "type")) {
    const type = action.type;
    if (typeof type !== "string" || type !== "fungi-action") {
      throw new Error("fungi action type must be fungi-action");
    }
  }
  const actionId = ownString(action, "actionId");
  if (!Object.hasOwn(ACTION_IDS, actionId)) {
    throw new Error(`unknown fungi action ID: ${actionId}`);
  }
  const source = ownString(action, "source");
  if (!Object.hasOwn(INPUT_SOURCES, source)) {
    throw new Error(`unsupported fungi action source: ${source}`);
  }
  return {
    record: action,
    actionId: actionId as FungiActionId,
    source: source as FungiInputSource,
  };
}

function validGrowthInterpretation(
  comparison: FungalTrialComparison | undefined,
  interpretation: string,
): boolean {
  if (
    comparison?.quality !== "fair" ||
    comparison.changedVariables.length !== 1
  ) {
    return false;
  }
  const variable = comparison.changedVariables[0];
  return (
    variable !== undefined &&
    GROWTH_INTERPRETATIONS[variable].includes(interpretation)
  );
}

function applyAction(
  state: FungiDirectorSnapshot,
  actionId: FungiActionId,
  action: Record<string, unknown>,
): void {
  switch (actionId) {
    case "director.request-hint":
      state.hintLevel = Math.min(3, state.hintLevel + 1) as 1 | 2 | 3;
      return;

    case "diagnose.classify": {
      const classification = ownString(action, "value");
      state.evidence.diagnose.firstPrediction ??= classification;
      state.evidence.diagnose.classificationAttempts.push(classification);
      state.evidence.diagnose.sequence.push({
        order: state.observationHistory.length + 1,
        kind: "classification",
        classification,
      });
      return;
    }
    case "diagnose.inspect": {
      const specimen = ownString(action, "targetId");
      if (!Object.hasOwn(SPECIMENS, specimen)) {
        throw new Error(`unknown diagnosis specimen ID: ${specimen}`);
      }
      const position = lensPosition(action);
      const accepted =
        state.evidence.diagnose.firstPrediction !== undefined &&
        crossesSpecimenBounds(
          specimen as keyof typeof SPECIMEN_BOUNDS,
          position,
        );
      state.evidence.diagnose.sequence.push({
        order: state.observationHistory.length + 1,
        kind: "lens-crossing",
        specimenId: specimen,
        accepted,
      });
      if (accepted) {
        addUnique(state.evidence.diagnose.lensCrossings, specimen);
        state.experiment = reduceFungiExperiment(state.experiment, {
          type: "record-observation",
          observation: `lens-crossing:${specimen}`,
        });
      }
      return;
    }
    case "mycelium.trace": {
      const branchId = ownString(action, "targetId");
      addUnique(state.evidence.mycelium.branchTraces, branchId);
      state.experiment = reduceFungiExperiment(state.experiment, {
        type: "record-observation",
        observation: `mycelium-branch:${branchId}`,
      });
      return;
    }
    case "mycelium.interpret":
      state.evidence.mycelium.interpretationAttempts.push(
        ownString(action, "value"),
      );
      return;

    case "spore.record-landing": {
      const outcome = ownString(action, "value");
      if (!Object.hasOwn(LANDING_OUTCOMES, outcome)) {
        throw new Error(`unknown spore landing outcome: ${outcome}`);
      }
      state.evidence.sporeFlight.landingOutcomes.push(outcome);
      state.evidence.sporeFlight.currentLandingOutcome = outcome;
      state.experiment = reduceFungiExperiment(state.experiment, {
        type: "record-observation",
        observation: `spore-landing:${outcome}`,
      });
      return;
    }

    case "growth.predict":
      state.experiment = reduceFungiExperiment(state.experiment, {
        type: "predict-trial",
        prediction: ownString(action, "value"),
      });
      return;
    case "growth.run-trial":
      state.experiment = reduceFungiExperiment(state.experiment, {
        type: "run-trial",
        input: ownValue(action, "input") as FungalExperimentInput,
      });
      return;
    case "growth.save-trial":
      state.experiment = reduceFungiExperiment(state.experiment, {
        type: "save-current-trial",
      });
      return;
    case "growth.compare-trials": {
      state.experiment = reduceFungiExperiment(state.experiment, {
        type: "compare-trials",
        trialIds: ownValue(action, "trialIds") as readonly [string, string],
      });
      const comparison = state.experiment.comparison;
      if (comparison !== undefined) {
        state.evidence.growth.comparisonHistory.push(
          structuredClone(comparison),
        );
      }
      return;
    }
    case "growth.interpret": {
      const interpretation = ownString(action, "value");
      state.evidence.growth.interpretationAttempts.push(interpretation);
      state.evidence.growth.correctInterpretationObserved ||=
        validGrowthInterpretation(state.experiment.comparison, interpretation);
      return;
    }

    case "growth.order-stages": {
      const ordered = ownValue(action, "value");
      if (
        !Array.isArray(ordered) ||
        ordered.length !== FUNGAL_DEVELOPMENT_STAGES.length ||
        ordered.some((stage) => typeof stage !== "string")
      ) {
        throw new Error(
          `fungal development order must list all ${FUNGAL_DEVELOPMENT_STAGES.length} stages`,
        );
      }
      const attempt = ordered as string[];
      if (new Set(attempt).size !== attempt.length) {
        throw new Error("fungal development order must not repeat a stage");
      }
      for (const stage of attempt) {
        if (!FUNGAL_DEVELOPMENT_STAGES.includes(stage as never)) {
          throw new Error(`unknown fungal development stage: ${stage}`);
        }
      }
      state.evidence.growth.orderAttempts.push([...attempt]);
      state.evidence.growth.correctOrderObserved ||=
        attempt.every((stage, index) => stage === FUNGAL_DEVELOPMENT_STAGES[index]);
      return;
    }

    case "useful.observe-dough": {
      const observation = ownString(action, "value");
      state.evidence.usefulFungi.doughObservations.push(observation);
      state.experiment = reduceFungiExperiment(state.experiment, {
        type: "record-observation",
        observation: `dough:${observation}`,
      });
      return;
    }
    case "useful.match-role": {
      const actorId = ownString(action, "targetId");
      if (!Object.hasOwn(USEFUL_ROLE_BY_ACTOR, actorId)) {
        throw new Error(`unknown useful fungi actor ID: ${actorId}`);
      }
      const role = ownString(action, "value");
      if (!Object.hasOwn(USEFUL_ROLES, role)) {
        throw new Error(`unknown useful fungi role ID: ${role}`);
      }
      const correct =
        USEFUL_ROLE_BY_ACTOR[actorId as keyof typeof USEFUL_ROLE_BY_ACTOR] ===
        role;
      state.evidence.usefulFungi.roleAttempts.push({
        actorId,
        role,
        correct,
      });
      if (correct) state.evidence.usefulFungi.roleByActor[actorId] = role;
      return;
    }

    case "safety.scan": {
      const depth = ownFiniteNumber(action, "value");
      if (depth < 0 || depth > 1) {
        throw new Error("safety scan depth must be between 0 and 1");
      }
      state.evidence.safety.maximumScanDepth = Math.max(
        state.evidence.safety.maximumScanDepth,
        depth,
      );
      if (depth > HIDDEN_HYPHAE_DEPTH) {
        state.experiment = reduceFungiExperiment(state.experiment, {
          type: "record-observation",
          observation: "hidden-hyphae-beyond-visible-patch",
        });
      }
      return;
    }
    case "safety.classify": {
      const itemId = ownString(action, "targetId");
      if (!Object.hasOwn(SAFETY_CLASSIFICATION_BY_ITEM, itemId)) {
        throw new Error(`unknown safety item ID: ${itemId}`);
      }
      const classification = ownString(action, "value");
      if (classification !== "check-use" && classification !== "do-not-eat") {
        throw new Error(`unknown safety classification ID: ${classification}`);
      }
      const correct =
        SAFETY_CLASSIFICATION_BY_ITEM[
          itemId as keyof typeof SAFETY_CLASSIFICATION_BY_ITEM
        ] === classification;
      state.evidence.safety.classificationAttempts.push({
        itemId,
        classification,
        correct,
      });
      state.evidence.safety.classificationByItem[itemId] = classification;
      return;
    }
    case "safety.explain":
      state.evidence.safety.explanationAttempts.push(
        ownString(action, "value"),
      );
      return;

    case "recommendation.change-storage":
      state.evidence.recommendation.storageChanges.push(
        ownString(action, "value"),
      );
      return;
    case "recommendation.cite-evidence": {
      const trialId = ownString(action, "value");
      if (!state.experiment.savedTrials.some(({ id }) => id === trialId)) {
        throw new Error(`cited fungal trial ${trialId} does not exist`);
      }
      addUnique(state.evidence.recommendation.citedTrialIds, trialId);
      return;
    }
    case "recommendation.distinguish":
      state.evidence.recommendation.distinctionAttempts.push(
        ownString(action, "value"),
      );
      return;
  }
}

function feedbackFor(
  state: FungiDirectorSnapshot,
  actionId: FungiActionId,
  action: Record<string, unknown>,
): FungiDirectorFeedback {
  switch (actionId) {
    case "director.request-hint":
      return {
        outcome:
          "The current scientific objective is unchanged by requesting guidance.",
        ...(state.currentHint === undefined ? {} : { hint: state.currentHint }),
      };
    case "diagnose.classify":
      return {
        outcome:
          "Classification prediction recorded; inspect structures before revising it.",
      };
    case "diagnose.inspect": {
      const specimen = ownString(action, "targetId");
      if (state.evidence.diagnose.firstPrediction === undefined) {
        return {
          outcome: `Predict first; the ${specimen} lens crossing is not yet accepted as observation evidence.`,
        };
      }
      const crossed = crossesSpecimenBounds(
        specimen as keyof typeof SPECIMEN_BOUNDS,
        lensPosition(action),
      );
      return {
        outcome: crossed
          ? `The lens crossed the ${specimen} region and revealed its observable structure.`
          : `The lens did not cross the ${specimen} specimen bounds, so no structure was observed.`,
      };
    }
    case "mycelium.trace": {
      const branchId = ownString(action, "targetId");
      const alreadyTraced = state.observationHistory.some(
        (record) =>
          record.actionId === "mycelium.trace" && record.targetId === branchId,
      );
      return {
        outcome: alreadyTraced
          ? `Branch ${branchId} was already traced, so it adds no new network evidence.`
          : "A distinct hyphal branch now contributes to the observed feeding network.",
      };
    }
    case "mycelium.interpret":
      return {
        outcome:
          ownString(action, "value") === CORRECT_NETWORK_INTERPRETATION
            ? "The traced hyphae support one connected feeding-network interpretation."
            : "That interpretation does not account for the connected traced hyphae.",
      };
    case "spore.record-landing":
      return {
        outcome: `The landed spore outcome was ${ownString(action, "value")}.`,
      };
    case "growth.predict":
      return {
        outcome:
          "Growth prediction recorded before observing the chamber response.",
      };
    case "growth.run-trial":
      return {
        outcome: `The representative colony reached ${Math.round(state.experiment.currentOutput.surfaceCoverage * 100)}% surface coverage.`,
      };
    case "growth.save-trial":
      return {
        outcome:
          "The observed growth curve and settings were saved as trial evidence.",
      };
    case "growth.compare-trials":
      return {
        outcome:
          state.experiment.comparison?.quality === "fair"
            ? "The comparison is fair because exactly one experimental variable changed."
            : "The comparison is confounded because it did not change exactly one variable.",
      };
    case "growth.interpret":
      return {
        outcome: validGrowthInterpretation(
          state.experiment.comparison,
          ownString(action, "value"),
        )
          ? "The interpretation matches the single variable changed in the fair comparison."
          : "The interpretation does not identify a single changed variable in a fair comparison.",
      };
    case "growth.order-stages": {
      const ordered = ownValue(action, "value") as string[];
      const correct = ordered.every(
        (stage, index) => stage === FUNGAL_DEVELOPMENT_STAGES[index],
      );
      const firstWrong = ordered.findIndex(
        (stage, index) => stage !== FUNGAL_DEVELOPMENT_STAGES[index],
      );
      return {
        outcome: correct
          ? "That is the order a bread mould really develops in."
          : `Not yet — step ${firstWrong + 1} does not come next. Watch the time-lapse again.`,
      };
    }
    case "useful.observe-dough": {
      const observation = ownString(action, "value");
      return {
        outcome:
          observation === REQUIRED_DOUGH_OBSERVATION
            ? "Yeast dough expanded beyond the no-yeast control as gas accumulated."
            : observation === "no-difference-from-control"
              ? "The recorded observation reports no difference from the no-yeast control."
              : `The dough observation '${observation}' was recorded without inferring a biological result.`,
      };
    }
    case "useful.match-role": {
      const attempt = latest(state.evidence.usefulFungi.roleAttempts);
      return {
        outcome: attempt?.correct
          ? "The fungal role matches the observed biological process."
          : "That role does not match the observed biological process; the attempt remains recorded.",
      };
    }
    case "safety.scan":
      return {
        outcome:
          state.evidence.safety.maximumScanDepth > HIDDEN_HYPHAE_DEPTH
            ? "The deeper scan revealed hidden hyphae beyond the visible mould patch."
            : "The scan remains within the visible patch and has not revealed deeper hyphae.",
      };
    case "safety.classify": {
      const attempt = latest(state.evidence.safety.classificationAttempts);
      return {
        outcome: attempt?.correct
          ? "The food classification agrees with the scan evidence."
          : "The food classification conflicts with the scan evidence; the attempt remains recorded.",
      };
    }
    case "safety.explain":
      return {
        outcome:
          ownString(action, "value") === CORRECT_SAFETY_EXPLANATION
            ? "The explanation now accounts for hidden hyphae extending beyond the visible patch."
            : "The explanation does not yet account for hidden hyphae beyond the visible patch.",
      };
    case "recommendation.change-storage":
      return {
        outcome:
          ownString(action, "value") === CORRECT_STORAGE_CHANGE
            ? "Cooler, drier storage reduces conditions that supported fungal growth in the trials."
            : "The proposed storage change was recorded but does not yet reduce both warmth and moisture.",
      };
    case "recommendation.cite-evidence":
      return {
        outcome:
          "A saved chamber trial now supports the storage recommendation.",
      };
    case "recommendation.distinguish":
      return {
        outcome:
          ownString(action, "value") === CORRECT_DISTINCTION
            ? "The recommendation distinguishes harmful spoilage from useful decomposition."
            : "That distinction does not yet separate harmful spoilage from useful decomposition.",
      };
  }
}

function observationFor(
  state: FungiDirectorSnapshot,
  missionId: FungiMissionId,
  actionId: FungiActionId,
  action: Record<string, unknown>,
): FungiObservationRecord {
  const targetId = Object.hasOwn(action, "targetId")
    ? action.targetId
    : undefined;
  const value = Object.hasOwn(action, "value") ? action.value : undefined;
  return {
    id: `observation-${state.observationHistory.length + 1}`,
    missionId,
    actionId,
    ...(typeof targetId === "string" ? { targetId } : {}),
    ...(typeof value === "string" || typeof value === "number"
      ? { value }
      : {}),
  };
}

function updateMissionProgress(state: FungiDirectorSnapshot): void {
  const descriptor = FUNGI_MISSIONS[state.missionIndex];
  if (descriptor === undefined || !descriptor.evidenceSatisfied(state)) return;
  if (!state.completedMissionIds.includes(descriptor.id)) {
    state.completedMissionIds.push(descriptor.id);
  }
  if (state.missionIndex === FUNGI_MISSIONS.length - 1) {
    state.journeyComplete = true;
    return;
  }
  state.missionIndex += 1;
  state.missionId = FUNGI_MISSION_IDS[state.missionIndex] ?? state.missionId;
  if (!state.visitedMissionIds.includes(state.missionId)) {
    state.visitedMissionIds.push(state.missionId);
  }
  state.hintLevel = 0;
  delete state.currentHint;
}

export function createFungiExperienceDirector(): FungiExperienceDirector {
  let state = initialState();

  const snapshot = (): FungiDirectorSnapshot => copyAndFreeze(state);
  const descriptor = (): FungiMissionDescriptor => {
    const current = FUNGI_MISSIONS[state.missionIndex];
    if (current === undefined) throw new Error("fungi mission is unavailable");
    return current;
  };

  return {
    dispatch(action) {
      const validated = validateAction(action);
      const current = descriptor();
      if (
        validated.actionId !== "director.request-hint" &&
        !current.actions.includes(validated.actionId)
      ) {
        throw new Error(
          `fungi action ${validated.actionId} is unavailable during ${current.id}`,
        );
      }

      const draft = structuredClone(state);
      applyAction(draft, validated.actionId, validated.record);
      if (validated.actionId === "director.request-hint") {
        draft.currentHint = current.hints[draft.hintLevel - 1];
      }
      draft.feedback = feedbackFor(draft, validated.actionId, validated.record);
      draft.observationHistory.push(
        observationFor(draft, current.id, validated.actionId, validated.record),
      );
      updateMissionProgress(draft);
      state = draft;
      return snapshot();
    },
    snapshot,
    descriptor,
    currentMission: descriptor,
    availableActions() {
      return deepFreeze([
        ...descriptor().actions,
        "director.request-hint" as const,
      ]);
    },
    resetExperiment() {
      if (
        state.missionId !== "spore-flight" &&
        state.missionId !== "growth-chamber"
      ) {
        return snapshot();
      }
      if (state.missionId === "spore-flight") {
        const draft = structuredClone(state);
        draft.experimentResetRequestId += 1;
        delete draft.evidence.sporeFlight.currentLandingOutcome;
        state = draft;
        return snapshot();
      }
      state = {
        ...structuredClone(state),
        experimentResetRequestId: state.experimentResetRequestId + 1,
        experiment: reduceFungiExperiment(state.experiment, {
          type: "reset-experiment",
        }),
      };
      return snapshot();
    },
    resetCameraRequest() {
      state = {
        ...structuredClone(state),
        cameraRequestId: state.cameraRequestId + 1,
      };
      return snapshot();
    },
    restartJourney() {
      state = initialState();
      return snapshot();
    },
  };
}
