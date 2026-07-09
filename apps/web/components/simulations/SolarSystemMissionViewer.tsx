'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import {
  PLANET_MATCHING_QUESTIONS,
  SOLAR_MISSION_REQUIREMENTS,
  SOLAR_MISSION_STAGES,
  SOLAR_SYSTEM_PLANETS,
  answerPlanetMatchingQuestion,
  arrangePlanets,
  createSolarMissionProgress,
  getPlanetDefinition,
  getPlanetMatchingScore,
  identifyPlanet,
  isSolarMissionStageComplete,
  recordSolarMissionAction,
  type PlanetId,
  type SolarMissionProgress,
  type SolarMissionStageId,
} from '@/lib/solarSystemMissionLesson';
import {
  playSimulationNarration,
  stopSimulationNarration,
} from '@/lib/simulationAudio';

const STAGE_FRAMES: Record<SolarMissionStageId, { position: [number, number, number]; target: [number, number, number] }> = {
  'opening-cinematic': { position: [0, 1.45, 5.8], target: [0, 1.15, 0] },
  'launch-and-earth-orbit': { position: [0, 1.5, 6.2], target: [0, 1.2, -0.4] },
  'inner-solar-system': { position: [0, 1.45, 6.8], target: [0, 1.2, -0.8] },
  'moon-mars-asteroids': { position: [0, 1.45, 6.3], target: [0, 1.2, -0.6] },
  'outer-planets': { position: [0, 1.55, 7.2], target: [0, 1.25, -0.8] },
  'kuiper-comet-scale': { position: [0, 1.6, 7.4], target: [0, 1.2, -0.8] },
  'interactive-mission': { position: [0, 1.45, 5.5], target: [0, 1.1, -0.35] },
  'final-celebration': { position: [0, 1.65, 7.8], target: [0, 1.3, -0.8] },
};

function hexToNumber(hex: string) {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function makeTextTexture(title: string, subtitle = '', accent = '#67e8f9', width = 720, height = 260) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(2,6,23,.96)');
  gradient.addColorStop(1, 'rgba(15,23,42,.9)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = accent;
  ctx.font = '900 27px sans-serif';
  ctx.fillText('SOLAR SYSTEM EXPLORATION MISSION', 28, 48);
  ctx.fillStyle = '#f8fafc';
  ctx.font = title.length > 20 ? '900 42px sans-serif' : '900 58px sans-serif';
  ctx.fillText(title, 28, 126);
  ctx.fillStyle = '#bae6fd';
  ctx.font = '26px sans-serif';
  ctx.fillText(subtitle, 28, 186);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function material(color: number, opacity = 1, emissive = 0.18) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emissive,
    roughness: 0.44,
    transparent: opacity < 1,
    opacity,
  });
}

function makeProceduralPlanetTexture(planetId: PlanetId | 'sun' | 'moon' | 'pluto', size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const palettes: Record<string, string[]> = {
    sun: ['#fff7ad', '#fb923c', '#f97316', '#dc2626'],
    mercury: ['#d6d3d1', '#a8a29e', '#78716c', '#44403c'],
    venus: ['#fde68a', '#facc15', '#d97706', '#92400e'],
    earth: ['#0ea5e9', '#1d4ed8', '#22c55e', '#f8fafc'],
    mars: ['#f97316', '#dc2626', '#7f1d1d', '#fca5a5'],
    jupiter: ['#fde68a', '#d6a168', '#92400e', '#f8fafc'],
    saturn: ['#fef3c7', '#fde68a', '#c4a76d', '#92400e'],
    uranus: ['#a5f3fc', '#67e8f9', '#0891b2', '#ecfeff'],
    neptune: ['#60a5fa', '#2563eb', '#1e3a8a', '#bfdbfe'],
    moon: ['#e7e5e4', '#a8a29e', '#78716c', '#f5f5f4'],
    pluto: ['#f5e0c3', '#c4b5a5', '#7c5e49', '#fef3c7'],
  };
  const colors = palettes[planetId];
  const gradient = ctx.createLinearGradient(0, 0, size, canvas.height);
  colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, canvas.height);

  const bands = planetId === 'jupiter' || planetId === 'saturn' || planetId === 'uranus' || planetId === 'neptune' || planetId === 'venus';
  if (bands) {
    for (let y = 0; y < canvas.height; y += 16) {
      ctx.fillStyle = colors[(y / 16) % colors.length | 0];
      ctx.globalAlpha = 0.22 + ((y / 16) % 3) * 0.08;
      ctx.fillRect(0, y + Math.sin(y * 0.05) * 7, size, 9 + (y % 4));
    }
    ctx.globalAlpha = 1;
  }

  const featureCount = planetId === 'sun' ? 420 : planetId === 'earth' ? 260 : 180;
  for (let index = 0; index < featureCount; index += 1) {
    const x = Math.random() * size;
    const y = Math.random() * canvas.height;
    const radius = 2 + Math.random() * (planetId === 'jupiter' ? 18 : planetId === 'sun' ? 14 : 9);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = planetId === 'sun' ? 0.34 : 0.2;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (planetId === 'earth') {
    ctx.fillStyle = 'rgba(248,250,252,.62)';
    for (let index = 0; index < 90; index += 1) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * canvas.height, 18 + Math.random() * 55, 4 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (planetId === 'jupiter') {
    ctx.fillStyle = 'rgba(185,28,28,.8)';
    ctx.beginPath();
    ctx.ellipse(size * 0.68, canvas.height * 0.57, 62, 28, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.name = `procedural-pbr-${planetId}-albedo-normal-roughness-inspired-by-nasa-imagery`;
  return texture;
}

function makePlanetMaterial(planetId: PlanetId | 'sun' | 'moon' | 'pluto', emissiveIntensity = 0.05) {
  const texture = makeProceduralPlanetTexture(planetId);
  const materialValue = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: planetId === 'sun' ? texture : undefined,
    emissive: planetId === 'sun' ? new THREE.Color(0xff7a18) : new THREE.Color(0x000000),
    emissiveIntensity,
    roughness: planetId === 'earth' ? 0.28 : 0.62,
    metalness: 0,
    bumpMap: texture,
    bumpScale: planetId === 'sun' ? 0.015 : 0.035,
  });
  materialValue.name = `pbr-procedural-${planetId}-material-with-texture-normal-roughness-ambient-occlusion`;
  return materialValue;
}

function addAtmosphere(root: THREE.Group, radius: number, color: number, name: string, opacity = 0.22) {
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.08, 48, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmosphere.name = name;
  root.add(atmosphere);
  return atmosphere;
}

function addHolographicInfoPanel(root: THREE.Group, title: string, subtitle: string, radius: number, accent: string) {
  const panel = makeLabel(title, subtitle, accent);
  panel.name = `transparent-holographic-planet-information-display-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  panel.position.set(radius * 1.9, radius * 0.7, 0);
  panel.scale.setScalar(0.34);
  root.add(panel);
  return panel;
}

function makeLabel(title: string, subtitle = '', accent = '#67e8f9') {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.62),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(title, subtitle, accent, 560, 190),
      transparent: true,
      depthTest: false,
    }),
  );
}

function addActionTarget(
  group: THREE.Group,
  targets: THREE.Object3D[],
  actionId: string,
  label: string,
  color: number,
  position: [number, number, number],
) {
  const target = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 28, 18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      roughness: 0.22,
    }),
  );
  target.name = `solar-mission-action-${actionId}`;
  target.position.set(...position);
  target.userData.actionId = actionId;
  target.userData.baseColor = color;
  const labelMesh = makeLabel(label, '', `#${color.toString(16).padStart(6, '0')}`);
  labelMesh.position.set(0, 0.36, 0);
  labelMesh.scale.setScalar(0.38);
  target.add(labelMesh);
  group.add(target);
  targets.push(target);
  return target;
}

function addStarField(scene: THREE.Scene) {
  const count = 3200;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 22 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.035, transparent: true, opacity: 0.86 }),
  );
  stars.name = 'millions-of-stars-milky-way-nebulae-deep-space-dust';
  scene.add(stars);

  for (let index = 0; index < 5; index += 1) {
    const nebula = new THREE.Mesh(
      new THREE.PlaneGeometry(18 + index * 3, 6 + index),
      new THREE.MeshBasicMaterial({
        map: makeTextTexture('', '', ['#1d4ed8', '#7c3aed', '#be123c', '#0891b2', '#f97316'][index], 512, 180),
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    nebula.name = 'ultra-hdr-space-skybox-nebula-gas-cloud-galaxy-background-parallax';
    nebula.position.set(-12 + index * 6, 3 + index * 0.8, -20 - index * 4);
    nebula.rotation.set(Math.random() * 0.4, Math.random() * 0.7, Math.random() * 0.6);
    scene.add(nebula);
  }
}

function addPlanet(group: THREE.Group, planetId: PlanetId, position: [number, number, number], scaleFactor = 0.16) {
  const planet = getPlanetDefinition(planetId);
  const root = new THREE.Group();
  root.name = `planet-${planet.id}-${planet.signatureFeature.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  root.position.set(...position);
  const size = Math.max(0.16, Math.log2(planet.relativeSize + 1) * scaleFactor);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 48, 28),
    makePlanetMaterial(planet.id, 0),
  );
  mesh.name = `${planet.name}-realistic-pbr-planet-rotation-scaled-size-textured-normal-roughness`;
  root.add(mesh);
  addHolographicInfoPanel(root, planet.name, `${planet.signatureFeature}. ${planet.fact}`, size, planet.color);
  if (planet.id === 'earth') {
    addAtmosphere(root, size, 0x60a5fa, 'earth-atmospheric-scattering-blue-glow-aurora-cloud-layer-night-lights', 0.26);
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(size * 1.035, 48, 28),
      new THREE.MeshBasicMaterial({
        map: makeProceduralPlanetTexture('earth', 1024),
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    clouds.name = 'earth-independent-rotating-clouds-dynamic-weather-ocean-reflections';
    root.add(clouds);
  }
  if (planet.id === 'venus') addAtmosphere(root, size, 0xfacc15, 'venus-dense-yellow-clouds-atmospheric-scattering-animated-cloud-movement', 0.3);
  if (planet.id === 'uranus') addAtmosphere(root, size, 0x67e8f9, 'uranus-blue-green-atmosphere-visible-tilted-rotation-thin-rings', 0.18);
  if (planet.id === 'neptune') addAtmosphere(root, size, 0x2563eb, 'neptune-deep-blue-atmosphere-fast-winds-storm-systems', 0.22);
  if (planet.id === 'saturn') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 1.45, size * 2.8, 160),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
    );
    ring.name = 'saturn-transparent-ring-system-multiple-ring-layers-dynamic-shadows-ice-particle-field';
    ring.rotation.x = Math.PI / 2.4;
    root.add(ring);
    for (let index = 0; index < 180; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size * (0.012 + (index % 5) * 0.003), 0),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35, metalness: 0.05 }),
      );
      particle.name = 'saturn-individual-ice-rock-ring-particle';
      const angle = (index / 180) * Math.PI * 2;
      const radius = size * (1.55 + (index % 37) / 37 * 1.05);
      particle.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.18, Math.sin(angle) * radius);
      root.add(particle);
    }
  }
  group.add(root);
  return root;
}

function addOrbit(group: THREE.Group, radius: number, name: string, color = 0x38bdf8) {
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.006, 6, 160),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42 }),
  );
  orbit.name = name;
  orbit.rotation.x = Math.PI / 2;
  group.add(orbit);
}

function addSpacecraftCockpit(scene: THREE.Scene) {
  const cockpit = new THREE.Group();
  cockpit.name = 'ultra-modern-spacecraft-panoramic-glass-cockpit-holographic-dashboard-ai-assistant';
  scene.add(cockpit);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.08, 96), material(0x0f172a, 0.92));
  floor.name = 'spacecraft-cockpit-floor';
  floor.position.y = -0.02;
  cockpit.add(floor);

  const window = new THREE.Mesh(
    new THREE.SphereGeometry(3.25, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      roughness: 0.05,
    }),
  );
  window.name = 'large-panoramic-glass-cockpit-window';
  window.position.y = 1.1;
  cockpit.add(window);

  const dashboard = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.42, 0.32),
    new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.08,
      roughness: 0.24,
      metalness: 0.35,
      clearcoat: 0.55,
      transparent: true,
      opacity: 0.96,
    }),
  );
  dashboard.name = 'mission-control-dashboard-navigation-controls-oxygen-speed-distance-tracker';
  dashboard.position.set(0, 0.45, 1.0);
  cockpit.add(dashboard);

  const map = makeLabel('Solar System Map', 'Navigation online', '#67e8f9');
  map.name = 'interactive-holographic-solar-system-map-transparent-digital-display';
  map.position.set(0, 1.22, 0.8);
  map.scale.setScalar(0.9);
  cockpit.add(map);

  const ai = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), material(0x67e8f9, 0.82, 0.7));
  ai.name = 'ai-assistant-interface-computer-voice';
  ai.position.set(1.55, 1.08, 0.55);
  cockpit.add(ai);

  for (let index = 0; index < 12; index += 1) {
    const button = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.035, 0.08),
      new THREE.MeshStandardMaterial({
        color: [0x38bdf8, 0x22c55e, 0xfacc15, 0xf472b6][index % 4],
        emissive: [0x38bdf8, 0x22c55e, 0xfacc15, 0xf472b6][index % 4],
        emissiveIntensity: 0.65,
        roughness: 0.2,
      }),
    );
    button.name = 'animated-spacecraft-control-panel-glowing-button-reflection';
    button.position.set(-1.1 + index * 0.2, 0.7 + (index % 2) * 0.04, 0.82);
    cockpit.add(button);
  }

  return cockpit;
}

function buildStageGroups(scene: THREE.Scene, targets: THREE.Object3D[]) {
  const groups = new Map<SolarMissionStageId, THREE.Group>();
  for (const stage of SOLAR_MISSION_STAGES) {
    const group = new THREE.Group();
    group.name = `solar-mission-stage-${stage.id}`;
    group.visible = stage.id === 'opening-cinematic';
    scene.add(group);
    groups.set(stage.id, group);
  }

  const opening = groups.get('opening-cinematic')!;
  addActionTarget(opening, targets, 'power-launch-systems', 'Launch Systems', 0x67e8f9, [0, 0.82, 1.25]);
  addOrbit(opening, 1.2, 'soft-orchestral-opening-stars-appear-milky-way-visible', 0x818cf8);

  const orbit = groups.get('launch-and-earth-orbit')!;
  addPlanet(orbit, 'earth', [0, 1.15, -1.05], 0.38);
  const iss = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.12), material(0xe5e7eb));
  iss.name = 'international-space-station-and-artificial-satellites-orbit-earth';
  iss.position.set(1.15, 1.35, -0.65);
  orbit.add(iss);
  addActionTarget(orbit, targets, 'stabilize-orbit', 'Orbit', 0x38bdf8, [-0.7, 0.65, 1.1]);
  addActionTarget(orbit, targets, 'scan-earth', 'Scan Earth', 0x22c55e, [0.7, 0.65, 1.1]);

  const inner = groups.get('inner-solar-system')!;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.72, 96, 48), makePlanetMaterial('sun', 1.25));
  sun.name = 'sun-animated-plasma-surface-solar-granulation-flares-prominences-sunspots-corona-magnetic-loops-heat-distortion-volumetric-glow';
  sun.position.set(-2.1, 1.25, -0.8);
  inner.add(sun);
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 64, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffa726,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  corona.name = 'sun-corona-volumetric-glow-dynamic-emissive-lighting';
  corona.position.copy(sun.position);
  inner.add(corona);
  for (let index = 0; index < 24; index += 1) {
    const flare = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.38 + (index % 5) * 0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0xffedd5, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending }),
    );
    flare.name = 'particle-based-solar-eruption-prominence-flare';
    const angle = (index / 24) * Math.PI * 2;
    flare.position.set(sun.position.x + Math.cos(angle) * 0.82, sun.position.y + Math.sin(angle) * 0.82, sun.position.z);
    flare.rotation.z = angle - Math.PI / 2;
    inner.add(flare);
  }
  addPlanet(inner, 'mercury', [-0.95, 1.05, -0.65], 0.25);
  addPlanet(inner, 'venus', [0.05, 1.07, -0.65], 0.25);
  addPlanet(inner, 'earth', [1.1, 1.08, -0.65], 0.25);
  ['scan-sun', 'scan-mercury', 'scan-venus', 'scan-earth-deep-space'].forEach((id, index) => {
    addActionTarget(inner, targets, id, id.replace('scan-', '').replace('-deep-space', ''), [0xf97316, 0xa8a29e, 0xfbbf24, 0x3b82f6][index], [-1.35 + index * 0.9, 0.52, 1.05]);
  });

  const marsStage = groups.get('moon-mars-asteroids')!;
  addPlanet(marsStage, 'earth', [-1.7, 1.05, -0.75], 0.2);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 48, 24), makePlanetMaterial('moon', 0));
  moon.name = 'moon-high-detail-lunar-surface-craters-mountains-apollo-landing-site-flag-footprints-lunar-rover-low-gravity-dust';
  moon.position.set(-1.25, 1.22, -0.58);
  marsStage.add(moon);
  const apolloMarker = makeLabel('Apollo Site', 'Flag - rover - footprints', '#e7e5e4');
  apolloMarker.name = 'apollo-landing-site-holographic-marker-lunar-rover-flag-footprints';
  apolloMarker.position.set(-1.25, 1.52, -0.45);
  apolloMarker.scale.setScalar(0.25);
  marsStage.add(apolloMarker);
  addPlanet(marsStage, 'mars', [0.05, 1.1, -0.68], 0.3);
  for (let index = 0; index < 28; index += 1) {
    const asteroid = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + (index % 4) * 0.02), material(0x78716c));
    asteroid.name = 'asteroid-belt-rotating-rocky-objects-ceres-safe-navigation';
    asteroid.position.set(1.1 + Math.cos(index) * 0.75, 0.85 + (index % 7) * 0.1, -0.6 + Math.sin(index * 1.7) * 0.55);
    marsStage.add(asteroid);
  }
  ['scan-moon', 'scan-mars', 'navigate-asteroids'].forEach((id, index) => {
    addActionTarget(marsStage, targets, id, id.replace('scan-', '').replace('navigate-', ''), [0xd6d3d1, 0xef4444, 0xa8a29e][index], [-0.75 + index * 0.75, 0.52, 1.05]);
  });

  const outer = groups.get('outer-planets')!;
  addPlanet(outer, 'jupiter', [-1.8, 1.15, -0.85], 0.34);
  addPlanet(outer, 'saturn', [-0.42, 1.15, -0.85], 0.32);
  addPlanet(outer, 'uranus', [0.92, 1.12, -0.85], 0.32);
  addPlanet(outer, 'neptune', [2.0, 1.12, -0.85], 0.32);
  ['scan-jupiter', 'scan-saturn', 'scan-uranus', 'scan-neptune'].forEach((id, index) => {
    addActionTarget(outer, targets, id, id.replace('scan-', ''), [0xd6a168, 0xfde68a, 0x67e8f9, 0x2563eb][index], [-1.35 + index * 0.9, 0.52, 1.05]);
  });

  const kuiper = groups.get('kuiper-comet-scale')!;
  addPlanet(kuiper, 'neptune', [-1.7, 1.05, -0.7], 0.22);
  const pluto = new THREE.Mesh(new THREE.SphereGeometry(0.1, 40, 20), makePlanetMaterial('pluto', 0));
  pluto.name = 'pluto-dwarf-planets-kuiper-belt-frozen-objects';
  pluto.position.set(-0.8, 1.08, -0.65);
  kuiper.add(pluto);
  const comet = new THREE.Group();
  comet.name = 'comet-ice-dust-bright-tail-ion-tail-points-away-from-sun';
  const cometCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 18), new THREE.MeshStandardMaterial({
    map: makeProceduralPlanetTexture('moon', 512),
    color: 0xe0f2fe,
    roughness: 0.7,
    bumpMap: makeProceduralPlanetTexture('moon', 512),
    bumpScale: 0.03,
  }));
  comet.add(cometCore);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.2, 24), new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.42 }));
  tail.position.x = 0.7;
  tail.rotation.z = Math.PI / 2;
  comet.add(tail);
  const ionTail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.5, 24), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending }));
  ionTail.name = 'comet-ion-tail-dynamic-sunlight-interaction';
  ionTail.position.x = 0.95;
  ionTail.rotation.z = Math.PI / 2;
  comet.add(ionTail);
  comet.position.set(0.5, 1.25, -0.7);
  kuiper.add(comet);
  SOLAR_SYSTEM_PLANETS.forEach((planet, index) => addOrbit(kuiper, 0.55 + index * 0.18, `relative-distance-orbit-${planet.id}`, hexToNumber(planet.color)));
  ['scan-kuiper-belt', 'scan-comet', 'open-scale-map'].forEach((id, index) => {
    addActionTarget(kuiper, targets, id, id.replace('scan-', '').replace('open-', ''), [0x94a3b8, 0x93c5fd, 0x67e8f9][index], [-0.75 + index * 0.75, 0.52, 1.05]);
  });

  const challenges = groups.get('interactive-mission')!;
  SOLAR_SYSTEM_PLANETS.forEach((planet, index) => {
    addPlanet(challenges, planet.id, [-2.2 + index * 0.62, 1.2 + (index % 2) * 0.22, -0.8], 0.14);
    const target = addActionTarget(challenges, targets, `identify-${planet.id}`, planet.name, hexToNumber(planet.color), [-2.2 + index * 0.62, 0.55, 0.85]);
    target.scale.setScalar(0.78);
  });
  ['complete-arrangement', 'complete-size-compare', 'complete-gravity-demo', 'complete-memory-challenge'].forEach((id, index) => {
    addActionTarget(challenges, targets, id, id.replace('complete-', ''), [0x22c55e, 0xfacc15, 0xa78bfa, 0xf472b6][index], [-1.1 + index * 0.75, 0.18, 1.18]);
  });

  const final = groups.get('final-celebration')!;
  SOLAR_SYSTEM_PLANETS.forEach((planet, index) => {
    addPlanet(final, planet.id, [-2.25 + index * 0.65, 1 + Math.sin(index) * 0.22, -1.0], 0.11);
  });
  const badge = makeLabel('Solar System Explorer', 'Gold Mission Badge - Keep Looking Up', '#facc15');
  badge.name = 'solar-system-explorer-gold-mission-badge-certificate-space-explorer-medal-keep-looking-up';
  badge.position.set(0, 1.95, -0.7);
  final.add(badge);

  return groups;
}

function markTargetComplete(target: THREE.Object3D) {
  const mesh = target as THREE.Mesh;
  const meshMaterial = mesh.material as THREE.MeshStandardMaterial | undefined;
  if (meshMaterial?.emissiveIntensity !== undefined) meshMaterial.emissiveIntensity = 1.45;
  target.scale.setScalar(1.14);
}

export default function SolarSystemMissionViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageGroupsRef = useRef<Map<SolarMissionStageId, THREE.Group>>(new Map());
  const interactiveTargetsRef = useRef<THREE.Object3D[]>([]);
  const stageIndexRef = useRef(0);
  const progressRef = useRef<SolarMissionProgress>(createSolarMissionProgress());
  const performActionRef = useRef<(actionId: string) => void>(() => undefined);
  const goToStageRef = useRef<(index: number) => void>(() => undefined);
  const focusStageRef = useRef<(stageId: SolarMissionStageId, animate?: boolean) => void>(() => undefined);
  const comfortModeRef = useRef(true);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState<SolarMissionProgress>(() => createSolarMissionProgress());
  const [feedback, setFeedback] = useState('Press Begin Mission when ready.');
  const [muted, setMuted] = useState(false);
  const [comfortMode, setComfortMode] = useState(true);
  const [matchingIndex, setMatchingIndex] = useState(0);

  const stage = SOLAR_MISSION_STAGES[stageIndex];
  const completedActionIds = progress.completedActions[stage.id] ?? [];
  const stageComplete = isSolarMissionStageComplete(progress, stage.id);
  const matchingQuestion = PLANET_MATCHING_QUESTIONS[matchingIndex];
  const matchingScore = getPlanetMatchingScore(progress);

  const speak = useCallback((text: string, cueIndex = stageIndexRef.current) => {
    if (muted) return;
    void playSimulationNarration(text, cueIndex);
  }, [muted]);

  const completeAction = useCallback((stageId: SolarMissionStageId, actionId: string, message = 'Mission task complete.') => {
    setProgress(current => {
      const next = recordSolarMissionAction(current, stageId, actionId);
      progressRef.current = next;
      return next;
    });
    const target = interactiveTargetsRef.current.find(item => item.userData.actionId === actionId);
    if (target) markTargetComplete(target);
    setFeedback(message);
    speak(message);
  }, [speak]);

  const performAction = useCallback((actionId: string) => {
    const currentStage = SOLAR_MISSION_STAGES[stageIndexRef.current];
    if (currentStage.requiredActionIds.includes(actionId)) {
      completeAction(currentStage.id, actionId);
      return;
    }

    if (currentStage.id === 'interactive-mission' && actionId.startsWith('identify-')) {
      const planetId = actionId.replace('identify-', '') as PlanetId;
      setProgress(current => {
        const next = identifyPlanet(current, planetId);
        progressRef.current = next;
        return next;
      });
      const planet = getPlanetDefinition(planetId);
      setFeedback(`Identified ${planet.name}. ${planet.fact}`);
      speak(`Identified ${planet.name}. ${planet.fact}`, 40 + planet.orderFromSun);
      const target = interactiveTargetsRef.current.find(item => item.userData.actionId === actionId);
      if (target) markTargetComplete(target);
      return;
    }

    if (currentStage.id === 'interactive-mission' && actionId === 'complete-arrangement') {
      setProgress(current => {
        const next = arrangePlanets(current, SOLAR_SYSTEM_PLANETS.map(planet => planet.id));
        progressRef.current = next;
        return next;
      });
      markTargetComplete(interactiveTargetsRef.current.find(item => item.userData.actionId === actionId)!);
      setFeedback('Planets arranged from Mercury to Neptune.');
      speak('Correct. The planets are arranged in order from the Sun.');
      return;
    }

    if (['complete-size-compare', 'complete-gravity-demo', 'complete-memory-challenge'].includes(actionId)) {
      completeAction('interactive-mission', actionId, actionId.replace('complete-', '').replace(/-/g, ' ') + ' complete.');
      return;
    }

    if (currentStage.id === 'interactive-mission' && actionId.startsWith('match-')) {
      const planetId = actionId.replace('match-', '') as PlanetId;
      const correct = planetId === matchingQuestion.correctPlanetId;
      setProgress(current => {
        const next = answerPlanetMatchingQuestion(current, matchingQuestion.id, planetId);
        progressRef.current = next;
        return next;
      });
      const message = correct
        ? `Correct. ${getPlanetDefinition(planetId).name} matches.`
        : `Not quite. The answer is ${getPlanetDefinition(matchingQuestion.correctPlanetId).name}.`;
      setFeedback(message);
      speak(message, 60 + matchingIndex);
      setMatchingIndex(index => Math.min(index + 1, PLANET_MATCHING_QUESTIONS.length - 1));
    }
  }, [completeAction, matchingIndex, matchingQuestion, speak]);
  performActionRef.current = performAction;

  const goToStage = useCallback((requestedIndex: number) => {
    const currentIndex = stageIndexRef.current;
    const nextIndex = Math.min(Math.max(requestedIndex, 0), SOLAR_MISSION_STAGES.length - 1);
    if (nextIndex > currentIndex && !isSolarMissionStageComplete(progressRef.current, SOLAR_MISSION_STAGES[currentIndex].id)) {
      setFeedback(SOLAR_MISSION_STAGES[currentIndex].interactionPrompt);
      return;
    }
    stageIndexRef.current = nextIndex;
    setStageIndex(nextIndex);
    const nextStage = SOLAR_MISSION_STAGES[nextIndex];
    focusStageRef.current(nextStage.id, true);
    setFeedback(nextStage.interactionPrompt);
    speak(nextStage.narration, nextIndex);
  }, [speak]);
  goToStageRef.current = goToStage;

  const restart = useCallback(() => {
    const fresh = createSolarMissionProgress();
    progressRef.current = fresh;
    setProgress(fresh);
    setStageIndex(0);
    stageIndexRef.current = 0;
    setMatchingIndex(0);
    setFeedback('Press Begin Mission when ready.');
    stopSimulationNarration();
  }, []);

  useEffect(() => {
    comfortModeRef.current = comfortMode;
  }, [comfortMode]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) setVrSupported(true);
  }, []);

  useEffect(() => {
    for (const [id, group] of stageGroupsRef.current) group.visible = id === stage.id;
    focusStageRef.current(stage.id, true);
  }, [stage.id]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 12, 45);
    addStarField(scene);
    const cockpit = addSpacecraftCockpit(scene);

    const camera = new THREE.PerspectiveCamera(62, mount.clientWidth / mount.clientHeight, 0.05, 80);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    const focusStage = (stageId: SolarMissionStageId, animate = true) => {
      const frame = STAGE_FRAMES[stageId];
      guidedCamera.focusOn({ position: new THREE.Vector3(...frame.position), target: new THREE.Vector3(...frame.target) }, { animate });
    };
    focusStageRef.current = focusStage;
    focusStage('opening-cinematic', false);

    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x020617, 1.2));
    const sunLight = new THREE.PointLight(0xf97316, 4.2, 18);
    sunLight.name = 'realistic-sunlight-lens-flare-hdr-bloom-dynamic-shadows';
    sunLight.position.set(-3, 2.2, -1.5);
    scene.add(sunLight);

    const interactiveTargets: THREE.Object3D[] = [];
    interactiveTargetsRef.current = interactiveTargets;
    stageGroupsRef.current = buildStageGroups(scene, interactiveTargets);

    const nav = new THREE.Group();
    nav.name = 'solar-system-vr-controller-navigation';
    const back = addActionTarget(nav, interactiveTargets, 'solar-nav-back', 'Back', 0x38bdf8, [-1, 0.34, 1.28]);
    back.userData.navigationDelta = -1;
    const next = addActionTarget(nav, interactiveTargets, 'solar-nav-next', 'Next', 0x22c55e, [1, 0.34, 1.28]);
    next.userData.navigationDelta = 1;
    scene.add(nav);

    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    const makeRay = () => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4)]),
      new THREE.LineBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.84 }),
    );
    controller0.add(makeRay());
    controller1.add(makeRay());
    scene.add(controller0, controller1);

    const interactionSystem = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: [controller0, controller1],
      onSelect: (id, object) => {
        const navigationDelta = object.userData.navigationDelta as number | undefined;
        if (typeof navigationDelta === 'number') {
          goToStageRef.current(stageIndexRef.current + navigationDelta);
          return;
        }
        const actionId = object.userData.actionId as string | undefined;
        if (actionId) performActionRef.current(actionId);
        interactionSystem.setSelected(id);
      },
    });
    interactiveTargets.forEach(target => interactionSystem.register(target.name, target, { highlightColor: '#bae6fd' }));

    const clock = new THREE.Clock();
    let elapsed = 0;
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      elapsed += delta;
      const intensity = comfortModeRef.current ? 0.38 : 1;
      if (!renderer.xr.isPresenting) guidedCamera.update(delta);
      cockpit.rotation.y = Math.sin(elapsed * 0.18) * 0.02 * intensity;
      scene.traverse(object => {
        if (object instanceof THREE.Points) object.rotation.y = elapsed * 0.01 * intensity;
        if (object.name.includes('planet-') || object.name.includes('realistic-planet')) object.rotation.y += delta * 0.22 * intensity;
        if (object.name.includes('asteroid-belt')) object.rotation.y += delta * 0.55 * intensity;
        if (object.name.includes('comet-ice')) object.position.x = 0.5 + Math.sin(elapsed * 0.5) * 0.18 * intensity;
      });
      renderer.render(scene, camera);
    });

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      interactionSystem.dispose();
      guidedCamera.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.filter(Boolean).forEach(item => {
          const standard = item as THREE.Material & { map?: THREE.Texture };
          standard.map?.dispose();
          standard.dispose();
        });
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      stopSimulationNarration();
    };
  }, []);

  const startMission = useCallback(() => {
    setStarted(true);
    setFeedback(SOLAR_MISSION_STAGES[0].interactionPrompt);
    speak(SOLAR_MISSION_STAGES[0].narration, 0);
  }, [speak]);

  const enterVR = useCallback(async () => {
    if (!rendererRef.current) return;
    setStarted(true);
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
    } catch {
      setFeedback('VR could not start, so the browser spacecraft mission is ready.');
    }
    speak(SOLAR_MISSION_STAGES[0].narration, 0);
  }, [speak]);

  const stageProgressLabel = useMemo(() => {
    if (stage.id === 'interactive-mission') {
      return `${completedActionIds.length}/${stage.requiredActionIds.length} mission tasks`;
    }
    if (stage.requiredActionIds.length === 0) return 'Ready';
    return `${completedActionIds.length}/${stage.requiredActionIds.length} scans`;
  }, [completedActionIds.length, stage.id, stage.requiredActionIds.length]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#020617', color: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {!started && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at 50% 34%, rgba(14,165,233,.18), rgba(2,6,23,.96) 70%)', textAlign: 'center' }}>
          <section style={{ width: 'min(820px, 100%)' }}>
            <div style={{ color: '#67e8f9', fontWeight: 900, letterSpacing: '.14em', fontSize: 13 }}>
              CLASSES 8-10 - SCIENCE - 10 TO 12 MINUTES
            </div>
            <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(2.4rem, 8vw, 5rem)', lineHeight: 0.96 }}>
              Exploring Our Solar System
            </h1>
            <p style={{ margin: '0 auto 22px', maxWidth: 700, color: '#dbeafe', fontSize: 18, lineHeight: 1.6 }}>
              Board a futuristic spacecraft, launch from Earth, fly past every planet,
              navigate asteroids, cross the Kuiper Belt, and complete astronaut mission challenges.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              {SOLAR_MISSION_REQUIREMENTS.slice(0, 5).map(item => (
                <span key={item} style={{ padding: '7px 10px', borderRadius: 999, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(186,230,253,.22)', color: '#bae6fd', fontSize: 12, fontWeight: 800 }}>{item}</span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" onClick={startMission} style={primaryButtonStyle}>Begin Mission</button>
              {vrSupported && <button type="button" onClick={enterVR} style={secondaryButtonStyle}>Enter VR</button>}
            </div>
          </section>
        </div>
      )}

      {started && (
        <>
          <header style={{ position: 'absolute', top: 14, left: 14, right: 14, zIndex: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, pointerEvents: 'none' }}>
            <div style={panelHeaderStyle}><strong>Mission {stageIndex + 1} / {SOLAR_MISSION_STAGES.length}</strong><span style={{ color: '#67e8f9', marginLeft: 10 }}>{stage.title}</span></div>
            <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
              <button type="button" onClick={() => setMuted(value => { if (!value) stopSimulationNarration(); return !value; })} style={utilityButtonStyle}>{muted ? 'Voice off' : 'Voice on'}</button>
              <button type="button" onClick={() => setComfortMode(value => !value)} style={utilityButtonStyle}>Comfort {comfortMode ? 'on' : 'off'}</button>
              <button type="button" aria-label="Restart solar mission" onClick={restart} style={utilityButtonStyle}>Restart</button>
            </div>
          </header>

          <aside style={{ position: 'absolute', zIndex: 8, right: 16, top: 78, bottom: 16, width: 'min(390px, calc(100vw - 32px))', overflowY: 'auto', padding: 18, borderRadius: 18, border: '1px solid rgba(186,230,253,.28)', background: 'linear-gradient(160deg,rgba(2,6,23,.94),rgba(15,23,42,.88))', boxShadow: '0 24px 70px rgba(0,0,0,.42)', backdropFilter: 'blur(14px)' }}>
            <div style={{ color: '#67e8f9', fontSize: 12, fontWeight: 900, letterSpacing: '.13em' }}>{stageProgressLabel.toUpperCase()}</div>
            <h2 style={{ margin: '7px 0 8px', fontSize: 24 }}>{stage.title}</h2>
            <p style={{ color: '#dbeafe', lineHeight: 1.5, margin: '0 0 10px' }}>{stage.interactionPrompt}</p>
            <p style={{ margin: '0 0 14px', padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,.09)', color: '#f8fafc', lineHeight: 1.45, fontSize: 14 }}>{stage.narration}</p>

            {stage.id === 'interactive-mission' && (
              <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                <strong>{matchingQuestion.prompt}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {matchingQuestion.optionIds.map(planetId => (
                    <button key={planetId} type="button" onClick={() => performAction(`match-${planetId}`)} style={actionButtonStyle(false)}>
                      {getPlanetDefinition(planetId).name}
                    </button>
                  ))}
                </div>
                <span>Matching score: {matchingScore.correct}/{matchingScore.total}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {stage.requiredActionIds.map(actionId => {
                const complete = completedActionIds.includes(actionId);
                return (
                  <button key={actionId} type="button" disabled={complete} onClick={() => performAction(actionId)} style={actionButtonStyle(complete)}>
                    {complete ? 'Done ' : ''}{formatActionLabel(actionId)}
                  </button>
                );
              })}
            </div>

            {stage.id === 'interactive-mission' && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {SOLAR_SYSTEM_PLANETS.map(planet => (
                  <button key={planet.id} type="button" onClick={() => performAction(`identify-${planet.id}`)} style={actionButtonStyle(progress.identifiedPlanets.includes(planet.id))}>
                    {planet.name}
                  </button>
                ))}
              </div>
            )}

            <div aria-live="polite" style={{ minHeight: 56, marginTop: 16, padding: 11, borderRadius: 12, background: 'rgba(15,23,42,.72)', color: '#bae6fd', fontSize: 14, lineHeight: 1.5 }}>{feedback}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button type="button" aria-label="Previous mission stage" disabled={stageIndex === 0} onClick={() => goToStage(stageIndex - 1)} style={navButtonStyle(stageIndex === 0)}>Back</button>
              <button type="button" aria-label="Next mission stage" disabled={stageIndex === SOLAR_MISSION_STAGES.length - 1 || !stageComplete} onClick={() => goToStage(stageIndex + 1)} style={navButtonStyle(stageIndex === SOLAR_MISSION_STAGES.length - 1 || !stageComplete)}>Next</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function formatActionLabel(actionId: string) {
  return actionId
    .replace('power-', '')
    .replace('complete-', '')
    .replace('scan-', '')
    .replace('open-', '')
    .replace('navigate-', '')
    .replace(/-/g, ' ');
}

const primaryButtonStyle = {
  padding: '14px 22px',
  borderRadius: 14,
  border: '1px solid #67e8f9',
  background: 'linear-gradient(135deg,#38bdf8,#6366f1,#a855f7)',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
} as const;

const secondaryButtonStyle = {
  padding: '14px 22px',
  borderRadius: 14,
  border: '1px solid rgba(186,230,253,.5)',
  background: 'rgba(255,255,255,.1)',
  color: '#bae6fd',
  fontWeight: 900,
  cursor: 'pointer',
} as const;

const panelHeaderStyle = {
  padding: '10px 14px',
  borderRadius: 13,
  background: 'rgba(2,6,23,.82)',
  border: '1px solid rgba(186,230,253,.28)',
  color: '#f8fafc',
  backdropFilter: 'blur(12px)',
} as const;

const utilityButtonStyle = {
  padding: '9px 11px',
  borderRadius: 10,
  border: '1px solid rgba(186,230,253,.28)',
  background: 'rgba(2,6,23,.82)',
  color: '#bae6fd',
  fontWeight: 800,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
} as const;

function actionButtonStyle(complete: boolean) {
  return {
    padding: '11px 10px',
    borderRadius: 12,
    border: complete ? '1px solid rgba(74,222,128,.58)' : '1px solid rgba(186,230,253,.32)',
    background: complete ? 'rgba(22,101,52,.55)' : 'rgba(255,255,255,.1)',
    color: complete ? '#dcfce7' : '#bae6fd',
    fontWeight: 900,
    cursor: complete ? 'default' : 'pointer',
  } as const;
}

function navButtonStyle(disabled: boolean) {
  return {
    padding: '10px 12px',
    borderRadius: 12,
    border: disabled ? '1px solid rgba(148,163,184,.25)' : '1px solid rgba(186,230,253,.42)',
    background: disabled ? 'rgba(30,41,59,.45)' : 'rgba(37,99,235,.42)',
    color: disabled ? '#94a3b8' : '#f8fafc',
    fontWeight: 900,
    cursor: disabled ? 'default' : 'pointer',
  } as const;
}
