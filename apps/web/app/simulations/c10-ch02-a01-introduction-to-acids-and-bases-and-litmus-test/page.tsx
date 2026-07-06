'use client';

import dynamic from 'next/dynamic';

const AcidBaseViewer = dynamic(
  () => import('@/components/simulations/AcidBaseViewer'),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100vw', height: '100vh', background: '#0b1622', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40, color: '#7dd3fc' }}>Acids &amp; Bases Lab</div>
        <p style={{ color: '#a9bdcf' }}>Preparing the beaker...</p>
      </div>
    ),
  },
);

export default function AcidBasePage() {
  return <AcidBaseViewer />;
}
