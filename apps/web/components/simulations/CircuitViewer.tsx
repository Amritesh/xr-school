'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

// Stage cameras: where to position the viewpoint for each stage
// pos = camera position, target = look-at point
const STAGE_CAMERAS = [
  { pos: new THREE.Vector3(0, 1.45, 0.5),    target: new THREE.Vector3(0, 0.88, -0.8) },   // overview
  { pos: new THREE.Vector3(0.5, 1.2, 0.15),  target: new THREE.Vector3(0.1, 0.9, -0.8) },  // lower angle, see electrons
  { pos: new THREE.Vector3(0.1, 1.1, 0.0),   target: new THREE.Vector3(0, 0.9, -0.97) },   // lean in toward resistor
  { pos: new THREE.Vector3(0, 1.55, 0.9),    target: new THREE.Vector3(0, 1.4, -2.1) },    // look up at chalkboard
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

function speakText(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.87;
  utterance.pitch = 1.02;
  utterance.volume = 1.0;
  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      const voice =
        voices.find(v => v.name === 'Samantha') ||
        voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => v.name.includes('Karen')) ||
        voices.find(v => v.lang === 'en-US' && v.localService) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };
  if (window.speechSynthesis.getVoices().length > 0) trySpeak();
  else window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
}

function drawCueCard(canvas: HTMLCanvasElement, stage: typeof STAGES[0], num: number, total: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#050814';
  ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.strokeStyle = 'rgba(251,191,36,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(4, 4, w - 8, h - 8);
  ctx.stroke();
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`Stage ${num} of ${total}  ·  ⚡ Electric Circuit`, 20, 38);
  ctx.fillStyle = 'rgba(251,191,36,0.3)';
  ctx.fillRect(20, 46, w - 40, 1);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  const titleY = wrapText(ctx, stage.title, 20, 72, w - 40, 30);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#d1d5db';
  const cueY = wrapText(ctx, stage.cue, 20, titleY + 6, w - 40, 26);
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(stage.formula, 20, Math.min(cueY + 18, h - 16));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(' ');
  let line = '', cy = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trimEnd(), x, cy); line = word + ' '; cy += lh; }
    else line = test;
  }
  if (line.trim()) { ctx.fillText(line.trimEnd(), x, cy); cy += lh; }
  return cy;
}

function drawChalkboard(canvas: HTMLCanvasElement, R: number, I: number, closed: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#1a3020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let y = 30; y < canvas.height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.font = 'bold 28px serif'; ctx.fillStyle = 'rgba(240,240,230,0.92)'; ctx.fillText("Ohm's Law", 20, 42);
  ctx.font = '56px serif'; ctx.fillStyle = 'rgba(255,255,200,0.96)'; ctx.fillText('V = I × R', 20, 108);
  ctx.font = '22px monospace';
  ctx.fillStyle = '#fbbf24'; ctx.fillText(`V = ${VOLTAGE.toFixed(1)} V`, 20, 152);
  ctx.fillStyle = closed ? '#60a5fa' : '#6b7280'; ctx.fillText(`I = ${I.toFixed(3)} A`, 20, 182);
  ctx.fillStyle = '#f87171'; ctx.fillText(`R = ${R} Ω`, 20, 212);
  ctx.font = '18px monospace';
  ctx.fillStyle = closed ? '#4ade80' : '#9ca3af'; ctx.fillText(`→ Circuit: ${closed ? 'CLOSED' : 'OPEN  '}`, 20, 246);
}

export default function CircuitViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const switchLeverRef = useRef<THREE.Mesh | null>(null);
  const bulbLightRef = useRef<THREE.PointLight | null>(null);
  const bulbMeshRef = useRef<THREE.Mesh | null>(null);
  const filamentRef = useRef<THREE.Mesh | null>(null);
  const electronMeshesRef = useRef<THREE.Mesh[]>([]);
  const electronTsRef = useRef<number[]>([]);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const resistorBodyRef = useRef<THREE.Mesh | null>(null);
  const resistorBandRef = useRef<THREE.Mesh | null>(null);
  const chalkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chalkTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cueTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cueNeedsUpdateRef = useRef(true);
  const chalkNeedsUpdateRef = useRef(true);

  // Camera animation
  const camGoalPos = useRef(STAGE_CAMERAS[0].pos.clone());
  const camGoalTarget = useRef(STAGE_CAMERAS[0].target.clone());
  const camAnimating = useRef(false);

  const switchClosedRef = useRef(false);
  const resistorIdxRef = useRef(0);
  const stageRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [switchClosed, setSwitchClosed] = useState(false);
  const [resistorIdx, setResistorIdx] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) setVrSupported(true);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x150e09);
    scene.fog = new THREE.Fog(0x150e09, 6, 18);

    // ── Camera — user stands at Z=0, workbench is at Z=BZ (-0.8) ─────────
    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.05, 30);
    camera.position.copy(STAGE_CAMERAS[0].pos);
    camera.lookAt(STAGE_CAMERAS[0].target);

    // ── Lights ────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x201508, 1.2);
    scene.add(ambient);
    const keyLight = new THREE.SpotLight(0xfff0c0, 2.8, 8, Math.PI / 5, 0.5, 1.5);
    keyLight.position.set(0, 2.8, BZ + 0.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.target.position.set(0, 0.88, BZ);
    scene.add(keyLight, keyLight.target);

    // ── Workshop room ─────────────────────────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.5), wallMat);
    backWall.position.set(0, 1.75, -3.0); scene.add(backWall);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ color: 0x120d08 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.2; scene.add(ceil);
    [-4.0, 4.0].forEach(x => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.5), wallMat);
      sw.position.set(x, 1.75, -1.5); sw.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(sw);
    });

    // ── Overhead lamp ──────────────────────────────────────────────────────
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.8 }));
    lampArm.position.set(0, 2.8, BZ + 0.3); scene.add(lampArm);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7, side: THREE.DoubleSide }));
    lampShade.position.set(0, 2.18, BZ + 0.3); scene.add(lampShade);
    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfffde7, emissive: 0xfffde7, emissiveIntensity: 1.5 }));
    lampBulb.position.set(0, 2.26, BZ + 0.3); scene.add(lampBulb);
    const lampLight = new THREE.PointLight(0xfff8e1, 2.0, 6, 2);
    lampLight.position.set(0, 2.25, BZ + 0.3); scene.add(lampLight);

    // ── Chalkboard (back wall — fully visible, no cue card in front) ──────
    const chalkCanvas = document.createElement('canvas');
    chalkCanvas.width = 512; chalkCanvas.height = 280;
    chalkCanvasRef.current = chalkCanvas;
    const chalkTex = new THREE.CanvasTexture(chalkCanvas);
    chalkTextureRef.current = chalkTex;
    const chalkboard = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1), new THREE.MeshBasicMaterial({ map: chalkTex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    chalkboard.position.set(0, 1.5, -2.93); scene.add(chalkboard);
    const chalkFrame = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.22, 0.04), new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.8 }));
    chalkFrame.position.set(0, 1.5, -2.97); scene.add(chalkFrame);

    // ── Tool shelves (side walls) ─────────────────────────────────────────
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3d2a14, roughness: 0.9 });
    [-3.85, 3.85].forEach((x, si) => {
      for (let s = 0; s < 2; s++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.28), shelfMat);
        shelf.position.set(x + (x < 0 ? 0.25 : -0.25), 1.1 + s * 0.7, BZ - 0.2);
        scene.add(shelf);
        for (let b = 0; b < 3; b++) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12 + Math.random() * 0.1, 0.12), new THREE.MeshStandardMaterial({ color: [0x374151, 0x1e3a5f, 0x2d1b1b][b], roughness: 0.8 }));
          box.position.set(x + (x < 0 ? 0.4 : -0.4) + (b - 1) * 0.22, 1.14 + s * 0.7 + 0.09, BZ - 0.22);
          scene.add(box);
        }
      }
      if (si === 0) {
        const mm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.07), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }));
        mm.position.set(-3.6, 1.28, BZ - 0.22); scene.add(mm);
      }
    });

    // ── Workbench (workbench center at Z = BZ) ────────────────────────────
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: 0.85 });
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.1), benchMat);
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

    const pcb = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.06, 3.8), new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7, metalness: 0.1 }));
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
    circuitGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 100, 0.028, 7, true), new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.65, roughness: 0.35 })));

    // ── Battery ────────────────────────────────────────────────────────────
    const batGroup = new THREE.Group();
    batGroup.position.set(-1.8, 0, 0); batGroup.rotation.z = Math.PI / 2;
    const batBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.5 }));
    batGroup.add(batBody);
    const posT = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 }));
    posT.position.y = 0.49; batGroup.add(posT);
    const negT = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 }));
    negT.position.y = -0.49; batGroup.add(negT);
    batGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.02), new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.2 })));
    batGroup.rotation.z = Math.PI / 2;
    circuitGroup.add(batGroup);

    // ── Switch ────────────────────────────────────────────────────────────
    const switchBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.25), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7 }));
    switchBase.position.set(0, 0.06, 1.1); circuitGroup.add(switchBase);
    const switchLever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.3, emissive: 0xef4444, emissiveIntensity: 0.15 }));
    switchLever.position.set(0, 0.25, 1.1); switchLeverRef.current = switchLever;
    circuitGroup.add(switchLever);

    // ── Resistor ──────────────────────────────────────────────────────────
    const resistorGroup = new THREE.Group();
    resistorGroup.position.set(0, 0, -1.1); resistorGroup.rotation.z = Math.PI / 2;
    const resBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 12), new THREE.MeshStandardMaterial({ color: RESISTORS[0].color, roughness: 0.7 }));
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
    bulbGroup.position.set(1.8, 0, 0);
    const bulbGlass = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.72), new THREE.MeshStandardMaterial({ color: 0xfef9e7, transparent: true, opacity: 0.55, roughness: 0.05, emissive: 0xfef9e7, emissiveIntensity: 0 }));
    bulbMeshRef.current = bulbGlass; bulbGroup.add(bulbGlass);
    bulbGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9 })));
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
    const electronMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x3b82f6, emissiveIntensity: 2.0, roughness: 0.1 });
    const electronMeshes: THREE.Mesh[] = [];
    const electronTs: number[] = [];
    for (let i = 0; i < ELECTRON_COUNT; i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), electronMat);
      e.visible = false; circuitGroup.add(e);
      electronMeshes.push(e); electronTs.push(i / ELECTRON_COUNT);
    }
    electronMeshesRef.current = electronMeshes;
    electronTsRef.current = electronTs;

    // ── 3D Cue card — LEFT side of bench, chalkboard fully visible ────────
    const cueCanvas = document.createElement('canvas');
    cueCanvas.width = 512; cueCanvas.height = 256;
    cueCanvasRef.current = cueCanvas;
    const cueTexture = new THREE.CanvasTexture(cueCanvas);
    cueTextureRef.current = cueTexture;
    const cueMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: cueTexture, transparent: true }));
    cueMesh.position.set(-1.5, 1.5, BZ); // left side at bench depth
    scene.add(cueMesh);

    // VR nav buttons (below cue card on the left)
    const btnMat = (col: number) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 });
    const prevBtn = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.04), btnMat(0x374151));
    prevBtn.position.set(-1.65, 1.17, BZ); prevBtn.name = 'btn-prev'; scene.add(prevBtn);
    const nextBtn = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.04), btnMat(0xb45309));
    nextBtn.position.set(-1.35, 1.17, BZ); nextBtn.name = 'btn-next'; scene.add(nextBtn);

    // VR switch button (floating above near edge of bench, easy to reach)
    const vrSwBtn = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.04), btnMat(0xef4444));
    vrSwBtn.position.set(0, 1.2, BZ + 0.35); vrSwBtn.name = 'btn-switch'; scene.add(vrSwBtn);

    // VR resistor buttons (above near edge, to the right)
    const resButtons: THREE.Mesh[] = [];
    RESISTORS.forEach((r, i) => {
      const rb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.04), btnMat(r.color));
      rb.position.set(0.55 + i * 0.22, 1.1, BZ + 0.35); rb.name = `btn-res-${i}`; scene.add(rb);
      resButtons.push(rb);
    });

    const interactables = [prevBtn, nextBtn, vrSwBtn, ...resButtons];

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

    const ctrlRaycaster = new THREE.Raycaster();
    const onCtrlSelect = (event: Event) => {
      const ctrl = event.target as unknown as THREE.XRTargetRaySpace;
      ctrlRaycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      ctrlRaycaster.ray.direction.set(0, 0, -1).applyQuaternion(ctrl.quaternion);
      const hits = ctrlRaycaster.intersectObjects(interactables);
      if (hits.length > 0) {
        const name = hits[0].object.name;
        if (name === 'btn-switch') {
          setSwitchClosed(prev => { const n = !prev; switchClosedRef.current = n; chalkNeedsUpdateRef.current = true; return n; });
        } else if (name === 'btn-next') {
          const next = Math.min(stageRef.current + 1, STAGES.length - 1);
          stageRef.current = next; cueNeedsUpdateRef.current = true; setStage(next);
          speakText(NARRATIONS[next]);
        } else if (name === 'btn-prev') {
          const next = Math.max(stageRef.current - 1, 0);
          stageRef.current = next; cueNeedsUpdateRef.current = true; setStage(next);
          speakText(NARRATIONS[next]);
        } else if (name.startsWith('btn-res-')) {
          const idx = parseInt(name.slice(-1));
          setResistorIdx(idx); resistorIdxRef.current = idx; chalkNeedsUpdateRef.current = true;
        }
      }
    };
    ctrl0.addEventListener('selectstart', onCtrlSelect as any);
    ctrl1.addEventListener('selectstart', onCtrlSelect as any);

    // ── Mouse click on switch ──────────────────────────────────────────────
    const mouseRaycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onMouseDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRaycaster.setFromCamera(mouse, camera);
      const hits = mouseRaycaster.intersectObject(switchLever, true);
      if (hits.length > 0) {
        setSwitchClosed(prev => { const n = !prev; switchClosedRef.current = n; chalkNeedsUpdateRef.current = true; return n; });
      }
    };
    renderer.domElement.addEventListener('mousedown', onMouseDown);

    // ── OrbitControls ────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(STAGE_CAMERAS[0].target);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 0.3; controls.maxDistance = 5;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controlsRef.current = controls;

    // ── Render loop ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      clock.getDelta();
      const closed = switchClosedRef.current;
      const rIdx = resistorIdxRef.current;
      const R = RESISTORS[rIdx].ohms;
      const I = closed ? VOLTAGE / R : 0;
      const brightness = closed ? Math.min(I / (VOLTAGE / RESISTORS[0].ohms), 1) : 0;

      // Smooth camera animation between stages (browser only)
      if (!renderer.xr.isPresenting && camAnimating.current) {
        camera.position.lerp(camGoalPos.current, 0.045);
        controls.target.lerp(camGoalTarget.current, 0.045);
        if (camera.position.distanceTo(camGoalPos.current) < 0.008) {
          camera.position.copy(camGoalPos.current);
          controls.target.copy(camGoalTarget.current);
          camAnimating.current = false;
        }
      }

      // Update cue card canvas
      if (cueNeedsUpdateRef.current && cueCanvasRef.current) {
        drawCueCard(cueCanvasRef.current, STAGES[stageRef.current], stageRef.current + 1, STAGES.length);
        if (cueTextureRef.current) cueTextureRef.current.needsUpdate = true;
        cueNeedsUpdateRef.current = false;
      }
      // Update chalkboard
      if (chalkNeedsUpdateRef.current && chalkCanvasRef.current) {
        drawChalkboard(chalkCanvasRef.current, R, I, closed);
        if (chalkTextureRef.current) chalkTextureRef.current.needsUpdate = true;
        chalkNeedsUpdateRef.current = false;
      }

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
      const speed = closed ? 0.007 * Math.sqrt(I) : 0;
      const t = clock.elapsedTime;
      electronMeshes.forEach((e, i) => {
        e.visible = closed;
        if (closed && curveRef.current) {
          electronTsRef.current[i] = (electronTsRef.current[i] + speed) % 1;
          const pt = curveRef.current.getPoint(electronTsRef.current[i]);
          e.position.copy(pt); e.position.y += 0.06;
          (e.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 8 + i * 0.4) * 0.5;
        }
      });

      // Resistor color
      if (resistorBodyRef.current) (resistorBodyRef.current.material as THREE.MeshStandardMaterial).color.setHex(RESISTORS[rIdx].color);
      if (resistorBandRef.current) (resistorBandRef.current.material as THREE.MeshStandardMaterial).color.setHex(RESISTORS[rIdx].bandColor);

      // Cue card + buttons always face the camera
      const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      cueMesh.lookAt(cam.position);
      prevBtn.lookAt(cam.position); nextBtn.lookAt(cam.position);
      vrSwBtn.lookAt(cam.position); resButtons.forEach(rb => rb.lookAt(cam.position));

      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    // Initial draws
    drawCueCard(cueCanvas, STAGES[0], 1, STAGES.length);
    cueTexture.needsUpdate = true;
    drawChalkboard(chalkCanvas, RESISTORS[0].ohms, 0, false);
    chalkTex.needsUpdate = true;

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      window.removeEventListener('resize', onResize);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const goToStage = useCallback((next: number) => {
    stageRef.current = next;
    cueNeedsUpdateRef.current = true;
    // Animate camera to stage-specific position
    camGoalPos.current.copy(STAGE_CAMERAS[next].pos);
    camGoalTarget.current.copy(STAGE_CAMERAS[next].target);
    camAnimating.current = true;
    setStage(next);
    speakText(NARRATIONS[next]);
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
    } catch { setStarted(true); }
  }, []);

  const toggleSwitch = () => {
    setSwitchClosed(prev => {
      const n = !prev; switchClosedRef.current = n; chalkNeedsUpdateRef.current = true;
      if (n && stageRef.current === 0) goToStage(1);
      return n;
    });
  };

  const changeResistor = (idx: number) => {
    setResistorIdx(idx); resistorIdxRef.current = idx; chalkNeedsUpdateRef.current = true;
    if (stageRef.current < 2) goToStage(2);
  };

  const R = RESISTORS[resistorIdx].ohms;
  const I = switchClosed ? VOLTAGE / R : 0;
  const stageInfo = STAGES[stage];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#0d1117', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

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
              <button onClick={() => { setStarted(true); speakText(NARRATIONS[0]); }} style={{ padding: '14px 28px', borderRadius: 12, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>💻</span> View in Browser
              </button>
            </div>
            {!vrSupported && <p style={{ marginTop: 20, color: '#374151', fontSize: '0.8rem' }}>For immersive VR, open this page in Meta Quest Browser over HTTPS on your local network.</p>}
          </div>
        </div>
      )}

      {started && (
        <>
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
          <div style={{ position: 'absolute', top: 80, right: 16, width: 268, background: 'rgba(10,7,3,0.93)', borderRadius: 14, padding: '16px', border: '1px solid rgba(251,191,36,0.18)', color: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 0 }}>
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
            Click switch · Drag to orbit · Scroll to zoom
          </div>
        </>
      )}
    </div>
  );
}
