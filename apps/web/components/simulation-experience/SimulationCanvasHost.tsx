'use client';

import { forwardRef } from 'react';

export interface SimulationCanvasHostProps {
  ariaLabel: string;
  className?: string;
  busy?: boolean;
}

const SimulationCanvasHost = forwardRef<
  HTMLDivElement,
  SimulationCanvasHostProps
>(function SimulationCanvasHost({ ariaLabel, className, busy = false }, ref) {
  return (
    <div
      ref={ref}
      className={className}
      data-testid="simulation-canvas"
      role="img"
      aria-label={ariaLabel}
      aria-busy={busy}
    />
  );
});

export default SimulationCanvasHost;
