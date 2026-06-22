'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VOLTAGE = 9; // 9V battery

interface ResistorPreset { label: string; ohms: number; color: number; bandColor: number }
const RESISTORS: ResistorPreset[] = [
  { label: '10 Ω (low)', ohms: 10, color: 0xc2410c, bandColor: 0x1d4ed8 },
  { label: '50 Ω (mid)', ohms: 50, color: 0x92400e, bandColor: 0xd97706 },
  { label: '200 Ω (high)', ohms: 200, color: 0x78350f, bandColor: 0xdc2626 },
];

const STAGES = [
  {
    title: '⚡ Open Circuit',
    cue: 'The switch is OPEN. No current can flow. The bulb is off.',
    detail: 'An electric circuit needs a complete, unbroken path for current to flow. When the switch is open, there is a gap — electrons cannot pass through.',
    formula: 'I = V / R',
    note: 'Switch is open → I = 0 A → Bulb off',
  },
  {
    title: '💡 Closed Circuit',
    cue: 'The switch is CLOSED. Current flows. The bulb glows!',
    detail: 'Electrons leave the negative terminal of the battery, flow through the wire, through the resistor, through the bulb, and back to the positive terminal.',
    formula: `I = ${VOLTAGE}V ÷ R`,
    note: 'Watch the blue electrons moving through the circuit.',
  },
  {
    title: '🔴 Changing Resistance',
    cue: 'Change the resistor value. Watch the current change and the bulb brightness change.',
    detail: 'Higher resistance → lower current → dimmer bulb. This is Ohm\'s Law: V = I × R. The voltage (9V) stays constant; resistance controls how much current flows.',
    formula: 'V = I × R   (Ohm\'s Law)',
    note: 'Try all three resistors. Compare brightness.',
  },
  {
    title: '📊 Understanding Ohm\'s Law',
    cue: 'Voltage, Current, and Resistance are always linked by V = IR.',
    detail: 'Think of voltage as water pressure, current as water flow rate, and resistance as the narrowness of the pipe. More resistance = less flow for the same pressure.',
    formula: 'V = I × R',
    note: 'This law applies to all circuits — from phone chargers to power grids.',
  },
];

// Wire path coordinates — a rectangular loop on the XZ plane
const WIRE_POINTS = [
  new THREE.Vector3(-1.8, 0.08, 0),     // battery negative
  new THREE.Vector3(-1.8, 0.08, 1.1),   // bottom-left corner
  new THREE.Vector3(0, 0.08, 1.1),      // switch position (bottom)
  new THREE.Vector3(1.8, 0.08, 1.1),    // bottom-right corner
  new THREE.Vector3(1.8, 0.08, 0),      // bulb position
  new THREE.Vector3(1.8, 0.08, -1.1),   // top-right corner
  new THREE.Vector3(0, 0.08, -1.1),     // resistor position (top)
  new THREE.Vector3(-1.8, 0.08, -1.1),  // top-left corner
  new THREE.Vector3(-1.8, 0.08, 0),     // battery positive (close loop)
];

export default function CircuitViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const switchMeshRef = useRef<THREE.Mesh | null>(null);
  const bulbLightRef = useRef<THREE.PointLight | null>(null);
  const bulbMeshRef = useRef<THREE.Mesh | null>(null);
  const electronMeshesRef = useRef<THREE.Mesh[]>([]);
  const electronTsRef = useRef<number[]>([]);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const resistorBodyRef = useRef<THREE.Mesh | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayTextureRef = useRef<THREE.CanvasTexture | null>(null);

  const [switchClosed, setSwitchClosed] = useState(false);
  const [resistorIdx, setResistorIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [vrSupported, setVrSupported] = useState(false);

  const switchClosedRef = useRef(false);
  const resistorIdxRef = useRef(0);
  const stageRef = useRef(0);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      (navigator as any).xr?.isSessionSupported?.('immersive-vr').then((ok: boolean) => setVrSupported(ok));
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    // ── Camera ─────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 80);
    camera.position.set(0, 4.5, 5.5);
    camera.lookAt(0, 0, 0);

    // ── Lights ─────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const topLight = new THREE.DirectionalLight(0xf0f4ff, 1.1);
    topLight.position.set(3, 8, 4);
    topLight.castShadow = true;
    topLight.shadow.mapSize.set(1024, 1024);
    scene.add(topLight);

    // ── Workbench ──────────────────────────────────────────
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x2c1810, roughness: 0.8 })
    );
    bench.position.y = -0.3;
    bench.receiveShadow = true;
    scene.add(bench);

    // ── PCB Board ──────────────────────────────────────────
    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.06, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7, metalness: 0.1 })
    );
    pcb.position.y = -0.07;
    pcb.receiveShadow = true;
    scene.add(pcb);

    // PCB holes grid
    for (let x = -2.4; x <= 2.4; x += 0.3) {
      for (let z = -1.6; z <= 1.6; z += 0.3) {
        const hole = new THREE.Mesh(
          new THREE.CircleGeometry(0.04, 6),
          new THREE.MeshStandardMaterial({ color: 0x0a2e1a })
        );
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(x, -0.03, z);
        scene.add(hole);
      }
    }

    // ── Wire path / tube ───────────────────────────────────
    const curve = new THREE.CatmullRomCurve3(WIRE_POINTS, true, 'chordal', 0);
    curveRef.current = curve;
    const wireTube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 100, 0.025, 6, true),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.4 })
    );
    scene.add(wireTube);

    // ── Battery ────────────────────────────────────────────
    const batGroup = new THREE.Group();
    batGroup.position.set(-1.8, 0, 0);
    batGroup.rotation.z = Math.PI / 2;
    const batBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.5, metalness: 0.2 })
    );
    batGroup.add(batBody);
    // + terminal
    const posT = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 }));
    posT.position.y = 0.49;
    batGroup.add(posT);
    // - terminal
    const negT = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 }));
    negT.position.y = -0.49;
    batGroup.add(negT);
    // Label
    const batLabel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.01), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
    batGroup.add(batLabel);
    // +/- text meshes (use simple markers)
    batGroup.rotation.z = Math.PI / 2;
    scene.add(batGroup);

    // Voltage label plate
    const batCaption = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.25, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.2 })
    );
    batCaption.position.set(-1.8, 0.4, 0);
    scene.add(batCaption);

    // ── Switch ────────────────────────────────────────────
    const switchBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7 })
    );
    switchBase.position.set(0, 0.05, 1.1);
    scene.add(switchBase);

    const switchLever = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.4, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.4 })
    );
    switchLever.position.set(0, 0.15, 1.1);
    switchMeshRef.current = switchLever;
    scene.add(switchLever);

    // ── Resistor ──────────────────────────────────────────
    const resistorGroup = new THREE.Group();
    resistorGroup.position.set(0, 0, -1.1);
    resistorGroup.rotation.z = Math.PI / 2;
    const resBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: RESISTORS[0].color, roughness: 0.7 })
    );
    resistorBodyRef.current = resBody;
    resistorGroup.add(resBody);
    // Color bands
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.125, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: i === 1 ? RESISTORS[0].bandColor : 0x111827 })
      );
      band.position.y = -0.15 + i * 0.15;
      resistorGroup.add(band);
    }
    scene.add(resistorGroup);

    // ── Bulb ──────────────────────────────────────────────
    const bulbGroup = new THREE.Group();
    bulbGroup.position.set(1.8, 0, 0);
    // Glass dome
    const bulbGlass = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.05, emissive: 0xfef3c7, emissiveIntensity: 0 })
    );
    bulbMeshRef.current = bulbGlass;
    bulbGroup.add(bulbGlass);
    // Base
    const bulbBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.8 })
    );
    bulbBase.position.y = -0.18;
    bulbGroup.add(bulbBase);
    // Filament
    const filament = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.008, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfbbf24, emissiveIntensity: 0 })
    );
    filament.rotation.x = Math.PI / 2;
    filament.position.y = 0.03;
    bulbGroup.add(filament);
    scene.add(bulbGroup);

    // Bulb point light (glow)
    const bulbLight = new THREE.PointLight(0xfef3c7, 0, 4, 2);
    bulbLight.position.set(1.8, 0.5, 0);
    scene.add(bulbLight);
    bulbLightRef.current = bulbLight;

    // ── Electrons ─────────────────────────────────────────
    const ELECTRON_COUNT = 24;
    const electronMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x3b82f6, emissiveIntensity: 1.5, roughness: 0.2 });
    const electronMeshes: THREE.Mesh[] = [];
    const electronTs: number[] = [];
    for (let i = 0; i < ELECTRON_COUNT; i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), electronMat);
      e.visible = false;
      scene.add(e);
      electronMeshes.push(e);
      electronTs.push(i / ELECTRON_COUNT); // evenly distributed
    }
    electronMeshesRef.current = electronMeshes;
    electronTsRef.current = electronTs;

    // ── Display canvas (Ohm's Law readout) ────────────────
    const dc = document.createElement('canvas');
    dc.width = 256; dc.height = 128;
    const dctx = dc.getContext('2d')!;
    displayCanvasRef.current = dc;
    const displayTexture = new THREE.CanvasTexture(dc);
    displayTextureRef.current = displayTexture;
    const displayMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.8),
      new THREE.MeshStandardMaterial({ map: displayTexture, emissive: 0x111111, emissiveIntensity: 0.3 })
    );
    displayMesh.position.set(0, 0.6, -1.5);
    displayMesh.rotation.x = -Math.PI / 5;
    scene.add(displayMesh);

    // Display border
    const displayBorder = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.9, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.3 })
    );
    displayBorder.position.set(0, 0.6, -1.52);
    displayBorder.rotation.x = -Math.PI / 5;
    scene.add(displayBorder);

    // ── Controls ──────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    // ── Click on switch ────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onMouseDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(switchLever);
      if (hits.length > 0) {
        setSwitchClosed(prev => { const next = !prev; switchClosedRef.current = next; return next; });
      }
    };
    renderer.domElement.addEventListener('mousedown', onMouseDown);

    // ── Render loop ────────────────────────────────────────
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      const closed = switchClosedRef.current;
      const rIdx = resistorIdxRef.current;
      const R = RESISTORS[rIdx].ohms;
      const I = closed ? VOLTAGE / R : 0;
      const brightness = closed ? Math.min(I / (VOLTAGE / RESISTORS[0].ohms), 1) : 0;

      // Switch lever angle
      if (switchLever) {
        const targetAngle = closed ? -0.5 : 0.5;
        switchLever.rotation.x += (targetAngle - switchLever.rotation.x) * 0.1;
      }

      // Bulb brightness
      if (bulbLight) {
        bulbLight.intensity += (brightness * 2.5 - bulbLight.intensity) * 0.1;
      }
      if (bulbMeshRef.current) {
        const mat = bulbMeshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity += (brightness * 1.2 - mat.emissiveIntensity) * 0.1;
        mat.opacity = 0.4 + brightness * 0.5;
        mat.needsUpdate = true;
      }

      // Electrons
      const speed = closed ? 0.006 * Math.sqrt(I) : 0;
      electronMeshes.forEach((e, i) => {
        e.visible = closed;
        if (closed) {
          electronTsRef.current[i] = (electronTsRef.current[i] + speed) % 1;
          const pt = curve.getPoint(electronTsRef.current[i]);
          e.position.copy(pt);
          e.position.y += 0.04;
        }
      });

      // Resistor color update (done imperatively when resistor changes)
      if (resistorBodyRef.current) {
        const mat = resistorBodyRef.current.material as THREE.MeshStandardMaterial;
        mat.color.setHex(RESISTORS[rIdx].color);
        mat.needsUpdate = true;
      }

      // Update display canvas
      const ctx = displayCanvasRef.current?.getContext('2d');
      if (ctx && displayTextureRef.current) {
        ctx.fillStyle = '#0a0f1a';
        ctx.fillRect(0, 0, 256, 128);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#4ade80';
        ctx.fillText('⚡ OHM\'S LAW  V = I × R', 10, 22);
        ctx.strokeStyle = '#1e3a2e';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10, 30); ctx.lineTo(246, 30); ctx.stroke();

        ctx.font = '13px monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`V (Voltage)   = ${VOLTAGE.toFixed(1)} V`, 10, 52);
        ctx.fillStyle = '#60a5fa';
        ctx.fillText(`I (Current)   = ${I.toFixed(3)} A`, 10, 72);
        ctx.fillStyle = '#f87171';
        ctx.fillText(`R (Resistance)= ${R} Ω`, 10, 92);
        ctx.fillStyle = closed ? '#4ade80' : '#6b7280';
        ctx.fillText(`Switch: ${closed ? 'CLOSED' : 'OPEN'}`, 10, 114);
        displayTextureRef.current.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);
    });

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
    };
  }, []);

  const enterVR = useCallback(async () => {
    if (!rendererRef.current) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor'],
      });
      rendererRef.current.xr.setSession(session);
    } catch {
      alert('Could not start VR session.');
    }
  }, []);

  const toggleSwitch = () => {
    setSwitchClosed(prev => { const n = !prev; switchClosedRef.current = n; return n; });
    if (!switchClosed && stage === 0) {
      setStage(1); stageRef.current = 1;
    }
  };

  const changeResistor = (idx: number) => {
    setResistorIdx(idx);
    resistorIdxRef.current = idx;
    setStage(2); stageRef.current = 2;
  };

  const R = RESISTORS[resistorIdx].ohms;
  const I = switchClosed ? VOLTAGE / R : 0;
  const stageInfo = STAGES[stage];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Stage counter */}
      <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', borderRadius: 8, padding: '6px 14px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
        Stage {stage + 1} / {STAGES.length}
      </div>

      {/* Interactive controls panel */}
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={toggleSwitch} style={{ padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', background: switchClosed ? '#16a34a' : '#dc2626', color: '#fff', minWidth: 130 }}>
          {switchClosed ? '🔌 Switch: ON' : '⭕ Switch: OFF'}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {RESISTORS.map((r, i) => (
            <button key={i} onClick={() => changeResistor(i)} style={{ padding: '9px 12px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', border: `1px solid ${i === resistorIdx ? '#ef4444' : 'rgba(255,255,255,0.12)'}`, cursor: 'pointer', background: i === resistorIdx ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', color: i === resistorIdx ? '#ef4444' : '#9ca3af' }}>
              {r.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>CURRENT</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: switchClosed ? '#60a5fa' : '#374151', fontFamily: 'monospace' }}>
            {I.toFixed(3)} A
          </div>
        </div>
      </div>

      {/* Cue card */}
      <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', width: 'min(600px, 92vw)', background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#fbbf24', marginBottom: 8 }}>⚡ Electric Circuit · Stage {stage + 1}</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb', marginBottom: 8 }}>{stageInfo.title}</h3>
        <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 10 }}>{stageInfo.cue}</p>
        <p style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 10 }}>{stageInfo.detail}</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <code style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace' }}>{stageInfo.formula}</code>
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{stageInfo.note}</span>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => { const n = Math.max(stage - 1, 0); setStage(n); stageRef.current = n; }} disabled={stage === 0} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: stage === 0 ? '#374151' : '#e5e7eb', cursor: stage === 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
          ← Prev
        </button>
        <button onClick={() => { const n = Math.min(stage + 1, STAGES.length - 1); setStage(n); stageRef.current = n; }} disabled={stage === STAGES.length - 1} style={{ padding: '10px 24px', borderRadius: 8, background: '#b45309', border: 'none', color: '#fff', cursor: stage === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: stage === STAGES.length - 1 ? 0.4 : 1 }}>
          Next Stage →
        </button>
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#93c5fd', fontSize: '0.85rem', fontFamily: 'monospace' }}>
          V={VOLTAGE}V  R={R}Ω  I={I.toFixed(3)}A
        </div>
        {vrSupported && (
          <button onClick={enterVR} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
            🥽 Enter VR
          </button>
        )}
      </div>

      {/* Click hint */}
      <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', color: '#4b5563', fontSize: '0.78rem', textAlign: 'center' }}>
        Click the red switch lever in the 3D scene to toggle it · Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
}
