import * as THREE from "three";
import {
  COLOUR_ADVENTURE_COLOURS,
  COLOUR_MEMORY_QUESTIONS,
  canFinishColourMemory,
  colourMemoryActionId,
  getActiveColourQuestion,
  getColourMemoryScore,
  type ColourAdventureProgress,
} from "./colourAdventureLesson";

/** Large, stationary cards: no tiny repeated course heading on every object. */
export function makeColourPanel(
  title: string,
  detail = "",
  accent = "#c4b5fd",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 240;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#171630";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accent;
  context.lineWidth = 5;
  context.strokeRect(4, 4, 760, 232);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  let size = detail ? 42 : 60;
  do {
    context.font = `700 ${size--}px sans-serif`;
  } while (context.measureText(title).width > 716 && size > 24);
  context.fillText(title, 384, detail ? 72 : 141);
  if (detail) {
    context.fillStyle = "#e2ddf7";
    context.font = "27px sans-serif";
    const words = detail.split(" ");
    let line = "";
    let y = 130;
    for (const word of words) {
      if (context.measureText(`${line} ${word}`).width > 708) {
        context.fillText(line, 384, y);
        y += 36;
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    context.fillText(line, 384, y);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.5),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
}

/** Recognisable, lightweight teaching models; no external asset dependency. */
export function createColourSpecimen(name: string) {
  const group = new THREE.Group();
  group.name = `colour-specimen-${name.toLowerCase()}`;
  const add = (
    geometry: THREE.BufferGeometry,
    colour: number,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: colour, roughness: 0.65 }),
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const ball = (colour: number, radius: number, x = 0, y = 0, z = 0) =>
    add(new THREE.SphereGeometry(radius, 24, 16), colour, x, y, z);
  const leaf = (x: number, y: number) => {
    const mesh = ball(0x348546, 0.15, x, y);
    mesh.scale.set(1.5, 0.35, 0.5);
    mesh.rotation.z = 0.4;
  };
  const cloud = (scale = 1, y = 0) => {
    [
      [-0.32, 0, 0.22],
      [-0.1, 0.1, 0.3],
      [0.19, 0.08, 0.27],
      [0.39, 0, 0.19],
    ].forEach(([x, dy, radius]) => {
      ball(0xffffff, radius * scale, x * scale, y + dy * scale).scale.z = 0.6;
    });
  };
  switch (name) {
    case "Apple":
      ball(0xe83a40, 0.32, -0.11).scale.y = 1.05;
      ball(0xe83a40, 0.32, 0.11).scale.y = 1.05;
      add(
        new THREE.CylinderGeometry(0.035, 0.045, 0.22, 8),
        0x765239,
        0,
        0.37,
      ).rotation.z = -0.15;
      leaf(0.15, 0.42);
      break;
    case "Banana": {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.48, 0.18, 0),
        new THREE.Vector3(0, -0.62, 0),
        new THREE.Vector3(0.46, 0.25, 0),
      );
      add(new THREE.TubeGeometry(curve, 28, 0.105, 12, false), 0xffd631);
      ball(0x71502a, 0.065, -0.48, 0.18);
      ball(0x71502a, 0.06, 0.46, 0.25);
      group.rotation.z = 0.12;
      break;
    }
    case "Grass":
      add(new THREE.CylinderGeometry(0.47, 0.43, 0.1, 24), 0x6d4b31, 0, -0.25);
      for (let i = 0; i < 16; i++) {
        const blade = add(
          new THREE.ConeGeometry(0.042, 0.48 + (i % 4) * 0.1, 4),
          0x30a34b,
          Math.sin(i * 2.4) * 0.35,
          0.02,
          Math.cos(i * 2.4) * 0.18,
        );
        blade.rotation.z = Math.sin(i) * 0.3;
      }
      break;
    case "Sun":
      ball(0xffd429, 0.29);
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const ray = add(
          new THREE.ConeGeometry(0.055, 0.18, 8),
          0xffd429,
          Math.sin(angle) * 0.44,
          Math.cos(angle) * 0.44,
        );
        ray.rotation.z = -angle;
      }
      break;
    case "Cloud":
      cloud();
      break;
    case "Grapes":
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4 - row; col++)
          ball(
            0x8b46c5,
            0.145,
            (col - (3 - row) / 2) * 0.23,
            0.3 - row * 0.21,
            (col % 2) * 0.045,
          );
      }
      add(new THREE.CylinderGeometry(0.025, 0.035, 0.15, 8), 0x655131, 0, 0.48);
      leaf(0.18, 0.48);
      break;
    case "Chocolate":
      add(new THREE.BoxGeometry(0.85, 0.53, 0.1), 0x4e2b1c);
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 3; col++) {
          add(
            new THREE.BoxGeometry(0.25, 0.22, 0.09),
            0x825137,
            (col - 1) * 0.275,
            (row - 0.5) * 0.25,
            0.075,
          );
        }
      group.rotation.set(-0.1, -0.12, 0.12);
      break;
    case "Sky":
      add(new THREE.PlaneGeometry(1.15, 0.8), 0x4d9fea, 0, 0, -0.12);
      cloud(0.55, -0.18);
      for (const x of [-0.61, 0.61])
        add(new THREE.BoxGeometry(0.065, 0.91, 0.08), 0xf1ede2, x);
      for (const y of [-0.44, 0.44])
        add(new THREE.BoxGeometry(1.28, 0.065, 0.08), 0xf1ede2, 0, y);
      break;
    case "Pumpkin":
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        ball(
          0xf18526,
          0.26,
          Math.cos(angle) * 0.17,
          0,
          Math.sin(angle) * 0.17,
        ).scale.set(0.8, 1.15, 0.8);
      }
      add(new THREE.CylinderGeometry(0.06, 0.08, 0.17, 10), 0x497342, 0, 0.35);
      break;
    case "Snow":
      ball(0xffffff, 0.48, 0, -0.14).scale.set(1.25, 0.45, 0.65);
      for (let i = 0; i < 6; i++) {
        const x = -0.45 + i * 0.18;
        const y = 0.15 + (i % 3) * 0.13;
        for (let arm = 0; arm < 3; arm++) {
          add(
            new THREE.BoxGeometry(0.14, 0.018, 0.025),
            0xffffff,
            x,
            y,
          ).rotation.z = (arm * Math.PI) / 3;
        }
      }
      break;
    default:
      throw new Error(`Missing colour specimen: ${name}`);
  }
  return group;
}

type PanelFactory = typeof makeColourPanel;

export function createColourMemoryScene(
  parent: THREE.Group,
  panelFactory: PanelFactory = makeColourPanel,
) {
  const targets: THREE.Mesh[] = [];
  const questions = COLOUR_MEMORY_QUESTIONS.map((question) => {
    const root = new THREE.Group();
    root.name = `colour-memory-question-${question.id}`;
    parent.add(root);
    const specimen = createColourSpecimen(question.objectName);
    specimen.position.set(0, 1.52, -0.2);
    root.add(specimen);
    question.optionIds.forEach((colourId, index) => {
      const colour = COLOUR_ADVENTURE_COLOURS.find(
        (item) => item.id === colourId,
      )!;
      const target = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 28, 20),
        new THREE.MeshBasicMaterial({ color: colour.hex }),
      );
      target.name = `colour-choice-${question.id}-${colourId}`;
      target.userData.actionId = colourMemoryActionId(question.id, colourId);
      target.position.set(-1.65 + index * 1.1, 0.65, 0.45);
      const label = panelFactory(colour.name);
      label.scale.set(0.6, 0.6, 0.6);
      label.position.y = -0.29;
      target.add(label);
      root.add(target);
      targets.push(target);
    });
    return { id: question.id, root };
  });
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.8, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x625593 }),
  );
  pedestal.position.set(0, 0.99, -0.2);
  parent.add(pedestal);
  const board = panelFactory("Colour Memory Game");
  board.name = "holographic-memory-check-board";
  board.position.set(0, 2.52, -0.45);
  board.scale.set(2.5, 2, 1);
  parent.add(board);
  const finish = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.25, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x334155 }),
  );
  finish.name = "colour-action-complete-memory-check";
  finish.userData.actionId = "complete-memory-check";
  finish.position.set(0, 0.04, 0.65);
  const finishLabel = panelFactory("Finish");
  finishLabel.scale.set(0.78, 0.45, 1);
  finishLabel.position.z = 0.06;
  finish.add(finishLabel);
  parent.add(finish);
  targets.push(finish);
  let previousBoardText = "";
  function update(progress: ColourAdventureProgress, feedback = "") {
    const question = getActiveColourQuestion(progress);
    for (const item of questions) item.root.visible = item.id === question?.id;
    pedestal.visible = Boolean(question);
    const ready = canFinishColourMemory(progress);
    finish.userData.disabled = !ready;
    finish.material.color.set(ready ? 0x22c55e : 0x334155);
    finishLabel.material.opacity = ready ? 1 : 0.45;
    finishLabel.material.transparent = true;
    const score = getColourMemoryScore(progress);
    const title = question?.prompt ?? "All ten objects matched!";
    const detail = `${score.correct} / ${score.total} matched. ${feedback || (ready ? "Select Finish, then Next." : "Point at the matching colour and select.")}`;
    const key = title + detail;
    if (key !== previousBoardText) {
      const fresh = panelFactory(title, detail);
      board.material.map?.dispose();
      board.material.map = fresh.material.map;
      board.material.needsUpdate = true;
      fresh.geometry.dispose();
      fresh.material.dispose();
      previousBoardText = key;
    }
  }
  update({ completedActions: {}, memoryAnswers: {} });
  return { targets, update };
}
