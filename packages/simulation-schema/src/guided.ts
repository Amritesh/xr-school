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

export function validateGuidedSimulationDefinition(
  definition: GuidedSimulationDefinition,
) {
  const errors: string[] = [];
  if (!isRecord(definition)) {
    return ["guidance: required"];
  }

  requireText(definition.id, "guidance.id", errors);
  requireText(definition.moduleId, "guidance.moduleId", errors);
  requireText(definition.viewerKey, "guidance.viewerKey", errors);
  requireText(definition.classContext, "guidance.classContext", errors);
  requireText(definition.objective, "guidance.objective", errors);
  if (!GRADE_TONES.includes(definition.gradeTone as GradeToneProfile)) {
    errors.push("guidance.gradeTone: unsupported grade tone");
  }

  const stageIds: { value: string; path: string }[] = [];
  const actionIds: { value: string; path: string }[] = [];
  const evidenceIds: { value: string; path: string }[] = [];
  const narrationIds: { value: string; path: string }[] = [];
  const sceneCueIds: { value: string; path: string }[] = [];

  if (!Array.isArray(definition.stages)) {
    errors.push("guidance.stages: required");
  } else {
    if (definition.stages.length === 0) {
      errors.push("guidance.stages: at least one stage is required");
    }

    definition.stages.forEach((stageValue, stageIndex) => {
      const path = `guidance.stages[${stageIndex}]`;
      if (!isRecord(stageValue)) {
        errors.push(`${path}: required`);
        return;
      }
      const stage = stageValue as Partial<GuidedStageDefinition>;
      requireText(stage.id, `${path}.id`, errors);
      requireText(stage.title, `${path}.title`, errors);
      requireText(stage.cue, `${path}.cue`, errors);
      requireText(stage.detail, `${path}.detail`, errors);
      requireText(stage.actionLabel, `${path}.actionLabel`, errors);
      requireText(stage.narrationId, `${path}.narrationId`, errors);
      requireText(stage.sceneCueId, `${path}.sceneCueId`, errors);

      if (hasText(stage.id)) {
        stageIds.push({ value: stage.id, path: `${path}.id` });
      }
      if (hasText(stage.narrationId)) {
        narrationIds.push({
          value: stage.narrationId,
          path: `${path}.narrationId`,
        });
      }
      if (hasText(stage.sceneCueId)) {
        sceneCueIds.push({
          value: stage.sceneCueId,
          path: `${path}.sceneCueId`,
        });
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

      if (stage.evidenceMode !== "scene" && stage.evidenceMode !== "answer") {
        errors.push(`${path}.evidenceMode: expected "scene" or "answer"`);
      } else if (stage.evidenceMode === "answer") {
        const hasMisconception = hasText(stage.misconceptionId);
        const hasTransfer = hasText(stage.transferPromptId);
        if (hasMisconception === hasTransfer) {
          errors.push(
            `${path}: answer evidence requires exactly one of misconceptionId or transferPromptId`,
          );
        }
        if (
          stage.misconceptionId !== undefined &&
          !hasText(stage.misconceptionId)
        ) {
          errors.push(`${path}.misconceptionId: required`);
        }
        if (
          stage.transferPromptId !== undefined &&
          !hasText(stage.transferPromptId)
        ) {
          errors.push(`${path}.transferPromptId: required`);
        }
      } else {
        if (stage.misconceptionId !== undefined) {
          errors.push(
            `${path}.misconceptionId: not allowed for scene evidence`,
          );
        }
        if (stage.transferPromptId !== undefined) {
          errors.push(
            `${path}.transferPromptId: not allowed for scene evidence`,
          );
        }
      }
    });
  }

  validateUniqueValues(stageIds, errors);
  validateUniqueValues(actionIds, errors);
  validateUniqueValues(evidenceIds, errors);
  validateUniqueValues(narrationIds, errors);
  validateUniqueValues(sceneCueIds, errors);

  if (!isRecord(definition.completion)) {
    errors.push("guidance.completion: required");
  } else {
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
  }

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
