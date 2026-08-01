import * as THREE from 'three';
import type {
  GuidedSimulationDefinition,
} from '@xr-school/simulation-schema';
import type {
  SimulationSceneContext,
} from '@xr-school/simulation-web';
import type {
  GuidedSceneMetadata,
} from '@xr-school/simulation-content';
import type { GuidedSceneWorld } from './sceneWorld';

export interface DeclarativeGuidedSceneConfig {
  definition: GuidedSimulationDefinition;
  metadata: GuidedSceneMetadata;
}

function palette(identifier: string) {
  let hash = 0;
  for (const character of identifier) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    base: new THREE.Color().setHSL(hue / 360, 0.52, 0.35),
    active: new THREE.Color().setHSL(((hue + 42) % 360) / 360, 0.74, 0.56),
    accent: new THREE.Color().setHSL(((hue + 188) % 360) / 360, 0.66, 0.64),
  };
}

function geometryFor(index: number): THREE.BufferGeometry {
  switch (index % 5) {
    case 0: return new THREE.BoxGeometry(1.35, 1.05, 1.1, 2, 2, 2);
    case 1: return new THREE.SphereGeometry(0.74, 24, 16);
    case 2: return new THREE.CylinderGeometry(0.62, 0.82, 1.25, 20);
    case 3: return new THREE.ConeGeometry(0.8, 1.45, 20);
    default: return new THREE.TorusGeometry(0.58, 0.2, 12, 28);
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material ? [mesh.material] : [];
    materials.forEach(material => material.dispose());
  });
}

export function createDeclarativeGuidedSceneWorld(
  context: SimulationSceneContext,
  config: DeclarativeGuidedSceneConfig,
): GuidedSceneWorld {
  const { definition, metadata } = config;
  const colors = palette(definition.moduleId);
  const root = new THREE.Group();
  root.name = `guided-world:${definition.moduleId}`;
  root.userData.environmentUrl = metadata.environmentUrl;
  root.userData.moduleId = definition.moduleId;

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.2, 48),
    new THREE.MeshStandardMaterial({
      color: colors.base.clone().multiplyScalar(0.42),
      roughness: 0.94,
      metalness: 0,
    }),
  );
  floor.name = 'stationary evidence platform';
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const ambient = new THREE.HemisphereLight(0xffffff, colors.base, 1.6);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3.5, 6, 4.5);
  root.add(ambient, key);

  const stageGroups = new Map<string, THREE.Group>();
  const focusTargets = new Map<string, THREE.Object3D>();
  const interactionTargets: GuidedSceneWorld['interactionTargets'][number][] = [];

  definition.stages.forEach((stage, stageIndex) => {
    const group = new THREE.Group();
    group.name = `${stage.sceneCueId}:${stage.title}`;
    group.userData.stageId = stage.id;
    group.userData.cue = stage.cue;
    group.userData.detail = stage.detail;
    group.visible = stageIndex === 0;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.7, 0.3, 28),
      new THREE.MeshStandardMaterial({
        color: colors.base,
        roughness: 0.72,
        metalness: 0.05,
      }),
    );
    pedestal.position.y = 0.15;
    pedestal.name = `${stage.title} evidence base`;

    const primary = new THREE.Mesh(
      geometryFor(stageIndex),
      new THREE.MeshStandardMaterial({
        color: colors.active,
        emissive: colors.active,
        emissiveIntensity: 0.08,
        roughness: 0.54,
        metalness: 0.08,
      }),
    );
    primary.position.y = 0.95;
    primary.name = `${stage.title}: ${stage.detail}`;
    primary.userData.outcome = stage.detail;
    primary.userData.scienceCue = stage.cue;

    const evidenceMarkers = Array.from({ length: 4 }, (_, markerIndex) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 8),
        new THREE.MeshStandardMaterial({
          color: colors.accent,
          emissive: colors.accent,
          emissiveIntensity: 0.25,
          roughness: 0.4,
        }),
      );
      const angle = (markerIndex / 4) * Math.PI * 2;
      marker.position.set(Math.cos(angle) * 1.55, 0.65, Math.sin(angle) * 1.55);
      marker.visible = false;
      marker.name = `${stage.id} evidence marker ${markerIndex + 1}`;
      return marker;
    });

    const hotspot = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshBasicMaterial({
        color: colors.accent,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    hotspot.position.set(0, 1.05, 0.9);
    hotspot.name = `${stage.actionLabel} hotspot`;
    hotspot.userData.actionId = stage.requiredActionIds[0];
    group.add(pedestal, primary, ...evidenceMarkers, hotspot);
    root.add(group);
    stageGroups.set(stage.sceneCueId, group);
    focusTargets.set(stage.sceneCueId, primary);
    interactionTargets.push({
      id: `${definition.moduleId}:target:${stage.id}`,
      object: hotspot,
      actionId: stage.requiredActionIds[0],
      accessibilityLabel: stage.actionLabel,
    });
  });

  const previousBackground = context.scene.background;
  let environmentTexture: THREE.Texture | undefined;
  if (typeof Image !== 'undefined') {
    environmentTexture = new THREE.TextureLoader().load(
      metadata.environmentUrl,
      texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        context.scene.background = texture;
      },
      undefined,
      () => {
        if (context.scene.background === environmentTexture) {
          context.scene.background = previousBackground;
        }
      },
    );
  }

  let disposed = false;
  return {
    root,
    cueIds: definition.stages.map(stage => stage.sceneCueId),
    interactionTargets,
    cueDurationSeconds(cueId) {
      const index = definition.stages.findIndex(stage => stage.sceneCueId === cueId);
      if (index < 0) throw new Error(`${definition.id}: unknown cue ${cueId}`);
      return Math.min(1.25, 0.65 + index * 0.06);
    },
    applyCue(cueId, progress, preferences) {
      if (disposed) throw new Error(`${definition.id}: scene world is disposed`);
      if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
        throw new Error(`${definition.id}: cue progress must be between 0 and 1`);
      }
      const active = stageGroups.get(cueId);
      if (!active) throw new Error(`${definition.id}: unknown cue ${cueId}`);
      for (const [candidateCueId, group] of stageGroups) {
        group.visible = candidateCueId === cueId;
      }
      const primary = focusTargets.get(cueId)! as THREE.Mesh;
      const eased = preferences.reducedMotion
        ? (progress > 0 ? 1 : 0)
        : THREE.MathUtils.smoothstep(progress, 0, 1);
      primary.position.y = 0.95 + eased * 0.48;
      primary.rotation.y = eased * Math.PI * 0.72;
      primary.scale.setScalar(1 + eased * 0.14);
      const material = primary.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.08 + eased * 0.52;
      active.children
        .filter(child => child.name.includes('evidence marker'))
        .forEach((marker, index) => {
          marker.visible = eased >= (index + 1) / 4;
        });
      root.userData.currentCueId = cueId;
      root.userData.progress = progress;
      root.userData.outcome = metadata.stageOutcomes[cueId];
      root.userData.numericEvidence = metadata.numericEvidence?.[cueId];
    },
    focusTarget(cueId) {
      return focusTargets.get(cueId);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (context.scene.background === environmentTexture) {
        context.scene.background = previousBackground;
      }
      environmentTexture?.dispose();
      disposeObject(root);
      root.clear();
      stageGroups.clear();
      focusTargets.clear();
    },
  };
}
