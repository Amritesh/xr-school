import * as THREE from 'three';
import type { LessonSnapshot } from '@xr-school/simulation-runtime';
import type {
  SimulationInteractionTarget,
  SimulationSceneContext,
} from '@xr-school/simulation-web';
import type { ProjectableSceneAdapter } from './types';
import { drawFittedText } from '../../vr/screenSafeTextPanel';

const INPUT_SOURCES = [
  'mouse',
  'touch',
  'keyboard',
  'xr-controller',
] as const;

function disposeMaterial(
  material: THREE.Material,
  disposedTextures: Set<THREE.Texture>,
) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
      disposedTextures.add(value);
      value.dispose();
    }
  }
  material.dispose();
}

export function disposeObjectTree(root: THREE.Object3D): void {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();
  root.traverse(object => {
    const renderable = object as THREE.Mesh;
    if (
      renderable.geometry instanceof THREE.BufferGeometry &&
      !disposedGeometries.has(renderable.geometry)
    ) {
      disposedGeometries.add(renderable.geometry);
      renderable.geometry.dispose();
    }
    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    for (const material of materials) {
      if (!disposedMaterials.has(material)) {
        disposedMaterials.add(material);
        disposeMaterial(material, disposedTextures);
      }
    }
  });
}

export function registerActionTarget(
  context: SimulationSceneContext,
  input: Omit<SimulationInteractionTarget, 'inputSources'>,
): () => void {
  return context.interactions.register({
    ...input,
    inputSources: [...INPUT_SOURCES],
  });
}

function textureForLabel(
  label: string,
  background: THREE.ColorRepresentation,
): THREE.CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const drawing = canvas.getContext('2d');
  if (!drawing) return undefined;
  drawing.fillStyle = new THREE.Color(background).getStyle();
  drawing.fillRect(0, 0, canvas.width, canvas.height);
  drawing.strokeStyle = 'rgba(255,255,255,.55)';
  drawing.lineWidth = 6;
  drawing.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  drawFittedText(drawing, label, {
    x: 24,
    y: 18,
    width: canvas.width - 48,
    height: canvas.height - 36,
    color: '#ffffff',
    fontWeight: 650,
    maxFontSize: 31,
    minFontSize: 16,
    maxLines: 3,
    align: 'center',
    verticalAlign: 'middle',
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createLabelledButton(
  label: string,
  options: {
    color?: THREE.ColorRepresentation;
    width?: number;
    height?: number;
  } = {},
): THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> {
  const color = options.color ?? '#155e75';
  const texture = textureForLabel(label, color);
  const material = new THREE.MeshStandardMaterial({
    color: texture ? '#ffffff' : color,
    map: texture,
    roughness: 0.65,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(options.width ?? 1.25, options.height ?? 0.34, 0.09),
    material,
  );
  mesh.name = label;
  mesh.userData.accessibilityLabel = label;
  return mesh;
}

export function addInteractiveWorkbench(
  context: SimulationSceneContext,
  options: {
    slug: string;
    environmentBrowserUrl: string;
    environmentQuestUrl: string;
    environmentFallbackUrl: string;
    accent: THREE.ColorRepresentation;
  },
): { root: THREE.Group; bench: THREE.Mesh; dispose(): void } {
  const root = new THREE.Group();
  root.name = `interactive-workbench:${options.slug}`;
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: '#172b35', roughness: 0.92 }),
  );
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  root.add(floor);

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(3.9, 0.16, 1.65),
    new THREE.MeshStandardMaterial({
      color: '#70452e',
      roughness: 0.78,
    }),
  );
  bench.position.set(0, 0.83, -1.05);
  bench.receiveShadow = true;
  root.add(bench);

  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(24, 32, 16),
    new THREE.MeshBasicMaterial({
      color: '#0b2233',
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  horizon.name = 'deterministic-environment-fallback';
  root.add(horizon);

  const ambient = new THREE.HemisphereLight('#d7f5ff', '#0b1722', 1.45);
  const key = new THREE.DirectionalLight('#ffffff', 2.1);
  key.position.set(3, 5, 2);
  key.castShadow = context.profile() !== 'questBaseline';
  const accent = new THREE.PointLight(options.accent, 4, 8, 2);
  accent.position.set(-2, 2.5, -1);
  root.add(ambient, key, accent);
  context.scene.add(root);

  let disposed = false;
  let loadedTexture: THREE.Texture | undefined;
  const selectedUrl =
    context.profile() === 'questBaseline'
      ? options.environmentQuestUrl
      : options.environmentBrowserUrl;
  if (typeof document !== 'undefined') {
    const loader = new THREE.TextureLoader();
    const applyTexture = (texture: THREE.Texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      loadedTexture?.dispose();
      loadedTexture = texture;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      (horizon.material as THREE.MeshBasicMaterial).map = texture;
      (horizon.material as THREE.MeshBasicMaterial).color.set('#ffffff');
      (horizon.material as THREE.MeshBasicMaterial).needsUpdate = true;
    };
    loader.load(
      selectedUrl,
      applyTexture,
      undefined,
      () => loader.load(options.environmentFallbackUrl, applyTexture),
    );
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    context.scene.remove(root);
    disposeObjectTree(root);
    loadedTexture = undefined;
  };
  const releaseResource = context.resources.register(
    `interactive:${options.slug}:workbench`,
    dispose,
  );

  return {
    root,
    bench,
    dispose() {
      releaseResource();
      dispose();
    },
  };
}

export interface InteractiveTargetSpec {
  id: string;
  actionId: string;
  label: string;
  object: THREE.Object3D;
}

export interface InteractiveSceneBuild<State> {
  targets: readonly InteractiveTargetSpec[];
  project(state: Readonly<State>): void;
  applySnapshot?(snapshot: LessonSnapshot): void;
  focusTarget?(): THREE.Object3D | undefined;
}

export function createProjectableSceneAdapter<State>(options: {
  id: string;
  slug: string;
  accent: THREE.ColorRepresentation;
  build(
    context: SimulationSceneContext,
    root: THREE.Group,
    bench: THREE.Mesh,
  ): InteractiveSceneBuild<State>;
}): ProjectableSceneAdapter<State> {
  let project: ((state: Readonly<State>) => void) | undefined;
  return {
    id: options.id,
    projectDomain(state) {
      if (!project) throw new Error(`${options.id}: scene is not initialized`);
      project(state);
    },
    create(context) {
      const baseUrl = `/simulations/${options.slug}`;
      const workbench = addInteractiveWorkbench(context, {
        slug: options.slug,
        environmentBrowserUrl: `${baseUrl}/environment-browser.webp`,
        environmentQuestUrl: `${baseUrl}/environment-quest.webp`,
        environmentFallbackUrl: `${baseUrl}/environment-fallback.svg`,
        accent: options.accent,
      });
      const build = options.build(context, workbench.root, workbench.bench);
      project = build.project;
      const unregister = build.targets.map(target =>
        registerActionTarget(context, {
          id: target.id,
          actionId: target.actionId,
          object: target.object,
          accessibilityLabel: target.label,
        }),
      );
      let disposed = false;
      return {
        applySnapshot(snapshot) {
          build.applySnapshot?.(snapshot);
        },
        focusTarget: build.focusTarget,
        dispose() {
          if (disposed) return;
          disposed = true;
          for (const remove of unregister.reverse()) remove();
          project = undefined;
          workbench.dispose();
        },
      };
    },
  };
}
