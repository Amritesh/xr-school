import * as THREE from 'three';
import type {
  AssetDefinition,
  AssetManifest,
  PbrMaterialDefinition,
  QualityProfileId,
} from '../../../../packages/simulation-schema/src/world';

export type TextureChannel =
  | 'baseColor'
  | 'emissive'
  | 'normal'
  | 'roughness'
  | 'metalness'
  | 'ambientOcclusion';

export interface AssetDiagnostic {
  severity: 'warning' | 'error';
  assetId: string;
  message: string;
  fallbackAssetId?: string;
}

export function textureColorSpaceForChannel(
  channel: TextureChannel,
): 'srgb' | 'none' {
  return channel === 'baseColor' || channel === 'emissive' ? 'srgb' : 'none';
}

export function validateMaterialForProfile(
  material: PbrMaterialDefinition,
  profileId: QualityProfileId,
) {
  const errors: string[] = [];
  if (profileId === 'questBaseline' && (material.transmission ?? 0) > 0) {
    errors.push(`${material.id}: transmission is not allowed by questBaseline`);
  }
  if (profileId === 'questBaseline' && (material.iridescence ?? 0) > 0) {
    errors.push(`${material.id}: iridescence is not allowed by questBaseline`);
  }
  if (material.model === 'physical' && profileId === 'questBaseline'
    && !material.fallbackMaterialId) {
    errors.push(`${material.id}: physical Quest material requires fallbackMaterialId`);
  }
  return errors;
}

interface MaterialFactoryConfig {
  assets: AssetManifest;
  materials: PbrMaterialDefinition[];
  qualityProfileId: QualityProfileId;
  maxAnisotropy: number;
  onDiagnostic?: (diagnostic: AssetDiagnostic) => void;
  textureLoader?: THREE.TextureLoader;
}

function mapAsset(
  manifest: AssetManifest,
  assetId: string,
): AssetDefinition {
  const asset = manifest.assets.find(item => item.id === assetId);
  if (!asset) throw new Error(`Missing texture asset ${assetId}`);
  if (asset.kind !== 'texture') throw new Error(`${assetId}: asset is not a texture`);
  return asset;
}

export function createMaterialFactory(config: MaterialFactoryConfig) {
  const textureLoader = config.textureLoader ?? new THREE.TextureLoader();
  const textures = new Map<string, THREE.Texture>();
  const materials = new Set<THREE.Material>();

  async function loadTexture(
    assetId: string,
    channel: TextureChannel,
    attempted = new Set<string>(),
  ): Promise<THREE.Texture> {
    const cacheKey = `${assetId}:${channel}`;
    const cached = textures.get(cacheKey);
    if (cached) return cached;
    if (attempted.has(assetId)) {
      throw new Error(`${assetId}: circular texture fallback`);
    }
    attempted.add(assetId);

    const asset = mapAsset(config.assets, assetId);
    try {
      const texture = await textureLoader.loadAsync(asset.url);
      texture.colorSpace = textureColorSpaceForChannel(channel) === 'srgb'
        ? THREE.SRGBColorSpace
        : THREE.NoColorSpace;
      texture.anisotropy = Math.max(
        1,
        Math.min(config.maxAnisotropy, config.qualityProfileId === 'questBaseline' ? 4 : 8),
      );
      textures.set(cacheKey, texture);
      return texture;
    } catch (error) {
      if (!asset.fallbackAssetId) {
        config.onDiagnostic?.({
          severity: 'error',
          assetId,
          message: error instanceof Error ? error.message : String(error),
        });
        throw new Error(`${assetId}: texture failed and has no fallback`, { cause: error });
      }
      config.onDiagnostic?.({
        severity: 'warning',
        assetId,
        fallbackAssetId: asset.fallbackAssetId,
        message: 'Texture failed; using declared fallback',
      });
      return loadTexture(asset.fallbackAssetId, channel, attempted);
    }
  }

  async function resolveDefinition(
    requested: PbrMaterialDefinition,
  ): Promise<PbrMaterialDefinition> {
    const profileErrors = validateMaterialForProfile(
      requested,
      config.qualityProfileId,
    );
    if (profileErrors.length === 0) return requested;
    if (!requested.fallbackMaterialId) throw new Error(profileErrors.join('; '));
    const fallback = config.materials.find(
      material => material.id === requested.fallbackMaterialId,
    );
    if (!fallback) {
      throw new Error(`${requested.id}: missing fallback material ${requested.fallbackMaterialId}`);
    }
    const fallbackErrors = validateMaterialForProfile(
      fallback,
      config.qualityProfileId,
    );
    if (fallbackErrors.length > 0) throw new Error(fallbackErrors.join('; '));
    config.onDiagnostic?.({
      severity: 'warning',
      assetId: requested.id,
      fallbackAssetId: fallback.id,
      message: `Material is too costly for ${config.qualityProfileId}; using declared fallback`,
    });
    return fallback;
  }

  async function create(
    requested: PbrMaterialDefinition,
  ): Promise<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial> {
    const definition = await resolveDefinition(requested);
    const [
      map,
      normalMap,
      roughnessMap,
      metalnessMap,
      aoMap,
      emissiveMap,
    ] = await Promise.all([
      definition.baseColorMap
        ? loadTexture(definition.baseColorMap, 'baseColor')
        : undefined,
      definition.normalMap
        ? loadTexture(definition.normalMap, 'normal')
        : undefined,
      definition.roughnessMap
        ? loadTexture(definition.roughnessMap, 'roughness')
        : undefined,
      definition.metalnessMap
        ? loadTexture(definition.metalnessMap, 'metalness')
        : undefined,
      definition.ambientOcclusionMap
        ? loadTexture(definition.ambientOcclusionMap, 'ambientOcclusion')
        : undefined,
      definition.emissiveMap
        ? loadTexture(definition.emissiveMap, 'emissive')
        : undefined,
    ]);

    for (const texture of [map, normalMap, roughnessMap, metalnessMap, aoMap, emissiveMap]) {
      if (!texture || !definition.textureRepeat) continue;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(...definition.textureRepeat);
    }

    const common: THREE.MeshStandardMaterialParameters = {
      name: definition.id,
      color: definition.baseColor,
      map,
      normalMap,
      normalScale: definition.normalScale
        ? new THREE.Vector2(...definition.normalScale)
        : undefined,
      roughness: definition.roughness,
      roughnessMap,
      metalness: definition.metalness,
      metalnessMap,
      aoMap,
      emissive: definition.emissiveColor ?? '#000000',
      emissiveMap,
      emissiveIntensity: definition.emissiveIntensity ?? 1,
      side: definition.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      opacity: definition.opacity ?? 1,
      transparent: (definition.opacity ?? 1) < 1,
    };
    const material = definition.model === 'physical'
      ? new THREE.MeshPhysicalMaterial({
        ...common,
        transmission: definition.transmission ?? 0,
        clearcoat: definition.clearcoat ?? 0,
        iridescence: definition.iridescence ?? 0,
      })
      : new THREE.MeshStandardMaterial(common);
    materials.add(material);
    return material;
  }

  function dispose() {
    for (const material of materials) material.dispose();
    for (const texture of new Set(textures.values())) texture.dispose();
    materials.clear();
    textures.clear();
  }

  return { create, dispose };
}

export type MaterialFactory = ReturnType<typeof createMaterialFactory>;
