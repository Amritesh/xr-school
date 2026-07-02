export const QUALITY_PROFILE_IDS = [
  'questBaseline',
  'browserBalanced',
  'browserEnhanced',
] as const;

export type QualityProfileId = (typeof QUALITY_PROFILE_IDS)[number];
export type Vector3Tuple = [number, number, number];

export interface QualityProfile {
  id: QualityProfileId;
  minSteadyFps: number;
  maxVisibleTriangles: number;
  maxDrawCalls: number;
  maxTextureSize: number;
  maxShadowLights: number;
  maxShadowMapSize: number;
  maxPixelRatio: number;
  postProcessing: ('antialias' | 'ambientOcclusion' | 'selectiveBloom' | 'output')[];
}

export const QUEST_BASELINE_PROFILE: QualityProfile = {
  id: 'questBaseline',
  minSteadyFps: 72,
  maxVisibleTriangles: 250_000,
  maxDrawCalls: 120,
  maxTextureSize: 1024,
  maxShadowLights: 1,
  maxShadowMapSize: 1024,
  maxPixelRatio: 1,
  postProcessing: [],
};

export const BROWSER_BALANCED_PROFILE: QualityProfile = {
  id: 'browserBalanced',
  minSteadyFps: 60,
  maxVisibleTriangles: 500_000,
  maxDrawCalls: 220,
  maxTextureSize: 2048,
  maxShadowLights: 1,
  maxShadowMapSize: 2048,
  maxPixelRatio: 1.5,
  postProcessing: ['antialias', 'output'],
};

export const BROWSER_ENHANCED_PROFILE: QualityProfile = {
  id: 'browserEnhanced',
  minSteadyFps: 60,
  maxVisibleTriangles: 750_000,
  maxDrawCalls: 300,
  maxTextureSize: 2048,
  maxShadowLights: 2,
  maxShadowMapSize: 2048,
  maxPixelRatio: 2,
  postProcessing: ['ambientOcclusion', 'selectiveBloom', 'antialias', 'output'],
};

export interface WorldDefinition {
  id: string;
  version: string;
  title: string;
  metersPerWorldUnit: number;
  environmentId: string;
  qualityProfileIds: QualityProfileId[];
  entityIds: string[];
  systemIds: string[];
  scientificModelIds: string[];
  lessonSequenceId: string;
  assessmentSequenceId: string;
  assetManifestId: string;
  acceptanceProfileId: string;
  experienceId?: string;
  spatialLayoutId?: string;
}

export interface WorldEntityDefinition {
  id: string;
  visualId: string;
  transform: {
    position: Vector3Tuple;
    rotation: Vector3Tuple;
    scale: Vector3Tuple;
  };
  materialId?: string;
  colliderId?: string;
  interactionTags: string[];
  accessibilityLabel?: string;
}

export interface PbrMaterialDefinition {
  id: string;
  model: 'standard' | 'physical';
  baseColor: string;
  baseColorMap?: string;
  normalMap?: string;
  normalScale?: [number, number];
  textureRepeat?: [number, number];
  roughness: number;
  roughnessMap?: string;
  metalness: number;
  metalnessMap?: string;
  ambientOcclusionMap?: string;
  emissiveColor?: string;
  emissiveMap?: string;
  emissiveIntensity?: number;
  transmission?: number;
  clearcoat?: number;
  iridescence?: number;
  doubleSided?: boolean;
  opacity?: number;
  fallbackMaterialId?: string;
}

export interface LightDefinition {
  kind: 'ambient' | 'directional' | 'hemisphere' | 'point' | 'spot';
  color: string;
  intensity: number;
  position?: Vector3Tuple;
  target?: Vector3Tuple;
  castsShadow?: boolean;
  range?: number;
  decay?: number;
}

export interface EnvironmentDefinition {
  id: string;
  background: {
    kind: 'color' | 'gradient' | 'texture';
    value: string;
  };
  environmentMap?: string;
  fog?: {
    color: string;
    near: number;
    far: number;
  };
  keyLight: LightDefinition;
  fillLight?: LightDefinition;
  accentLights: LightDefinition[];
  shadowCasters: string[];
  exposure: number;
  toneMapping: 'AgX' | 'ACESFilmic' | 'Neutral';
}

export type ScientificValue = number | string | boolean;

export interface ScientificReferenceVector {
  id: string;
  inputs: Record<string, ScientificValue>;
  expectedOutputs: Record<string, ScientificValue>;
  toleranceOverrides?: Record<string, number>;
}

export interface ScientificModelManifest {
  id: string;
  version: string;
  domain: 'biology' | 'electricity' | 'particleMatter' | 'mixtures' | 'classification';
  internalUnits: Record<string, string>;
  validInputRanges: Record<string, { min: number; max: number; unit: string }>;
  assumptions: string[];
  limitations: string[];
  referenceSources: string[];
  referenceVectors: ScientificReferenceVector[];
  numericalTolerance: number;
}

export type AssessmentPromptKind =
  | 'prediction'
  | 'observation'
  | 'misconception'
  | 'transfer';

export interface AssessmentPromptDefinition {
  id: string;
  kind: AssessmentPromptKind;
  stageId: string;
  question: string;
  options?: { id: string; label: string }[];
  acceptedEvidenceIds: string[];
  hint: string;
  explanation: string;
  retryPolicy: 'immediateWithHint' | 'afterObservation';
}

export interface MasteryRule {
  requiredEvidenceCount: number;
  requiredKinds: ('observation' | 'misconception' | 'transfer')[];
  allowHintedMastery: boolean;
}

export interface AssessmentSequence {
  id: string;
  objectiveId: string;
  prompts: AssessmentPromptDefinition[];
  masteryRule: MasteryRule;
}

export type AssetKind =
  | 'texture'
  | 'environment'
  | 'model'
  | 'audio'
  | 'font'
  | 'data';

export interface AssetDefinition {
  id: string;
  url: string;
  kind: AssetKind;
  source: string;
  license: string;
  author: string;
  width: number;
  height: number;
  channels: string[];
  compression: string;
  fallbackAssetId?: string;
}

export interface AssetManifest {
  id: string;
  assets: AssetDefinition[];
}

export interface AcceptanceProfile {
  id: string;
  requiredQualityProfileId: QualityProfileId;
  minSteadyFps: number;
  maxDrawCalls: number;
  maxVisibleTriangles: number;
  requiresQuestAcceptance: boolean;
}

export interface WorldBundle {
  world: WorldDefinition;
  entities: WorldEntityDefinition[];
  environments: EnvironmentDefinition[];
  materials: PbrMaterialDefinition[];
  qualityProfiles: QualityProfile[];
  scientificModels: ScientificModelManifest[];
  assessments: AssessmentSequence[];
  assetManifests: AssetManifest[];
  acceptanceProfiles: AcceptanceProfile[];
  lessonSequenceIds: string[];
  systemIds: string[];
  experienceDefinitions?: import('./experience').ExperienceDefinition[];
  spatialLayouts?: import('./spatial').SpatialLayoutDefinition[];
}
