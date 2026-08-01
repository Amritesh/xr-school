'use client';

import { forwardRef, type CSSProperties } from 'react';
import { ACCEPTANCE_HOOKS } from './acceptanceHooks';

export interface SimulationCanvasHostProps {
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  busy?: boolean;
}

const SimulationCanvasHost = forwardRef<
  HTMLDivElement,
  SimulationCanvasHostProps
>(function SimulationCanvasHost({ ariaLabel, className, style, busy = false }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      style={style}
      data-testid={ACCEPTANCE_HOOKS.canvas}
      role="img"
      aria-label={ariaLabel}
      aria-busy={busy}
    />
  );
});

export default SimulationCanvasHost;
