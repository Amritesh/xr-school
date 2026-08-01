import * as THREE from 'three';
import type {
  MixtureSnapshot,
  SolubilityInvestigationState,
} from '@xr-school/simulation-runtime';
import {
  createLabelledButton,
  createProjectableSceneAdapter,
  type InteractiveTargetSpec,
} from './sceneKit';

const slug = 'c5-ch07-a03-soluble-and-insoluble-substances';
const substances = ['salt', 'sugar', 'sand', 'chalk', 'oil', 'sawdust'] as const;

function phaseColor(snapshot: MixtureSnapshot | undefined) {
  if (!snapshot) return '#dbeafe';
  if (snapshot.phaseState === 'solution') return '#bae6fd';
  if (snapshot.phaseState === 'suspension') return '#e2e8f0';
  if (snapshot.phaseState === 'sediment') return '#a16207';
  if (snapshot.phaseState === 'separated-layer') return '#facc15';
  if (snapshot.phaseState === 'floating-solid') return '#92400e';
  return '#dbeafe';
}

export function createSolubilitySceneAdapter() {
  return createProjectableSceneAdapter<SolubilityInvestigationState>({
    id: 'interactive-solubility-scene',
    slug,
    accent: '#38bdf8',
    build(_context, root) {
      const beaker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.66, 0.56, 1.25, 32, 1, true),
        new THREE.MeshPhysicalMaterial({
          color: '#dff7ff',
          transparent: true,
          opacity: 0.28,
          transmission: 0.62,
          roughness: 0.12,
          side: THREE.DoubleSide,
        }),
      );
      beaker.position.set(0, 1.52, -1.04);
      root.add(beaker);
      const mixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.54, 0.49, 0.82, 28),
        new THREE.MeshStandardMaterial({
          color: '#dbeafe',
          transparent: true,
          opacity: 0.72,
        }),
      );
      mixture.position.set(0, 1.31, -1.04);
      root.add(mixture);
      const sediment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.49, 0.47, 0.08, 28),
        new THREE.MeshStandardMaterial({ color: '#a16207' }),
      );
      sediment.position.set(0, 0.93, -1.04);
      root.add(sediment);
      const upperLayer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.53, 0.53, 0.08, 28),
        new THREE.MeshStandardMaterial({
          color: '#facc15',
          transparent: true,
          opacity: 0.82,
        }),
      );
      upperLayer.position.set(0, 1.7, -1.04);
      root.add(upperLayer);

      const particleGeometry = new THREE.SphereGeometry(0.025, 8, 6);
      const particleMaterial = new THREE.MeshStandardMaterial({ color: '#9a6337' });
      const floatingParticles = new THREE.InstancedMesh(
        particleGeometry,
        particleMaterial,
        32,
      );
      const matrix = new THREE.Matrix4();
      for (let index = 0; index < 32; index += 1) {
        const angle = index * 2.399;
        matrix.makeTranslation(
          Math.cos(angle) * (0.12 + (index % 5) * 0.07),
          1.71 + (index % 3) * 0.035,
          -1.04 + Math.sin(angle) * (0.12 + (index % 5) * 0.07),
        );
        floatingParticles.setMatrixAt(index, matrix);
      }
      floatingParticles.name = 'Floating sawdust particles';
      root.add(floatingParticles);

      const lens = createLabelledButton('Molecular lens: representative, not to scale', {
        color: '#4c1d95',
        width: 2.15,
        height: 0.3,
      });
      lens.position.set(0, 2.45, -1.5);
      root.add(lens);

      const predictionGroup = new THREE.Group();
      const trialGroup = new THREE.Group();
      const rateGroup = new THREE.Group();
      root.add(predictionGroup, trialGroup, rateGroup);
      const targets: InteractiveTargetSpec[] = [];
      substances.forEach((id, index) => {
        (['soluble', 'insoluble'] as const).forEach((prediction, optionIndex) => {
          const button = createLabelledButton(`${id}: ${prediction}`, {
            color: prediction === 'soluble' ? '#047857' : '#9f1239',
            width: 0.85,
            height: 0.24,
          });
          button.position.set(
            -1.55 + index * 0.62,
            0.5 - optionIndex * 0.28,
            -0.36,
          );
          predictionGroup.add(button);
          targets.push({
            id: `${id}::${prediction}`,
            actionId: 'solubility.predict',
            label: `Predict ${id} is ${prediction}`,
            object: button,
          });
        });
        const trial = createLabelledButton(`Test ${id}`, {
          color: '#075985',
          width: 0.85,
          height: 0.26,
        });
        trial.position.set(-1.55 + index * 0.62, 0.4, -0.36);
        trialGroup.add(trial);
        targets.push({
          id,
          actionId: 'solubility.run-fair-trial',
          label: `Run the equal fair trial for ${id}`,
          object: trial,
        });
      });
      (['stirring', 'temperature'] as const).forEach((comparison, index) => {
        const button = createLabelledButton(`Compare ${comparison}`, {
          color: '#6d28d9',
          width: 1.5,
        });
        button.position.set(index === 0 ? -0.9 : 0.9, 0.42, -0.4);
        rateGroup.add(button);
        targets.push({
          id: comparison,
          actionId: 'solubility.compare-rate',
          label: `Compare equal sugar trials by ${comparison}`,
          object: button,
        });
      });

      let stageId = 'predict';
      return {
        targets,
        project(state) {
          const latest = state.lastSubstanceId
            ? state.trials[state.lastSubstanceId]
            : undefined;
          const material = mixture.material as THREE.MeshStandardMaterial;
          material.color.set(phaseColor(latest));
          material.opacity = latest
            ? Math.max(0.42, latest.turbidityPercent / 100)
            : 0.72;
          sediment.visible = Boolean(latest && latest.settledMassG > 0.05);
          upperLayer.visible = Boolean(
            latest &&
              (latest.separatedMassG > 0.05 || latest.floatingMassG > 0.05),
          );
          floatingParticles.visible = latest?.phaseState === 'floating-solid';
          if (latest?.phaseState === 'floating-solid') {
            (upperLayer.material as THREE.MeshStandardMaterial).color.set('#92400e');
          } else {
            (upperLayer.material as THREE.MeshStandardMaterial).color.set('#facc15');
          }
        },
        applySnapshot(snapshot) {
          stageId = snapshot.stageId;
          predictionGroup.visible = stageId === 'predict';
          trialGroup.visible = stageId === 'fair-test';
          rateGroup.visible = stageId === 'investigate-rate';
        },
        focusTarget() {
          if (stageId === 'fair-test') return trialGroup;
          if (stageId === 'investigate-rate') return rateGroup;
          return predictionGroup;
        },
      };
    },
  });
}

export default createSolubilitySceneAdapter();
