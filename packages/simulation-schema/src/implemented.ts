import type { ExperienceDefinition, GradeToneProfile } from "./experience.js";
import {
  toExperienceDefinition,
  validateGuidedSimulationDefinition,
  type GuidedSimulationDefinition,
} from "./guided.js";
import type { SimulationModuleRecord } from "./index.js";
import type { AssessmentSequence, AssetManifest } from "./world.js";

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
const ASSESSMENT_PROMPT_KINDS = [
  "prediction",
  "observation",
  "misconception",
  "transfer",
] as const;
const MASTERY_REQUIRED_KINDS = [
  "observation",
  "misconception",
  "transfer",
] as const;
const ASSESSMENT_RETRY_POLICIES = [
  "immediateWithHint",
  "afterObservation",
] as const;
const STATUS_BY_PUBLICATION: Record<
  PublicationStatus,
  readonly SimulationModuleRecord["status"][]
> = {
  released: ["released"],
  preview: ["draft", "approved"],
  retired: ["deprecated", "archived"],
};
const LOWERCASE_SHA_256 = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireText(value: unknown, path: string, errors: string[]) {
  if (!hasText(value)) errors.push(`${path}: required`);
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

function validateNarration(manifest: unknown, path: string) {
  const errors: string[] = [];
  if (!isRecord(manifest)) {
    return [`${path}: required`];
  }
  requireText(manifest.id, `${path}.id`, errors);

  const cueIds: { value: string; path: string }[] = [];
  if (!Array.isArray(manifest.cues)) {
    errors.push(`${path}.cues: required`);
  } else {
    if (manifest.cues.length === 0) {
      errors.push(`${path}.cues: at least one cue is required`);
    }
    manifest.cues.forEach((cue, index) => {
      const cuePath = `${path}.cues[${index}]`;
      if (!isRecord(cue)) {
        errors.push(`${cuePath}: required`);
        return;
      }
      requireText(cue.id, `${cuePath}.id`, errors);
      requireText(cue.stageId, `${cuePath}.stageId`, errors);
      requireText(cue.text, `${cuePath}.text`, errors);
      requireText(cue.caption, `${cuePath}.caption`, errors);
      if (cue.audioUrl !== undefined) {
        requireText(cue.audioUrl, `${cuePath}.audioUrl`, errors);
      }
      if (hasText(cue.id)) {
        cueIds.push({ value: cue.id, path: `${cuePath}.id` });
      }
    });
  }
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

function validateExperience(experience: unknown, errors: string[]) {
  if (!isRecord(experience)) {
    errors.push("implemented.experience: required");
    return;
  }
  requireText(experience.id, "implemented.experience.id", errors);
  requireText(experience.objective, "implemented.experience.objective", errors);
  if (!GRADE_TONES.includes(experience.gradeTone as GradeToneProfile)) {
    errors.push("implemented.experience.gradeTone: unsupported grade tone");
  }

  const stageIds: { value: string; path: string }[] = [];
  const actionIds: { value: string; path: string }[] = [];
  const evidenceIds: { value: string; path: string }[] = [];
  if (!Array.isArray(experience.stages)) {
    errors.push("implemented.experience.stages: required");
  } else {
    if (experience.stages.length === 0) {
      errors.push(
        "implemented.experience.stages: at least one stage is required",
      );
    }
    experience.stages.forEach((stage, stageIndex) => {
      const path = `implemented.experience.stages[${stageIndex}]`;
      if (!isRecord(stage)) {
        errors.push(`${path}: required`);
        return;
      }
      requireText(stage.id, `${path}.id`, errors);
      requireText(stage.title, `${path}.title`, errors);
      requireText(stage.cue, `${path}.cue`, errors);
      if (hasText(stage.id)) {
        stageIds.push({ value: stage.id, path: `${path}.id` });
      }

      if (!Array.isArray(stage.requiredActionIds)) {
        errors.push(`${path}.requiredActionIds: required`);
      } else {
        if (stage.requiredActionIds.length === 0) {
          errors.push(
            `${path}.requiredActionIds: at least one action is required`,
          );
        }
        stage.requiredActionIds.forEach((value, index) => {
          const valuePath = `${path}.requiredActionIds[${index}]`;
          requireText(value, valuePath, errors);
          if (hasText(value)) actionIds.push({ value, path: valuePath });
        });
      }

      if (!Array.isArray(stage.completionEvidenceIds)) {
        errors.push(`${path}.completionEvidenceIds: required`);
      } else {
        if (stage.completionEvidenceIds.length === 0) {
          errors.push(
            `${path}.completionEvidenceIds: at least one evidence ID is required`,
          );
        }
        stage.completionEvidenceIds.forEach((value, index) => {
          const valuePath = `${path}.completionEvidenceIds[${index}]`;
          requireText(value, valuePath, errors);
          if (hasText(value)) evidenceIds.push({ value, path: valuePath });
        });
      }
    });
  }

  validateUniqueValues(stageIds, errors);
  validateUniqueValues(actionIds, errors);
  validateUniqueValues(evidenceIds, errors);
}

function validateAssessment(
  assessment: unknown,
  experience: unknown,
  publicationStatus: unknown,
  errors: string[],
) {
  if (!isRecord(assessment)) {
    errors.push("implemented.assessment: required");
    return;
  }
  requireText(assessment.id, "implemented.assessment.id", errors);
  requireText(
    assessment.objectiveId,
    "implemented.assessment.objectiveId",
    errors,
  );
  if (
    hasText(assessment.objectiveId) &&
    isRecord(experience) &&
    hasText(experience.id) &&
    assessment.objectiveId !== experience.id
  ) {
    errors.push(
      `implemented.assessment.objectiveId: expected "${experience.id}", received "${assessment.objectiveId}"`,
    );
  }

  const stageIds = new Set<string>();
  if (isRecord(experience) && Array.isArray(experience.stages)) {
    experience.stages.forEach((stage) => {
      if (isRecord(stage) && hasText(stage.id)) stageIds.add(stage.id);
    });
  }

  const promptIds: { value: string; path: string }[] = [];
  const promptKinds = new Set<string>();
  const prompts = Array.isArray(assessment.prompts)
    ? assessment.prompts
    : undefined;
  if (!prompts) {
    errors.push("implemented.assessment.prompts: required");
  } else {
    if (prompts.length === 0) {
      errors.push(
        "implemented.assessment.prompts: at least one prompt is required",
      );
    }

    prompts.forEach((prompt, index) => {
      const path = `implemented.assessment.prompts[${index}]`;
      if (!isRecord(prompt)) {
        errors.push(`${path}: required`);
        return;
      }

      requireText(prompt.id, `${path}.id`, errors);
      if (hasText(prompt.id)) {
        promptIds.push({ value: prompt.id, path: `${path}.id` });
      }
      if (
        !ASSESSMENT_PROMPT_KINDS.includes(
          prompt.kind as (typeof ASSESSMENT_PROMPT_KINDS)[number],
        )
      ) {
        errors.push(
          `${path}.kind: expected "prediction", "observation", "misconception", or "transfer"`,
        );
      } else {
        promptKinds.add(prompt.kind as string);
      }

      requireText(prompt.stageId, `${path}.stageId`, errors);
      if (hasText(prompt.stageId) && !stageIds.has(prompt.stageId)) {
        errors.push(`${path}.stageId: unknown stage "${prompt.stageId}"`);
      }
      requireText(prompt.question, `${path}.question`, errors);
      requireText(prompt.hint, `${path}.hint`, errors);
      requireText(prompt.explanation, `${path}.explanation`, errors);
      if (
        !ASSESSMENT_RETRY_POLICIES.includes(
          prompt.retryPolicy as (typeof ASSESSMENT_RETRY_POLICIES)[number],
        )
      ) {
        errors.push(
          `${path}.retryPolicy: expected "immediateWithHint" or "afterObservation"`,
        );
      }

      const optionIds: { value: string; path: string }[] = [];
      let optionIdSet: Set<string> | undefined;
      if (prompt.options !== undefined) {
        if (!Array.isArray(prompt.options)) {
          errors.push(`${path}.options: required`);
        } else {
          if (prompt.options.length === 0) {
            errors.push(
              `${path}.options: at least one option is required when provided`,
            );
          }
          prompt.options.forEach((option, optionIndex) => {
            const optionPath = `${path}.options[${optionIndex}]`;
            if (!isRecord(option)) {
              errors.push(`${optionPath}: required`);
              return;
            }
            requireText(option.id, `${optionPath}.id`, errors);
            requireText(option.label, `${optionPath}.label`, errors);
            if (hasText(option.id)) {
              optionIds.push({ value: option.id, path: `${optionPath}.id` });
            }
          });
          validateUniqueValues(optionIds, errors);
          optionIdSet = new Set(optionIds.map((entry) => entry.value));
        }
      }

      const evidenceIds: { value: string; path: string }[] = [];
      if (!Array.isArray(prompt.acceptedEvidenceIds)) {
        errors.push(`${path}.acceptedEvidenceIds: required`);
      } else {
        if (prompt.acceptedEvidenceIds.length === 0) {
          errors.push(
            `${path}.acceptedEvidenceIds: at least one evidence ID is required`,
          );
        }
        prompt.acceptedEvidenceIds.forEach((evidenceId, evidenceIndex) => {
          const evidencePath = `${path}.acceptedEvidenceIds[${evidenceIndex}]`;
          requireText(evidenceId, evidencePath, errors);
          if (hasText(evidenceId)) {
            evidenceIds.push({ value: evidenceId, path: evidencePath });
            if (optionIdSet && !optionIdSet.has(evidenceId)) {
              errors.push(`${evidencePath}: unknown option "${evidenceId}"`);
            }
          }
        });
        validateUniqueValues(evidenceIds, errors);
      }
    });
  }
  validateUniqueValues(promptIds, errors);

  if (publicationStatus === "released") {
    for (const kind of ["misconception", "transfer"] as const) {
      if (!promptKinds.has(kind)) {
        errors.push(
          `implemented.assessment.prompts: released simulations require a ${kind} prompt`,
        );
      }
    }
  }

  if (!isRecord(assessment.masteryRule)) {
    errors.push("implemented.assessment.masteryRule: required");
    return;
  }
  const mastery = assessment.masteryRule;
  const promptCount = prompts?.length;
  if (
    !Number.isInteger(mastery.requiredEvidenceCount) ||
    (mastery.requiredEvidenceCount as number) <= 0 ||
    (promptCount !== undefined &&
      (mastery.requiredEvidenceCount as number) > promptCount)
  ) {
    const upperBound = promptCount ?? "the prompt count";
    errors.push(
      `implemented.assessment.masteryRule.requiredEvidenceCount: expected an integer between 1 and ${upperBound}`,
    );
  }

  if (!Array.isArray(mastery.requiredKinds)) {
    errors.push("implemented.assessment.masteryRule.requiredKinds: required");
  } else {
    const requiredKinds: { value: string; path: string }[] = [];
    mastery.requiredKinds.forEach((kind, index) => {
      const path = `implemented.assessment.masteryRule.requiredKinds[${index}]`;
      if (
        !MASTERY_REQUIRED_KINDS.includes(
          kind as (typeof MASTERY_REQUIRED_KINDS)[number],
        )
      ) {
        errors.push(
          `${path}: expected "observation", "misconception", or "transfer"`,
        );
        return;
      }
      requiredKinds.push({ value: kind, path });
      if (!promptKinds.has(kind)) {
        errors.push(`${path}: no "${kind}" prompt is available`);
      }
    });
    validateUniqueValues(requiredKinds, errors);
  }

  if (typeof mastery.allowHintedMastery !== "boolean") {
    errors.push(
      "implemented.assessment.masteryRule.allowHintedMastery: expected boolean",
    );
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function validateReleasedAsset(
  asset: Record<string, unknown>,
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
    const value = asset[field];
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
  if (
    typeof asset.sha256 !== "string" ||
    !LOWERCASE_SHA_256.test(asset.sha256)
  ) {
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
  assetsValue: unknown,
  moduleValue: unknown,
  errors: string[],
) {
  if (!isRecord(assetsValue)) {
    errors.push("implemented.assets: required");
    return;
  }
  requireText(assetsValue.id, "implemented.assets.id", errors);
  const assetIds: { value: string; path: string }[] = [];
  if (!Array.isArray(assetsValue.assets)) {
    errors.push("implemented.assets.assets: required");
  } else {
    const publicationStatus = isRecord(moduleValue)
      ? moduleValue.publicationStatus
      : undefined;
    const evidenceMaturity = isRecord(moduleValue)
      ? moduleValue.evidenceMaturity
      : undefined;
    assetsValue.assets.forEach((asset, index) => {
      const path = `implemented.assets.assets[${index}]`;
      if (!isRecord(asset)) {
        errors.push(`${path}: required`);
        return;
      }
      requireText(asset.id, `${path}.id`, errors);
      if (hasText(asset.id)) {
        assetIds.push({ value: asset.id, path: `${path}.id` });
      }
      if (publicationStatus === "released") {
        validateReleasedAsset(asset, path, errors);
      }
      if (
        evidenceMaturity === "deviceVerified" ||
        evidenceMaturity === "classroomVerified"
      ) {
        for (const field of ["source", "license", "author"] as const) {
          const value = asset[field];
          if (!hasText(value)) {
            errors.push(
              `${path}.${field}: missing provenance blocks ${evidenceMaturity} evidence`,
            );
          } else if (/unverified/i.test(value)) {
            errors.push(
              `${path}.${field}: unverified provenance blocks ${evidenceMaturity} evidence`,
            );
          }
        }
      }
    });
  }
  validateUniqueValues(assetIds, errors);
}

function validateModule(
  module: unknown,
  experience: unknown,
  errors: string[],
) {
  if (!isRecord(module)) {
    errors.push("implemented.module: required");
    return;
  }
  requireText(module.id, "implemented.module.id", errors);
  requireText(module.slug, "implemented.module.slug", errors);
  requireText(module.viewerKey, "implemented.module.viewerKey", errors);

  if (
    !PUBLICATION_STATUSES.includes(
      module.publicationStatus as PublicationStatus,
    )
  ) {
    errors.push(
      "implemented.module.publicationStatus: unsupported publication status",
    );
  } else if (
    !STATUS_BY_PUBLICATION[
      module.publicationStatus as PublicationStatus
    ].includes(module.status as SimulationModuleRecord["status"])
  ) {
    errors.push(
      `implemented.module.status: "${module.status}" contradicts publicationStatus "${module.publicationStatus}"`,
    );
  }
  if (
    !EVIDENCE_MATURITIES.includes(module.evidenceMaturity as EvidenceMaturity)
  ) {
    errors.push(
      "implemented.module.evidenceMaturity: unsupported evidence maturity",
    );
  }

  if (
    isRecord(experience) &&
    Array.isArray(experience.stages) &&
    module.stages !== experience.stages.length
  ) {
    errors.push(
      `implemented.module.stages: expected ${experience.stages.length}, received ${module.stages}`,
    );
  }

  if (
    module.evidenceMaturity === "deviceVerified" &&
    !hasText(module.deviceAcceptanceEvidenceId)
  ) {
    errors.push(
      "implemented.module.deviceAcceptanceEvidenceId: required for deviceVerified evidence",
    );
  }
  if (module.evidenceMaturity === "classroomVerified") {
    if (!hasText(module.deviceAcceptanceEvidenceId)) {
      errors.push(
        "implemented.module.deviceAcceptanceEvidenceId: required for classroomVerified evidence",
      );
    }
    if (!hasText(module.classroomAcceptanceEvidenceId)) {
      errors.push(
        "implemented.module.classroomAcceptanceEvidenceId: required for classroomVerified evidence",
      );
    }
  }

  if (
    module.legacyAliases !== undefined &&
    !Array.isArray(module.legacyAliases)
  ) {
    errors.push("implemented.module.legacyAliases: required");
    return;
  }
  const aliases = (module.legacyAliases ?? []) as unknown[];
  const aliasEntries = aliases.map((value, index) => ({
    value,
    path: `implemented.module.legacyAliases[${index}]`,
  }));
  aliasEntries.forEach((entry) => requireText(entry.value, entry.path, errors));
  validateUniqueValues(
    aliasEntries.filter((entry): entry is { value: string; path: string } =>
      hasText(entry.value),
    ),
    errors,
  );
  aliases.forEach((alias, index) => {
    if (hasText(alias) && alias === module.slug) {
      errors.push(
        `implemented.module.legacyAliases[${index}]: collides with canonical slug "${module.slug}"`,
      );
    }
  });
}

function validateLegacyPaths(
  legacyPaths: unknown,
  module: unknown,
  errors: string[],
) {
  if (!Array.isArray(legacyPaths)) {
    errors.push("implemented.legacyPaths: required");
    return;
  }
  const entries = legacyPaths.map((value, index) => ({
    value,
    path: `implemented.legacyPaths[${index}]`,
  }));
  entries.forEach((entry) => requireText(entry.value, entry.path, errors));
  validateUniqueValues(
    entries.filter((entry): entry is { value: string; path: string } =>
      hasText(entry.value),
    ),
    errors,
  );

  const canonicalPath =
    isRecord(module) && hasText(module.slug)
      ? `/simulations/${module.slug}`
      : undefined;
  legacyPaths.forEach((path, index) => {
    if (canonicalPath && path === canonicalPath) {
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
  if (!isRecord(definition)) {
    return ["implemented: required"];
  }
  if (definition.kind !== "guided" && definition.kind !== "interactive") {
    errors.push('implemented.kind: expected "guided" or "interactive"');
  }

  validateExperience(definition.experience, errors);
  validateModule(definition.module, definition.experience, errors);
  validateAssessment(
    definition.assessment,
    definition.experience,
    isRecord(definition.module)
      ? definition.module.publicationStatus
      : undefined,
    errors,
  );
  errors.push(
    ...validateNarration(definition.narration, "implemented.narration"),
  );

  const stageIds = new Set<string>();
  if (
    isRecord(definition.experience) &&
    Array.isArray(definition.experience.stages)
  ) {
    definition.experience.stages.forEach((stage) => {
      if (isRecord(stage) && hasText(stage.id)) stageIds.add(stage.id);
    });
  }
  if (
    isRecord(definition.narration) &&
    Array.isArray(definition.narration.cues)
  ) {
    definition.narration.cues.forEach((cue, index) => {
      if (isRecord(cue) && hasText(cue.stageId) && !stageIds.has(cue.stageId)) {
        errors.push(
          `implemented.narration.cues[${index}].stageId: unknown stage "${cue.stageId}"`,
        );
      }
    });
  }

  validateAssets(definition.assets, definition.module, errors);
  validateLegacyPaths(definition.legacyPaths, definition.module, errors);
  if (!isRecord(definition.contribution)) {
    errors.push("implemented.contribution: required");
    return errors;
  }
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

function validateGuidedAlignment(input: unknown) {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return ["guided: required"];
  }
  if (!isRecord(input.module)) {
    errors.push("guided.module: required");
    return errors;
  }
  if (!isRecord(input.guidance)) return errors;

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
  if (
    Array.isArray(input.guidance.stages) &&
    input.module.stages !== input.guidance.stages.length
  ) {
    errors.push(
      `guided.module.stages: expected ${input.guidance.stages.length}, received ${input.module.stages}`,
    );
  }
  return errors;
}

function validateGuidedReferences(input: unknown) {
  const errors: string[] = [];
  if (
    !isRecord(input) ||
    !isRecord(input.guidance) ||
    !Array.isArray(input.guidance.stages)
  ) {
    return errors;
  }
  const narrationById = new Map<string, Record<string, unknown>>();
  if (isRecord(input.narration) && Array.isArray(input.narration.cues)) {
    input.narration.cues.forEach((cue) => {
      if (isRecord(cue) && hasText(cue.id)) narrationById.set(cue.id, cue);
    });
  }
  const promptsById = new Map<string, Record<string, unknown>>();
  if (isRecord(input.assessment) && Array.isArray(input.assessment.prompts)) {
    input.assessment.prompts.forEach((prompt) => {
      if (isRecord(prompt) && hasText(prompt.id)) {
        promptsById.set(prompt.id, prompt);
      }
    });
  }

  input.guidance.stages.forEach((stage, index) => {
    const path = `guidance.stages[${index}]`;
    if (!isRecord(stage)) return;
    const cue = hasText(stage.narrationId)
      ? narrationById.get(stage.narrationId)
      : undefined;
    if (hasText(stage.narrationId) && !cue) {
      errors.push(
        `${path}.narrationId: unknown narration cue "${stage.narrationId}"`,
      );
    } else if (cue && cue.stageId !== stage.id) {
      errors.push(
        `${path}.narrationId: cue "${stage.narrationId}" belongs to stage "${cue.stageId}"`,
      );
    }

    if (stage.evidenceMode !== "answer") return;
    for (const [field, expectedKind] of [
      ["misconceptionId", "misconception"],
      ["transferPromptId", "transfer"],
    ] as const) {
      const promptId = stage[field];
      if (!hasText(promptId)) continue;
      const prompt = promptsById.get(promptId);
      if (!prompt) {
        errors.push(
          `${path}.${field}: unknown ${expectedKind} prompt "${promptId}"`,
        );
      } else if (prompt.kind !== expectedKind) {
        errors.push(
          `${path}.${field}: prompt "${promptId}" has kind "${String(prompt.kind)}", expected "${expectedKind}"`,
        );
      } else if (prompt.stageId !== stage.id) {
        errors.push(
          `${path}.${field}: prompt "${promptId}" belongs to stage "${String(prompt.stageId)}"`,
        );
      }
    }
  });
  return errors;
}

export function defineGuidedImplementedSimulation(
  input: GuidedImplementedSimulationInput,
): ImplementedSimulationDefinition {
  if (!isRecord(input)) throw new Error("guided: required");
  const guidanceErrors = validateGuidedSimulationDefinition(
    input.guidance as GuidedSimulationDefinition,
  );
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
