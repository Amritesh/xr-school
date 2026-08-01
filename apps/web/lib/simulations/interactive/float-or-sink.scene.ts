import * as THREE from 'three';
import type { FloatOrSinkState } from '@xr-school/simulation-runtime';
import {
  createLabelledButton,
  createProjectableSceneAdapter,
  type InteractiveTargetSpec,
} from './sceneKit';

const slug = 'c5-ch07-a01-a-concept-about-what-floats-what-sinks';
const objectIds = ['leaf', 'stone', 'cork', 'spoon', 'bottle', 'marble'] as const;
const colors = {
  leaf: '#65a30d',
  stone: '#64748b',
  cork: '#a16207',
  spoon: '#cbd5e1',
  bottle: '#22d3ee',
  marble: '#60a5fa',
} as const;

export function createFloatOrSinkSceneAdapter() {
  return createProjectableSceneAdapter<FloatOrSinkState>({
    id: 'interactive-float-or-sink-scene',
    slug,
    accent: '#22d3ee',
    build(_context, root) {
      const tank = new THREE.Mesh(
        new THREE.BoxGeometry(2.15, 1.35, 1.15),
        new THREE.MeshPhysicalMaterial({
          color: '#9cecff',
          transparent: true,
          opacity: 0.22,
          transmission: 0.55,
          roughness: 0.15,
          side: THREE.DoubleSide,
        }),
      );
      tank.position.set(0, 1.55, -1.05);
      root.add(tank);
      const waterline = new THREE.Mesh(
        new THREE.BoxGeometry(2.02, 0.03, 1.02),
        new THREE.MeshBasicMaterial({
          color: '#38bdf8',
          transparent: true,
          opacity: 0.72,
        }),
      );
      waterline.position.set(0, 1.78, -1.05);
      root.add(waterline);

      const objectMeshes = new Map<string, THREE.Mesh>();
      objectIds.forEach((id, index) => {
        const geometry =
          id === 'spoon'
            ? new THREE.CapsuleGeometry(0.07, 0.28, 4, 10)
            : id === 'bottle'
              ? new THREE.CylinderGeometry(0.11, 0.14, 0.34, 16)
              : new THREE.SphereGeometry(id === 'leaf' ? 0.12 : 0.14, 16, 10);
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: colors[id], roughness: 0.55 }),
        );
        mesh.name = id;
        mesh.position.set(-1.55 + index * 0.62, 1.05, -0.62);
        root.add(mesh);
        objectMeshes.set(id, mesh);
      });

      const weightArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(-0.26, 2.2, -0.44),
        0.45,
        '#f97316',
      );
      const supportArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0.26, 1.38, -0.44),
        0.45,
        '#22c55e',
      );
      weightArrow.name = 'Illustrative weight (not to scale)';
      supportArrow.name = 'Illustrative water support (not to scale)';
      root.add(weightArrow, supportArrow);

      const predictionGroup = new THREE.Group();
      predictionGroup.name = 'prediction-choices';
      const testGroup = new THREE.Group();
      testGroup.name = 'release-choices';
      root.add(predictionGroup, testGroup);
      const targets: InteractiveTargetSpec[] = [];
      objectIds.forEach((id, index) => {
        (['float', 'sink'] as const).forEach((prediction, optionIndex) => {
          const label = `${id}: predict ${prediction}`;
          const button = createLabelledButton(label, {
            color: prediction === 'float' ? '#047857' : '#9f1239',
            width: 0.86,
            height: 0.25,
          });
          button.position.set(
            -1.55 + index * 0.62,
            0.5 - optionIndex * 0.29,
            -0.42,
          );
          predictionGroup.add(button);
          targets.push({
            id: `${id}::${prediction}`,
            actionId: 'float-sink.predict',
            label,
            object: button,
          });
        });
        const release = createLabelledButton(`Release ${id}`, {
          color: '#0369a1',
          width: 0.86,
          height: 0.27,
        });
        release.position.set(-1.55 + index * 0.62, 0.42, -0.42);
        testGroup.add(release);
        targets.push({
          id,
          actionId: 'float-sink.test',
          label: `Release ${id} and observe its final position`,
          object: release,
        });
      });

      let stageId = 'predict';
      return {
        targets,
        project(state) {
          for (const id of objectIds) {
            const mesh = objectMeshes.get(id)!;
            const outcome = state.observations[id];
            if (outcome === 'float') {
              mesh.position.set(-0.72 + objectIds.indexOf(id) * 0.29, 1.83, -1.05);
            } else if (outcome === 'sink') {
              mesh.position.set(-0.72 + objectIds.indexOf(id) * 0.29, 1.04, -1.05);
            }
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.emissive.set(
              state.predictions[id] === outcome && outcome ? '#14532d' : '#000000',
            );
          }
        },
        applySnapshot(snapshot) {
          stageId = snapshot.stageId;
          predictionGroup.visible = stageId === 'predict';
          testGroup.visible = stageId === 'observe';
        },
        focusTarget() {
          return stageId === 'observe' ? testGroup : predictionGroup;
        },
      };
    },
  });
}

export default createFloatOrSinkSceneAdapter();
