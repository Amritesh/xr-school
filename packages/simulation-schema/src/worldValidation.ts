import type {
  AcceptanceProfile,
  AssessmentSequence,
  AssetDefinition,
  EnvironmentDefinition,
  PbrMaterialDefinition,
  QualityProfile,
  ScientificModelManifest,
  Vector3Tuple,
  WorldBundle,
  WorldEntityDefinition,
} from './world';
import { validateExperienceDefinition } from './experience';
import { validateSpatialLayoutDefinition } from './spatial';

function duplicates(values: readonly string[]) {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function allFinite(values: readonly number[]) {
  return values.every(Number.isFinite);
}

function validateUnitRange(
  id: string,
  label: string,
  value: number | undefined,
  errors: string[],
) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) {
    errors.push(`${id}: ${label} must be between 0 and 1`);
  }
}

function validateVector(
  entityId: string,
  label: string,
  vector: Vector3Tuple,
  errors: string[],
) {
  if (!allFinite(vector)) errors.push(`${entityId}: ${label} must contain finite numbers`);
}

function validateMaterial(material: PbrMaterialDefinition, errors: string[]) {
  validateUnitRange(material.id, 'roughness', material.roughness, errors);
  validateUnitRange(material.id, 'metalness', material.metalness, errors);
  validateUnitRange(material.id, 'transmission', material.transmission, errors);
  validateUnitRange(material.id, 'clearcoat', material.clearcoat, errors);
  validateUnitRange(material.id, 'iridescence', material.iridescence, errors);
  validateUnitRange(material.id, 'opacity', material.opacity, errors);
  if (material.emissiveIntensity !== undefined
    && (!Number.isFinite(material.emissiveIntensity) || material.emissiveIntensity < 0)) {
    errors.push(`${material.id}: emissiveIntensity must be a non-negative finite number`);
  }
}

function validateEntity(entity: WorldEntityDefinition, errors: string[]) {
  validateVector(entity.id, 'position', entity.transform.position, errors);
  validateVector(entity.id, 'rotation', entity.transform.rotation, errors);
  validateVector(entity.id, 'scale', entity.transform.scale, errors);
  if (entity.transform.scale.some(value => value <= 0)) {
    errors.push(`${entity.id}: scale values must be positive`);
  }
}

function validateQualityProfile(profile: QualityProfile, errors: string[]) {
  const positiveBudgets: [string, number][] = [
    ['minSteadyFps', profile.minSteadyFps],
    ['maxVisibleTriangles', profile.maxVisibleTriangles],
    ['maxDrawCalls', profile.maxDrawCalls],
    ['maxTextureSize', profile.maxTextureSize],
    ['maxShadowMapSize', profile.maxShadowMapSize],
    ['maxPixelRatio', profile.maxPixelRatio],
  ];
  for (const [label, value] of positiveBudgets) {
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`${profile.id}: ${label} must be a positive finite number`);
    }
  }
  if (!Number.isInteger(profile.maxShadowLights) || profile.maxShadowLights < 0) {
    errors.push(`${profile.id}: maxShadowLights must be a non-negative integer`);
  }
}

function validateAsset(asset: AssetDefinition, assetIds: Set<string>, errors: string[]) {
  if (!asset.source.trim()) errors.push(`${asset.id}: asset source is required`);
  if (!asset.license.trim()) errors.push(`${asset.id}: asset license is required`);
  if (!asset.author.trim()) errors.push(`${asset.id}: asset author is required`);
  if (!asset.url.trim()) errors.push(`${asset.id}: asset URL is required`);
  if (!Number.isInteger(asset.width) || asset.width < 0
    || !Number.isInteger(asset.height) || asset.height < 0) {
    errors.push(`${asset.id}: asset dimensions must be non-negative integers`);
  }
  if (asset.fallbackAssetId && !assetIds.has(asset.fallbackAssetId)) {
    errors.push(`${asset.id}: missing fallback asset ${asset.fallbackAssetId}`);
  }
}

function validateScientificModel(model: ScientificModelManifest, errors: string[]) {
  if (!Number.isFinite(model.numericalTolerance) || model.numericalTolerance < 0) {
    errors.push(`${model.id}: numericalTolerance must be a non-negative finite number`);
  }
  if (model.referenceSources.length === 0) {
    errors.push(`${model.id}: at least one reference source is required`);
  }
  if (model.referenceVectors.length === 0) {
    errors.push(`${model.id}: at least one reference vector is required`);
  }
  for (const [inputId, range] of Object.entries(model.validInputRanges)) {
    if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min > range.max) {
      errors.push(`${model.id}: invalid range for ${inputId}`);
    }
    if (!range.unit.trim()) errors.push(`${model.id}: unit is required for ${inputId}`);
  }
  for (const vector of model.referenceVectors) {
    if (Object.keys(vector.inputs).length === 0 || Object.keys(vector.expectedOutputs).length === 0) {
      errors.push(`${model.id}/${vector.id}: reference vector requires inputs and expected outputs`);
    }
    for (const [outputId, tolerance] of Object.entries(vector.toleranceOverrides ?? {})) {
      if (!Number.isFinite(tolerance) || tolerance < 0) {
        errors.push(`${model.id}/${vector.id}: invalid tolerance for ${outputId}`);
      }
    }
  }
}

function validateAssessment(sequence: AssessmentSequence, errors: string[]) {
  const kinds = new Set(sequence.prompts.map(prompt => prompt.kind));
  if (!kinds.has('misconception') || !kinds.has('transfer')) {
    errors.push(`${sequence.id}: assessment requires misconception and transfer prompts`);
  }
  if (!Number.isInteger(sequence.masteryRule.requiredEvidenceCount)
    || sequence.masteryRule.requiredEvidenceCount <= 0
    || sequence.masteryRule.requiredEvidenceCount > sequence.prompts.length) {
    errors.push(`${sequence.id}: mastery evidence count must fit the prompt sequence`);
  }
  for (const kind of sequence.masteryRule.requiredKinds) {
    if (!kinds.has(kind)) errors.push(`${sequence.id}: mastery requires missing ${kind} prompt`);
  }
  for (const duplicate of duplicates(sequence.prompts.map(prompt => prompt.id))) {
    errors.push(`${sequence.id}: duplicate prompt ${duplicate}`);
  }
  for (const prompt of sequence.prompts) {
    if (prompt.acceptedEvidenceIds.length === 0) {
      errors.push(`${sequence.id}/${prompt.id}: accepted evidence is required`);
    }
    if (prompt.options) {
      for (const duplicate of duplicates(prompt.options.map(option => option.id))) {
        errors.push(`${sequence.id}/${prompt.id}: duplicate option ${duplicate}`);
      }
      const optionIds = new Set(prompt.options.map(option => option.id));
      for (const evidenceId of prompt.acceptedEvidenceIds) {
        if (!optionIds.has(evidenceId)) {
          errors.push(`${sequence.id}/${prompt.id}: accepted evidence ${evidenceId} is not an option`);
        }
      }
    }
  }
}

function validateEnvironment(environment: EnvironmentDefinition, errors: string[]) {
  if (!Number.isFinite(environment.exposure) || environment.exposure <= 0) {
    errors.push(`${environment.id}: exposure must be a positive finite number`);
  }
  if (environment.fog
    && (!allFinite([environment.fog.near, environment.fog.far])
      || environment.fog.near < 0
      || environment.fog.far <= environment.fog.near)) {
    errors.push(`${environment.id}: fog requires finite near and farther far distances`);
  }
  const lights = [environment.keyLight, environment.fillLight, ...environment.accentLights]
    .filter(light => light !== undefined);
  for (const light of lights) {
    if (!Number.isFinite(light.intensity) || light.intensity < 0) {
      errors.push(`${environment.id}: light intensity must be a non-negative finite number`);
    }
    if (light.position && !allFinite(light.position)) {
      errors.push(`${environment.id}: light position must contain finite numbers`);
    }
  }
}

function validateAcceptance(
  acceptance: AcceptanceProfile,
  qualityProfiles: Map<string, QualityProfile>,
  errors: string[],
) {
  const profile = qualityProfiles.get(acceptance.requiredQualityProfileId);
  if (!profile) {
    errors.push(`${acceptance.id}: missing quality profile ${acceptance.requiredQualityProfileId}`);
    return;
  }
  if (!Number.isFinite(acceptance.minSteadyFps) || acceptance.minSteadyFps < profile.minSteadyFps) {
    errors.push(`${acceptance.id}: minSteadyFps cannot be below ${profile.id}`);
  }
  if (!Number.isFinite(acceptance.maxDrawCalls)
    || acceptance.maxDrawCalls <= 0
    || acceptance.maxDrawCalls > profile.maxDrawCalls) {
    errors.push(`${acceptance.id}: maxDrawCalls must fit ${profile.id}`);
  }
  if (!Number.isFinite(acceptance.maxVisibleTriangles)
    || acceptance.maxVisibleTriangles <= 0
    || acceptance.maxVisibleTriangles > profile.maxVisibleTriangles) {
    errors.push(`${acceptance.id}: maxVisibleTriangles must fit ${profile.id}`);
  }
}

export function validateWorldBundle(bundle: WorldBundle) {
  const errors: string[] = [];
  const idGroups: [string, string[]][] = [
    ['entity', bundle.entities.map(item => item.id)],
    ['environment', bundle.environments.map(item => item.id)],
    ['material', bundle.materials.map(item => item.id)],
    ['quality profile', bundle.qualityProfiles.map(item => item.id)],
    ['scientific model', bundle.scientificModels.map(item => item.id)],
    ['assessment', bundle.assessments.map(item => item.id)],
    ['asset manifest', bundle.assetManifests.map(item => item.id)],
    ['acceptance profile', bundle.acceptanceProfiles.map(item => item.id)],
    ['lesson sequence', bundle.lessonSequenceIds],
    ['system', bundle.systemIds],
  ];
  for (const [kind, ids] of idGroups) {
    for (const id of duplicates(ids)) errors.push(`duplicate ${kind} ${id}`);
  }

  const environmentIds = new Set(bundle.environments.map(item => item.id));
  const entityIds = new Set(bundle.entities.map(item => item.id));
  const materialIds = new Set(bundle.materials.map(item => item.id));
  const qualityProfiles = new Map(bundle.qualityProfiles.map(item => [item.id, item]));
  const modelIds = new Set(bundle.scientificModels.map(item => item.id));
  const assessmentIds = new Set(bundle.assessments.map(item => item.id));
  const assetManifestIds = new Set(bundle.assetManifests.map(item => item.id));
  const acceptanceIds = new Set(bundle.acceptanceProfiles.map(item => item.id));
  const lessonIds = new Set(bundle.lessonSequenceIds);
  const systemIds = new Set(bundle.systemIds);
  const experienceIds = new Set(
    (bundle.experienceDefinitions ?? []).map(item => item.id),
  );
  const spatialLayoutIds = new Set(
    (bundle.spatialLayouts ?? []).map(item => item.id),
  );

  if (!environmentIds.has(bundle.world.environmentId)) {
    errors.push(`${bundle.world.id}: missing environment ${bundle.world.environmentId}`);
  }
  for (const id of bundle.world.entityIds) {
    if (!entityIds.has(id)) errors.push(`${bundle.world.id}: missing entity ${id}`);
  }
  for (const id of bundle.world.qualityProfileIds) {
    if (!qualityProfiles.has(id)) errors.push(`${bundle.world.id}: missing quality profile ${id}`);
  }
  for (const id of bundle.world.scientificModelIds) {
    if (!modelIds.has(id)) errors.push(`${bundle.world.id}: missing scientific model ${id}`);
  }
  for (const id of bundle.world.systemIds) {
    if (!systemIds.has(id)) errors.push(`${bundle.world.id}: missing system ${id}`);
  }
  if (!lessonIds.has(bundle.world.lessonSequenceId)) {
    errors.push(`${bundle.world.id}: missing lesson sequence ${bundle.world.lessonSequenceId}`);
  }
  if (!assessmentIds.has(bundle.world.assessmentSequenceId)) {
    errors.push(`${bundle.world.id}: missing assessment ${bundle.world.assessmentSequenceId}`);
  }
  if (!assetManifestIds.has(bundle.world.assetManifestId)) {
    errors.push(`${bundle.world.id}: missing asset manifest ${bundle.world.assetManifestId}`);
  }
  if (!acceptanceIds.has(bundle.world.acceptanceProfileId)) {
    errors.push(`${bundle.world.id}: missing acceptance profile ${bundle.world.acceptanceProfileId}`);
  }
  if (bundle.world.experienceId && !experienceIds.has(bundle.world.experienceId)) {
    errors.push(`${bundle.world.id}: missing experience ${bundle.world.experienceId}`);
  }
  if (bundle.world.spatialLayoutId && !spatialLayoutIds.has(bundle.world.spatialLayoutId)) {
    errors.push(`${bundle.world.id}: missing spatial layout ${bundle.world.spatialLayoutId}`);
  }
  if (!Number.isFinite(bundle.world.metersPerWorldUnit) || bundle.world.metersPerWorldUnit <= 0) {
    errors.push(`${bundle.world.id}: metersPerWorldUnit must be a positive finite number`);
  }

  for (const entity of bundle.entities) {
    validateEntity(entity, errors);
    if (entity.materialId && !materialIds.has(entity.materialId)) {
      errors.push(`${entity.id}: missing material ${entity.materialId}`);
    }
  }
  for (const environment of bundle.environments) {
    validateEnvironment(environment, errors);
    for (const entityId of environment.shadowCasters) {
      if (!entityIds.has(entityId)) errors.push(`${environment.id}: missing shadow caster ${entityId}`);
    }
  }
  for (const material of bundle.materials) validateMaterial(material, errors);
  for (const profile of bundle.qualityProfiles) validateQualityProfile(profile, errors);
  for (const model of bundle.scientificModels) validateScientificModel(model, errors);
  for (const sequence of bundle.assessments) validateAssessment(sequence, errors);

  for (const manifest of bundle.assetManifests) {
    for (const duplicate of duplicates(manifest.assets.map(asset => asset.id))) {
      errors.push(`${manifest.id}: duplicate asset ${duplicate}`);
    }
    const assetIds = new Set(manifest.assets.map(asset => asset.id));
    for (const asset of manifest.assets) validateAsset(asset, assetIds, errors);
  }
  for (const acceptance of bundle.acceptanceProfiles) {
    validateAcceptance(acceptance, qualityProfiles, errors);
  }
  for (const experience of bundle.experienceDefinitions ?? []) {
    errors.push(...validateExperienceDefinition(experience));
  }
  for (const spatial of bundle.spatialLayouts ?? []) {
    errors.push(...validateSpatialLayoutDefinition(spatial));
  }

  return errors;
}
