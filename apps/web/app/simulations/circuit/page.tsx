'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const CircuitViewer = dynamic(
  () => import('@/components/simulations/CircuitViewer'),
  { ssr: false, loading: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>⚡</div>
      <p style={{ color: '#9ca3af' }}>Setting up circuit board…</p>
    </div>
  )}
);

export default function CircuitPage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0f1a' }}>
      <Link href="/" style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.5)', color: '#e5e7eb', fontSize: '0.85rem', backdropFilter: 'blur(4px)' }}>
        ← Back
      </Link>
      <CircuitViewer />
    </div>
  );
}
