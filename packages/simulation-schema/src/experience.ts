export type GradeToneProfile =
  | 'class1To2'
  | 'class3To5'
  | 'class6To8'
  | 'class9To10';

export interface ExperienceStageDefinition {
  id: string;
  title: string;
  cue: string;
  requiredActionIds: string[];
  completionEvidenceIds: string[];
  completionMode?: 'requirements' | 'automatic';
}

export interface ExperienceDefinition {
  id: string;
  gradeTone: GradeToneProfile;
  objective: string;
  stages: ExperienceStageDefinition[];
}

function duplicates(values: readonly string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

export function validateExperienceDefinition(definition: ExperienceDefinition) {
  const errors: string[] = [];
  if (!definition.id.trim()) errors.push('experience id is required');
  if (!definition.objective.trim()) errors.push(`${definition.id}: objective is required`);
  if (definition.stages.length === 0) errors.push(`${definition.id}: at least one stage is required`);
  for (const id of duplicates(definition.stages.map(stage => stage.id))) {
    errors.push(`${definition.id}: duplicate stage ${id}`);
  }
  for (const [stageIndex, stage] of definition.stages.entries()) {
    if (!stage.title.trim() || !stage.cue.trim()) {
      errors.push(`${definition.id}/${stage.id}: title and cue are required`);
    }
    const completionMode = stage.completionMode ?? 'requirements';
    if (!['requirements', 'automatic'].includes(completionMode)) {
      errors.push(`${definition.id}/${stage.id}: invalid completion mode`);
    } else if (completionMode === 'automatic') {
      if (stageIndex !== definition.stages.length - 1) {
        errors.push(
          `${definition.id}/${stage.id}: automatic completion is allowed only for the final stage`,
        );
      }
      if (
        stage.requiredActionIds.length > 0
        || stage.completionEvidenceIds.length > 0
      ) {
        errors.push(
          `${definition.id}/${stage.id}: automatic completion stages cannot declare requirements`,
        );
      }
    } else {
      if (stage.requiredActionIds.length === 0) {
        errors.push(`${definition.id}/${stage.id}: at least one required action is required`);
      }
      if (stage.completionEvidenceIds.length === 0) {
        errors.push(`${definition.id}/${stage.id}: at least one completion evidence id is required`);
      }
    }
    for (const id of duplicates(stage.requiredActionIds)) {
      errors.push(`${definition.id}/${stage.id}: duplicate required action ${id}`);
    }
    for (const id of duplicates(stage.completionEvidenceIds)) {
      errors.push(`${definition.id}/${stage.id}: duplicate completion evidence ${id}`);
    }
  }
  return errors;
}
