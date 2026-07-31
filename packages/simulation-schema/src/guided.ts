import type {
  ExperienceDefinition,
  ExperienceStageDefinition,
  GradeToneProfile,
} from "./experience.js";

export interface GuidedStageDefinition extends ExperienceStageDefinition {
  detail: string;
  actionLabel: string;
  narrationId: string;
  sceneCueId: string;
  evidenceMode: "scene" | "answer";
  scaleNote?: string;
  misconceptionId?: string;
  transferPromptId?: string;
}

export interface GuidedSimulationDefinition {
  id: string;
  moduleId: string;
  viewerKey: string;
  classContext: string;
  gradeTone: GradeToneProfile;
  objective: string;
  stages: GuidedStageDefinition[];
  completion: {
    eyebrow: string;
    headline: string;
    body: string;
    actionLabel: string;
  };
}

const GRADE_TONES: readonly GradeToneProfile[] = [
  "class3To5",
  "class6To8",
  "class9To10",
];

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

export function validateGuidedSimulationDefinition(
  definition: GuidedSimulationDefinition,
) {
  const errors: string[] = [];

  requireText(definition.id, "guidance.id", errors);
  requireText(definition.moduleId, "guidance.moduleId", errors);
  requireText(definition.viewerKey, "guidance.viewerKey", errors);
  requireText(definition.classContext, "guidance.classContext", errors);
  requireText(definition.objective, "guidance.objective", errors);
  if (!GRADE_TONES.includes(definition.gradeTone)) {
    errors.push("guidance.gradeTone: unsupported grade tone");
  }
  if (definition.stages.length === 0) {
    errors.push("guidance.stages: at least one stage is required");
  }

  const stageIds: { value: string; path: string }[] = [];
  const actionIds: { value: string; path: string }[] = [];
  const evidenceIds: { value: string; path: string }[] = [];
  const narrationIds: { value: string; path: string }[] = [];
  const sceneCueIds: { value: string; path: string }[] = [];

  definition.stages.forEach((stage, stageIndex) => {
    const path = `guidance.stages[${stageIndex}]`;
    requireText(stage.id, `${path}.id`, errors);
    requireText(stage.title, `${path}.title`, errors);
    requireText(stage.cue, `${path}.cue`, errors);
    requireText(stage.detail, `${path}.detail`, errors);
    requireText(stage.actionLabel, `${path}.actionLabel`, errors);
    requireText(stage.narrationId, `${path}.narrationId`, errors);
    requireText(stage.sceneCueId, `${path}.sceneCueId`, errors);

    stageIds.push({ value: stage.id, path: `${path}.id` });
    narrationIds.push({
      value: stage.narrationId,
      path: `${path}.narrationId`,
    });
    sceneCueIds.push({ value: stage.sceneCueId, path: `${path}.sceneCueId` });

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

    if (stage.evidenceMode !== "scene" && stage.evidenceMode !== "answer") {
      errors.push(`${path}.evidenceMode: expected "scene" or "answer"`);
    } else if (stage.evidenceMode === "answer") {
      if (!stage.misconceptionId?.trim()) {
        errors.push(`${path}.misconceptionId: required for answer evidence`);
      }
      if (!stage.transferPromptId?.trim()) {
        errors.push(`${path}.transferPromptId: required for answer evidence`);
      }
    } else {
      if (stage.misconceptionId !== undefined) {
        errors.push(`${path}.misconceptionId: not allowed for scene evidence`);
      }
      if (stage.transferPromptId !== undefined) {
        errors.push(`${path}.transferPromptId: not allowed for scene evidence`);
      }
    }
  });

  validateUniqueValues(stageIds, errors);
  validateUniqueValues(actionIds, errors);
  validateUniqueValues(evidenceIds, errors);
  validateUniqueValues(narrationIds, errors);
  validateUniqueValues(sceneCueIds, errors);

  requireText(
    definition.completion.eyebrow,
    "guidance.completion.eyebrow",
    errors,
  );
  requireText(
    definition.completion.headline,
    "guidance.completion.headline",
    errors,
  );
  requireText(definition.completion.body, "guidance.completion.body", errors);
  requireText(
    definition.completion.actionLabel,
    "guidance.completion.actionLabel",
    errors,
  );

  return errors;
}

export function toExperienceDefinition(
  definition: GuidedSimulationDefinition,
): ExperienceDefinition {
  return {
    id: definition.id,
    gradeTone: definition.gradeTone,
    objective: definition.objective,
    stages: definition.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      cue: stage.cue,
      requiredActionIds: [...stage.requiredActionIds],
      completionEvidenceIds: [...stage.completionEvidenceIds],
    })),
  };
}
