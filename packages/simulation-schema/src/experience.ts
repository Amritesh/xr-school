export type GradeToneProfile = 'class3To5' | 'class6To8' | 'class9To10';

export interface ExperienceStageDefinition {
  id: string;
  title: string;
  cue: string;
  requiredActionIds: string[];
  completionEvidenceIds: string[];
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
  for (const stage of definition.stages) {
    if (!stage.title.trim() || !stage.cue.trim()) {
      errors.push(`${definition.id}/${stage.id}: title and cue are required`);
    }
    if (stage.requiredActionIds.length === 0) {
      errors.push(`${definition.id}/${stage.id}: at least one required action is required`);
    }
    if (stage.completionEvidenceIds.length === 0) {
      errors.push(`${definition.id}/${stage.id}: at least one completion evidence id is required`);
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
