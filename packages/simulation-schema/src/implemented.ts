import type { ExperienceDefinition, GradeToneProfile } from "./experience.js";
import {
  toExperienceDefinition,
  validateGuidedSimulationDefinition,
  type GuidedSimulationDefinition,
} from "./guided.js";
import type { SimulationModuleRecord } from "./index.js";
import type {
  AssessmentSequence,
  AssetDefinition,
  AssetManifest,
} from "./world.js";

export type PublicationStatus = "released" | "preview" | "retired";
export type EvidenceMaturity =
  | "internalQA"
  | "deviceVerified"
  | "classroomVerified";

export interface NarrationCueDefinition {
  id: string;
  stageId: string;
  text: string;
  caption: string;
  audioUrl?: string;
}

export interface SimulationNarrationManifest {
  id: string;
  cues: NarrationCueDefinition[];
  fallback: "browserTts" | "none";
}

export interface ImplementedSimulationDefinition {
  module: SimulationModuleRecord;
  kind: "guided" | "interactive";
  experience: ExperienceDefinition;
  assessment: AssessmentSequence;
  narration: SimulationNarrationManifest;
  assets: AssetManifest;
  legacyPaths: string[];
  contribution: {
    source: "existing" | "pr-8";
    contributor?: string;
    sourcePath?: string;
  };
}

export interface GuidedImplementedSimulationInput {
  module: SimulationModuleRecord;
  guidance: GuidedSimulationDefinition;
  assessment: AssessmentSequence;
  narration: SimulationNarrationManifest;
  assets: AssetManifest;
  legacyPaths: string[];
  contribution: ImplementedSimulationDefinition["contribution"];
}

const GRADE_TONES: readonly GradeToneProfile[] = [
  "class3To5",
  "class6To8",
  "class9To10",
];
const PUBLICATION_STATUSES: readonly PublicationStatus[] = [
  "released",
  "preview",
  "retired",
];
const EVIDENCE_MATURITIES: readonly EvidenceMaturity[] = [
  "internalQA",
  "deviceVerified",
  "classroomVerified",
];
const STATUS_BY_PUBLICATION: Record<
  PublicationStatus,
  readonly SimulationModuleRecord["status"][]
> = {
  released: ["released"],
  preview: ["draft", "approved"],
  retired: ["deprecated", "archived"],
};
const LOWERCASE_SHA_256 = /^[0-9a-f]{64}$/;

function requireText(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "string" || !value.trim())
    errors.push(`${path}: required`);
}

function validateUniqueValues(
  entries: readonly { value: string; path: string }[],
  errors: string[],
) {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.value)) {
      errors.push(`${entry.path}: duplicate "${entry.value}"`);
    }
    seen.add(entry.value);
  }
}

function validateNarration(
  manifest: SimulationNarrationManifest,
  path: string,
) {
  const errors: string[] = [];
  requireText(manifest.id, `${path}.id`, errors);
  if (manifest.cues.length === 0) {
    errors.push(`${path}.cues: at least one cue is required`);
  }

  const cueIds: { value: string; path: string }[] = [];
  manifest.cues.forEach((cue, index) => {
    const cuePath = `${path}.cues[${index}]`;
    requireText(cue.id, `${cuePath}.id`, errors);
    requireText(cue.stageId, `${cuePath}.stageId`, errors);
    requireText(cue.text, `${cuePath}.text`, errors);
    requireText(cue.caption, `${cuePath}.caption`, errors);
    if (cue.audioUrl !== undefined) {
      requireText(cue.audioUrl, `${cuePath}.audioUrl`, errors);
    }
    cueIds.push({ value: cue.id, path: `${cuePath}.id` });
  });
  validateUniqueValues(cueIds, errors);

  if (manifest.fallback !== "browserTts" && manifest.fallback !== "none") {
    errors.push(`${path}.fallback: expected "browserTts" or "none"`);
  }
  return errors;
}

export function validateNarrationManifest(
  manifest: SimulationNarrationManifest,
) {
  return validateNarration(manifest, "narration");
}

function validateExperience(
  experience: ExperienceDefinition,
  errors: string[],
) {
  requireText(experience.id, "implemented.experience.id", errors);
  requireText(experience.objective, "implemented.experience.objective", errors);
  if (!GRADE_TONES.includes(experience.gradeTone)) {
    errors.push("implemented.experience.gradeTone: unsupported grade tone");
  }
  if (experience.stages.length === 0) {
    errors.push(
      "implemented.experience.stages: at least one stage is required",
    );
  }

  const stageIds: { value: string; path: string }[] = [];
  const actionIds: { value: string; path: string }[] = [];
  const evidenceIds: { value: string; path: string }[] = [];
  experience.stages.forEach((stage, stageIndex) => {
    const path = `implemented.experience.stages[${stageIndex}]`;
    requireText(stage.id, `${path}.id`, errors);
    requireText(stage.title, `${path}.title`, errors);
    requireText(stage.cue, `${path}.cue`, errors);
    stageIds.push({ value: stage.id, path: `${path}.id` });

    if (stage.requiredActionIds.length === 0) {
      errors.push(`${path}.requiredActionIds: at least one action is required`);
    }
    stage.requiredActionIds.forEach((value, index) => {
      const valuePath = `${path}.requiredActionIds[${index}]`;
      requireText(value, valuePath, errors);
      actionIds.push({ value, path: valuePath });
    });

    if (stage.completionEvidenceIds.length === 0) {
      errors.push(
        `${path}.completionEvidenceIds: at least one evidence ID is required`,
      );
    }
    stage.completionEvidenceIds.forEach((value, index) => {
      const valuePath = `${path}.completionEvidenceIds[${index}]`;
      requireText(value, valuePath, errors);
      evidenceIds.push({ value, path: valuePath });
    });
  });

  validateUniqueValues(stageIds, errors);
  validateUniqueValues(actionIds, errors);
  validateUniqueValues(evidenceIds, errors);
}

function validateAssessment(
  assessment: AssessmentSequence,
  experience: ExperienceDefinition,
  errors: string[],
) {
  requireText(assessment.id, "implemented.assessment.id", errors);
  if (assessment.objectiveId !== experience.id) {
    errors.push(
      `implemented.assessment.objectiveId: expected "${experience.id}", received "${assessment.objectiveId}"`,
    );
  }

  const stageIds = new Set(experience.stages.map((stage) => stage.id));
  const promptIds: { value: string; path: string }[] = [];
  assessment.prompts.forEach((prompt, index) => {
    const path = `implemented.assessment.prompts[${index}]`;
    requireText(prompt.id, `${path}.id`, errors);
    promptIds.push({ value: prompt.id, path: `${path}.id` });
    if (!stageIds.has(prompt.stageId)) {
      errors.push(`${path}.stageId: unknown stage "${prompt.stageId}"`);
    }
  });
  validateUniqueValues(promptIds, errors);
}

function isPositiveInteger(value: number | undefined) {
  return Number.isInteger(value) && (value ?? 0) > 0;
}

function validateReleasedAsset(
  asset: AssetDefinition,
  path: string,
  errors: string[],
) {
  for (const field of [
    "url",
    "source",
    "license",
    "author",
    "compression",
  ] as const) {
    const value: unknown = asset[field];
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${path}.${field}: required for released simulations`);
    }
  }
  if (!isPositiveInteger(asset.width)) {
    errors.push(
      `${path}.width: expected a positive integer for released simulations`,
    );
  }
  if (!isPositiveInteger(asset.height)) {
    errors.push(
      `${path}.height: expected a positive integer for released simulations`,
    );
  }
  if (!asset.sha256 || !LOWERCASE_SHA_256.test(asset.sha256)) {
    errors.push(
      `${path}.sha256: expected lowercase 64-hex SHA-256 for released simulations`,
    );
  }
  if (!isPositiveInteger(asset.byteSize)) {
    errors.push(
      `${path}.byteSize: expected a positive integer for released simulations`,
    );
  }
}

function validateAssets(
  definition: ImplementedSimulationDefinition,
  errors: string[],
) {
  requireText(definition.assets.id, "implemented.assets.id", errors);
  const assetIds: { value: string; path: string }[] = [];
  definition.assets.assets.forEach((asset, index) => {
    const path = `implemented.assets.assets[${index}]`;
    requireText(asset.id, `${path}.id`, errors);
    assetIds.push({ value: asset.id, path: `${path}.id` });
    if (definition.module.publicationStatus === "released") {
      validateReleasedAsset(asset, path, errors);
    }
    if (definition.module.evidenceMaturity !== "internalQA") {
      for (const field of ["source", "license", "author"] as const) {
        const value: unknown = asset[field];
        if (typeof value !== "string" || !value.trim()) {
          errors.push(
            `${path}.${field}: missing provenance blocks ${definition.module.evidenceMaturity} evidence`,
          );
        } else if (/unverified/i.test(value)) {
          errors.push(
            `${path}.${field}: unverified provenance blocks ${definition.module.evidenceMaturity} evidence`,
          );
        }
      }
    }
  });
  validateUniqueValues(assetIds, errors);
}

function validateModule(
  module: SimulationModuleRecord,
  experience: ExperienceDefinition,
  errors: string[],
) {
  requireText(module.id, "implemented.module.id", errors);
  requireText(module.slug, "implemented.module.slug", errors);
  requireText(module.viewerKey, "implemented.module.viewerKey", errors);

  if (!PUBLICATION_STATUSES.includes(module.publicationStatus)) {
    errors.push(
      "implemented.module.publicationStatus: unsupported publication status",
    );
  } else if (
    !STATUS_BY_PUBLICATION[module.publicationStatus].includes(module.status)
  ) {
    errors.push(
      `implemented.module.status: "${module.status}" contradicts publicationStatus "${module.publicationStatus}"`,
    );
  }
  if (!EVIDENCE_MATURITIES.includes(module.evidenceMaturity)) {
    errors.push(
      "implemented.module.evidenceMaturity: unsupported evidence maturity",
    );
  }

  if (module.stages !== experience.stages.length) {
    errors.push(
      `implemented.module.stages: expected ${experience.stages.length}, received ${module.stages}`,
    );
  }

  if (
    module.evidenceMaturity === "deviceVerified" &&
    !module.deviceAcceptanceEvidenceId?.trim()
  ) {
    errors.push(
      "implemented.module.deviceAcceptanceEvidenceId: required for deviceVerified evidence",
    );
  }
  if (module.evidenceMaturity === "classroomVerified") {
    if (!module.deviceAcceptanceEvidenceId?.trim()) {
      errors.push(
        "implemented.module.deviceAcceptanceEvidenceId: required for classroomVerified evidence",
      );
    }
    if (!module.classroomAcceptanceEvidenceId?.trim()) {
      errors.push(
        "implemented.module.classroomAcceptanceEvidenceId: required for classroomVerified evidence",
      );
    }
  }

  const aliases = module.legacyAliases ?? [];
  const aliasEntries = aliases.map((value, index) => ({
    value,
    path: `implemented.module.legacyAliases[${index}]`,
  }));
  aliasEntries.forEach((entry) => requireText(entry.value, entry.path, errors));
  validateUniqueValues(aliasEntries, errors);
  aliases.forEach((alias, index) => {
    if (alias === module.slug) {
      errors.push(
        `implemented.module.legacyAliases[${index}]: collides with canonical slug "${module.slug}"`,
      );
    }
  });
}

function validateLegacyPaths(
  definition: ImplementedSimulationDefinition,
  errors: string[],
) {
  const entries = definition.legacyPaths.map((value, index) => ({
    value,
    path: `implemented.legacyPaths[${index}]`,
  }));
  entries.forEach((entry) => requireText(entry.value, entry.path, errors));
  validateUniqueValues(entries, errors);

  const canonicalPath = `/simulations/${definition.module.slug}`;
  definition.legacyPaths.forEach((path, index) => {
    if (path === canonicalPath) {
      errors.push(
        `implemented.legacyPaths[${index}]: collides with canonical path "${canonicalPath}"`,
      );
    }
  });
}

export function validateImplementedSimulationDefinition(
  definition: ImplementedSimulationDefinition,
) {
  const errors: string[] = [];
  if (definition.kind !== "guided" && definition.kind !== "interactive") {
    errors.push('implemented.kind: expected "guided" or "interactive"');
  }

  validateExperience(definition.experience, errors);
  validateModule(definition.module, definition.experience, errors);
  validateAssessment(definition.assessment, definition.experience, errors);
  errors.push(
    ...validateNarration(definition.narration, "implemented.narration"),
  );

  const stageIds = new Set(
    definition.experience.stages.map((stage) => stage.id),
  );
  definition.narration.cues.forEach((cue, index) => {
    if (!stageIds.has(cue.stageId)) {
      errors.push(
        `implemented.narration.cues[${index}].stageId: unknown stage "${cue.stageId}"`,
      );
    }
  });

  validateAssets(definition, errors);
  validateLegacyPaths(definition, errors);
  if (
    definition.contribution.source !== "existing" &&
    definition.contribution.source !== "pr-8"
  ) {
    errors.push(
      'implemented.contribution.source: expected "existing" or "pr-8"',
    );
  }
  if (definition.contribution.contributor !== undefined) {
    requireText(
      definition.contribution.contributor,
      "implemented.contribution.contributor",
      errors,
    );
  }
  if (definition.contribution.sourcePath !== undefined) {
    requireText(
      definition.contribution.sourcePath,
      "implemented.contribution.sourcePath",
      errors,
    );
  }
  return errors;
}

function throwValidationErrors(errors: readonly string[]) {
  if (errors.length > 0) throw new Error(errors.join("\n"));
}

export function defineImplementedSimulation<
  TDefinition extends ImplementedSimulationDefinition,
>(definition: TDefinition): TDefinition {
  throwValidationErrors(validateImplementedSimulationDefinition(definition));
  return definition;
}

function validateGuidedAlignment(input: GuidedImplementedSimulationInput) {
  const errors: string[] = [];
  if (input.module.id !== input.guidance.moduleId) {
    errors.push(
      `guided.module.id: expected guidance.moduleId "${input.guidance.moduleId}", received "${input.module.id}"`,
    );
  }
  if (input.module.viewerKey !== input.guidance.viewerKey) {
    errors.push(
      `guided.module.viewerKey: expected guidance.viewerKey "${input.guidance.viewerKey}", received "${input.module.viewerKey}"`,
    );
  }
  if (input.module.stages !== input.guidance.stages.length) {
    errors.push(
      `guided.module.stages: expected ${input.guidance.stages.length}, received ${input.module.stages}`,
    );
  }
  return errors;
}

function validateGuidedReferences(input: GuidedImplementedSimulationInput) {
  const errors: string[] = [];
  const narrationById = new Map(
    input.narration.cues.map((cue) => [cue.id, cue]),
  );
  const promptsById = new Map(
    input.assessment.prompts.map((prompt) => [prompt.id, prompt]),
  );

  input.guidance.stages.forEach((stage, index) => {
    const path = `guidance.stages[${index}]`;
    const cue = narrationById.get(stage.narrationId);
    if (!cue) {
      errors.push(
        `${path}.narrationId: unknown narration cue "${stage.narrationId}"`,
      );
    } else if (cue.stageId !== stage.id) {
      errors.push(
        `${path}.narrationId: cue "${stage.narrationId}" belongs to stage "${cue.stageId}"`,
      );
    }

    if (stage.evidenceMode !== "answer") return;
    const misconception = stage.misconceptionId
      ? promptsById.get(stage.misconceptionId)
      : undefined;
    if (stage.misconceptionId && misconception?.kind !== "misconception") {
      errors.push(
        `${path}.misconceptionId: unknown misconception prompt "${stage.misconceptionId}"`,
      );
    }
    const transfer = stage.transferPromptId
      ? promptsById.get(stage.transferPromptId)
      : undefined;
    if (stage.transferPromptId && transfer?.kind !== "transfer") {
      errors.push(
        `${path}.transferPromptId: unknown transfer prompt "${stage.transferPromptId}"`,
      );
    }
  });
  return errors;
}

export function defineGuidedImplementedSimulation(
  input: GuidedImplementedSimulationInput,
): ImplementedSimulationDefinition {
  const guidanceErrors = validateGuidedSimulationDefinition(input.guidance);
  const alignmentErrors = validateGuidedAlignment(input);
  throwValidationErrors([...guidanceErrors, ...alignmentErrors]);

  const definition: ImplementedSimulationDefinition = {
    module: input.module,
    kind: "guided",
    experience: toExperienceDefinition(input.guidance),
    assessment: input.assessment,
    narration: input.narration,
    assets: input.assets,
    legacyPaths: input.legacyPaths,
    contribution: input.contribution,
  };
  throwValidationErrors([
    ...validateImplementedSimulationDefinition(definition),
    ...validateGuidedReferences(input),
  ]);
  return definition;
}
