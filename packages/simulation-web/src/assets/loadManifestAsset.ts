import type { ResourceRegistry } from '@xr-school/simulation-runtime';
import type {
  AssetDefinition,
  AssetManifest,
} from '@xr-school/simulation-schema';

export interface AssetLoadDiagnostic {
  severity: 'warning' | 'error';
  assetId: string;
  message: string;
  fallbackAssetId?: string;
}

export interface LoadManifestAssetConfig<T> {
  manifest: AssetManifest;
  assetId: string;
  resources: ResourceRegistry;
  load(definition: AssetDefinition): Promise<T>;
  dispose?(value: T): void | Promise<void>;
  onDiagnostic?(diagnostic: AssetLoadDiagnostic): void;
  resourceId?: string;
}

export async function loadManifestAsset<T>(
  config: LoadManifestAssetConfig<T>,
): Promise<T> {
  if (!config.assetId.trim()) throw new Error('Manifest asset ID is required');
  const byId = new Map(config.manifest.assets.map(asset => [asset.id, asset]));
  const attempted = new Set<string>();

  const load = async (assetId: string): Promise<T> => {
    const definition = byId.get(assetId);
    if (!definition) throw new Error(`Missing manifest asset ${assetId}`);
    if (attempted.has(assetId)) {
      throw new Error(`Circular manifest asset fallback at ${assetId}`);
    }
    attempted.add(assetId);
    try {
      return await config.load(definition);
    } catch (error) {
      if (!definition.fallbackAssetId) {
        const reason = error instanceof Error ? error.message : String(error);
        config.onDiagnostic?.({
          severity: 'error',
          assetId: definition.id,
          message: `${definition.id} failed without a declared fallback: ${reason}`,
        });
        throw new Error(
          `${definition.id}: asset load failed without a declared fallback`,
          { cause: error },
        );
      }
      config.onDiagnostic?.({
        severity: 'warning',
        assetId: definition.id,
        fallbackAssetId: definition.fallbackAssetId,
        message: `${definition.id} failed; using declared fallback ${definition.fallbackAssetId}`,
      });
      return load(definition.fallbackAssetId);
    }
  };

  const value = await load(config.assetId);
  const candidate = value as { dispose?: () => void | Promise<void> };
  const disposeValue = config.dispose
    ? () => config.dispose!(value)
    : typeof candidate?.dispose === 'function'
      ? () => candidate.dispose!()
      : undefined;
  if (disposeValue) {
    try {
      config.resources.register(
        config.resourceId ?? `asset:${config.manifest.id}:${config.assetId}`,
        disposeValue,
      );
    } catch (error) {
      await disposeValue();
      throw error;
    }
  }
  return value;
}
