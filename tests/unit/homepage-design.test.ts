import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('apps/web/app/page.tsx', 'utf8');
const css = readFileSync('apps/web/app/home.css', 'utf8');

describe('editorial homepage design', () => {
  it('leads with the immersive learning promise and primary paths', () => {
    expect(page).toContain('Step inside the lesson');
    expect(page).toContain('/simulations');
    expect(page).toContain('/robotree/login');
    expect(page).toContain('/robotree/headset');
  });

  it('uses contextual artwork and complete homepage sections', () => {
    expect(page).toContain('/home/hero-learning-world.webp');
    expect(page).toContain('home-feature-row');
    expect(page).toContain('home-class-band');
    expect(page).toContain('home-proof');
  });

  it('defines the editorial palette and narrow-screen behavior', () => {
    expect(css).toContain('--home-paper: #f7f5ff');
    expect(css).toContain('--home-purple: #6f35f2');
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('prefers-reduced-motion');
  });
});
