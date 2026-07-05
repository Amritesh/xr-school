'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  createAssessmentSession,
  type AssessmentAnswerResult,
} from '../../../../packages/simulation-runtime/src/world/assessment';
import {
  createScientificModelRegistry,
} from '../../../../packages/simulation-runtime/src/world/scientificModels';
import {
  evaluateCircuit,
} from '../../../../packages/simulation-runtime/src/models/circuitModel';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import ExperienceFocusGuide from '@/components/simulation-experience/ExperienceFocusGuide';
import '@/components/simulation-experience/simulation-experience.css';
import { createEnvironment } from '@/lib/world-builder/environmentFactory';
import { createMaterialFactory } from '@/lib/world-builder/materialFactory';
import { CIRCUIT_WORLD } from '@/lib/world-builder/circuitWorld';
import {
  resolveFocusGuide,
  type FocusGuideVisibility,
} from '@/lib/world-builder/focusGuidance';
import {
  isQuestBackPressed,
  updateButtonLatch,
} from '@/lib/xrNavigation';
import {
  computeFocusFrame,
  createGuidedCamera,
} from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';

const VOLTAGE = 9;

interface ResistorPreset { label: string; ohms: number; color: number; bandColor: number }
const RESISTORS: ResistorPreset[] = [
  { label: '10 Ω', ohms: 10, color: 0xc2410c, bandColor: 0x1d4ed8 },
  { label: '50 Ω', ohms: 50, color: 0x92400e, bandColor: 0xd97706 },
  { label: '200 Ω', ohms: 200, color: 0x78350f, bandColor: 0xdc2626 },
];

const STAGES = [
  { title: '⚡ Open Circuit', cue: 'The switch is OPEN. No current can flow. The bulb is off.', detail: 'An electric circuit needs a complete, unbroken path for current to flow. When the switch is open, there is a gap — electrons cannot pass through.', formula: 'I = V / R', note: 'Switch open → I = 0 A → Bulb off' },
  { title: '💡 Closed Circuit', cue: 'The switch is CLOSED. Current flows — watch the electrons!', detail: 'Electrons leave the negative terminal of the battery, flow through the wire, through the resistor, through the bulb filament, and back to the positive terminal.', formula: `I = ${VOLTAGE}V ÷ R`, note: 'Watch the blue electrons moving.' },
  { title: '🔴 Changing Resistance', cue: 'Change the resistor. Watch current and brightness change.', detail: "Higher resistance → lower current → dimmer bulb. This is Ohm's Law: the voltage stays constant; resistance controls how much current flows.", formula: "V = I × R  (Ohm's Law)", note: 'Try all three resistors. Compare brightness.' },
  { title: "📊 Ohm's Law Mastered", cue: 'Voltage, Current, and Resistance are always linked by V = IR.', detail: 'Think of voltage as water pressure, current as water flow rate, and resistance as how narrow the pipe is. More resistance = less flow for the same pressure.', formula: 'V = I × R', note: 'Applies to phone chargers, power grids — everything.' },
];

const NARRATIONS = [
  "Open circuit. The switch is open, creating a gap. No current can flow and the bulb stays dark. A circuit must form a complete, unbroken loop for electrons to move.",
  "Closed circuit. The switch is now closed — the path is complete. Electrons flow from the battery's negative terminal, through the wire, the resistor, and the bulb filament, and back. Watch the blue particles moving around the circuit.",
  "Changing resistance. Try the different resistor values. A higher resistance reduces the current, making the bulb dimmer. This is Ohm's Law — the voltage stays constant, but resistance controls how much current flows.",
  "Ohm's Law. Voltage equals current multiplied by resistance. Think of voltage as water pressure, current as the flow rate, and resistance as how narrow the pipe is. This single equation governs every circuit in the world, from phone chargers to power grids.",
];

const NARRATION_AUDIO_URLS = [
  '/audio/circuit/stage-01.mp3',
  '/audio/circuit/stage-02.mp3',
  '/audio/circuit/stage-03.mp3',
  '/audio/circuit/stage-04.mp3',
];

// Stage cameras: where to position the viewpoint for each stage
// pos = camera position, target = look-at point
const STAGE_CAMERAS = [
  { pos: new THREE.Vector3(0.48, 1.5, 0.72), target: new THREE.Vector3(0.48, 0.88, -0.8) },
  { pos: new THREE.Vector3(0.72, 1.28, 0.38), target: new THREE.Vector3(0.42, 0.9, -0.8) },
  { pos: new THREE.Vector3(0.56, 1.18, 0.24), target: new THREE.Vector3(0.42, 0.9, -0.97) },
  { pos: new THREE.Vector3(0.48, 1.5, 0.72), target: new THREE.Vector3(0.48, 0.9, -0.8) },
];

// Wire loop — internal coordinates within circuitGroup (scaled 0.155×, placed at z=-0.8)
const WIRE_POINTS = [
  new THREE.Vector3(-1.8, 0.08, 0),
  new THREE.Vector3(-1.8, 0.08, 1.1),
  new THREE.Vector3(0, 0.08, 1.1),
  new THREE.Vector3(1.8, 0.08, 1.1),
  new THREE.Vector3(1.8, 0.08, 0),
  new THREE.Vector3(1.8, 0.08, -1.1),
  new THREE.Vector3(0, 0.08, -1.1),
  new THREE.Vector3(-1.8, 0.08, -1.1),
  new THREE.Vector3(-1.8, 0.08, 0),
];

const CIRCUIT_SCALE = 0.155;
// World-space bench center: Z = -0.8  (user starts at Z=0, facing -Z)
const BZ = -0.8;
const ASSESSMENT_STAGE_REQUIREMENTS = [1, 2, 3] as const;
const ASSESSMENT_SEQUENCE = CIRCUIT_WORLD.assessments[0];

function playNarration(stageIndex: number) {
  void playSimulationNarration(NARRATIONS[stageIndex], stageIndex, NARRATION_AUDIO_URLS[stageIndex]);
}

export default function CircuitViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const guidedCameraRef = useRef<ReturnType<typeof createGuidedCamera> | null>(null);
  const switchLeverRef = useRef<THREE.Mesh | null>(null);
  const bulbLightRef = useRef<THREE.PointLight | null>(null);
  const bulbMeshRef = useRef<THREE.Mesh | null>(null);
  const filamentRef = useRef<THREE.Mesh | null>(null);
  const electronMeshesRef = useRef<THREE.Mesh[]>([]);
  const electronTsRef = useRef<number[]>([]);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const resistorBodyRef = useRef<THREE.Mesh | null>(null);
  const resistorBandRef = useRef<THREE.Mesh | null>(null);

  const switchClosedRef = useRef(false);
  const resistorIdxRef = useRef(0);
  const stageRef = useRef(0);
  const assessmentRef = useRef(createAssessmentSession(ASSESSMENT_SEQUENCE));

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [switchClosed, setSwitchClosed] = useState(false);
  const [resistorIdx, setResistorIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [runtimeError, setRuntimeError] = useState('');
  const [assessmentPromptIndex, setAssessmentPromptIndex] = useState(0);
  const [assessmentResult, setAssessmentResult] =
    useState<AssessmentAnswerResult | null>(null);
  const [mastered, setMastered] = useState(false);
  const [focusVisibility, setFocusVisibility] = useState<FocusGuideVisibility>({
    direction: 'forward',
    visible: false,
  });
  const focusVisibilityRef = useRef(focusVisibility);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) setVrSupported(true);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const hostMount = mount;

    let cancelled = false;
    let host: WebSimulationRuntime | undefined;
    let fixedUpdate: WebSimulationUpdates['fixedUpdate'];
    let renderUpdate: WebSimulationUpdates['renderUpdate'];

    async function start() {
    setRuntimeError('');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 30);
    camera.position.copy(STAGE_CAMERAS[0].pos);
    camera.lookAt(STAGE_CAMERAS[0].target);

    host = createWebSimulationRuntime({
      mount: hostMount,
      scene,
      camera,
      updates: {
        fixedUpdate: context => fixedUpdate?.(context),
        renderUpdate: context => renderUpdate?.(context),
      },
    });
    const renderer = host.renderer;
    rendererRef.current = renderer;

    const materialFactory = createMaterialFactory({
      assets: CIRCUIT_WORLD.assetManifests[0],
      materials: CIRCUIT_WORLD.materials,
      qualityProfileId: 'questBaseline',
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
    const materialDefinition = (id: string) => {
      const definition = CIRCUIT_WORLD.materials.find(
        material => material.id === id,
      );
      if (!definition) throw new Error(`Missing Circuit material ${id}`);
      return definition;
    };
    const [
      wallMat,
      benchMat,
      pcbMat,
      wireMat,
      metalMat,
      batteryMat,
      switchMat,
      resistorMat,
      electronMat,
      bulbGlassMat,
    ] = await Promise.all([
      'workshop-wall',
      'workbench-wood',
      'circuit-board',
      'copper-wire',
      'brushed-metal',
      'battery-blue',
      'switch-red',
      'resistor-body',
      'electron',
      'bulb-glass',
    ].map(id => materialFactory.create(materialDefinition(id))));
    if (cancelled) {
      materialFactory.dispose();
      await host.dispose();
      return;
    }
    host.resources.register('circuit-materials', () => materialFactory.dispose());

    const environment = await createEnvironment({
      renderer,
      scene,
      definition: CIRCUIT_WORLD.environments[0],
      assets: CIRCUIT_WORLD.assetManifests[0],
    });
    if (cancelled) {
      await host.dispose();
      return;
    }
    host.resources.register('circuit-environment', () => environment.dispose());

    const scientificModels = createScientificModelRegistry();
    scientificModels.register({
      manifest: CIRCUIT_WORLD.scientificModels[0],
      evaluate: input => evaluateCircuit({
        voltage: Number(input.voltage),
        resistance: Number(input.resistance),
        closed: Boolean(input.closed),
      }),
    });
    const modelFailures = scientificModels.verify('ohms-law');
    if (modelFailures.length > 0) throw new Error(modelFailures.join('; '));
    host.resources.register(
      'circuit-scientific-model',
      () => scientificModels.dispose(),
    );

    // ── Bright school electronics classroom ──────────────────────────────
    const classroomFloorMaterial = wallMat.clone();
    classroomFloorMaterial.color.set('#d8e3ea');
    classroomFloorMaterial.roughness = 0.86;
    const classroomWallMaterial = wallMat.clone();
    classroomWallMaterial.color.set('#edf5f7');
    classroomWallMaterial.roughness = 0.94;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      classroomFloorMaterial,
    );
    floor.name = 'circuit-classroom-floor';
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 3.5),
      classroomWallMaterial,
    );
    backWall.name = 'circuit-classroom-wall';
    backWall.position.set(0, 1.75, -3.0);
    scene.add(backWall);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), classroomWallMaterial);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.2; scene.add(ceil);
    [-4.0, 4.0].forEach(x => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.5), classroomWallMaterial);
      sw.position.set(x, 1.75, -1.5); sw.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(sw);
    });

    const classroomLight = new THREE.HemisphereLight(0xffffff, 0xb7c8d2, 1.6);
    scene.add(classroomLight);
    const taskLight = new THREE.DirectionalLight(0xfff6dc, 2.1);
    taskLight.position.set(2.4, 4, 2.2);
    taskLight.target.position.set(0, 0.9, BZ);
    scene.add(taskLight, taskLight.target);

    // ── Workbench (workbench center at Z = BZ) ────────────────────────────
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.1), benchMat);
    benchTop.name = 'student-workbench';
    benchTop.position.set(0, 0.86, BZ); benchTop.castShadow = true; benchTop.receiveShadow = true;
    scene.add(benchTop);
    // Legs: near pair at z=BZ+0.45, far pair at z=BZ-0.45
    [[-0.95, BZ + 0.45], [0.95, BZ + 0.45], [-0.95, BZ - 0.45], [0.95, BZ - 0.45]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.07), benchMat);
      leg.position.set(lx, 0.43, lz); scene.add(leg);
    });

    // ── Circuit group (centered on workbench top at Z = BZ) ───────────────
    const circuitGroup = new THREE.Group();
    circuitGroup.scale.setScalar(CIRCUIT_SCALE);
    circuitGroup.position.set(0, 0.90, BZ);
    scene.add(circuitGroup);

    const pcb = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.06, 3.8), pcbMat);
    pcb.position.y = -0.07; circuitGroup.add(pcb);
    for (let x = -2.4; x <= 2.4; x += 0.45) {
      for (let z = -1.6; z <= 1.6; z += 0.45) {
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.06, 6), new THREE.MeshStandardMaterial({ color: 0x0a2e1a }));
        hole.rotation.x = -Math.PI / 2; hole.position.set(x, -0.03, z); circuitGroup.add(hole);
      }
    }

    // ── Wire ──────────────────────────────────────────────────────────────
    const curve = new THREE.CatmullRomCurve3(WIRE_POINTS, true, 'chordal', 0);
    curveRef.current = curve;
    circuitGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 100, 0.028, 7, true), wireMat));

    // ── Battery ────────────────────────────────────────────────────────────
    const batGroup = new THREE.Group();
    batGroup.name = 'circuit-battery';
    batGroup.position.set(-1.8, 0, 0); batGroup.rotation.z = Math.PI / 2;
    const batBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 16), batteryMat);
    batGroup.add(batBody);
    const posT = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.09, 8), metalMat);
    posT.position.y = 0.49; batGroup.add(posT);
    const negT = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.09, 8), metalMat);
    negT.position.y = -0.49; batGroup.add(negT);
    batGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.02), batteryMat));
    batGroup.rotation.z = Math.PI / 2;
    circuitGroup.add(batGroup);

    // ── Switch ────────────────────────────────────────────────────────────
    const switchBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.25), metalMat);
    switchBase.position.set(0, 0.06, 1.1); circuitGroup.add(switchBase);
    const switchLever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), switchMat);
    switchLever.name = 'circuit-switch-lever';
    switchLever.position.set(0, 0.25, 1.1); switchLeverRef.current = switchLever;
    circuitGroup.add(switchLever);

    // ── Resistor ──────────────────────────────────────────────────────────
    const resistorGroup = new THREE.Group();
    resistorGroup.name = 'circuit-resistor';
    resistorGroup.position.set(0, 0, -1.1); resistorGroup.rotation.z = Math.PI / 2;
    const resBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 12), resistorMat);
    resistorBodyRef.current = resBody; resistorGroup.add(resBody);
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.06, 12), new THREE.MeshStandardMaterial({ color: i === 1 ? RESISTORS[0].bandColor : 0x111827 }));
      band.position.y = -0.18 + i * 0.18;
      if (i === 1) resistorBandRef.current = band;
      resistorGroup.add(band);
    }
    circuitGroup.add(resistorGroup);

    // ── Bulb ──────────────────────────────────────────────────────────────
    const bulbGroup = new THREE.Group();
    bulbGroup.name = 'circuit-bulb';
    bulbGroup.position.set(1.8, 0, 0);
    const bulbGlass = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.72), bulbGlassMat);
    bulbMeshRef.current = bulbGlass; bulbGroup.add(bulbGlass);
    bulbGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 12), metalMat));
    (bulbGroup.children[1] as THREE.Mesh).position.y = -0.2;
    const filament = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 4, 14), new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfbbf24, emissiveIntensity: 0 }));
    filament.rotation.x = Math.PI / 2; filament.position.y = 0.04;
    filamentRef.current = filament; bulbGroup.add(filament);
    circuitGroup.add(bulbGroup);

    // Bulb point light in world space
    const bulbLight = new THREE.PointLight(0xfef3c7, 0, 6, 2);
    bulbLight.position.set(1.8 * CIRCUIT_SCALE, 1.1, BZ);
    scene.add(bulbLight); bulbLightRef.current = bulbLight;

    // ── Electrons ─────────────────────────────────────────────────────────
    const ELECTRON_COUNT = 28;
    const electronMeshes: THREE.Mesh[] = [];
    const electronTs: number[] = [];
    for (let i = 0; i < ELECTRON_COUNT; i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), electronMat);
      e.visible = false; circuitGroup.add(e);
      electronMeshes.push(e); electronTs.push(i / ELECTRON_COUNT);
    }
    electronMeshesRef.current = electronMeshes;
    electronTsRef.current = electronTs;

    const focusTargets = [switchLever, resistorGroup, bulbGroup, bulbGroup];
    const projectedFocus = new THREE.Vector3();

    // ── Guided camera: hand-tuned per-stage shots, with a closer dolly-in
    // whenever the learner selects the switch, resistor, or bulb ──────────
    const guidedCamera = createGuidedCamera(camera, renderer.domElement, {
      transitionSeconds: 0.65,
    });
    guidedCamera.focusOn(
      { position: STAGE_CAMERAS[0].pos, target: STAGE_CAMERAS[0].target },
      { animate: false },
    );
    guidedCameraRef.current = guidedCamera;

    const moveToCircuitStage = (next: number) => {
      const bounded = Math.max(0, Math.min(STAGES.length - 1, next));
      stageRef.current = bounded;
      interactionSystem.setSelected(undefined);
      guidedCamera.focusOn({
        position: STAGE_CAMERAS[bounded].pos,
        target: STAGE_CAMERAS[bounded].target,
      });
      setStage(bounded);
      playNarration(bounded);
    };

    const handleCircuitObjectSelection = (id: string, object: THREE.Object3D) => {
      if (id === 'circuit-switch-lever') {
        setSwitchClosed(previous => {
          const closed = !previous;
          switchClosedRef.current = closed;
          if (closed && stageRef.current === 0) moveToCircuitStage(1);
          return closed;
        });
      } else if (id === 'circuit-resistor' && stageRef.current >= 1) {
        const nextResistor = (resistorIdxRef.current + 1) % RESISTORS.length;
        resistorIdxRef.current = nextResistor;
        setResistorIdx(nextResistor);
        if (stageRef.current < 2) moveToCircuitStage(2);
      } else if (id === 'circuit-bulb' && stageRef.current >= 2) {
        moveToCircuitStage(3);
      }
      interactionSystem.setSelected(id);
      guidedCamera.focusOn(computeFocusFrame(object, camera));
    };

    // ── XR Controllers ────────────────────────────────────────────────────
    function buildControllerVisual() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.6 })));
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.5, 4), new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.4 }));
      ray.position.z = -0.75; ray.rotation.x = Math.PI / 2; g.add(ray);
      return g;
    }
    const ctrl0 = renderer.xr.getController(0);
    const ctrl1 = renderer.xr.getController(1);
    ctrl0.add(buildControllerVisual()); ctrl1.add(buildControllerVisual());
    scene.add(ctrl0, ctrl1);

    // ── Selection: one shared raycasting/highlight system for mouse + XR ──
    const interactionSystem = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: [ctrl0, ctrl1],
      onSelect: handleCircuitObjectSelection,
    });
    interactionSystem.register('circuit-switch-lever', switchLever, { highlightColor: '#ffcf5c' });
    interactionSystem.register('circuit-resistor', resistorGroup, { highlightColor: '#ffcf5c' });
    interactionSystem.register('circuit-bulb', bulbGroup, { highlightColor: '#ffcf5c' });
    interactionSystem.register('circuit-battery', batGroup, { highlightColor: '#ffcf5c' });

    let circuitState = evaluateCircuit({
      voltage: VOLTAGE,
      resistance: RESISTORS[0].ohms,
      closed: false,
    });
    const questBackLatches = [false, false];

    fixedUpdate = ({ deltaSeconds }) => {
      const closed = switchClosedRef.current;
      const rIdx = resistorIdxRef.current;
      const R = RESISTORS[rIdx].ohms;
      circuitState = evaluateCircuit({
        voltage: VOLTAGE,
        resistance: R,
        closed,
      });
      const speed = closed ? 0.42 * Math.sqrt(circuitState.current) : 0;
      electronTsRef.current.forEach((value, index) => {
        electronTsRef.current[index] = (value + speed * deltaSeconds) % 1;
      });
    };

    renderUpdate = ({ elapsedSeconds, interpolationAlpha, frameDeltaSeconds, renderer }) => {
      const closed = switchClosedRef.current;
      const rIdx = resistorIdxRef.current;
      const R = RESISTORS[rIdx].ohms;
      const { current: I, brightness } = circuitState;
      if (!renderer.xr.isPresenting) guidedCamera.update(frameDeltaSeconds);

      // Switch lever
      if (switchLeverRef.current) {
        const target = closed ? -0.55 : 0.55;
        switchLeverRef.current.rotation.x += (target - switchLeverRef.current.rotation.x) * 0.12;
      }

      // Bulb
      if (bulbLightRef.current) bulbLightRef.current.intensity += (brightness * 4.0 - bulbLightRef.current.intensity) * 0.12;
      if (bulbMeshRef.current) {
        const mat = bulbMeshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity += (brightness * 1.4 - mat.emissiveIntensity) * 0.1;
        mat.opacity = 0.35 + brightness * 0.55; mat.needsUpdate = true;
      }
      if (filamentRef.current) {
        const mat = filamentRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity += (brightness * 3.0 - mat.emissiveIntensity) * 0.1; mat.needsUpdate = true;
      }

      // Electrons
      const t = elapsedSeconds + interpolationAlpha / 60;
      electronMeshes.forEach((e, i) => {
        e.visible = closed;
        if (closed && curveRef.current) {
          const pt = curveRef.current.getPoint(electronTsRef.current[i]);
          e.position.copy(pt); e.position.y += 0.06;
          (e.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 8 + i * 0.4) * 0.5;
        }
      });

      // Resistor color
      if (resistorBodyRef.current) (resistorBodyRef.current.material as THREE.MeshStandardMaterial).color.setHex(RESISTORS[rIdx].color);
      if (resistorBandRef.current) (resistorBandRef.current.material as THREE.MeshStandardMaterial).color.setHex(RESISTORS[rIdx].bandColor);

      if (renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        session?.inputSources.forEach((inputSource, index) => {
          const gamepad = inputSource.gamepad;
          if (!gamepad) return;
          const back = updateButtonLatch(
            isQuestBackPressed(gamepad.buttons, inputSource.handedness),
            questBackLatches[index],
          );
          questBackLatches[index] = back.latched;
          if (!back.pressed) return;
          if (stageRef.current > 0) moveToCircuitStage(stageRef.current - 1);
          else void session.end();
        });
      } else {
        focusTargets[stageRef.current]
          .getWorldPosition(projectedFocus)
          .project(camera);
        const nextFocusVisibility = resolveFocusGuide(projectedFocus);
        const currentFocusVisibility = focusVisibilityRef.current;
        if (
          nextFocusVisibility.visible !== currentFocusVisibility.visible
          || nextFocusVisibility.direction !== currentFocusVisibility.direction
        ) {
          focusVisibilityRef.current = nextFocusVisibility;
          setFocusVisibility(nextFocusVisibility);
        }
      }
    };

    host.resources.register('circuit-camera', () => guidedCamera.dispose());
    host.resources.register('circuit-interaction', () => interactionSystem.dispose());
    host.resources.register('circuit-scene', () => {
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const objectMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        objectMaterials.forEach(material => material.dispose());
      });
      scene.clear();
    });

    await host.initialize();
    }

    void start().catch(error => {
      if (!cancelled) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
      void host?.dispose();
    });

    return () => {
      cancelled = true;
      stopSimulationNarration();
      void host?.dispose();
    };
  }, []);

  const goToStage = useCallback((next: number) => {
    stageRef.current = next;
    guidedCameraRef.current?.focusOn({
      position: STAGE_CAMERAS[next].pos,
      target: STAGE_CAMERAS[next].target,
    });
    setStage(next);
    playNarration(next);
  }, []);

  const enterVR = useCallback(async () => {
    if (!rendererRef.current) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      rendererRef.current.xr.setSession(session);
      setStarted(true);
      playNarration(stageRef.current);
    } catch {
      setStarted(true);
      playNarration(stageRef.current);
    }
  }, []);

  const toggleSwitch = () => {
    setSwitchClosed(prev => {
      const n = !prev; switchClosedRef.current = n;
      if (n && stageRef.current === 0) goToStage(1);
      return n;
    });
  };

  const changeResistor = (idx: number) => {
    setResistorIdx(idx); resistorIdxRef.current = idx;
    if (stageRef.current < 2) goToStage(2);
  };

  const answerAssessment = useCallback((evidenceId: string) => {
    const prompt = ASSESSMENT_SEQUENCE.prompts[assessmentPromptIndex];
    const result = assessmentRef.current.answer(prompt.id, evidenceId);
    setAssessmentResult(result);
    setMastered(assessmentRef.current.mastery().mastered);
  }, [assessmentPromptIndex]);

  const continueAssessment = useCallback(() => {
    setAssessmentPromptIndex(index => Math.min(
      index + 1,
      ASSESSMENT_SEQUENCE.prompts.length - 1,
    ));
    setAssessmentResult(null);
  }, []);

  const R = RESISTORS[resistorIdx].ohms;
  const circuitState = evaluateCircuit({
    voltage: VOLTAGE,
    resistance: R,
    closed: switchClosed,
  });
  const I = circuitState.current;
  const stageInfo = STAGES[stage];
  const assessmentPrompt =
    ASSESSMENT_SEQUENCE.prompts[assessmentPromptIndex];
  const assessmentReady = stage >= (
    ASSESSMENT_STAGE_REQUIREMENTS[assessmentPromptIndex]
    ?? STAGES.length
  );
  const focusGuide = {
    direction: focusVisibility.direction,
    label: stage === 0
      ? 'Look at and click the red switch'
      : stage === 1
        ? 'Click the resistor to change resistance'
        : stage === 2
          ? 'Inspect the bulb after the resistance change'
          : 'Inspect the bulb and current reading',
    visible: started && focusVisibility.visible,
  } as const;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#dce8ef', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {runtimeError && (
        <div role="alert" style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'grid', placeContent: 'center', padding: 24, background: 'rgba(8,5,2,0.95)', color: '#fecaca', textAlign: 'center' }}>
          <strong>Circuit world could not start.</strong>
          <span style={{ marginTop: 8, color: '#fca5a5' }}>{runtimeError}</span>
        </div>
      )}

      {/* Intro overlay */}
      {!started && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 40%, #0d1a2e 0%, #020508 100%)', zIndex: 10 }}>
          <div style={{ textAlign: 'center', maxWidth: 520, padding: '0 24px' }}>
            <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16, filter: 'drop-shadow(0 0 24px rgba(96,165,250,0.6))' }}>⚡</div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f9fafb', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Electric Circuits</h1>
            <p style={{ fontSize: '1.05rem', color: '#60a5fa', fontWeight: 600, marginBottom: 8 }}>& Ohm's Law</p>
            <p style={{ color: '#6b7280', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 32 }}>Stand at a real workbench. Toggle the switch, watch electrons flow, change resistance, and discover V = I × R from inside the circuit.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {vrSupported && (
                <button onClick={enterVR} style={{ padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 30px rgba(96,165,250,0.4)' }}>
                  <span style={{ fontSize: 22 }}>🥽</span> Enter in VR
                </button>
              )}
              <button onClick={() => { setStarted(true); playNarration(0); }} style={{ padding: '14px 28px', borderRadius: 12, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>💻</span> View in Browser
              </button>
            </div>
            {!vrSupported && <p style={{ marginTop: 20, color: '#374151', fontSize: '0.8rem' }}>For immersive VR, open this page in Meta Quest Browser over HTTPS on your local network.</p>}
          </div>
        </div>
      )}

      {started && (
        <>
          <ExperienceFocusGuide {...focusGuide} />
          {assessmentReady && (
            <aside
              aria-label="Circuit evidence check"
              style={{ position: 'absolute', top: 96, left: 16, zIndex: 5, width: 'min(330px, calc(100vw - 32px))', padding: 16, borderRadius: 12, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(8,5,2,0.94)', color: '#f9fafb' }}
            >
              {mastered ? (
                <>
                  <strong style={{ color: '#86efac' }}>Concept mastered</strong>
                  <p style={{ marginTop: 7, color: '#d1fae5', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    You connected the visible circuit behavior to Ohm&apos;s law and transferred it to a new resistance.
                  </p>
                </>
              ) : (
                <>
                  <div style={{ color: '#60a5fa', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {assessmentPrompt.kind} evidence
                  </div>
                  <p style={{ margin: '8px 0 10px', fontSize: '0.86rem', lineHeight: 1.45 }}>
                    {assessmentPrompt.question}
                  </p>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {assessmentPrompt.options?.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={assessmentResult?.correct}
                        onClick={() => answerAssessment(option.id)}
                        style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#f3f4f6', cursor: 'pointer', textAlign: 'left', fontSize: '0.76rem' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {assessmentResult && (
                    <div style={{ marginTop: 10, color: assessmentResult.correct ? '#86efac' : '#fde68a', fontSize: '0.76rem', lineHeight: 1.45 }}>
                      {assessmentResult.correct
                        ? assessmentResult.explanation
                        : assessmentResult.hint}
                      {assessmentResult.correct
                        && assessmentPromptIndex < ASSESSMENT_SEQUENCE.prompts.length - 1 && (
                        <button
                          type="button"
                          onClick={continueAssessment}
                          style={{ display: 'block', marginTop: 8, padding: '7px 10px', border: 0, borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Continue
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </aside>
          )}

          {/* Top-centre toolbar — switch + resistors + current */}
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, background: 'rgba(10,7,3,0.90)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={toggleSwitch} style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: 'pointer', background: switchClosed ? '#16a34a' : '#dc2626', color: '#fff', minWidth: 120 }}>
              {switchClosed ? '🔌 ON' : '⭕ OFF'}
            </button>
            <div style={{ display: 'flex', gap: 5 }}>
              {RESISTORS.map((r, i) => (
                <button key={i} onClick={() => changeResistor(i)} style={{ padding: '8px 10px', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', border: `1px solid ${i === resistorIdx ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', background: i === resistorIdx ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)', color: i === resistorIdx ? '#ef4444' : '#9ca3af' }}>
                  {r.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700 }}>CURRENT</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: switchClosed ? '#60a5fa' : '#374151', fontFamily: 'monospace' }}>{I.toFixed(3)} A</div>
            </div>
          </div>

          {/* Right-side info panel — clear of the workbench */}
          <div className="simulation-experience__circuit-panel" style={{ position: 'absolute', top: 80, right: 16, width: 268, background: 'rgba(10,24,38,0.88)', borderRadius: 14, padding: '16px', border: '1px solid rgba(96,165,250,0.28)', color: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fbbf24', marginBottom: 6 }}>
              ⚡ Stage {stage + 1} / {STAGES.length}
            </div>
            <div style={{ width: '100%', height: 1, background: 'rgba(251,191,36,0.18)', marginBottom: 10 }} />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f9fafb', margin: '0 0 8px', lineHeight: 1.3 }}>{stageInfo.title}</h3>
            <p style={{ color: '#d1d5db', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 8px' }}>{stageInfo.cue}</p>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', lineHeight: 1.5, margin: '0 0 12px' }}>{stageInfo.detail}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <code style={{ padding: '3px 10px', borderRadius: 5, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>{stageInfo.formula}</code>
              <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{stageInfo.note}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <button onClick={() => goToStage(Math.max(stage - 1, 0))} disabled={stage === 0} style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: stage === 0 ? '#374151' : '#e5e7eb', cursor: stage === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                ← Prev
              </button>
              <button onClick={() => goToStage(Math.min(stage + 1, STAGES.length - 1))} disabled={stage === STAGES.length - 1} style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: '#b45309', border: 'none', color: '#fff', cursor: stage === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem', opacity: stage === STAGES.length - 1 ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#93c5fd', fontSize: '0.8rem', fontFamily: 'monospace', textAlign: 'center', marginBottom: vrSupported ? 8 : 0 }}>
              {VOLTAGE}V / {R}Ω = {I.toFixed(3)}A
            </div>
            {vrSupported && (
              <button onClick={enterVR} style={{ padding: '8px 0', borderRadius: 8, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', width: '100%' }}>
                🥽 Enter VR
              </button>
            )}
          </div>

          <div style={{ position: 'absolute', bottom: 16, left: 16, color: '#374151', fontSize: '0.74rem' }}>
            Click objects to inspect · Drag to look around
          </div>
        </>
      )}
    </div>
  );
}
