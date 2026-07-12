import * as THREE from 'three';

export type SolarTextureId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface SolarTextureAsset {
  path: string;
  credit: string;
  sourceUrl: string;
  representation: 'observation-derived' | 'imagery-derived-illustration';
}

export const SOLAR_TEXTURES: Record<SolarTextureId, SolarTextureAsset> = {
  sun: {
    path: '/solar-system/textures/sun.webp',
    credit: 'Solar System Scope, based on NASA imagery',
    sourceUrl: 'https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
    representation: 'imagery-derived-illustration',
  },
  mercury: {
    path: '/solar-system/textures/mercury.webp',
    credit: 'Caltech/JPL/USGS, Mariner 10',
    sourceUrl: 'https://maps.jpl.nasa.gov/tmaps/pix/mer0muu2.jpg',
    representation: 'observation-derived',
  },
  venus: {
    path: '/solar-system/textures/venus.webp',
    credit: 'JPL/Caltech, Magellan/Venera/Pioneer',
    sourceUrl: 'https://maps.jpl.nasa.gov/tmaps/pix/ven0ajj2.jpg',
    representation: 'observation-derived',
  },
  earth: {
    path: '/solar-system/textures/earth.webp',
    credit: 'Caltech/JPL/USGS global map',
    sourceUrl: 'https://maps.jpl.nasa.gov/tmaps/pix/ear0xuu2.jpg',
    representation: 'observation-derived',
  },
  mars: {
    path: '/solar-system/textures/mars.webp',
    credit: 'Caltech/JPL/USGS, Viking',
    sourceUrl: 'https://maps.jpl.nasa.gov/tmaps/pix/mar0kuu2.jpg',
    representation: 'observation-derived',
  },
  jupiter: {
    path: '/solar-system/textures/jupiter.webp',
    credit: 'Solar System Scope, based on NASA imagery',
    sourceUrl: 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg',
    representation: 'imagery-derived-illustration',
  },
  saturn: {
    path: '/solar-system/textures/saturn.webp',
    credit: 'Solar System Scope, based on NASA imagery',
    sourceUrl: 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg',
    representation: 'imagery-derived-illustration',
  },
  uranus: {
    path: '/solar-system/textures/uranus.webp',
    credit: 'JPL/Caltech representative atmosphere map',
    sourceUrl: 'https://maps.jpl.nasa.gov/tmaps/pix/ura0fss1.jpg',
    representation: 'imagery-derived-illustration',
  },
  neptune: {
    path: '/solar-system/textures/neptune.webp',
    credit: 'Solar System Scope, based on NASA imagery',
    sourceUrl: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
    representation: 'imagery-derived-illustration',
  },
};

export function configureSolarTexture(texture: THREE.Texture, renderer?: THREE.WebGLRenderer) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer
    ? Math.min(4, renderer.capabilities.getMaxAnisotropy())
    : 1;
  texture.needsUpdate = true;
  return texture;
}
