import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('XR School public website design language', () => {
  it('gives the catalog the homepage palette, editorial type, texture, and pill controls', () => {
    const css = read('apps/web/app/globals.css');

    expect(css).toContain('--paper: #f7f5ff');
    expect(css).toContain('--purple: #6f35f2');
    expect(css).toContain('--display-font: Iowan Old Style');
    expect(css).toContain('.showcase-shell::before');
    expect(css).toContain('border-radius: 99px');
  });

  it('carries the design language onto the robotree entry surfaces', () => {
    const css = read('apps/web/app/robotree/robotree.css');

    expect(css).toContain('.rt-public');
    expect(css).toContain('--rt-paper: #f7f5ff');
    expect(css).toContain('--rt-purple: #6f35f2');
    expect(css).toContain('Iowan Old Style');
    expect(css).toContain('border-radius: 99px');
  });

  it('keeps responsive and reduced-motion behavior across the public website', () => {
    const catalogCss = read('apps/web/app/globals.css');

    expect(catalogCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(catalogCss).toContain('@media (max-width: 720px)');
  });
});
