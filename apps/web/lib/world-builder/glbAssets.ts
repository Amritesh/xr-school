import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export interface GlbAssetLoader {
  load(url: string): Promise<THREE.Group>;
  loadOrFallback(
    url: string,
    fallback: () => THREE.Group,
    onDiagnostic?: (message: string) => void,
  ): Promise<THREE.Group>;
  dispose(): void;
}

/** Resolves to the loaded model, or to the fallback with a diagnostic when loading fails. */
export async function loadOrFallback(
  load: (url: string) => Promise<THREE.Group>,
  url: string,
  fallback: () => THREE.Group,
  onDiagnostic?: (message: string) => void,
): Promise<THREE.Group> {
  try {
    return await load(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    onDiagnostic?.(`${url} failed to load, using fallback: ${reason}`);
    return fallback();
  }
}

export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

/** Offline-safe GLB loading: meshopt and KTX2 decoders are served from this app. */
export function createGlbAssetLoader(
  renderer: THREE.WebGLRenderer,
  { transcoderPath = '/vendor/basis/' }: { transcoderPath?: string } = {},
): GlbAssetLoader {
  const ktx2 = new KTX2Loader().setTranscoderPath(transcoderPath).detectSupport(renderer);
  const gltf = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  const loaded = new Set<THREE.Group>();

  const load = async (url: string) => {
    const result = await gltf.loadAsync(url);
    loaded.add(result.scene);
    return result.scene;
  };

  return {
    load,
    loadOrFallback: (url, fallback, onDiagnostic) =>
      loadOrFallback(load, url, fallback, onDiagnostic),
    dispose() {
      loaded.forEach(disposeObjectTree);
      loaded.clear();
      ktx2.dispose();
    },
  };
}
