'use client';

import dynamic from 'next/dynamic';

const BreathingProcessViewer = dynamic(
  () => import('@/components/simulations/BreathingProcessViewer'),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100vw', height: '100vh', background: '#0a1220', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40, color: '#7dd3fc' }}>Respiratory System Lab</div>
        <p style={{ color: '#a9bdcf' }}>Preparing the model...</p>
      </div>
    ),
  },
);

export default function BreathingProcessPage() {
  return <BreathingProcessViewer />;
}
