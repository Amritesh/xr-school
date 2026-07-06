import * as THREE from 'three';
import { litmusColor, universalIndicatorColor } from './acidBaseChemistry';

export interface AcidBaseSceneConfig {
  scene: THREE.Scene;
}

const ACID_PH = 2;
const BASE_PH = 12;
const NEUTRAL_PH = 7;
const SCALE_LEFT = -1.4;
const SCALE_RIGHT = 1.4;

function phToScaleX(ph: number) {
  return SCALE_LEFT + (SCALE_RIGHT - SCALE_LEFT) * (Math.min(14, Math.max(0, ph)) / 14);
}

export function createAcidBaseScene(config: AcidBaseSceneConfig) {
  const root = new THREE.Group();
  root.name = 'acid-base-production-world';
  config.scene.add(root);

  const owned: THREE.Material[] = [];
  const std = (params: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(params);
    owned.push(m);
    return m;
  };
  const basic = (color: THREE.ColorRepresentation) => {
    const m = new THREE.MeshBasicMaterial({ color });
    owned.push(m);
    return m;
  };

  const glassMat = std({ color: '#cfe9f5', transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.0 });
  const solutionMat = std({ color: '#bfe3ff', transparent: true, opacity: 0.78, roughness: 0.3, emissive: '#0b2233', emissiveIntensity: 0.15 });
  const redPaperMat = std({ color: '#dc2626', roughness: 0.85 });
  const bluePaperMat = std({ color: '#2563eb', roughness: 0.85 });
  const metalMat = std({ color: '#94a3b8', roughness: 0.4, metalness: 0.6 });
  const boardMat = std({ color: '#1e293b', roughness: 0.7 });
  const markerMat = std({ color: '#f8fafc', emissive: '#64748b', emissiveIntensity: 0.4, roughness: 0.5 });

  // ── Beaker + solution ────────────────────────────────────────────────
  const beaker = new THREE.Group();
  beaker.name = 'beaker';
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.46, 0.92, 32, 1, true), glassMat);
  glass.position.y = 0.5;
  const glassBase = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 32), glassMat);
  glassBase.position.y = 0.05;
  const solution = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.43, 0.62, 32), solutionMat);
  solution.name = 'solution';
  solution.position.y = 0.38;
  beaker.add(glass, glassBase, solution);
  beaker.position.set(0, 0, 0);

  // ── Litmus strips (the two clickable "tests") ────────────────────────
  const redLitmus = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.02), redPaperMat);
  redLitmus.name = 'red-litmus';
  redLitmus.position.set(-0.78, 0.85, 0.28);
  const blueLitmus = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.02), bluePaperMat);
  blueLitmus.name = 'blue-litmus';
  blueLitmus.position.set(-0.55, 0.85, 0.42);

  // ── Indicator dropper ────────────────────────────────────────────────
  const dropper = new THREE.Group();
  dropper.name = 'indicator-dropper';
  const dropperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 16), std({ color: '#22c55e', roughness: 0.4, emissive: '#14532d', emissiveIntensity: 0.4 }));
  const dropperTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 12), metalMat);
  dropperTip.position.y = -0.19;
  dropper.add(dropperBody, dropperTip);
  dropper.position.set(0.72, 1.15, 0.25);

  // ── Base burette (neutraliser) ───────────────────────────────────────
  const burette = new THREE.Group();
  burette.name = 'base-burette';
  const buretteTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 16), std({ color: '#22d3ee', transparent: true, opacity: 0.6, roughness: 0.3 }));
  const buretteTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 12), metalMat);
  buretteTip.position.y = -0.29;
  burette.add(buretteTube, buretteTip);
  burette.position.set(0, 1.35, -0.05);

  // ── pH scale bar with a live marker ──────────────────────────────────
  const phScale = new THREE.Group();
  phScale.name = 'ph-scale';
  const segWidth = (SCALE_RIGHT - SCALE_LEFT) / 14;
  for (let i = 0; i < 14; i += 1) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segWidth * 0.94, 0.12, 0.05), basic(universalIndicatorColor(i + 0.5)));
    seg.position.set(SCALE_LEFT + segWidth * (i + 0.5), 0, 0);
    phScale.add(seg);
  }
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), markerMat);
  marker.name = 'ph-marker';
  marker.rotation.x = Math.PI; // point down at the bar
  marker.position.set(phToScaleX(ACID_PH), 0.14, 0);
  phScale.add(marker);
  phScale.position.set(0, 0.12, 1.0);

  // ── Comparison board ─────────────────────────────────────────────────
  const comparisonBoard = new THREE.Group();
  comparisonBoard.name = 'comparison-board';
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.02), boardMat);
  comparisonBoard.add(panel);
  for (const [i, ph] of [ACID_PH, NEUTRAL_PH, BASE_PH].entries()) {
    const chip = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), basic(universalIndicatorColor(ph)));
    chip.position.set((i - 1) * 0.15, 0.02, 0.012);
    comparisonBoard.add(chip);
  }
  comparisonBoard.position.set(1.45, 0.7, -0.2);

  root.add(beaker, redLitmus, blueLitmus, dropper, burette, phScale, comparisonBoard);

  // ── State ────────────────────────────────────────────────────────────
  let ph = ACID_PH;
  let targetPh = ACID_PH;
  let indicatorAdded = false;
  let litmusDipped = false;
  const litmusRestY = 0.85;
  const litmusDipY = 0.55;

  const solutionColor = new THREE.Color();
  const paleAcid = new THREE.Color('#bfe3ff');

  function refresh() {
    if (indicatorAdded) {
      solutionColor.set(universalIndicatorColor(ph));
      solutionMat.color.lerp(solutionColor, 0.5);
      solutionMat.opacity = 0.85;
    } else {
      solutionMat.color.lerp(paleAcid, 0.3);
      solutionMat.opacity = 0.72;
    }
    if (litmusDipped) {
      (redLitmus.material as THREE.MeshStandardMaterial).color.set(litmusColor(ph, 'red'));
      (blueLitmus.material as THREE.MeshStandardMaterial).color.set(litmusColor(ph, 'blue'));
    }
    marker.position.x += (phToScaleX(ph) - marker.position.x) * 0.2;
  }

  function dipLitmus(dip: boolean) {
    litmusDipped = dip;
    const y = dip ? litmusDipY : litmusRestY;
    redLitmus.position.y += (y - redLitmus.position.y);
    blueLitmus.position.y += (y - blueLitmus.position.y);
    if (!dip) {
      (redLitmus.material as THREE.MeshStandardMaterial).color.set('#dc2626');
      (blueLitmus.material as THREE.MeshStandardMaterial).color.set('#2563eb');
    }
  }

  function testAcidLitmus() { targetPh = ACID_PH; ph = ACID_PH; dipLitmus(true); }
  function testBaseLitmus() { targetPh = BASE_PH; ph = BASE_PH; dipLitmus(true); }
  function addIndicator() { indicatorAdded = true; }
  function addBase() { targetPh = NEUTRAL_PH; }
  function compareSolutions() { indicatorAdded = true; }

  function update(deltaSeconds: number) {
    const t = Math.min(1, deltaSeconds * 1.6);
    ph += (targetPh - ph) * t;
    refresh();
  }

  let stage = 0;
  function setStage(nextStage: number) {
    stage = Math.max(0, Math.min(4, nextStage));
    if (stage === 0) { ph = ACID_PH; targetPh = ACID_PH; indicatorAdded = false; dipLitmus(false); }
    else if (stage === 1) { ph = BASE_PH; targetPh = BASE_PH; indicatorAdded = false; dipLitmus(false); }
    else if (stage === 2) { ph = ACID_PH; targetPh = ACID_PH; indicatorAdded = true; dipLitmus(false); }
    else if (stage === 3) { ph = ACID_PH; targetPh = ACID_PH; indicatorAdded = true; dipLitmus(false); }
    else { ph = NEUTRAL_PH; targetPh = NEUTRAL_PH; indicatorAdded = true; dipLitmus(false); }
    refresh();
  }
  setStage(0);

  function dispose() {
    config.scene.remove(root);
    root.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    for (const m of owned) m.dispose();
  }

  return {
    root,
    beaker,
    redLitmus,
    blueLitmus,
    dropper,
    burette,
    phScale,
    comparisonBoard,
    setStage,
    update,
    testAcidLitmus,
    testBaseLitmus,
    addIndicator,
    addBase,
    compareSolutions,
    getPh: () => ph,
    dispose,
  };
}

export type AcidBaseScene = ReturnType<typeof createAcidBaseScene>;
