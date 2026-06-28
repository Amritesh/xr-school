'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const SolubilityLabViewer = dynamic(
  () => import('@/components/simulations/SolubilityLabViewer'),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100vw', height: '100vh', background: '#07131d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>Solubility Lab</div>
        <p style={{ color: '#a5b4c3' }}>Preparing beaker...</p>
      </div>
    ),
  }
);

export default function SolubilityLabPage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#07131d' }}>
      <Link href="/simulations" style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.5)', color: '#f4f7fb', fontSize: '0.85rem', backdropFilter: 'blur(4px)', textDecoration: 'none' }}>
        Back
      </Link>
      <SolubilityLabViewer />
    </div>
  );
}
