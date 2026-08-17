"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  playNarration,
  stopNarration,
  unlockNarration,
} from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

type EnvironmentName = "control" | "launchpad" | "ascent" | "orbit";

const ENVIRONMENTS: Record<EnvironmentName, string> = {
  control: "/environments/space-shuttle-mission-control-360.jpg",
  launchpad: "/environments/space-shuttle-launchpad-360.jpg",
  ascent: "/environments/space-shuttle-ascent-360.jpg",
  orbit: "/environments/space-shuttle-orbit-360.jpg",
};

const REAL_NASA_VIDEO = {
  title: "STS-135: Final Launch of the Space Shuttle Program",
  youtubeId: "3deA3BXAnHs",
  sourceUrl:
    "https://plus.nasa.gov/video/sts-135-final-launch-of-the-space-shuttle-program/",
  credit: "Historical footage: NASA • STS-135 • 8 July 2011",
};

const STAGES = [
  {
    title: "Mission Briefing",
    zone: "Launch Control",
    environment: "control" as const,
    cue: "Join Flight Director Tara and connect Sunita Williams's journey with the historic Space Shuttle.",
    detail:
      "Sunita Williams first travelled to the International Space Station aboard Discovery on STS-116 in December 2006. The Shuttle programme flew from 1981 to 2011 and is now retired.",
    action: "Accept the launch-learning mission",
  },
  {
    title: "Inspect the Shuttle Stack",
    zone: "Safe Inspection Bay",
    environment: "launchpad" as const,
    cue: "Find the winged orbiter, orange external tank and two white solid rocket boosters.",
    detail:
      "The orbiter carried people and cargo. The external tank supplied propellants to the three main engines. The two boosters supplied most of the thrust at liftoff.",
    action: "Identify all three main parts",
  },
  {
    title: "Crew and Ground Safety",
    zone: "Crew Access Level",
    environment: "launchpad" as const,
    cue: "Verify restraints, pressure suits, communications and the cleared safety boundary.",
    detail:
      "A real launch is handled only by trained crews and large professional teams. Learners operate a supervised simulation from a protected observation position.",
    action: "Complete the safety checklist",
  },
  {
    title: "Weather and Systems Check",
    zone: "Go / No-Go Console",
    environment: "control" as const,
    cue: "Check weather, main engines, boosters, guidance and communications before giving a GO.",
    detail:
      "If any critical system is not ready, launch controllers stop the countdown. Safety is more important than launching on time.",
    action: "Confirm all systems GO",
  },
  {
    title: "Countdown and Ignition",
    zone: "T Minus 10 Seconds",
    environment: "launchpad" as const,
    cue: "Start the supervised countdown. The three main engines ignite first; the solid boosters ignite at zero.",
    detail:
      "At liftoff, hot gases rush downward and the engines push the Shuttle upward. When upward thrust exceeds its weight, the stack accelerates away from Earth.",
    action: "Begin the countdown",
  },
  {
    title: "Liftoff and Tower Clear",
    zone: "Launch Ascent",
    environment: "launchpad" as const,
    cue: "Watch the stack rise, roll and begin curving toward the path needed for orbit.",
    detail:
      "The Shuttle does not fly straight up forever. Its path gradually turns so it gains the sideways speed needed to keep circling Earth.",
    action: "Launch the Shuttle",
  },
  {
    title: "Climb Through Max Q",
    zone: "Upper Atmosphere",
    environment: "ascent" as const,
    cue: "Guide the vehicle through the region of greatest aerodynamic pressure without making sudden turns.",
    detail:
      "Max Q is the period of greatest air-pressure load on the rising vehicle. The engines and flight path are carefully managed to protect the structure.",
    action: "Pass Max Q smoothly",
  },
  {
    title: "Booster Separation",
    zone: "About 2 Minutes",
    environment: "ascent" as const,
    cue: "Release the two empty solid rocket boosters together and track their safe recovery path.",
    detail:
      "The boosters separate about two minutes after liftoff, descend by parachute into the ocean, and were recovered for reuse. The orbiter's main engines keep firing.",
    action: "Separate both boosters",
  },
  {
    title: "Main Engine Cutoff",
    zone: "About 8½ Minutes",
    environment: "ascent" as const,
    cue: "Shut down the main engines and release the nearly empty external tank.",
    detail:
      "The orange tank separates before orbit and breaks up in the atmosphere. Only the winged orbiter continues into orbit; the tank was not recovered for reuse.",
    action: "Separate the external tank",
  },
  {
    title: "Orbit Earth",
    zone: "Low Earth Orbit",
    environment: "orbit" as const,
    cue: "Float beside the orbiter, observe Earth and explain why astronauts feel weightless.",
    detail:
      "The orbiter and everything inside are continuously falling around Earth together. This orbital free fall creates microgravity. The Shuttle later returned and landed like a glider.",
    action: "Complete the orbital mission",
  },
];

const NARRATIONS = [
  "Namaste, young mission specialists! I am Flight Director Tara. Sunita Williams first travelled to the International Space Station aboard Space Shuttle Discovery on mission STS-116 in December 2006. Today, we will explore how a Space Shuttle launch worked. Remember, the Shuttle programme flew from 1981 to 2011 and is now retired. Accept this supervised learning mission when you are ready.",
  "Move close to the model and inspect its three main parts. The white winged vehicle is the orbiter, which carried astronauts and cargo. The large orange cylinder is the external tank, which supplied propellants to the orbiter's three main engines. The two tall white cylinders are solid rocket boosters. They produced most of the thrust needed at liftoff.",
  "Before launch, safety comes first. Check the crew's restraints, pressure suits and communication link. Confirm that the launchpad safety boundary is clear. A real launch is never a classroom experiment. It is managed by highly trained crews, engineers and controllers. Here, you are operating a supervised simulation from a protected observation point.",
  "Mission control now performs a go or no-go poll. Check the weather, the three main engines, both boosters, guidance computers and communication systems. If any critical item is not ready, the countdown must stop. Excellent: every status light is green. The launch team may continue, because safety is always more important than launching on time.",
  "Listen to the final countdown. The orbiter's three main engines ignite first, just before zero. At zero, the two solid rocket boosters ignite and the stack is committed to liftoff. Hot gases rush downward, while the engines push the vehicle upward. When upward thrust becomes greater than the Shuttle's weight, the stack accelerates away from Earth.",
  "Liftoff! Watch the Shuttle clear the tower and begin a carefully planned roll. A spacecraft does not fly straight upward forever. The flight path slowly curves so the orbiter gains tremendous sideways speed. That sideways motion is essential: orbit means continuously falling around Earth while moving fast enough to keep missing the ground.",
  "The Shuttle is climbing through Max Q, the period of greatest aerodynamic pressure on the vehicle. Air is still present, and speed is increasing, so the structure experiences a large load. Flight computers and controllers manage engine power and direction smoothly. Avoid sudden movement and guide the vehicle safely into the thin upper atmosphere.",
  "About two minutes after liftoff, the solid rocket boosters have finished burning. Separate both boosters together. They move away from the stack, descend by parachute and splash into the ocean, where they were recovered for reuse. The orbiter's three main engines continue firing, using propellants supplied by the orange external tank.",
  "Roughly eight and a half minutes after liftoff, the main engines shut down. Release the nearly empty orange external tank. It falls back and breaks up in the atmosphere; it was not recovered for reuse. Notice what remains. Only the winged orbiter continues into orbit with the crew and payload.",
  "Mission accomplished! We are in low Earth orbit above India and the Indian Ocean. The orbiter and everything inside are falling around Earth together, creating the feeling of microgravity. Astronauts are not beyond Earth's gravity. Later, a Space Shuttle re-entered the atmosphere and landed on a runway like a glider. You have completed the full launch sequence.",
];

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
) {
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

function makePanel(
  title: string,
  subtitle: string,
  accent = "#fb923c",
  width = 2.5,
  height = 1,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "rgba(3, 12, 28, 0.96)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = accent;
    context.lineWidth = 12;
    context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    context.fillStyle = accent;
    context.font = "bold 42px sans-serif";
    context.textAlign = "center";
    context.fillText(title, canvas.width / 2, 112);
    context.fillStyle = "#e0f2fe";
    context.font = "27px sans-serif";
    context.textAlign = "left";
    wrapText(context, subtitle, 48, 177, canvas.width - 96, 38);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
}

function drawMissionCard(
  canvas: HTMLCanvasElement,
  stage: number,
  completed: boolean,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const info = STAGES[stage];
  context.fillStyle = "#07152d";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = completed ? "#86efac" : "#fb923c";
  context.lineWidth = 7;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.fillStyle = "#7dd3fc";
  context.font = "bold 22px sans-serif";
  context.fillText(
    `FLIGHT DECK  •  ${stage + 1}/${STAGES.length}  •  ${info.zone}`,
    25,
    40,
  );
  context.fillStyle = "#ffffff";
  context.font = "bold 31px sans-serif";
  context.fillText(info.title, 25, 85);
  context.fillStyle = "#dbeafe";
  context.font = "20px sans-serif";
  wrapText(context, info.cue, 25, 124, canvas.width - 50, 28);
  context.fillStyle = completed ? "#86efac" : "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(
    completed
      ? "✓ COMPLETE — PRESS A AGAIN TO CONTINUE"
      : `ACTION: ${info.action}`,
    25,
    245,
  );
}

function triangleWing(side: -1 | 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.45);
  shape.lineTo(side * 0.95, -0.75);
  shape.lineTo(side * 0.25, 0.45);
  shape.closePath();
  const wing = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  wing.position.z = 0.16;
  return wing;
}

function makeShuttleStack(scale = 1) {
  const stack = new THREE.Group();
  stack.name = "complete Space Shuttle stack";

  const tankMaterial = new THREE.MeshStandardMaterial({
    color: 0xc45a21,
    roughness: 0.76,
  });
  const tank = new THREE.Group();
  tank.name = "orange external tank supplies the three main engines";
  const tankBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 2.55, 28),
    tankMaterial,
  );
  tankBody.position.y = 1.55;
  const tankNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.44, 0.72, 28),
    tankMaterial,
  );
  tankNose.position.y = 3.18;
  tank.add(tankBody, tankNose);

  const boosterMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.48,
  });
  const boosters = new THREE.Group();
  boosters.name = "two white solid rocket boosters provide most liftoff thrust";
  for (const x of [-0.66, 0.66]) {
    const booster = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 2.55, 22),
      boosterMaterial,
    );
    body.position.y = 1.35;
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.48, 22),
      boosterMaterial,
    );
    nose.position.y = 2.86;
    const nozzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.28, 18),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 }),
    );
    nozzle.position.y = -0.06;
    nozzle.rotation.x = Math.PI;
    booster.add(body, nose, nozzle);
    booster.position.x = x;
    booster.userData.side = Math.sign(x);
    booster.userData.homeX = x;
    boosters.add(booster);
  }

  const orbiter = new THREE.Group();
  orbiter.name = "white winged orbiter carries crew and cargo into orbit";
  const white = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.5,
  });
  const fuselage = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.25, 1.55, 10, 22),
    white,
  );
  fuselage.position.y = 1.5;
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 20, 14),
    new THREE.MeshPhysicalMaterial({
      color: 0x12243d,
      metalness: 0.28,
      roughness: 0.2,
      clearcoat: 1,
    }),
  );
  cockpit.scale.set(0.85, 0.45, 0.4);
  cockpit.position.set(0, 2.12, 0.22);
  const thermalTiles = new THREE.Mesh(
    new THREE.BoxGeometry(0.31, 1.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 }),
  );
  thermalTiles.position.set(0, 1.13, 0.2);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.58), white);
  tail.position.set(0, 0.63, -0.08);
  orbiter.add(
    fuselage,
    cockpit,
    thermalTiles,
    tail,
    triangleWing(-1),
    triangleWing(1),
  );
  const engines = new THREE.Group();
  engines.name = "three orbiter main engines";
  for (const x of [-0.16, 0, 0.16]) {
    const engine = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.27, 16),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }),
    );
    engine.position.set(x, 0.37, 0.06);
    engine.rotation.x = Math.PI;
    engines.add(engine);
  }
  orbiter.add(engines);
  orbiter.position.set(0, 0.02, 0.56);

  const flames = new THREE.Group();
  flames.name = "engine exhaust points downward";
  for (const x of [-0.66, 0.66, -0.14, 0, 0.14]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(
        x === 0 || Math.abs(x) === 0.14 ? 0.11 : 0.16,
        0.9,
        18,
      ),
      new THREE.MeshBasicMaterial({
        color: Math.abs(x) > 0.2 ? 0xfff1a8 : 0x7dd3fc,
        transparent: true,
        opacity: 0.88,
      }),
    );
    flame.position.set(x, -0.42, x === 0 || Math.abs(x) === 0.14 ? 0.58 : 0);
    flames.add(flame);
  }
  flames.visible = false;
  stack.add(tank, boosters, orbiter, flames);
  stack.scale.setScalar(scale);
  stack.userData.tank = tank;
  stack.userData.boosters = boosters;
  stack.userData.orbiter = orbiter;
  stack.userData.flames = flames;
  return stack;
}

function makeStatusConsole() {
  const group = new THREE.Group();
  group.name =
    "weather engines boosters guidance communications go no-go board";
  const labels = ["WEATHER", "MAIN ENGINES", "BOOSTERS", "GUIDANCE", "COMMS"];
  labels.forEach((label, index) => {
    const panel = makePanel(label, "NO-GO  →  READY", "#f59e0b", 1.26, 0.52);
    panel.position.set(
      (index - 2) * 1.12,
      1.15 + Math.abs(index - 2) * 0.08,
      0,
    );
    panel.userData.statusLight = true;
    panel.userData.index = index;
    group.add(panel);
  });
  return group;
}

function makeSafetyChecklist() {
  const group = new THREE.Group();
  group.name =
    "crew restraints pressure suits communications and cleared safety boundary";
  [
    ["RESTRAINTS", "Crew secured"],
    ["PRESSURE SUITS", "Visors checked"],
    ["COMMUNICATION", "Clear voice link"],
    ["PAD BOUNDARY", "Ground team clear"],
  ].forEach(([title, subtitle], index) => {
    const panel = makePanel(title, subtitle, "#38bdf8", 1.65, 0.64);
    panel.position.set(
      index % 2 === 0 ? -0.92 : 0.92,
      index < 2 ? 1.75 : 0.9,
      0,
    );
    group.add(panel);
  });
  return group;
}

function makeParachute(color: number) {
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }),
  );
  canopy.scale.y = 0.42;
  const group = new THREE.Group();
  group.add(canopy);
  return group;
}

function registerHotspot(
  root: THREE.Object3D,
  stage: number,
  interactables: THREE.Object3D[],
) {
  root.traverse((object) => {
    object.userData.hotspotStage = stage;
    if (object instanceof THREE.Mesh) interactables.push(object);
  });
}

export default function SpaceShuttleLaunchViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const actionTimeRef = useRef(0);
  const completedStagesRef = useRef(new Set<number>());
  const cardNeedsUpdateRef = useRef(true);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const soundContextRef = useRef<AudioContext | null>(null);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<number>>(
    () => new Set(),
  );
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (
        navigator as Navigator & {
          xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
        }
      ).xr
        ?.isSessionSupported?.("immersive-vr")
        .then(setVrSupported)
        .catch(() => setVrSupported(false));
    }
  }, []);

  const playMissionCue = useCallback((currentStage: number) => {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = soundContextRef.current ?? new AudioContextConstructor();
    soundContextRef.current = context;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type =
      currentStage >= 4 && currentStage <= 6 ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(
      currentStage === 5 ? 88 : 360 + currentStage * 32,
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      currentStage === 5 ? 56 : 720,
      now + 0.55,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      currentStage === 5 ? 0.035 : 0.06,
      now + 0.03,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.75);
  }, []);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    actionTimeRef.current = performance.now() / 1000;
    setStage(safeStage);
    cardNeedsUpdateRef.current = true;
    setTransitioning(true);
    if (transitionTimerRef.current)
      window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(
      () => setTransitioning(false),
      620,
    );
    playNarration(NARRATIONS[safeStage]);
  }, []);

  const performAction = useCallback(() => {
    const currentStage = stageRef.current;
    if (completedStagesRef.current.has(currentStage)) {
      if (currentStage < STAGES.length - 1) goToStage(currentStage + 1);
      return;
    }
    completedStagesRef.current.add(currentStage);
    setCompletedStages(new Set(completedStagesRef.current));
    actionTimeRef.current = performance.now() / 1000;
    cardNeedsUpdateRef.current = true;
    playMissionCue(currentStage);
  }, [goToStage, playMissionCue]);

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
    scene.fog = new THREE.Fog(0x091a32, 20, 52);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      ENVIRONMENTS.control,
      { exposure: 1.03, intensity: 0.48 },
    );
    const environmentTextures: Record<EnvironmentName, THREE.Texture | null> = {
      control: scene.background as THREE.Texture,
      launchpad: null,
      ascent: null,
      orbit: null,
    };
    const textureLoader = new THREE.TextureLoader();
    (["launchpad", "ascent", "orbit"] as const).forEach((name) => {
      const texture = textureLoader.load(ENVIRONMENTS[name]);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      environmentTextures[name] = texture;
    });

    const camera = new THREE.PerspectiveCamera(
      68,
      mount.clientWidth / mount.clientHeight,
      0.05,
      110,
    );
    camera.position.set(0, 2.1, 5.6);
    camera.lookAt(0, 1.35, 0);
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x101827, 1.85));
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.1);
    keyLight.position.set(-4, 8, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x25334c,
      roughness: 0.86,
      transparent: true,
      opacity: 0.28,
    });
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64),
      groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const stageGroups = Array.from(
      { length: STAGES.length },
      () => new THREE.Group(),
    );
    stageGroups.forEach((group, index) => {
      group.name = `scene-${index}-${STAGES[index].title}`;
      scene.add(group);
    });

    const briefingStack = makeShuttleStack(0.64);
    briefingStack.position.set(0.4, 0, -0.2);
    stageGroups[0].add(briefingStack);
    const briefingPanel = makePanel(
      "MISSION: REACH ORBIT",
      "Inspect → Check → Count down → Launch → Separate → Orbit",
      "#7dd3fc",
      3.5,
      1.2,
    );
    briefingPanel.position.set(0, 2.55, -0.2);
    stageGroups[0].add(briefingPanel);

    const inspectionStack = makeShuttleStack(0.9);
    inspectionStack.position.set(0, -0.05, -0.35);
    stageGroups[1].add(inspectionStack);
    const partLabels = [
      ["ORBITER", "Crew + cargo", -1.55, 2.15],
      ["EXTERNAL TANK", "Main-engine propellants", 0, 3.55],
      ["TWO BOOSTERS", "Most liftoff thrust", 1.55, 2.15],
    ] as const;
    partLabels.forEach(([title, subtitle, x, y]) => {
      const label = makePanel(title, subtitle, "#fb923c", 1.45, 0.56);
      label.position.set(x, y, 0.1);
      stageGroups[1].add(label);
    });

    const safetyChecklist = makeSafetyChecklist();
    safetyChecklist.position.z = -0.2;
    stageGroups[2].add(safetyChecklist);

    const statusConsole = makeStatusConsole();
    statusConsole.position.set(0, 0.25, -0.35);
    stageGroups[3].add(statusConsole);

    const countdownStack = makeShuttleStack(0.78);
    countdownStack.position.set(0, 0, -0.45);
    stageGroups[4].add(countdownStack);
    const countdownPanel = makePanel(
      "T − 10 SECONDS",
      "Main engines first • boosters at zero",
      "#facc15",
      2.8,
      0.92,
    );
    countdownPanel.position.set(0, 3.2, 0);
    stageGroups[4].add(countdownPanel);

    const liftoffStack = makeShuttleStack(0.72);
    liftoffStack.position.set(0, 0, -0.45);
    stageGroups[5].add(liftoffStack);

    const maxQStack = makeShuttleStack(0.62);
    maxQStack.position.set(0, 0.35, -0.55);
    maxQStack.rotation.z = -0.08;
    stageGroups[6].add(maxQStack);
    const maxQPanel = makePanel(
      "MAX Q",
      "Greatest aerodynamic pressure • fly smoothly",
      "#38bdf8",
      2.5,
      0.86,
    );
    maxQPanel.position.set(-1.2, 3.15, 0);
    stageGroups[6].add(maxQPanel);

    const boosterStack = makeShuttleStack(0.64);
    boosterStack.position.set(0, 0.45, -0.5);
    stageGroups[7].add(boosterStack);
    const parachutes = [makeParachute(0xef4444), makeParachute(0xffffff)];
    parachutes.forEach((parachute, index) => {
      parachute.visible = false;
      parachute.position.set(index === 0 ? -1.55 : 1.55, 2.8, -0.2);
      stageGroups[7].add(parachute);
    });

    const tankStack = makeShuttleStack(0.64);
    tankStack.position.set(0, 0.55, -0.5);
    stageGroups[8].add(tankStack);
    const cutoffPanel = makePanel(
      "MECO",
      "Main Engine Cutoff • external tank separates",
      "#fb923c",
      2.7,
      0.86,
    );
    cutoffPanel.position.set(-1, 3.2, 0);
    stageGroups[8].add(cutoffPanel);

    const orbitStack = makeShuttleStack(0.68);
    const orbitTank = orbitStack.userData.tank as THREE.Group;
    const orbitBoosters = orbitStack.userData.boosters as THREE.Group;
    orbitTank.visible = false;
    orbitBoosters.visible = false;
    orbitStack.position.set(0.25, 1.25, -0.5);
    orbitStack.rotation.z = -Math.PI / 2;
    stageGroups[9].add(orbitStack);
    for (let index = 0; index < 16; index += 1) {
      const floatingObject = new THREE.Mesh(
        index % 2 === 0
          ? new THREE.SphereGeometry(0.045 + (index % 3) * 0.01, 10, 8)
          : new THREE.BoxGeometry(0.08, 0.08, 0.08),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? 0xfacc15 : 0x7dd3fc,
          emissive: index % 2 === 0 ? 0x422006 : 0x082f49,
        }),
      );
      floatingObject.position.set(
        -1.5 + (index % 6) * 0.58,
        0.65 + Math.floor(index / 6) * 0.55,
        -0.1 + Math.sin(index) * 0.4,
      );
      floatingObject.userData.floatIndex = index;
      stageGroups[9].add(floatingObject);
    }
    const orbitPanel = makePanel(
      "ORBIT ACHIEVED",
      "Only the orbiter remains • orbital free fall creates microgravity",
      "#86efac",
      3.2,
      1.05,
    );
    orbitPanel.position.set(0, 3.0, 0.1);
    stageGroups[9].add(orbitPanel);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 850;
    cardCanvas.height = 285;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(2.95, 0.99),
      new THREE.MeshBasicMaterial({ map: cardTexture, transparent: true }),
    );
    card.position.set(-1.65, 2.7, 0.7);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.64, 0.19, 0.09),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.32,
        }),
      );
      button.name = name;
      button.position.set(x, 1.15, 0.82);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.84);
    const actionButton = makeButton("btn-action", 0xf97316, 0);
    actionButton.scale.x = 1.34;
    const nextButton = makeButton("btn-next", 0x2563eb, 0.84);
    const buttonInteractables: THREE.Object3D[] = [
      previousButton,
      actionButton,
      nextButton,
    ];
    const stageInteractables: THREE.Object3D[] = [];
    stageGroups.forEach((group, index) =>
      registerHotspot(group, index, stageInteractables),
    );
    const raycaster = new THREE.Raycaster();

    const findNamedAncestor = (
      object: THREE.Object3D | null,
    ): THREE.Object3D | null => {
      let current = object;
      while (current) {
        if (current.name.startsWith("btn-")) return current;
        current = current.parent;
      }
      return null;
    };
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(
        [...buttonInteractables, ...stageInteractables],
        true,
      )[0];
      if (!hit) return;
      const button = findNamedAncestor(hit.object);
      if (button?.name === "btn-action") performAction();
      else if (button?.name === "btn-previous") goToStage(stageRef.current - 1);
      else if (button?.name === "btn-next") {
        if (completedStagesRef.current.has(stageRef.current))
          goToStage(stageRef.current + 1);
      } else if (hit.object.userData.hotspotStage === stageRef.current)
        performAction();
    };
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 2.4, 4),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
      );
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -1.2;
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
      startPosition: new THREE.Vector3(0.1, 0, 2.4),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.45, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.25;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    const pointerDown = new THREE.Vector2();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) =>
      pointerDown.set(event.clientX, event.clientY);
    const onPointerUp = (event: PointerEvent) => {
      if (
        Math.hypot(
          event.clientX - pointerDown.x,
          event.clientY - pointerDown.y,
        ) > 8
      )
        return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(stageInteractables, true)[0];
      if (hit?.object.userData.hotspotStage === stageRef.current)
        performAction();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    let lastEnvironment: EnvironmentName | null = null;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const currentStage = stageRef.current;
      const info = STAGES[currentStage];
      const completed = completedStagesRef.current.has(currentStage);
      const actionAge = Math.max(
        0,
        performance.now() / 1000 - actionTimeRef.current,
      );
      questVr.update();

      if (lastEnvironment !== info.environment) {
        const texture =
          environmentTextures[info.environment] ?? environmentTextures.control;
        scene.background = texture;
        scene.environment = texture;
        const inSpace =
          info.environment === "ascent" || info.environment === "orbit";
        scene.fog = inSpace ? null : new THREE.Fog(0x16324a, 22, 58);
        ground.visible = !inSpace;
        renderer.toneMappingExposure =
          info.environment === "orbit" ? 1.16 : 1.03;
        lastEnvironment = info.environment;
      }
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawMissionCard(cardCanvasRef.current, currentStage, completed);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      stageGroups.forEach(
        (group, index) => (group.visible = index === currentStage),
      );

      briefingStack.rotation.y = elapsed * 0.18;
      inspectionStack.rotation.y = Math.sin(elapsed * 0.45) * 0.22;
      const inspectedParts = [
        inspectionStack.userData.orbiter as THREE.Group,
        inspectionStack.userData.tank as THREE.Group,
        inspectionStack.userData.boosters as THREE.Group,
      ];
      inspectedParts.forEach((part, index) => {
        part.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const material = child.material as THREE.MeshStandardMaterial;
          if (!("emissive" in material)) return;
          material.emissive.setHex(
            completed && currentStage === 1
              ? [0x0c4a6e, 0x7c2d12, 0x14532d][index]
              : 0x000000,
          );
          material.emissiveIntensity =
            completed && currentStage === 1 ? 0.38 : 0;
        });
      });
      safetyChecklist.children.forEach((child, index) => {
        if (currentStage === 2 && completed) {
          const appear = Math.min(1, actionAge * 1.4 - index * 0.2);
          child.scale.setScalar(Math.max(0.08, appear));
        } else child.scale.setScalar(1);
      });
      statusConsole.children.forEach((child, index) => {
        if (!(child instanceof THREE.Mesh)) return;
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(
          currentStage === 3 && completed ? 0x86efac : 0xffffff,
        );
        child.position.y +=
          currentStage === 3 && completed
            ? Math.sin(elapsed * 3 + index) * 0.0008
            : 0;
      });

      const countdownFlames = countdownStack.userData.flames as THREE.Group;
      countdownFlames.visible = currentStage === 4 && completed;
      if (countdownFlames.visible)
        countdownFlames.scale.y = 0.65 + Math.sin(elapsed * 15) * 0.15;
      const liftoffFlames = liftoffStack.userData.flames as THREE.Group;
      liftoffFlames.visible = currentStage === 5 && completed;
      liftoffStack.position.y =
        currentStage === 5 && completed ? Math.min(actionAge * 1.1, 3.4) : 0;
      liftoffStack.rotation.z =
        currentStage === 5 && completed ? -Math.min(actionAge * 0.06, 0.2) : 0;
      if (liftoffFlames.visible)
        liftoffFlames.scale.y = 1.1 + Math.sin(elapsed * 18) * 0.2;

      const maxQFlames = maxQStack.userData.flames as THREE.Group;
      maxQFlames.visible = currentStage === 6 && completed;
      if (currentStage === 6 && completed) {
        maxQStack.position.y = 0.35 + Math.sin(elapsed * 0.8) * 0.18;
        maxQStack.rotation.z = -0.16 - Math.min(actionAge * 0.06, 0.34);
      }

      const separatingBoosters = boosterStack.userData.boosters as THREE.Group;
      const boosterFlames = boosterStack.userData.flames as THREE.Group;
      boosterFlames.visible = currentStage === 7 && !completed;
      separatingBoosters.children.forEach((booster) => {
        const side = booster.userData.side as number;
        const homeX = booster.userData.homeX as number;
        const separation =
          currentStage === 7 && completed ? Math.min(actionAge / 1.8, 1) : 0;
        booster.position.x = homeX + side * separation * 1.25;
        booster.position.y = -separation * 1.15;
        booster.rotation.z = -side * separation * 0.22;
      });
      parachutes.forEach((parachute, index) => {
        const visible = currentStage === 7 && completed && actionAge > 1.5;
        parachute.visible = visible;
        if (visible) {
          parachute.position.y = 2.8 - Math.min((actionAge - 1.5) * 0.18, 0.7);
          parachute.rotation.y = elapsed * (index === 0 ? 0.2 : -0.2);
        }
      });

      const separatingTank = tankStack.userData.tank as THREE.Group;
      const tankOrbiter = tankStack.userData.orbiter as THREE.Group;
      const tankBoosters = tankStack.userData.boosters as THREE.Group;
      tankBoosters.visible = false;
      if (currentStage === 8 && completed) {
        const separation = Math.min(actionAge / 2, 1);
        separatingTank.position.set(-separation * 0.95, -separation * 1.45, 0);
        separatingTank.rotation.z = separation * 0.5;
        tankOrbiter.position.y = 0.02 + separation * 0.55;
        tankOrbiter.position.x = separation * 0.5;
      }

      orbitStack.position.y = 1.25 + Math.sin(elapsed * 0.7) * 0.12;
      orbitStack.rotation.x = Math.sin(elapsed * 0.35) * 0.1;
      stageGroups[9].children.forEach((child) => {
        if (typeof child.userData.floatIndex !== "number") return;
        const index = child.userData.floatIndex as number;
        child.position.y += Math.sin(elapsed * 0.8 + index) * 0.0007;
        child.rotation.x += 0.004 + (index % 3) * 0.001;
        child.rotation.y += 0.003;
      });

      const activeCamera = renderer.xr.isPresenting
        ? renderer.xr.getCamera()
        : camera;
      card.lookAt(activeCamera.position);
      buttonInteractables.forEach((button) =>
        button.lookAt(activeCamera.position),
      );
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    drawMissionCard(cardCanvas, 0, false);
    cardTexture.needsUpdate = true;
    actionTimeRef.current = performance.now() / 1000;

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);
    return () => {
      renderer.setAnimationLoop(null);
      controllers.forEach((controller) =>
        controller.removeEventListener(
          "selectstart",
          onControllerSelect as any,
        ),
      );
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      questVr.dispose();
      realisticEnvironment.dispose();
      environmentTextures.launchpad?.dispose();
      environmentTextures.ascent?.dispose();
      environmentTextures.orbit?.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [goToStage, performAction]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current)
        window.clearTimeout(transitionTimerRef.current);
      void soundContextRef.current?.close();
    },
    [],
  );

  const enterVR = useCallback(async () => {
    const xr = (
      navigator as Navigator & {
        xr?: {
          requestSession?: (
            mode: string,
            options: object,
          ) => Promise<XRSession>;
        };
      }
    ).xr;
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

  const currentComplete = completedStages.has(stage);
  const missionComplete = completedStages.has(STAGES.length - 1);
  const progress = Math.round((completedStages.size / STAGES.length) * 100);
  const showRealFootage = stage === 4 || stage === 5;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#030712",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(circle at 50% 25%, #16325c 0%, #030712 72%)",
          }}
        >
          <div style={{ maxWidth: 760, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 82 }}>🚀🌍🛰️</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#7dd3fc",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 5 • Chapter 11 • Sunita in Space • Activity 1
            </div>
            <h1
              style={{
                color: "#f8fafc",
                fontSize: "clamp(2.15rem, 5vw, 3.5rem)",
                lineHeight: 1.05,
                margin: "0 0 12px",
              }}
            >
              A Space Shuttle Launch
            </h1>
            <p
              style={{
                color: "#dbeafe",
                lineHeight: 1.7,
                maxWidth: 660,
                margin: "0 auto",
              }}
            >
              Enter launch control, inspect a realistic Shuttle stack, complete
              the safety poll, launch through the atmosphere, separate each
              spent stage and reach orbit above Earth.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 25,
              }}
            >
              {vrSupported && (
                <button onClick={enterVR} style={primaryButtonStyle}>
                  🥽 Start Mission in VR
                </button>
              )}
              <button
                onClick={() => {
                  unlockNarration();
                  setStarted(true);
                  playNarration(NARRATIONS[0]);
                }}
                style={secondaryButtonStyle}
              >
                💻 Start Mission in Browser
              </button>
            </div>
          </div>
        </div>
      )}

      {started && (
        <>
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(560px, calc(100vw - 40px))",
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(3,12,28,0.9)",
              border: "1px solid rgba(125,211,252,0.48)",
              color: "#f8fafc",
              backdropFilter: "blur(10px)",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                fontSize: "0.75rem",
                fontWeight: 800,
              }}
            >
              <span>🚀 ORBIT READINESS</span>
              <span>{progress}%</span>
            </div>
            <div
              style={{
                height: 9,
                marginTop: 7,
                borderRadius: 99,
                overflow: "hidden",
                background: "rgba(255,255,255,0.14)",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: 99,
                  background:
                    "linear-gradient(90deg, #38bdf8, #fb923c, #86efac)",
                  transition: "width 700ms ease",
                }}
              />
            </div>
          </div>

          <aside
            style={{
              position: "absolute",
              top: 76,
              right: 16,
              width: 390,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 96px)",
              overflowY: "auto",
              padding: 18,
              borderRadius: 15,
              background: "rgba(3,12,28,0.95)",
              border: "1px solid rgba(125,211,252,0.42)",
              color: "#f8fafc",
              backdropFilter: "blur(12px)",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                color: "#7dd3fc",
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
              }}
            >
              <span>
                Stage {stage + 1}/{STAGES.length}
              </span>
              <span>{STAGES[stage].zone}</span>
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.24rem" }}>
              {STAGES[stage].title}
            </h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div
              style={{
                padding: 11,
                borderRadius: 9,
                background: "rgba(125,211,252,0.08)",
                border: "1px solid rgba(125,211,252,0.2)",
                marginBottom: 11,
              }}
            >
              <div style={{ ...bodyCopyStyle, margin: 0 }}>
                {STAGES[stage].detail}
              </div>
            </div>

            {showRealFootage && (
              <div
                style={{
                  margin: "10px 0 12px",
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(249,115,22,0.1)",
                  border: "1px solid rgba(251,146,60,0.35)",
                }}
              >
                <div
                  style={{
                    color: "#fdba74",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    marginBottom: 7,
                  }}
                >
                  REAL LAUNCH FOOTAGE • USER-CONTROLLED
                </div>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    paddingBottom: "56.25%",
                    overflow: "hidden",
                    borderRadius: 8,
                    background: "#000",
                  }}
                >
                  <iframe
                    title={REAL_NASA_VIDEO.title}
                    src={`https://www.youtube-nocookie.com/embed/${REAL_NASA_VIDEO.youtubeId}?rel=0`}
                    loading="lazy"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      border: 0,
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 7,
                    color: "#fed7aa",
                    fontSize: "0.7rem",
                    lineHeight: 1.45,
                  }}
                >
                  {REAL_NASA_VIDEO.credit}
                </div>
                <a
                  href={REAL_NASA_VIDEO.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: 5,
                    color: "#7dd3fc",
                    fontSize: "0.7rem",
                  }}
                >
                  Open the official NASA+ source ↗
                </a>
                <div
                  style={{
                    marginTop: 5,
                    color: "#cbd5e1",
                    fontSize: "0.67rem",
                    lineHeight: 1.4,
                  }}
                >
                  This is STS-135 historical footage, not Sunita Williams's
                  STS-116 launch.
                </div>
              </div>
            )}

            <button
              onClick={performAction}
              disabled={missionComplete}
              style={{
                ...primaryButtonStyle,
                opacity: missionComplete ? 0.62 : 1,
              }}
            >
              {missionComplete
                ? "🌍 Orbital mission complete"
                : currentComplete
                  ? "Continue to the next stage →"
                  : STAGES[stage].action}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button
                onClick={() => goToStage(stage - 1)}
                disabled={stage === 0}
                style={{ ...navButtonStyle, opacity: stage === 0 ? 0.45 : 1 }}
              >
                ← Previous
              </button>
              <button
                onClick={() => goToStage(stage + 1)}
                disabled={!currentComplete || stage === STAGES.length - 1}
                style={{
                  ...navButtonStyle,
                  opacity:
                    !currentComplete || stage === STAGES.length - 1 ? 0.45 : 1,
                }}
              >
                Next →
              </button>
            </div>
            <div
              role="status"
              style={{
                marginTop: 11,
                color: currentComplete ? "#86efac" : "#fde68a",
                fontSize: "0.76rem",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {currentComplete
                ? "Stage complete • press Continue or controller A"
                : "Point and select the model, or use the action button"}
            </div>
            <button
              onClick={() => playNarration(NARRATIONS[stage])}
              style={secondaryButtonStyle}
            >
              🔊 Replay Flight Director Tara
            </button>
            {vrSupported && (
              <button onClick={enterVR} style={secondaryButtonStyle}>
                🥽 Enter VR
              </button>
            )}
          </aside>

          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              maxWidth: 650,
              padding: "7px 10px",
              borderRadius: 9,
              background: "rgba(3,12,28,0.84)",
              color: "#dbeafe",
              fontSize: "0.72rem",
              zIndex: 4,
            }}
          >
            Quest: point + trigger interacts • A completes/continues • B/right
            grip exits VR • Y goes back • joysticks walk and turn
          </div>
        </>
      )}

      <div
        aria-hidden={!transitioning}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 8,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
          background: transitioning ? "rgba(2,6,23,0.68)" : "transparent",
          opacity: transitioning ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      >
        <div
          style={{
            padding: "14px 24px",
            borderRadius: 14,
            background: "rgba(3,12,28,0.94)",
            border: "1px solid #7dd3fc",
            color: "#f8fafc",
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#7dd3fc",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Proceeding to
          </div>
          <div style={{ marginTop: 5 }}>{STAGES[stage].zone}</div>
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(135deg, #ea580c, #c2410c)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 7,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(125,211,252,0.42)",
  background: "rgba(125,211,252,0.1)",
  color: "#dbeafe",
} as const;

const bodyCopyStyle = {
  margin: "0 0 11px",
  color: "#dbeafe",
  fontSize: "0.83rem",
  lineHeight: 1.52,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.07)",
  color: "#dbeafe",
  cursor: "pointer",
} as const;
