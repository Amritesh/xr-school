import * as THREE from 'three';
import type { LipidTestState } from '@xr-school/simulation-runtime';
import { LIPID_PROCEDURE } from '@xr-school/simulation-runtime';
import {
  createLabelledButton,
  createProjectableSceneAdapter,
  type InteractiveTargetSpec,
} from './sceneKit';

const slug = 'c6-ch02-a03-test-the-presence-of-lipids';
const sampleIds = ['peanut', 'coconut', 'rice'] as const;

export function createLipidTestSceneAdapter() {
  return createProjectableSceneAdapter<LipidTestState>({
    id: 'interactive-lipid-test-scene',
    slug,
    accent: '#f59e0b',
    build(_context, root) {
      const lamp = new THREE.PointLight('#fff4c2', 7, 5, 1.5);
      lamp.position.set(0, 2.45, -1.65);
      root.add(lamp);

      const predictionGroup = new THREE.Group();
      predictionGroup.name = 'lipid-predictions';
      const procedureGroup = new THREE.Group();
      procedureGroup.name = 'ordered-paper-procedure';
      const papers = new Map<string, THREE.Mesh>();
      const sampleModels = new Map<string, THREE.Mesh>();
      root.add(predictionGroup, procedureGroup);
      const targets: InteractiveTargetSpec[] = [];

      sampleIds.forEach((id, index) => {
        const x = -1.35 + index * 1.35;
        const paper = new THREE.Mesh(
          new THREE.BoxGeometry(0.92, 0.035, 0.72),
          new THREE.MeshPhysicalMaterial({
            color: '#fffdf2',
            roughness: 0.72,
            transmission: 0,
            transparent: true,
          }),
        );
        paper.name = `${id} paper evidence`;
        paper.position.set(x, 0.96, -1.05);
        root.add(paper);
        papers.set(id, paper);

        const sample = new THREE.Mesh(
          id === 'rice'
            ? new THREE.CapsuleGeometry(0.055, 0.15, 4, 8)
            : id === 'coconut'
              ? new THREE.TorusGeometry(0.14, 0.075, 8, 16, Math.PI)
              : new THREE.SphereGeometry(0.14, 14, 9),
          new THREE.MeshStandardMaterial({
            color: id === 'peanut' ? '#b45309' : id === 'coconut' ? '#f5e7c6' : '#e5e7eb',
            roughness: 0.78,
          }),
        );
        sample.name = id;
        sample.position.set(x, 1.11, -1.05);
        root.add(sample);
        sampleModels.set(id, sample);

        (['present', 'absent'] as const).forEach((prediction, optionIndex) => {
          const button = createLabelledButton(`${id}: ${prediction}`, {
            color: prediction === 'present' ? '#9a3412' : '#475569',
            width: 1.05,
            height: 0.25,
          });
          button.position.set(x, 0.51 - optionIndex * 0.29, -0.38);
          predictionGroup.add(button);
          targets.push({
            id: `${id}::${prediction}`,
            actionId: 'lipid.predict',
            label: `Predict lipid evidence ${prediction} for ${id}`,
            object: button,
          });
        });

        LIPID_PROCEDURE.forEach((step, stepIndex) => {
          const button = createLabelledButton(`${step} ${id}`, {
            color: step === 'inspect' ? '#7c2d12' : '#92400e',
            width: 0.58,
            height: 0.2,
          });
          button.position.set(
            x - 0.48 + (stepIndex % 3) * 0.48,
            0.53 - Math.floor(stepIndex / 3) * 0.24,
            -0.38,
          );
          procedureGroup.add(button);
          targets.push({
            id: `${id}::${step}`,
            actionId: 'lipid.advance-procedure',
            label: `${step} step for ${id}`,
            object: button,
          });
        });
      });

      let stageId = 'predict';
      return {
        targets,
        project(state) {
          for (const id of sampleIds) {
            const record = state.records[id];
            const paper = papers.get(id)!;
            const material = paper.material as THREE.MeshPhysicalMaterial;
            const complete = record?.completedSteps.includes('inspect') ?? false;
            material.color.set(
              record?.observation === 'persistent' ? '#f3c98b' : '#fffdf2',
            );
            material.opacity = record?.observation === 'persistent' ? 0.64 : 1;
            material.transmission = record?.observation === 'persistent' ? 0.32 : 0;
            const sample = sampleModels.get(id)!;
            sample.visible = !(record?.completedSteps.includes('remove') ?? false);
            paper.rotation.z = complete ? 0.08 : 0;
          }
        },
        applySnapshot(snapshot) {
          stageId = snapshot.stageId;
          predictionGroup.visible = stageId === 'predict';
          procedureGroup.visible = stageId === 'procedure';
        },
        focusTarget() {
          return stageId === 'procedure' ? procedureGroup : predictionGroup;
        },
      };
    },
  });
}

export default createLipidTestSceneAdapter();
