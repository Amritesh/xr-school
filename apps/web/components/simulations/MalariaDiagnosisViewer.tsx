"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Symptoms Are Clues",
    cue: "Recognise fever, chills, headache, tiredness and body aches—but do not diagnose malaria from symptoms alone.",
    detail: "Several illnesses can cause similar symptoms. Suspected malaria needs prompt parasite-based testing by trained health workers.",
    action: "Review the history",
  },
  {
    title: "History and Mosquito Link",
    cue: "Connect fever with exposure in a malaria-risk area and the bite of an infected female Anopheles mosquito.",
    detail: "The mosquito transmits Plasmodium parasites. A mosquito bite or travel history raises suspicion but still does not confirm malaria.",
    action: "Collect a sample safely",
  },
  {
    title: "Professional Blood Collection",
    cue: "Observe a protected health worker station preparing a small blood sample.",
    detail: "Only a trained health worker should collect and handle blood using gloves, sterile single-use equipment and safe sharps disposal.",
    action: "Prepare both films",
  },
  {
    title: "Thick and Thin Blood Films",
    cue: "Prepare two complementary smears from the same sample.",
    detail: "A thick film concentrates parasites for detection. A thin film preserves red-cell detail to help identify the Plasmodium species and estimate the proportion of infected cells.",
    action: "Stain the films",
  },
  {
    title: "Stain and Focus",
    cue: "Apply Giemsa stain, place the prepared slide on the microscope and bring the field into focus.",
    detail: "Staining makes parasite structures easier for a trained microscopist to recognise. Correct preparation and careful examination matter.",
    action: "Begin microscope scan",
  },
  {
    title: "Find the Parasites",
    cue: "Scan the enlarged field and reveal three infected red blood cells.",
    detail: "Malaria is confirmed by finding Plasmodium parasites in the blood. A thick film helps detect them; the thin film helps assess species and parasite density.",
    action: "Reveal parasite 1 of 3",
  },
  {
    title: "Rapid Diagnostic Test",
    cue: "Observe a malaria RDT detect parasite antigens from a small blood sample.",
    detail: "RDTs can provide parasite-based evidence where quality microscopy is not readily available. The control line must appear for a valid test.",
    action: "Interpret the result",
  },
  {
    title: "Act on a Confirmed Result",
    cue: "Send the result to a qualified health professional for prompt interpretation and treatment decisions.",
    detail: "Do not self-diagnose or self-medicate. A positive test needs prompt professional care; persistent symptoms after a negative result need further medical evaluation.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 8, A Treat for Mosquitoes, Activity 1, Diagnosis of Malaria. Fever, chills, headache, tiredness and body aches can suggest malaria, but these symptoms also occur in other illnesses. Symptoms alone cannot confirm malaria. A suspected case needs prompt testing by trained health workers.",
  "A health worker asks about the illness, recent time spent in a malaria-risk area and possible mosquito exposure. Malaria is transmitted when an infected female Anopheles mosquito passes Plasmodium parasites during a bite. Exposure raises suspicion, but laboratory evidence is still required.",
  "A trained health worker collects a small blood sample using gloves and sterile single-use equipment, then disposes of sharps safely. This is a demonstration only. Learners should never collect or handle blood themselves.",
  "Two blood films are prepared from the same patient. The thick film concentrates parasites and is useful for detecting infection. The thin film keeps red blood cells visible, helping an experienced microscopist identify the parasite species and estimate how many cells are infected.",
  "The films are stained, commonly with Giemsa stain, so parasite structures can be seen. The trained microscopist places the slide on the microscope, focuses carefully and examines many fields before reporting a result.",
  "Scan the enlarged blood field. Healthy red blood cells appear as red discs with pale centres. Infected cells can contain purple-stained Plasmodium structures, including small ring forms. Reveal three infected cells to complete the scan.",
  "A malaria rapid diagnostic test, or R D T, detects specific parasite antigens in a small blood sample. It is useful where quality microscopy is not readily available. A visible control line shows that the test worked; the health worker interprets the test line according to the kit instructions.",
  "The diagnosis journey is complete. Suspect malaria from symptoms and exposure, but confirm it with parasite-based testing by microscopy or an approved rapid diagnostic test. A positive result needs prompt professional treatment. If symptoms continue after a negative result, return for further medical evaluation. Never self-medicate.",
];

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) {
  let line = "";
  let currentY = y;
  for (const word of text.split(" ")) {
    const candidate = `${line}${word} `;
    if (line && context.measureText(candidate).width > width) {
      context.fillText(line.trim(), x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else line = candidate;
  }
  if (line) context.fillText(line.trim(), x, currentY);
}

function drawCard(canvas: HTMLCanvasElement, stage: number, parasitesFound: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#142a3a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#38bdf8";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#7dd3fc";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 1  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#dbeafe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 27);
  context.fillStyle = stage === 5 ? "#86efac" : "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(stage === 5 ? `Parasites found: ${parasitesFound}/3` : `Action: ${STAGES[stage].action}`, 24, 245);
}

function makeMosquito() {
  const group = new THREE.Group();
  group.name = "Realistic female Anopheles mosquito";

  const dark = new THREE.MeshStandardMaterial({ color: 0x29221f, roughness: 0.72 });
  const brown = new THREE.MeshStandardMaterial({ color: 0x5b4033, roughness: 0.8 });
  const paleBand = new THREE.MeshStandardMaterial({ color: 0xd8c9a9, roughness: 0.82 });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x090706, roughness: 0.28 });
  const wingMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9eef0,
    transparent: true,
    opacity: 0.42,
    roughness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const veinMaterial = new THREE.MeshBasicMaterial({ color: 0x6f6257, transparent: true, opacity: 0.58 });

  const segmentBetween = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    radius: number,
    material: THREE.Material,
  ) => {
    const direction = to.clone().sub(from);
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.82, direction.length(), 6),
      material,
    );
    segment.position.copy(from).add(to).multiplyScalar(0.5);
    segment.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    return segment;
  };

  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.065, 0.37, 12), brown);
  abdomen.rotation.z = Math.PI / 2;
  abdomen.position.x = 0.11;

  for (const x of [-0.01, 0.065, 0.14, 0.215]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.014, 12), paleBand);
    band.rotation.z = Math.PI / 2;
    band.position.x = x;
    group.add(band);
  }

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), dark);
  thorax.scale.set(1.15, 0.92, 0.9);
  thorax.position.x = -0.13;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), brown);
  head.position.x = -0.255;

  for (const side of [-1, 1]) {
    const compoundEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), eyeMaterial);
    compoundEye.name = "compoundEye";
    compoundEye.position.set(-0.277, 0.012, side * 0.035);
    compoundEye.scale.set(1, 0.9, 0.72);
    group.add(compoundEye);

    const antennaBase = new THREE.Vector3(-0.285, 0.025, side * 0.024);
    const antennaJoint = new THREE.Vector3(-0.39, 0.065, side * 0.085);
    const antennaTip = new THREE.Vector3(-0.49, 0.09, side * 0.15);
    group.add(
      segmentBetween(antennaBase, antennaJoint, 0.004, dark),
      segmentBetween(antennaJoint, antennaTip, 0.0025, dark),
    );

    const palpStart = new THREE.Vector3(-0.285, -0.012, side * 0.018);
    const palpTip = new THREE.Vector3(-0.47, -0.018, side * 0.035);
    group.add(segmentBetween(palpStart, palpTip, 0.004, paleBand));

    const wingPivot = new THREE.Group();
    wingPivot.name = side < 0 ? "leftWing" : "rightWing";
    wingPivot.position.set(-0.12, 0.045, side * 0.045);
    wingPivot.userData.wing = true;
    wingPivot.userData.side = side;

    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), wingMaterial);
    wing.scale.set(1.65, 0.52, 1);
    wing.rotation.x = Math.PI / 2;
    wing.rotation.z = side * -0.18;
    wing.position.set(0.09, 0, side * 0.16);
    wingPivot.add(wing);

    for (const veinOffset of [-0.045, 0, 0.045]) {
      const vein = segmentBetween(
        new THREE.Vector3(0.005, 0.003, 0),
        new THREE.Vector3(0.27, 0.003, side * (0.13 + veinOffset)),
        0.002,
        veinMaterial,
      );
      vein.name = "wingVein";
      wingPivot.add(vein);
    }
    group.add(wingPivot);
  }

  const proboscis = segmentBetween(
    new THREE.Vector3(-0.292, -0.005, 0),
    new THREE.Vector3(-0.59, -0.012, 0),
    0.0045,
    dark,
  );
  proboscis.name = "longProboscis";

  const legOrigins = [-0.19, -0.12, -0.045];
  const legSweep = [-0.17, 0.015, 0.2];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      const hip = new THREE.Vector3(legOrigins[index], -0.035, side * 0.047);
      const knee = new THREE.Vector3(
        legOrigins[index] + legSweep[index] * 0.48,
        -0.16,
        side * (0.21 + index * 0.025),
      );
      const ankle = new THREE.Vector3(
        legOrigins[index] + legSweep[index],
        -0.285,
        side * (0.43 + index * 0.045),
      );
      const foot = new THREE.Vector3(
        ankle.x + legSweep[index] * 0.25,
        -0.31,
        ankle.z + side * 0.12,
      );
      const upperLeg = segmentBetween(hip, knee, 0.005, brown);
      const lowerLeg = segmentBetween(knee, ankle, 0.0038, dark);
      const tarsus = segmentBetween(ankle, foot, 0.0024, paleBand);
      upperLeg.name = "segmentedLeg";
      group.add(upperLeg, lowerLeg, tarsus);
    }
  }

  group.add(abdomen, thorax, head, proboscis);
  group.scale.setScalar(2.05);
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.name.includes("Wing")) child.castShadow = true;
  });
  return group;
}

function makeMicroscope() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x263746, metalness: 0.45, roughness: 0.36 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 0.15, roughness: 0.42 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.72), dark);
  base.position.y = 0.68;
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 12, 28, Math.PI * 1.35), pale);
  arm.rotation.y = Math.PI / 2;
  arm.rotation.z = -0.15;
  arm.position.set(0.04, 1.25, 0);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.68, 16), dark);
  tube.position.set(-0.06, 1.72, 0);
  tube.rotation.z = -0.22;
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 16), dark);
  eyepiece.position.set(-0.14, 2.16, 0);
  eyepiece.rotation.z = -0.22;
  const stage = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.66), dark);
  stage.position.y = 1.09;
  const light = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.7 }),
  );
  light.position.y = 0.91;
  group.add(base, arm, tube, eyepiece, stage, light);
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return group;
}

export default function MalariaDiagnosisViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const stageStartRef = useRef(0);
  const parasitesFoundRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [parasitesFound, setParasitesFound] = useState(0);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr
        ?.isSessionSupported?.("immersive-vr")
        .then(setVrSupported)
        .catch(() => setVrSupported(false));
    }
  }, []);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    stageStartRef.current = performance.now() / 1000;
    if (safeStage !== 5) {
      parasitesFoundRef.current = 0;
      setParasitesFound(0);
    }
    setStage(safeStage);
    cardNeedsUpdateRef.current = true;
    playNarration(NARRATIONS[safeStage]);
  }, []);

  const performAction = useCallback(() => {
    if (stageRef.current === 5 && parasitesFoundRef.current < 3) {
      parasitesFoundRef.current += 1;
      setParasitesFound(parasitesFoundRef.current);
      cardNeedsUpdateRef.current = true;
      return;
    }
    if (stageRef.current < STAGES.length - 1) goToStage(stageRef.current + 1);
  }, [goToStage]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xc7d8e5, 18, 38);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/malaria-diagnosis-lab-360.png",
      { exposure: 0.99, intensity: 0.44 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 72);
    camera.position.set(0, 2.05, 5.3);
    camera.lookAt(0, 1.2, 0);
    scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x425466, 1.72));
    const light = new THREE.DirectionalLight(0xffffff, 2.05);
    light.position.set(-4, 7, 4);
    light.castShadow = true;
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: 0x718392, roughness: 0.9, transparent: true, opacity: 0.65 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.18, 2.25),
      new THREE.MeshStandardMaterial({ color: 0x607785, metalness: 0.12, roughness: 0.48 }),
    );
    bench.position.y = 0.62;
    bench.castShadow = true;
    bench.receiveShadow = true;
    scene.add(bench);

    const symptomGroup = new THREE.Group();
    const symptomColors = [0xef4444, 0x60a5fa, 0xf59e0b, 0xa78bfa, 0x34d399];
    for (let index = 0; index < 5; index++) {
      const icon = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 20, 14),
        new THREE.MeshStandardMaterial({ color: symptomColors[index], roughness: 0.55, emissive: symptomColors[index], emissiveIntensity: 0.12 }),
      );
      icon.position.set(-1.45 + index * 0.72, 1.32, 0);
      icon.userData.phase = index * 0.7;
      symptomGroup.add(icon);
    }
    scene.add(symptomGroup);

    const mosquito = makeMosquito();
    mosquito.position.set(0, 1.85, 0);
    mosquito.visible = false;
    scene.add(mosquito);

    const sampleStation = new THREE.Group();
    const glove = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 20, 12),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.66 }),
    );
    glove.scale.set(1.5, 0.36, 0.85);
    glove.position.set(-0.6, 0.91, 0);
    const sampleTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.72, 18),
      new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.55, roughness: 0.18, transmission: 0.25 }),
    );
    sampleTube.position.set(0.15, 1.03, 0);
    const tubeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.12, 18),
      new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.45 }),
    );
    tubeCap.position.set(0.15, 1.45, 0);
    const sampleDrop = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.42 }),
    );
    sampleDrop.scale.y = 1.35;
    sampleDrop.position.set(0.15, 0.83, 0);
    const sharpsBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.62, 0.48),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.58 }),
    );
    sharpsBox.position.set(0.85, 1.02, 0);
    sampleStation.add(glove, sampleTube, tubeCap, sampleDrop, sharpsBox);
    sampleStation.visible = false;
    scene.add(sampleStation);

    const films = new THREE.Group();
    for (const [index, x] of [-0.65, 0.65].entries()) {
      const slide = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.05, 0.42),
        new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.58, roughness: 0.13, transmission: 0.35 }),
      );
      slide.position.set(x, 0.78, 0);
      const film = new THREE.Mesh(
        index === 0 ? new THREE.CircleGeometry(0.16, 24) : new THREE.PlaneGeometry(0.62, 0.22),
        new THREE.MeshBasicMaterial({ color: 0xbe123c, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
      );
      film.rotation.x = -Math.PI / 2;
      film.position.set(x, 0.82, 0);
      if (index === 1) film.rotation.z = -0.08;
      films.add(slide, film);
    }
    films.visible = false;
    scene.add(films);

    const stainDrops: THREE.Mesh[] = [];
    for (let index = 0; index < 16; index++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 7),
        new THREE.MeshBasicMaterial({ color: 0x6d28d9, transparent: true, opacity: 0.8 }),
      );
      drop.userData.offset = index / 16;
      drop.visible = false;
      scene.add(drop);
      stainDrops.push(drop);
    }

    const microscope = makeMicroscope();
    microscope.position.set(0, 0, 0);
    microscope.visible = false;
    scene.add(microscope);

    const field = new THREE.Group();
    const fieldDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.18, 64),
      new THREE.MeshBasicMaterial({ color: 0xfef2f2, side: THREE.DoubleSide }),
    );
    fieldDisc.position.set(0, 1.58, -0.1);
    field.add(fieldDisc);
    const infectedIndices = [2, 8, 14];
    const parasiteRings: THREE.Mesh[] = [];
    for (let index = 0; index < 18; index++) {
      const angle = index * 2.399;
      const radius = 0.22 + (index % 5) * 0.17;
      const cell = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.035, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0xef7777, roughness: 0.65 }),
      );
      cell.position.set(Math.cos(angle) * radius, 1.58 + Math.sin(angle) * radius, 0);
      field.add(cell);
      if (infectedIndices.includes(index)) {
        const parasite = new THREE.Mesh(
          new THREE.TorusGeometry(0.045, 0.014, 8, 18),
          new THREE.MeshStandardMaterial({ color: 0x6d28d9, emissive: 0x6d28d9, emissiveIntensity: 0.35 }),
        );
        parasite.position.copy(cell.position);
        parasite.position.z = 0.05;
        parasite.visible = false;
        field.add(parasite);
        parasiteRings.push(parasite);
      }
    }
    field.position.set(0, 0, 0);
    field.visible = false;
    scene.add(field);

    const rdt = new THREE.Group();
    const cassette = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.16, 0.82),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 }),
    );
    cassette.position.y = 0.79;
    const sampleWell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.025, 20),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 }),
    );
    sampleWell.position.set(-0.72, 0.88, 0);
    const windowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.03, 0.31),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }),
    );
    windowMesh.position.set(0.43, 0.89, 0);
    const controlLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 0.26),
      new THREE.MeshBasicMaterial({ color: 0xbe123c }),
    );
    controlLine.position.set(0.63, 0.92, 0);
    const testLine = controlLine.clone();
    testLine.position.x = 0.28;
    rdt.add(cassette, sampleWell, windowMesh, controlLine, testLine);
    rdt.visible = false;
    scene.add(rdt);

    const resultPath = new THREE.Group();
    const positive = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x16a34a, emissiveIntensity: 0.18 }),
    );
    positive.position.set(-0.75, 0.78, 0);
    const clinician = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.78, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.72 }),
    );
    clinician.position.set(0.75, 1.23, 0);
    resultPath.add(positive, clinician);
    resultPath.visible = false;
    scene.add(resultPath);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 1.11), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.42, 2.82, -1.95);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.12, -1.56);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.82);
    const actionButton = makeButton("btn-action", 0x0284c7, 0);
    actionButton.scale.x = 1.35;
    const nextButton = makeButton("btn-next", 0x2563eb, 0.82);
    const interactables = [previousButton, actionButton, nextButton];
    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (!hit) return;
      if (hit.object.name === "btn-action") performAction();
      else if (hit.object.name === "btn-previous") goToStage(stageRef.current - 1);
      else goToStage(stageRef.current + 1);
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.9;
      controller.add(ray);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: performAction,
      onBack: () => goToStage(stageRef.current - 1),
      onNarrate: () => playNarration(NARRATIONS[stageRef.current]),
      startPosition: new THREE.Vector3(0, 0, 2.55),
    });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.18, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.8;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const currentStage = stageRef.current;
      const stageAge = Math.max(0, performance.now() / 1000 - stageStartRef.current);
      questVr.update();
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage, parasitesFoundRef.current);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      symptomGroup.visible = currentStage === 0;
      symptomGroup.children.forEach((icon) => {
        icon.position.y = 1.32 + Math.sin(elapsed * 1.7 + (icon.userData.phase as number)) * 0.07;
      });
      mosquito.visible = currentStage === 1;
      if (mosquito.visible) {
        const mosquitoX = Math.sin(elapsed * 0.95) * 0.82 + Math.sin(elapsed * 2.3) * 0.17;
        const mosquitoY = 1.73 + Math.sin(elapsed * 1.55) * 0.15 + Math.sin(elapsed * 4.1) * 0.035;
        const mosquitoZ = Math.cos(elapsed * 0.77) * 0.38 + Math.sin(elapsed * 1.9) * 0.11;
        const velocityX = Math.cos(elapsed * 0.95) * 0.779 + Math.cos(elapsed * 2.3) * 0.391;
        const velocityY = Math.cos(elapsed * 1.55) * 0.233 + Math.cos(elapsed * 4.1) * 0.144;
        const velocityZ = -Math.sin(elapsed * 0.77) * 0.293 + Math.cos(elapsed * 1.9) * 0.209;
        mosquito.position.set(mosquitoX, mosquitoY, mosquitoZ);
        mosquito.rotation.y = Math.atan2(-velocityZ, velocityX);
        mosquito.rotation.z = Math.atan2(velocityY, Math.hypot(velocityX, velocityZ)) * 0.42;
        mosquito.children.forEach((child) => {
          if (child.userData.wing) {
            child.rotation.x = Math.sin(elapsed * 46) * 0.9 * (child.userData.side as number);
          }
        });
      }
      sampleStation.visible = currentStage === 2;
      films.visible = currentStage === 3 || currentStage === 4;
      stainDrops.forEach((drop, index) => {
        drop.visible = currentStage === 4;
        if (drop.visible) {
          const fall = (stageAge * 0.48 + (drop.userData.offset as number)) % 1;
          drop.position.set(index % 2 ? 0.65 : -0.65, 2.15 - fall * 1.27, (index % 3 - 1) * 0.05);
          drop.scale.setScalar(1 - fall * 0.45);
        }
      });
      microscope.visible = currentStage === 4;
      field.visible = currentStage === 5;
      parasiteRings.forEach((parasite, index) => {
        parasite.visible = currentStage === 5 && index < parasitesFoundRef.current;
        if (parasite.visible) {
          const pulse = 1 + Math.sin(elapsed * 4 + index) * 0.15;
          parasite.scale.setScalar(pulse);
        }
      });
      rdt.visible = currentStage === 6;
      controlLine.visible = currentStage === 6 && stageAge > 0.8;
      testLine.visible = currentStage === 6 && stageAge > 1.65;
      resultPath.visible = currentStage === 7;
      if (resultPath.visible) positive.rotation.y += 0.008;
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawCard(cardCanvas, 0, 0);
    cardTexture.needsUpdate = true;
    stageStartRef.current = performance.now() / 1000;

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);
    return () => {
      renderer.setAnimationLoop(null);
      controllers.forEach((controller) => controller.removeEventListener("selectstart", onControllerSelect as any));
      controls.dispose();
      questVr.dispose();
      realisticEnvironment.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [goToStage, performAction]);

  const enterVR = useCallback(async () => {
    const xr = (navigator as Navigator & { xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> } }).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      window.setTimeout(() => playNarration(NARRATIONS[stageRef.current]), 900);
    } catch {
      setVrSupported(false);
    }
  }, []);

  const actionLabel = stage === 5 && parasitesFound < 3
    ? `🔬 Reveal parasite ${parasitesFound + 1} of 3`
    : STAGES[stage].action;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#142a3a" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #075985 0%, #142a3a 76%)" }}>
          <div style={{ maxWidth: 680, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🦟🔬🩸</div>
            <div style={{ margin: "14px 0 10px", color: "#7dd3fc", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 8 • Activity 1
            </div>
            <h1 style={{ color: "#f0f9ff", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              Diagnosis of Malaria
            </h1>
            <p style={{ color: "#dbeafe", lineHeight: 1.7 }}>
              Follow a safe professional diagnosis from symptoms and exposure through blood films, microscope examination and rapid testing.
            </p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}
              <button onClick={() => { setStarted(true); playNarration(NARRATIONS[0]); }} style={secondaryButtonStyle}>💻 View in Browser</button>
            </div>
          </div>
        </div>
      )}
      {started && (
        <>
          <aside style={{ position: "absolute", top: 70, right: 16, width: 365, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(20,42,58,0.95)", border: "1px solid rgba(56,189,248,0.42)", color: "#f0f9ff", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#7dd3fc", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 1 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", marginBottom: 13 }}>
              <div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div>
            </div>
            <button onClick={performAction} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1 }}>
              {actionLabel}
            </button>
            {stage === 5 && (
              <div role="status" style={{ marginTop: 10, color: parasitesFound === 3 ? "#86efac" : "#fde68a", textAlign: "center", fontSize: "0.82rem" }}>
                Parasites identified: {parasitesFound}/3
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => goToStage(stage + 1)} disabled={stage === STAGES.length - 1} style={navButtonStyle}>Next →</button>
            </div>
            <button onClick={() => playNarration(NARRATIONS[stage])} style={secondaryButtonStyle}>🔊 Replay narration</button>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#dbeafe", fontSize: "0.75rem" }}>
            Quest: trigger selects • A advances/scans • B/right grip exits VR • Y goes back • joysticks move and turn
          </div>
        </>
      )}
    </div>
  );
}

const primaryButtonStyle = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(135deg, #0284c7, #0369a1)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(56,189,248,0.42)",
  background: "rgba(56,189,248,0.1)",
  color: "#dbeafe",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#dbeafe",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#dbeafe",
  cursor: "pointer",
} as const;
