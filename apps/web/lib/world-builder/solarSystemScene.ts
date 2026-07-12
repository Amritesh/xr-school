import * as THREE from 'three';
import {
  SOLAR_TEXTURES,
  configureSolarTexture,
  type SolarTextureId,
} from './solarSystemAssets';
import {
  COMPRESSED_SUN_RADIUS,
  MISSION_COMET,
  SOLAR_PLANETS,
  advanceComet,
  blendedOrbitRadius,
  blendedPlanetRadius,
  blendedSunRadius,
  cometRadiusAu,
  completedLapsSince,
  getPlanet,
  orbitAngleAtDay,
  type CometState,
  type CometTailChoice,
  type PlanetId,
  type PlanetSpec,
} from './solarSystemAstronomy';

/**
 * One persistent, living solar system. Planets never stop orbiting — the
 * lesson's stages change the camera, the time compression, and which
 * instruments are visible, never the world itself. All motion is derived
 * from the astronomy module inside the fixed-step `advance()`, so what the
 * learner sees is the scientific model, not a choreographed animation.
 */

export const ECLIPTIC_Y = 1.32;

export interface SolarSystemSceneConfig {
  scene: THREE.Scene;
  renderer?: THREE.WebGLRenderer;
}

// ── Deterministic pseudo-randomness (seeded; keeps builds reproducible) ──

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Procedural texture painting ──────────────────────────────────────────

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paintPlanetSurface(ctx: CanvasRenderingContext2D, planet: PlanetSpec, random: () => number) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const [bright, mid, dark, accent] = planet.palette;

  if (planet.kind === 'rocky') {
    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, mid);
    base.addColorStop(0.5, bright);
    base.addColorStop(1, mid);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // Terrain mottling, then craters on airless/thin-atmosphere worlds.
    for (let index = 0; index < 340; index += 1) {
      ctx.fillStyle = [dark, mid, accent][Math.floor(random() * 3)];
      ctx.globalAlpha = 0.05 + random() * 0.13;
      const blobRadius = 3 + random() * 26;
      ctx.beginPath();
      ctx.ellipse(random() * width, random() * height, blobRadius * (1 + random()), blobRadius, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (planet.id === 'mercury' || planet.id === 'mars') {
      for (let index = 0; index < 90; index += 1) {
        const craterRadius = 1.5 + random() * 6;
        const x = random() * width;
        const y = random() * height;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(x, y, craterRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = bright;
        ctx.beginPath();
        ctx.arc(x - craterRadius * 0.25, y - craterRadius * 0.25, craterRadius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (planet.id === 'earth') {
      // Continent masses as clustered blobs, then polar ice.
      ctx.fillStyle = planet.palette[2];
      for (let landmass = 0; landmass < 7; landmass += 1) {
        let x = random() * width;
        let y = height * (0.2 + random() * 0.6);
        for (let step = 0; step < 26; step += 1) {
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.ellipse((x + width) % width, y, 8 + random() * 20, 6 + random() * 12, random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
          x += (random() - 0.5) * 34;
          y += (random() - 0.5) * 18;
        }
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, width, height * 0.06);
      ctx.fillRect(0, height * 0.94, width, height * 0.06);
      ctx.globalAlpha = 1;
    }

    if (planet.id === 'mars') {
      // Polar caps and a hint of Valles Marineris.
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#f4ede2';
      ctx.fillRect(0, 0, width, height * 0.05);
      ctx.fillRect(0, height * 0.95, width, height * 0.05);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(width * 0.3, height * 0.55);
      ctx.bezierCurveTo(width * 0.42, height * 0.5, width * 0.52, height * 0.6, width * 0.62, height * 0.55);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    return;
  }

  // Gas and ice giants: latitudinal bands with turbulent edges.
  const bandColors = [bright, mid, dark, accent];
  const bandCount = planet.kind === 'gas-giant' ? 14 : 8;
  for (let band = 0; band < bandCount; band += 1) {
    const y0 = (band / bandCount) * height;
    const bandHeight = height / bandCount;
    ctx.fillStyle = bandColors[band % bandColors.length];
    ctx.fillRect(0, y0, width, bandHeight + 1);
    // Turbulence: streaks along the band boundary.
    ctx.globalAlpha = planet.kind === 'gas-giant' ? 0.4 : 0.22;
    for (let streak = 0; streak < 26; streak += 1) {
      ctx.fillStyle = bandColors[Math.floor(random() * bandColors.length)];
      const streakY = y0 + random() * bandHeight;
      ctx.beginPath();
      ctx.ellipse(random() * width, streakY, 14 + random() * 42, 1.5 + random() * 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (planet.id === 'jupiter') {
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#c4502e';
    ctx.beginPath();
    ctx.ellipse(width * 0.68, height * 0.62, 44, 20, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#e8956d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(width * 0.68, height * 0.62, 52, 26, -0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function paintSun(ctx: CanvasRenderingContext2D, random: () => number) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#ffdf8a');
  base.addColorStop(0.5, '#ffb347');
  base.addColorStop(1, '#ff9040');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  // Granulation cells.
  for (let index = 0; index < 900; index += 1) {
    ctx.fillStyle = ['#fff2b8', '#ffc45e', '#ff8f3d', '#ffe89a'][Math.floor(random() * 4)];
    ctx.globalAlpha = 0.1 + random() * 0.2;
    const cell = 1.5 + random() * 7;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, cell, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few sunspot groups.
  for (let index = 0; index < 6; index += 1) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#8a4a17';
    ctx.beginPath();
    ctx.ellipse(random() * width, height * (0.3 + random() * 0.4), 4 + random() * 9, 3 + random() * 5, random(), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintGlow(ctx: CanvasRenderingContext2D, inner: string, outer: string) {
  const size = ctx.canvas.width;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

function paintLabel(ctx: CanvasRenderingContext2D, text: string, accent: string) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(4, 10, 24, 0.72)';
  const radius = 22;
  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, height - 8, radius);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 1);
}

// ── Small builders ───────────────────────────────────────────────────────

function makeLabelSprite(text: string, accent: string, owned: OwnedResources, scale = 0.5) {
  const texture = canvasTexture(256, 72, ctx => paintLabel(ctx, text, accent));
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  owned.textures.push(texture);
  owned.materials.push(material);
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale * 0.28, 1);
  sprite.renderOrder = 12;
  return sprite;
}

/** Invisible-but-raycastable padding so small planets are easy to select. */
function makeHitProxy(radius: number, owned: OwnedResources) {
  const geometry = new THREE.SphereGeometry(radius, 12, 8);
  const material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true });
  owned.geometries.push(geometry);
  owned.materials.push(material);
  const proxy = new THREE.Mesh(geometry, material);
  proxy.name = 'hit-proxy';
  return proxy;
}

function makeArrowMesh(color: THREE.ColorRepresentation, length: number, owned: OwnedResources) {
  const group = new THREE.Group();
  const shaftGeometry = new THREE.CylinderGeometry(0.012, 0.012, length * 0.7, 8);
  const headGeometry = new THREE.ConeGeometry(0.038, length * 0.3, 12);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });
  owned.geometries.push(shaftGeometry, headGeometry);
  owned.materials.push(material);
  const shaft = new THREE.Mesh(shaftGeometry, material);
  shaft.position.y = length * 0.35;
  const head = new THREE.Mesh(headGeometry, material);
  head.position.y = length * 0.85;
  group.add(shaft, head);
  return group;
}

interface OwnedResources {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

// ── Scene ────────────────────────────────────────────────────────────────

export function createSolarSystemScene(config: SolarSystemSceneConfig) {
  const owned: OwnedResources = { geometries: [], materials: [], textures: [] };
  const textureLoader = new THREE.TextureLoader();
  let disposed = false;
  const root = new THREE.Group();
  root.name = 'solar-system-world';
  config.scene.add(root);

  // Open space has no contact surfaces for ambient occlusion to shade, and
  // GTAO's opaque depth pre-pass would turn the corona/nebula glow sprites
  // into dark squares. Bloom stays on — the Sun is genuinely emissive.
  config.scene.userData.postProcessing = { ambientOcclusion: false };

  const random = mulberry32(20260711);

  function loadMappedTexture(
    textureId: SolarTextureId,
    material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial,
  ) {
    textureLoader.load(
      SOLAR_TEXTURES[textureId].path,
      loadedTexture => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        configureSolarTexture(loadedTexture, config.renderer);
        loadedTexture.name = `credited-solar-texture-${textureId}`;
        owned.textures.push(loadedTexture);
        material.map = loadedTexture;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        // The seeded procedural texture remains a complete offline fallback.
      },
    );
  }

  // ── Star field: two point layers plus a tilted galactic band ──────────
  function starLayer(count: number, minRadius: number, maxRadius: number, size: number, banded: boolean) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const starColor = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      const radius = minRadius + random() * (maxRadius - minRadius);
      const theta = random() * Math.PI * 2;
      let phi = Math.acos(2 * random() - 1);
      if (banded) phi = Math.PI / 2 + (random() - 0.5) * 0.5 * (random() < 0.7 ? 1 : 2.4);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const warmth = random();
      starColor.setHSL(warmth < 0.72 ? 0.6 : 0.09, 0.35 * random(), 0.68 + random() * 0.3);
      colors[index * 3] = starColor.r;
      colors[index * 3 + 1] = starColor.g;
      colors[index * 3 + 2] = starColor.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
    });
    owned.geometries.push(geometry);
    owned.materials.push(material);
    return new THREE.Points(geometry, material);
  }

  const stars = new THREE.Group();
  stars.name = 'star-field';
  stars.add(starLayer(3800, 42, 78, 0.085, false));
  stars.add(starLayer(1400, 42, 78, 0.16, false));
  const galaxyBand = new THREE.Group();
  galaxyBand.add(starLayer(2600, 46, 74, 0.11, true));
  galaxyBand.rotation.set(1.05, 0.2, 0.35);
  galaxyBand.name = 'milky-way-band';
  stars.add(galaxyBand);
  root.add(stars);

  // Distant nebulae as soft additive sprites.
  const nebulaColors: Array<[string, string]> = [
    ['rgba(99,102,241,0.55)', 'rgba(99,102,241,0)'],
    ['rgba(14,165,233,0.4)', 'rgba(14,165,233,0)'],
    ['rgba(217,70,239,0.35)', 'rgba(217,70,239,0)'],
  ];
  nebulaColors.forEach(([inner, outer], index) => {
    const texture = canvasTexture(256, 256, ctx => paintGlow(ctx, inner, outer));
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    owned.textures.push(texture);
    owned.materials.push(material);
    const nebula = new THREE.Sprite(material);
    nebula.name = 'distant-nebula';
    const angle = index * 2.4 + 0.8;
    nebula.position.set(Math.cos(angle) * 58, 8 + index * 9, Math.sin(angle) * 58);
    nebula.scale.setScalar(26 + index * 10);
    root.add(nebula);
  });

  // ── Mission deck: faint floor grid so VR learners have a ground plane ──
  const deck = new THREE.Group();
  deck.name = 'mission-deck';
  {
    const discGeometry = new THREE.CircleGeometry(16, 72);
    const discMaterial = new THREE.MeshBasicMaterial({
      color: '#0b1526',
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    owned.geometries.push(discGeometry);
    owned.materials.push(discMaterial);
    const disc = new THREE.Mesh(discGeometry, discMaterial);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.001;
    deck.add(disc);
    for (let ring = 1; ring <= 4; ring += 1) {
      const ringGeometry = new THREE.RingGeometry(ring * 4 - 0.012, ring * 4 + 0.012, 96);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: '#2c4a75',
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      owned.geometries.push(ringGeometry);
      owned.materials.push(ringMaterial);
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.002;
      deck.add(ringMesh);
    }
  }
  root.add(deck);

  // ── The Sun ────────────────────────────────────────────────────────────
  const sun = new THREE.Group();
  sun.name = 'inspect-sun';
  sun.position.set(0, ECLIPTIC_Y, 0);
  const sunTexture = canvasTexture(512, 256, ctx => paintSun(ctx, random));
  const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
  const sunGeometry = new THREE.SphereGeometry(1, 48, 32);
  owned.textures.push(sunTexture);
  owned.materials.push(sunMaterial);
  owned.geometries.push(sunGeometry);
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = 'sun-photosphere';
  sunMesh.scale.setScalar(COMPRESSED_SUN_RADIUS);
  sun.add(sunMesh);
  loadMappedTexture('sun', sunMaterial);

  const coronaTexture = canvasTexture(256, 256, ctx => paintGlow(ctx, 'rgba(255,190,90,0.85)', 'rgba(255,120,40,0)'));
  const coronaMaterial = new THREE.SpriteMaterial({
    map: coronaTexture,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  owned.textures.push(coronaTexture);
  owned.materials.push(coronaMaterial);
  const corona = new THREE.Sprite(coronaMaterial);
  corona.name = 'sun-corona-glow';
  corona.scale.setScalar(COMPRESSED_SUN_RADIUS * 4.6);
  sun.add(corona);
  sun.add(makeHitProxy(COMPRESSED_SUN_RADIUS * 1.5, owned));

  const sunLight = new THREE.PointLight('#ffd9a0', 210, 0, 1.75);
  sun.add(sunLight);
  root.add(sun);

  // ── Planets ────────────────────────────────────────────────────────────
  interface PlanetHandle {
    spec: PlanetSpec;
    group: THREE.Group;
    body: THREE.Mesh;
    tiltPivot: THREE.Group;
    label: THREE.Sprite;
    locator: THREE.Sprite;
    velocityArrow: THREE.Group;
    readout?: THREE.Sprite;
    extras: THREE.Object3D[];
  }

  const planets = {} as Record<PlanetId, PlanetHandle>;
  const planetGeometry = new THREE.SphereGeometry(1, 40, 26);
  owned.geometries.push(planetGeometry);

  const locatorTexture = canvasTexture(128, 128, ctx => {
    const size = ctx.canvas.width;
    ctx.strokeStyle = 'rgba(148, 197, 255, 0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  });
  owned.textures.push(locatorTexture);

  for (const spec of SOLAR_PLANETS) {
    const group = new THREE.Group();
    group.name = `planet-${spec.id}`;

    const tiltPivot = new THREE.Group();
    tiltPivot.rotation.z = THREE.MathUtils.degToRad(spec.axialTiltDegrees);
    group.add(tiltPivot);

    const surfaceTexture = canvasTexture(512, 256, ctx => paintPlanetSurface(ctx, spec, random));
    const surfaceMaterial = new THREE.MeshStandardMaterial({
      map: surfaceTexture,
      bumpMap: surfaceTexture,
      bumpScale: 0.02,
      roughness: spec.id === 'earth' ? 0.55 : 0.85,
      metalness: 0,
    });
    owned.textures.push(surfaceTexture);
    owned.materials.push(surfaceMaterial);
    const body = new THREE.Mesh(planetGeometry, surfaceMaterial);
    body.name = `planet-${spec.id}-body`;
    tiltPivot.add(body);
    loadMappedTexture(spec.id, surfaceMaterial);

    const extras: THREE.Object3D[] = [];

    if (spec.id === 'earth') {
      const cloudTexture = canvasTexture(512, 256, ctx => {
        ctx.clearRect(0, 0, 512, 256);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let index = 0; index < 130; index += 1) {
          ctx.globalAlpha = 0.16 + random() * 0.3;
          ctx.beginPath();
          ctx.ellipse(random() * 512, random() * 256, 10 + random() * 44, 3 + random() * 8, random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      const cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        roughness: 1,
      });
      owned.textures.push(cloudTexture);
      owned.materials.push(cloudMaterial);
      const clouds = new THREE.Mesh(planetGeometry, cloudMaterial);
      clouds.name = 'earth-cloud-layer';
      clouds.scale.setScalar(1.03);
      tiltPivot.add(clouds);
      extras.push(clouds);

      const moonMaterial = new THREE.MeshStandardMaterial({ color: '#b8b2a8', roughness: 0.95 });
      owned.materials.push(moonMaterial);
      const moon = new THREE.Mesh(planetGeometry, moonMaterial);
      moon.name = 'earth-moon';
      moon.scale.setScalar(0.27);
      group.add(moon);
      extras.push(moon);
    }

    if (spec.id === 'venus' || spec.id === 'uranus' || spec.id === 'neptune') {
      const hazeColor = spec.id === 'venus' ? '#f5d98a' : spec.palette[0];
      const hazeMaterial = new THREE.MeshBasicMaterial({
        color: hazeColor,
        transparent: true,
        opacity: spec.id === 'venus' ? 0.3 : 0.16,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      owned.materials.push(hazeMaterial);
      const haze = new THREE.Mesh(planetGeometry, hazeMaterial);
      haze.name = `${spec.id}-atmosphere-haze`;
      haze.scale.setScalar(1.12);
      tiltPivot.add(haze);
    }

    if (spec.id === 'saturn') {
      const ringGeometry = new THREE.RingGeometry(1.55, 2.65, 128, 1);
      // Re-map UVs so the texture's X axis follows radius (bands read as rings).
      const positionAttribute = ringGeometry.getAttribute('position');
      const uvAttribute = ringGeometry.getAttribute('uv');
      const vertex = new THREE.Vector3();
      for (let index = 0; index < positionAttribute.count; index += 1) {
        vertex.fromBufferAttribute(positionAttribute, index);
        const radial = (vertex.length() - 1.55) / (2.65 - 1.55);
        uvAttribute.setXY(index, radial, 0.5);
      }
      const ringTexture = canvasTexture(256, 8, ctx => {
        for (let x = 0; x < 256; x += 1) {
          const wave = Math.sin(x * 0.19) * 0.5 + Math.sin(x * 0.045) * 0.5;
          const alpha = x < 8 || x > 246 ? 0
            : (x > 148 && x < 162 ? 0.06 : 0.38 + wave * 0.3 + random() * 0.12);
          ctx.fillStyle = `rgba(226, 205, 158, ${Math.max(0, Math.min(0.92, alpha))})`;
          ctx.fillRect(x, 0, 1, 8);
        }
      });
      const ringMaterial = new THREE.MeshStandardMaterial({
        map: ringTexture,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.9,
        depthWrite: false,
      });
      owned.geometries.push(ringGeometry);
      owned.textures.push(ringTexture);
      owned.materials.push(ringMaterial);
      const rings = new THREE.Mesh(ringGeometry, ringMaterial);
      rings.name = 'saturn-ring-system';
      rings.rotation.x = Math.PI / 2;
      tiltPivot.add(rings);
    }

    const label = makeLabelSprite(spec.name, spec.palette[0], owned);
    label.name = `label-${spec.id}`;
    group.add(label);

    const locatorMaterial = new THREE.SpriteMaterial({
      map: locatorTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    owned.materials.push(locatorMaterial);
    const locator = new THREE.Sprite(locatorMaterial);
    locator.name = `locator-${spec.id}`;
    locator.scale.setScalar(0.32);
    group.add(locator);

    const velocityArrow = makeArrowMesh('#fbbf24', 0.34 + spec.orbitalSpeedKmPerS / 55, owned);
    velocityArrow.name = `velocity-${spec.id}`;
    velocityArrow.visible = false;
    group.add(velocityArrow);

    group.add(makeHitProxy(0.2, owned));
    root.add(group);
    planets[spec.id] = { spec, group, body, tiltPivot, label, locator, velocityArrow, extras };
  }

  // ── Orbit lines (rebuilt when the scale lever moves) ──────────────────
  const orbitLines = new Map<PlanetId, THREE.LineLoop>();
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: '#3d5a86',
    transparent: true,
    opacity: 0.5,
  });
  owned.materials.push(orbitMaterial);

  function buildOrbitLine(spec: PlanetSpec, trueness: number) {
    const segments = 160;
    const positions = new Float32Array(segments * 3);
    const radius = blendedOrbitRadius(spec.orbitRadiusAu, trueness);
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = ECLIPTIC_Y;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }

  for (const spec of SOLAR_PLANETS) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(buildOrbitLine(spec, 0), 3));
    owned.geometries.push(geometry);
    const line = new THREE.LineLoop(geometry, orbitMaterial);
    line.name = `orbit-${spec.id}`;
    root.add(line);
    orbitLines.set(spec.id, line);
  }

  // ── Asteroid belt and Kuiper belt ──────────────────────────────────────
  interface BeltEntry { orbitRadiusAu: number; angle: number; height: number; scale: number; speed: number }

  function makeBelt(name: string, count: number, minAu: number, maxAu: number, color: string, size: number) {
    const entries: BeltEntry[] = [];
    for (let index = 0; index < count; index += 1) {
      entries.push({
        orbitRadiusAu: minAu + random() * (maxAu - minAu),
        angle: random() * Math.PI * 2,
        height: (random() - 0.5) * 0.22,
        scale: 0.35 + random() * 0.9,
        speed: 0.05 + random() * 0.05,
      });
    }
    const geometry = new THREE.DodecahedronGeometry(size, 0);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    owned.geometries.push(geometry);
    owned.materials.push(material);
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name;
    root.add(mesh);
    return { mesh, entries };
  }

  const asteroidBelt = makeBelt('asteroid-belt', 420, 2.1, 3.3, '#8d8578', 0.02);
  const kuiperBelt = makeBelt('kuiper-belt', 520, 34, 46, '#9fb4cc', 0.016);

  const beltMatrix = new THREE.Matrix4();
  const beltQuaternion = new THREE.Quaternion();
  const beltScale = new THREE.Vector3();
  const beltPosition = new THREE.Vector3();

  function layoutBelt(belt: { mesh: THREE.InstancedMesh; entries: BeltEntry[] }, trueness: number, elapsed: number) {
    belt.entries.forEach((entry, index) => {
      const radius = blendedOrbitRadius(entry.orbitRadiusAu, trueness);
      const angle = entry.angle + elapsed * entry.speed * 0.02;
      beltPosition.set(Math.cos(angle) * radius, ECLIPTIC_Y + entry.height, Math.sin(angle) * radius);
      beltQuaternion.setFromEuler(new THREE.Euler(entry.angle, angle, entry.height * 8));
      beltScale.setScalar(entry.scale);
      beltMatrix.compose(beltPosition, beltQuaternion, beltScale);
      belt.mesh.setMatrixAt(index, beltMatrix);
    });
    belt.mesh.instanceMatrix.needsUpdate = true;
  }

  // ── Gravity lens: the invisible pull made visible ──────────────────────
  const gravityField = new THREE.Group();
  gravityField.name = 'gravity-field';
  gravityField.visible = false;
  const GRAVITY_ARROWS = 168;
  const gravityGeometry = new THREE.ConeGeometry(0.03, 0.12, 8);
  const gravityMaterial = new THREE.MeshBasicMaterial({
    color: '#7dd3fc',
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  owned.geometries.push(gravityGeometry);
  owned.materials.push(gravityMaterial);
  const gravityArrows = new THREE.InstancedMesh(gravityGeometry, gravityMaterial, GRAVITY_ARROWS);
  gravityArrows.name = 'gravity-arrow-field';
  gravityField.add(gravityArrows);
  root.add(gravityField);

  interface GravityArrowEntry { radius: number; angle: number; drift: number }
  const gravityEntries: GravityArrowEntry[] = [];
  {
    const rings = 7;
    const perRing = GRAVITY_ARROWS / rings;
    for (let ring = 0; ring < rings; ring += 1) {
      const radius = 1.35 + ring * 1.7;
      for (let index = 0; index < perRing; index += 1) {
        gravityEntries.push({
          radius: radius + random() * 0.5,
          angle: (index / perRing) * Math.PI * 2 + ring * 0.31,
          drift: 0.16 + random() * 0.1,
        });
      }
    }
  }

  function layoutGravityField(delta: number) {
    const inwardTilt = new THREE.Quaternion();
    const toSun = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    gravityEntries.forEach((entry, index) => {
      entry.radius -= entry.drift * delta * (2.2 / entry.radius);
      if (entry.radius < 1.1) entry.radius = 13.2;
      const strength = THREE.MathUtils.clamp(0.16 + 2.2 / (entry.radius * entry.radius), 0.14, 1.5);
      beltPosition.set(Math.cos(entry.angle) * entry.radius, ECLIPTIC_Y, Math.sin(entry.angle) * entry.radius);
      toSun.set(-Math.cos(entry.angle), 0, -Math.sin(entry.angle));
      inwardTilt.setFromUnitVectors(up, toSun);
      beltScale.setScalar(strength);
      beltMatrix.compose(beltPosition, inwardTilt, beltScale);
      gravityArrows.setMatrixAt(index, beltMatrix);
    });
    gravityArrows.instanceMatrix.needsUpdate = true;
  }

  // Gravity lens control: a glowing instrument orb beside the Sun.
  const gravityLens = new THREE.Group();
  gravityLens.name = 'toggle-gravity-lens';
  {
    const standGeometry = new THREE.CylinderGeometry(0.03, 0.08, 0.9, 12);
    const standMaterial = new THREE.MeshStandardMaterial({ color: '#24344e', roughness: 0.5, metalness: 0.6 });
    const orbGeometry = new THREE.IcosahedronGeometry(0.13, 2);
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });
    owned.geometries.push(standGeometry, orbGeometry);
    owned.materials.push(standMaterial, orbMaterial);
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = 0.45;
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.name = 'gravity-lens-orb';
    orb.position.y = 1.0;
    gravityLens.add(stand, orb, makeHitProxy(0.24, owned));
    const lensLabel = makeLabelSprite('Gravity lens', '#7dd3fc', owned, 0.42);
    lensLabel.position.y = 1.32;
    gravityLens.add(lensLabel);
  }
  gravityLens.position.set(1.35, 0, 1.7);
  root.add(gravityLens);

  // ── Orbit race: lap board and start gates ──────────────────────────────
  const raceBoard = new THREE.Group();
  raceBoard.name = 'race-board';
  raceBoard.visible = false;
  const raceBoardCanvas = document.createElement('canvas');
  raceBoardCanvas.width = 512;
  raceBoardCanvas.height = 300;
  const raceBoardTexture = new THREE.CanvasTexture(raceBoardCanvas);
  raceBoardTexture.colorSpace = THREE.SRGBColorSpace;
  const raceBoardMaterial = new THREE.MeshBasicMaterial({ map: raceBoardTexture, transparent: true, depthWrite: false });
  const raceBoardGeometry = new THREE.PlaneGeometry(1.9, 1.11);
  owned.textures.push(raceBoardTexture);
  owned.materials.push(raceBoardMaterial);
  owned.geometries.push(raceBoardGeometry);
  const raceBoardMesh = new THREE.Mesh(raceBoardGeometry, raceBoardMaterial);
  raceBoardMesh.renderOrder = 10;
  raceBoard.add(raceBoardMesh);
  raceBoard.position.set(-2.7, ECLIPTIC_Y + 1.15, 1.9);
  root.add(raceBoard);

  const RACERS: readonly PlanetId[] = ['mercury', 'earth', 'mars'];
  let raceStartDay: number | undefined;

  function drawRaceBoard(simDay: number) {
    const ctx = raceBoardCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 512, 300);
    ctx.fillStyle = 'rgba(4, 10, 24, 0.85)';
    ctx.beginPath();
    ctx.roundRect(2, 2, 508, 296, 20);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ORBIT RACE — ONE FULL LAP', 24, 44);
    RACERS.forEach((planetId, index) => {
      const spec = getPlanet(planetId);
      const y = 96 + index * 64;
      const laps = raceStartDay === undefined ? 0 : completedLapsSince(spec, raceStartDay, simDay);
      const lapProgress = raceStartDay === undefined
        ? 0
        : ((simDay - raceStartDay) % spec.orbitalPeriodDays) / spec.orbitalPeriodDays;
      ctx.fillStyle = spec.palette[0];
      ctx.beginPath();
      ctx.arc(38, y - 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 27px system-ui, sans-serif';
      ctx.fillText(spec.name, 62, y);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.fillRect(210, y - 24, 220, 22);
      ctx.fillStyle = laps > 0 ? '#4ade80' : spec.palette[0];
      ctx.fillRect(210, y - 24, 220 * (laps > 0 ? 1 : lapProgress), 22);
      ctx.fillStyle = laps > 0 ? '#4ade80' : '#cbd5e1';
      ctx.font = '700 25px system-ui, sans-serif';
      ctx.fillText(
        laps > 0 ? `${laps} LAP${laps > 1 ? 'S' : ''} ✓` : `${Math.round(lapProgress * 100)}%`,
        446,
        y,
      );
    });
    raceBoardTexture.needsUpdate = true;
  }

  // ── Infrared probe readouts ────────────────────────────────────────────
  function showTemperatureReadout(planetId: PlanetId) {
    const handle = planets[planetId];
    if (handle.readout) return handle.spec.meanTempC;
    const heat = handle.spec.meanTempC;
    const accent = heat > 300 ? '#f87171' : heat > 0 ? '#fbbf24' : '#7dd3fc';
    const readout = makeLabelSprite(`${handle.spec.name}: ${heat}°C mean`, accent, owned, 0.78);
    readout.name = `readout-${planetId}`;
    readout.position.y = 0.42;
    handle.group.add(readout);
    handle.readout = readout;
    return heat;
  }

  function clearTemperatureReadouts() {
    for (const spec of SOLAR_PLANETS) {
      const handle = planets[spec.id];
      if (handle.readout) {
        handle.group.remove(handle.readout);
        handle.readout = undefined;
      }
    }
  }

  // ── Scale lever console ────────────────────────────────────────────────
  const scaleLever = new THREE.Group();
  scaleLever.name = 'pull-scale-lever';
  let leverArm: THREE.Group;
  {
    const consoleGeometry = new THREE.BoxGeometry(0.5, 0.85, 0.3);
    const consoleMaterial = new THREE.MeshStandardMaterial({ color: '#1b2c47', roughness: 0.45, metalness: 0.5 });
    owned.geometries.push(consoleGeometry);
    owned.materials.push(consoleMaterial);
    const console_ = new THREE.Mesh(consoleGeometry, consoleMaterial);
    console_.position.y = 0.42;
    leverArm = makeArrowMesh('#fbbf24', 0.5, owned);
    leverArm.name = 'scale-lever-arm';
    leverArm.position.set(0, 0.86, 0);
    leverArm.rotation.x = -0.5;
    const leverLabel = makeLabelSprite('True-scale lever', '#fbbf24', owned, 0.44);
    leverLabel.position.y = 1.5;
    scaleLever.add(console_, leverArm, leverLabel, makeHitProxy(0.34, owned));
  }
  scaleLever.position.set(-1.9, 0, 2.3);
  scaleLever.visible = false;
  root.add(scaleLever);

  // ── Comet with dust and ion tails ──────────────────────────────────────
  const comet = new THREE.Group();
  comet.name = 'ride-comet';
  comet.visible = false;
  /** Approach angle: close enough to perihelion that the ride pays off in
   * seconds, far enough that the inbound prediction moment reads clearly. */
  const COMET_APPROACH_ANOMALY = -1.45;
  let cometState: CometState = {
    trueAnomaly: COMET_APPROACH_ANOMALY,
    radiusAu: cometRadiusAu(MISSION_COMET, COMET_APPROACH_ANOMALY),
  };
  let cometPeriapsisPassed = false;
  {
    const coreGeometry = new THREE.IcosahedronGeometry(0.075, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({ color: '#cfd8e3', roughness: 0.9 });
    owned.geometries.push(coreGeometry);
    owned.materials.push(coreMaterial);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = 'comet-core';
    comet.add(core);

    const comaTexture = canvasTexture(128, 128, ctx => paintGlow(ctx, 'rgba(210,235,255,0.9)', 'rgba(210,235,255,0)'));
    const comaMaterial = new THREE.SpriteMaterial({
      map: comaTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    owned.textures.push(comaTexture);
    owned.materials.push(comaMaterial);
    const coma = new THREE.Sprite(comaMaterial);
    coma.scale.setScalar(0.42);
    comet.add(coma);

    const dustGeometry = new THREE.ConeGeometry(0.13, 1, 16, 1, true);
    dustGeometry.translate(0, -0.5, 0);
    const dustMaterial = new THREE.MeshBasicMaterial({
      color: '#e8ddc8',
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ionGeometry = new THREE.ConeGeometry(0.05, 1, 12, 1, true);
    ionGeometry.translate(0, -0.5, 0);
    const ionMaterial = new THREE.MeshBasicMaterial({
      color: '#67e8f9',
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    owned.geometries.push(dustGeometry, ionGeometry);
    owned.materials.push(dustMaterial, ionMaterial);
    const dustTail = new THREE.Mesh(dustGeometry, dustMaterial);
    dustTail.name = 'comet-dust-tail';
    const ionTail = new THREE.Mesh(ionGeometry, ionMaterial);
    ionTail.name = 'comet-ion-tail';
    ionTail.rotation.z = 0.06;
    comet.add(dustTail, ionTail);
    comet.add(makeHitProxy(0.3, owned));
  }
  root.add(comet);

  // Tail-direction prediction arrows around the comet.
  const tailArrows = {} as Record<CometTailChoice, THREE.Group>;
  const tailArrowSpecs: Array<{ id: CometTailChoice; label: string; color: string }> = [
    { id: 'toward-sun', label: 'Toward the Sun', color: '#fca5a5' },
    { id: 'behind-motion', label: 'Behind its motion', color: '#fbbf24' },
    { id: 'away-from-sun', label: 'Away from the Sun', color: '#7dd3fc' },
  ];
  for (const arrowSpec of tailArrowSpecs) {
    const group = new THREE.Group();
    group.name = `tail-${arrowSpec.id}`;
    const arrow = makeArrowMesh(arrowSpec.color, 0.55, owned);
    group.add(arrow);
    const arrowLabel = makeLabelSprite(arrowSpec.label, arrowSpec.color, owned, 0.5);
    arrowLabel.position.y = 0.75;
    group.add(arrowLabel, makeHitProxy(0.28, owned));
    group.visible = false;
    root.add(group);
    tailArrows[arrowSpec.id] = group;
  }

  // ── Debrief: transfer panels and mission badge ─────────────────────────
  function makeAnswerPanel(name: string, text: string, accent: string) {
    const group = new THREE.Group();
    group.name = name;
    const panel = makeLabelSprite(text, accent, owned, 1.15);
    group.add(panel, makeHitProxy(0.42, owned));
    group.visible = false;
    root.add(group);
    return group;
  }
  const transferLonger = makeAnswerPanel('transfer-longer', 'Its year is LONGER', '#4ade80');
  const transferShorter = makeAnswerPanel('transfer-shorter', 'Its year is SHORTER', '#f87171');
  transferLonger.position.set(-1.2, ECLIPTIC_Y + 1.1, 2.6);
  transferShorter.position.set(1.2, ECLIPTIC_Y + 1.1, 2.6);

  const badge = new THREE.Group();
  badge.name = 'collect-badge';
  {
    const starShape = new THREE.Shape();
    for (let point = 0; point < 10; point += 1) {
      const starRadius = point % 2 === 0 ? 0.2 : 0.085;
      const angle = (point / 10) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * starRadius;
      const y = Math.sin(angle) * starRadius;
      if (point === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    const starGeometry = new THREE.ExtrudeGeometry(starShape, { depth: 0.04, bevelEnabled: false });
    const starMaterial = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#b45309',
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.3,
    });
    owned.geometries.push(starGeometry);
    owned.materials.push(starMaterial);
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.name = 'mission-badge-star';
    badge.add(star, makeHitProxy(0.3, owned));
    const badgeLabel = makeLabelSprite('Solar System Explorer', '#fbbf24', owned, 0.7);
    badgeLabel.position.y = 0.45;
    badge.add(badgeLabel);
  }
  badge.position.set(0, ECLIPTIC_Y + 0.6, 2.9);
  badge.visible = false;
  root.add(badge);

  // ── Simulation state ───────────────────────────────────────────────────
  let simDay = 0;
  let daysPerSecond = 8;
  let trueness = 0;
  let truenessTarget = 0;
  let lastAppliedTrueness = -1;
  let gravityLensOn = false;
  let gravityLayerVisible = false;
  let paused = false;
  let observatoryMode = false;
  let cometRiding = false;
  let activeStageIndex = 0;
  let raceBoardRedrawIn = 0;

  function applyVelocityArrowVisibility() {
    const visible = gravityLensOn && activeStageIndex >= 1 && activeStageIndex <= 2;
    for (const spec of SOLAR_PLANETS) {
      planets[spec.id].velocityArrow.visible = visible;
    }
  }

  const scratch = new THREE.Vector3();
  const sunWorld = new THREE.Vector3();

  /** Fixed-step scientific propagation: sim time and the comet's Kepler-II sweep. */
  function advance(deltaSeconds: number) {
    if (paused) return;
    simDay += daysPerSecond * deltaSeconds;
    cometState = advanceComet(MISSION_COMET, cometState, daysPerSecond * deltaSeconds * 0.55);
    if (!cometPeriapsisPassed && Math.cos(cometState.trueAnomaly) > 0.996 && Math.sin(cometState.trueAnomaly) > 0) {
      cometPeriapsisPassed = true;
    }
  }

  function planetPosition(spec: PlanetSpec, out: THREE.Vector3) {
    const angle = orbitAngleAtDay(spec, simDay);
    const radius = blendedOrbitRadius(spec.orbitRadiusAu, trueness);
    return out.set(Math.cos(angle) * radius, ECLIPTIC_Y, Math.sin(angle) * radius);
  }

  function applyTrueness() {
    if (Math.abs(trueness - lastAppliedTrueness) < 0.0005) return;
    lastAppliedTrueness = trueness;
    for (const spec of SOLAR_PLANETS) {
      const line = orbitLines.get(spec.id)!;
      (line.geometry.getAttribute('position') as THREE.BufferAttribute)
        .copyArray(buildOrbitLine(spec, trueness));
      line.geometry.getAttribute('position').needsUpdate = true;
      const handle = planets[spec.id];
      const displayRadius = blendedPlanetRadius(spec, trueness);
      handle.tiltPivot.scale.setScalar(displayRadius);
      handle.label.position.y = displayRadius + 0.2;
      handle.locator.material.opacity = trueness > 0.4 ? (trueness - 0.4) : 0;
    }
    sunMesh.scale.setScalar(blendedSunRadius(trueness));
    corona.scale.setScalar(blendedSunRadius(trueness) * 4.6);
  }

  /** Per-frame presentation: positions, spins, tails, boards, labels. */
  function update(frameDelta: number, elapsedSeconds: number, camera?: THREE.Camera) {
    if (camera && raceBoard.visible) {
      camera.getWorldPosition(scratch);
      raceBoard.lookAt(scratch);
    }
    // Ease the scale lever blend.
    if (Math.abs(truenessTarget - trueness) > 0.0004) {
      trueness += (truenessTarget - trueness) * Math.min(1, frameDelta * 1.1);
    }
    applyTrueness();

    sun.getWorldPosition(sunWorld);
    corona.material.opacity = 0.75 + Math.sin(elapsedSeconds * 1.7) * 0.1;

    for (const spec of SOLAR_PLANETS) {
      const handle = planets[spec.id];
      planetPosition(spec, handle.group.position);
      // Spin about the tilted axis; sign encodes retrograde rotation.
      const spinSpeed = (24 / Math.abs(spec.rotationHours)) * Math.sign(spec.rotationHours);
      if (!paused) handle.body.rotation.y += spinSpeed * frameDelta * 0.6;
      for (const extra of handle.extras) {
        if (!paused && extra.name === 'earth-cloud-layer') extra.rotation.y += frameDelta * 0.05;
        if (extra.name === 'earth-moon') {
          const moonAngle = (simDay / 27.3) * Math.PI * 2;
          const moonDistance = blendedPlanetRadius(spec, trueness) * 2.6;
          extra.position.set(Math.cos(moonAngle) * moonDistance, 0.02, Math.sin(moonAngle) * moonDistance);
          extra.scale.setScalar(blendedPlanetRadius(spec, trueness) * 0.27);
        }
      }
      if (handle.velocityArrow.visible) {
        const angle = orbitAngleAtDay(spec, simDay);
        // Tangent of counter-clockwise motion when viewed from +Y.
        scratch.set(-Math.sin(angle), 0, Math.cos(angle));
        handle.velocityArrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), scratch.normalize());
        handle.velocityArrow.position.y = blendedPlanetRadius(spec, trueness) + 0.05;
      }
    }

    layoutBelt(asteroidBelt, trueness, elapsedSeconds);
    layoutBelt(kuiperBelt, trueness, elapsedSeconds);
    if (gravityField.visible) layoutGravityField(frameDelta);

    // Comet position, and both tails pushed away from the Sun.
    {
      const angle = cometState.trueAnomaly;
      const radius = blendedOrbitRadius(cometState.radiusAu, trueness);
      comet.position.set(Math.cos(angle) * radius, ECLIPTIC_Y + 0.12, Math.sin(angle) * radius);
      scratch.copy(comet.position).sub(sunWorld).normalize();
      const tailLength = THREE.MathUtils.clamp(1.9 / cometState.radiusAu, 0.25, 2.6);
      for (const tailName of ['comet-dust-tail', 'comet-ion-tail'] as const) {
        const tail = comet.getObjectByName(tailName);
        if (tail) {
          tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), scratch);
          tail.scale.set(1, tailLength * (tailName === 'comet-ion-tail' ? 1.35 : 1), 1);
        }
      }
      if (tailArrows['toward-sun'].visible) {
        const motion = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
        tailArrows['toward-sun'].position.copy(comet.position).addScaledVector(scratch, -0.7);
        tailArrows['toward-sun'].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), scratch.clone().negate());
        tailArrows['behind-motion'].position.copy(comet.position).addScaledVector(motion, -0.7);
        tailArrows['behind-motion'].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), motion.clone().negate());
        tailArrows['away-from-sun'].position.copy(comet.position).addScaledVector(scratch, 0.85);
        tailArrows['away-from-sun'].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), scratch);
      }
    }

    if (raceBoard.visible) {
      raceBoardRedrawIn -= frameDelta;
      if (raceBoardRedrawIn <= 0) {
        raceBoardRedrawIn = 0.2;
        drawRaceBoard(simDay);
      }
    }
    badge.rotation.y += frameDelta * 0.8;

    const lensOrb = gravityLens.getObjectByName('gravity-lens-orb');
    if (lensOrb) lensOrb.rotation.y += frameDelta * (gravityLensOn ? 2.4 : 0.5);
  }

  function setLayerVisibility(layer: 'orbits' | 'labels' | 'gravity', visible: boolean) {
    if (layer === 'orbits') {
      for (const orbit of orbitLines.values()) orbit.visible = visible;
    } else if (layer === 'labels') {
      for (const handle of Object.values(planets)) handle.label.visible = visible;
    } else {
      gravityLayerVisible = visible;
      gravityField.visible = observatoryMode
        ? visible
        : gravityLensOn && activeStageIndex >= 1 && activeStageIndex <= 2;
    }
  }

  // ── Stage orchestration (overlays only — the world itself persists) ────
  function setStage(stageIndex: number) {
    observatoryMode = false;
    paused = false;
    activeStageIndex = stageIndex;
    setLayerVisibility('orbits', true);
    setLayerVisibility('labels', true);
    setLayerVisibility('gravity', false);
    raceBoard.visible = stageIndex === 2;
    applyVelocityArrowVisibility();
    gravityField.visible = gravityLensOn && stageIndex >= 1 && stageIndex <= 2;
    scaleLever.visible = stageIndex === 5;
    comet.visible = stageIndex >= 6;
    transferLonger.visible = stageIndex === 7;
    transferShorter.visible = stageIndex === 7;
    badge.visible = stageIndex === 7;
    if (stageIndex !== 3) clearTemperatureReadouts();
    if (stageIndex === 6) {
      // Fresh approach every time the stage is entered: the comet has been
      // orbiting all lesson, so its position would otherwise be arbitrary —
      // possibly already past perihelion, which would void the observation.
      resetCometPassState();
    } else {
      for (const group of Object.values(tailArrows)) group.visible = false;
      cometRiding = false;
    }
    // The stretched scale belongs to the true-scale stage alone.
    if (stageIndex !== 5) {
      truenessTarget = 0;
      leverArm.rotation.x = -0.5;
    }
    if (stageIndex === 2 && raceStartDay === undefined) beginRace();
    // Time compression per stage: giants crawl, the comet stage runs slow
    // enough that the perihelion swing is watchable end to end.
    daysPerSecond = [8, 8, 16, 6, 20, 24, 4, 8][stageIndex] ?? 8;
  }

  function beginRace() {
    raceStartDay = simDay;
  }

  function resetCometPassState() {
    cometState = {
      trueAnomaly: COMET_APPROACH_ANOMALY,
      radiusAu: cometRadiusAu(MISSION_COMET, COMET_APPROACH_ANOMALY),
    };
    cometPeriapsisPassed = false;
    cometRiding = false;
  }

  function raceStatus() {
    const laps = Object.fromEntries(RACERS.map(planetId => [
      planetId,
      raceStartDay === undefined ? 0 : completedLapsSince(getPlanet(planetId), raceStartDay, simDay),
    ])) as Record<PlanetId, number>;
    const finished = RACERS.filter(planetId => laps[planetId] >= 1);
    return { laps, anyFinished: finished.length > 0, finished };
  }

  return {
    root,
    sun,
    planets,
    raceBoard,
    gravityLens,
    scaleLever,
    leverArm,
    comet,
    tailArrows,
    transferLonger,
    transferShorter,
    badge,
    advance,
    update,
    setStage,
    setTimeCompression(value: number) { daysPerSecond = value; },
    setPaused(value: boolean) { paused = value; },
    setLayerVisibility,
    setObservatoryMode(enabled: boolean) {
      observatoryMode = enabled;
      raceBoard.visible = false;
      scaleLever.visible = false;
      transferLonger.visible = false;
      transferShorter.visible = false;
      badge.visible = false;
      comet.visible = false;
      for (const group of Object.values(tailArrows)) group.visible = false;
      gravityField.visible = enabled && gravityLayerVisible;
      for (const handle of Object.values(planets)) handle.label.visible = true;
    },
    focusPlanet(planetId: PlanetId) {
      return planets[planetId].group;
    },
    setTrueScale(enabled: boolean) {
      truenessTarget = enabled ? 1 : 0;
      leverArm.rotation.x = enabled ? 0.5 : -0.5;
    },
    simDay: () => simDay,
    setGravityLens(on: boolean) {
      gravityLensOn = on;
      gravityField.visible = on && activeStageIndex >= 1 && activeStageIndex <= 2;
      applyVelocityArrowVisibility();
    },
    beginRace,
    raceStatus,
    probePlanet: showTemperatureReadout,
    pullScaleLever() {
      truenessTarget = 1;
      leverArm.rotation.x = 0.5;
    },
    resetScale() {
      truenessTarget = 0;
      leverArm.rotation.x = -0.5;
    },
    scaleTrueness: () => trueness,
    showTailArrows(visible: boolean) {
      for (const group of Object.values(tailArrows)) group.visible = visible;
    },
    rideComet() {
      // Always ride a full approach: if the learner took their time
      // predicting, the comet may already be past its closest pass — replay
      // the observation from the approach point rather than skipping it.
      resetCometPassState();
      cometRiding = true;
    },
    isRidingComet: () => cometRiding,
    cometStatus: () => ({ ...cometState, periapsisPassed: cometPeriapsisPassed }),
    resetCometPass: resetCometPassState,
    restart() {
      simDay = 0;
      raceStartDay = undefined;
      truenessTarget = 0;
      gravityLensOn = false;
      resetCometPassState();
      clearTemperatureReadouts();
      setStage(0);
    },
    dispose() {
      disposed = true;
      config.scene.remove(root);
      for (const geometry of owned.geometries) geometry.dispose();
      for (const material of owned.materials) material.dispose();
      for (const texture of owned.textures) texture.dispose();
    },
  };
}

export type SolarSystemScene = ReturnType<typeof createSolarSystemScene>;
