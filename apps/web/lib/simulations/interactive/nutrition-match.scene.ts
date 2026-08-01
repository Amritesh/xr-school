import * as THREE from 'three';
import type {
  NutritionCase,
  NutritionMatchState,
} from '@xr-school/simulation-runtime';
import {
  createLabelledButton,
  createProjectableSceneAdapter,
  type InteractiveTargetSpec,
} from './sceneKit';

interface NutritionSceneOptions {
  id: string;
  slug: string;
  accent: THREE.ColorRepresentation;
  cases: readonly NutritionCase[];
  kind: 'mineral' | 'vitamin';
}

const distractorSource = {
  mineral: 'plain-sugar',
  vitamin: 'plain-rice',
} as const;

const distractorRelation = {
  mineral: 'same-job-for-all',
  vitamin: 'instant-after-one-meal',
} as const;

export function createNutritionMatchSceneAdapter(options: NutritionSceneOptions) {
  return createProjectableSceneAdapter<NutritionMatchState>({
    id: options.id,
    slug: options.slug,
    accent: options.accent,
    build(_context, root) {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(3.75, 1.55, 0.08),
        new THREE.MeshStandardMaterial({ color: '#eff6ff', roughness: 0.82 }),
      );
      board.position.set(0, 1.65, -1.78);
      root.add(board);

      const matchGroup = new THREE.Group();
      matchGroup.name = `${options.kind}-source-and-relation-matches`;
      root.add(matchGroup);
      const statusCards = new Map<string, THREE.Mesh>();
      const targets: InteractiveTargetSpec[] = [];

      options.cases.forEach((nutritionCase, index) => {
        const x =
          options.cases.length === 3
            ? -1.25 + index * 1.25
            : -1.5 + index;
        const card = createLabelledButton(
          options.kind === 'vitamin'
            ? `${nutritionCase.label}: long-term deficiency link`
            : `${nutritionCase.label}: source and body role`,
          { color: '#1e3a5f', width: options.cases.length === 3 ? 1.08 : 0.88, height: 0.3 },
        );
        card.position.set(x, 1.75, -1.69);
        root.add(card);
        statusCards.set(nutritionCase.id, card);

        const sourceId = nutritionCase.acceptedSourceIds[0];
        const correctValue = `${sourceId}::${nutritionCase.acceptedRelationId}`;
        const correct = createLabelledButton(`Link ${nutritionCase.label}`, {
          color: '#047857',
          width: options.cases.length === 3 ? 1.06 : 0.86,
          height: 0.26,
        });
        correct.position.set(x, 0.56, -0.38);
        matchGroup.add(correct);
        targets.push({
          id: `${nutritionCase.id}::${correctValue}`,
          actionId: 'nutrition.submit-match',
          label: `Match ${nutritionCase.label} with ${sourceId} and ${nutritionCase.acceptedRelationId}`,
          object: correct,
        });

        const incorrectValue = `${distractorSource[options.kind]}::${distractorRelation[options.kind]}`;
        const incorrect = createLabelledButton(`Test another link`, {
          color: '#9f1239',
          width: options.cases.length === 3 ? 1.06 : 0.86,
          height: 0.24,
        });
        incorrect.position.set(x, 0.27, -0.38);
        matchGroup.add(incorrect);
        targets.push({
          id: `${nutritionCase.id}::${incorrectValue}`,
          actionId: 'nutrition.submit-match',
          label: `Try an unsupported source and relation for ${nutritionCase.label}`,
          object: incorrect,
        });
      });

      let stageId = 'match';
      return {
        targets,
        project(state) {
          for (const nutritionCase of options.cases) {
            const complete = state.completedIds.includes(nutritionCase.id);
            const card = statusCards.get(nutritionCase.id)!;
            const material = card.material as THREE.MeshStandardMaterial;
            material.emissive.set(complete ? '#16a34a' : '#000000');
            material.emissiveIntensity = complete ? 0.55 : 0;
            card.scale.setScalar(complete ? 1.04 : 1);
          }
        },
        applySnapshot(snapshot) {
          stageId = snapshot.stageId;
          matchGroup.visible = stageId === 'match';
        },
        focusTarget() {
          return stageId === 'match' ? matchGroup : board;
        },
      };
    },
  });
}
