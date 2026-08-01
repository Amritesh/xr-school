import * as THREE from 'three';
import type {
  ShapeId,
  ShapeSortingState,
} from '@xr-school/simulation-runtime';
import { SHAPE_ITEMS } from '@xr-school/simulation-runtime';
import {
  createLabelledButton,
  createProjectableSceneAdapter,
  type InteractiveTargetSpec,
} from './sceneKit';

const slug = 'c6-ch04-a01-sorting-materials-according-to-their-shape';
const shapeIds: readonly ShapeId[] = ['sphere', 'cylinder', 'cuboid', 'cone'];
const itemIds = Object.keys(SHAPE_ITEMS) as Array<keyof typeof SHAPE_ITEMS>;

function geometryFor(shape: ShapeId): THREE.BufferGeometry {
  if (shape === 'sphere') return new THREE.SphereGeometry(0.13, 16, 10);
  if (shape === 'cylinder') return new THREE.CylinderGeometry(0.1, 0.1, 0.3, 14);
  if (shape === 'cone') return new THREE.ConeGeometry(0.14, 0.32, 14);
  return new THREE.BoxGeometry(0.28, 0.2, 0.16);
}

export function createShapeSortingSceneAdapter() {
  return createProjectableSceneAdapter<ShapeSortingState>({
    id: 'interactive-shape-sorting-scene',
    slug,
    accent: '#f97316',
    build(_context, root) {
      const bins = new Map<ShapeId, THREE.Group>();
      shapeIds.forEach((shape, index) => {
        const bin = new THREE.Group();
        bin.name = `${shape} group`;
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.76, 0.13, 0.62),
          new THREE.MeshStandardMaterial({
            color: ['#2563eb', '#0f766e', '#b45309', '#7e22ce'][index],
            roughness: 0.76,
          }),
        );
        base.position.set(-1.35 + index * 0.9, 0.95, -1.2);
        bin.add(base);
        const label = createLabelledButton(shape, {
          color: ['#1d4ed8', '#0f766e', '#92400e', '#6b21a8'][index],
          width: 0.72,
          height: 0.22,
        });
        label.position.set(-1.35 + index * 0.9, 1.2, -1.2);
        bin.add(label);
        root.add(bin);
        bins.set(shape, bin);
      });

      const objectMeshes = new Map<string, THREE.Mesh>();
      itemIds.forEach((id, index) => {
        const item = SHAPE_ITEMS[id];
        const mesh = new THREE.Mesh(
          geometryFor(item.shape),
          new THREE.MeshStandardMaterial({
            color: `hsl(${28 + index * 37}, 68%, 54%)`,
            roughness: 0.58,
          }),
        );
        mesh.name = item.label;
        mesh.userData.accessibilityLabel = `${item.label}: ${item.clue}`;
        mesh.position.set(-1.55 + (index % 4) * 1.02, 1.72 + Math.floor(index / 4) * 0.43, -1.05);
        root.add(mesh);
        objectMeshes.set(id, mesh);
      });

      const sortGroup = new THREE.Group();
      sortGroup.name = 'shape-sorting-choices';
      root.add(sortGroup);
      const targets: InteractiveTargetSpec[] = [];
      itemIds.forEach((id, itemIndex) => {
        shapeIds.forEach((shape, shapeIndex) => {
          const button = createLabelledButton(`${id} → ${shape}`, {
            color: '#334155',
            width: 0.76,
            height: 0.19,
          });
          button.position.set(
            -1.52 + shapeIndex * 1.02,
            0.61 - itemIndex * 0.105,
            -0.38,
          );
          sortGroup.add(button);
          targets.push({
            id: `${id}::${shape}`,
            actionId: 'shape.assign',
            label: `Place ${SHAPE_ITEMS[id].label} in the ${shape} group`,
            object: button,
          });
        });
      });

      let stageId = 'sort';
      return {
        targets,
        project(state) {
          itemIds.forEach((id, index) => {
            const mesh = objectMeshes.get(id)!;
            const assignment = state.assignments[id];
            if (!assignment) {
              mesh.position.set(
                -1.55 + (index % 4) * 1.02,
                1.72 + Math.floor(index / 4) * 0.43,
                -1.05,
              );
              return;
            }
            const shapeIndex = shapeIds.indexOf(assignment);
            const peerIndex = itemIds
              .filter(peer => state.assignments[peer] === assignment)
              .indexOf(id);
            mesh.position.set(
              -1.48 + shapeIndex * 0.9 + peerIndex * 0.24,
              1.08,
              -1.18,
            );
          });
        },
        applySnapshot(snapshot) {
          stageId = snapshot.stageId;
          sortGroup.visible = stageId === 'sort';
        },
        focusTarget() {
          return stageId === 'sort' ? sortGroup : bins.get('cuboid');
        },
      };
    },
  });
}

export default createShapeSortingSceneAdapter();
