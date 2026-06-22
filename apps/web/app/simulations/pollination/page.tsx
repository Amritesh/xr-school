'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const PollinationViewer = dynamic(
  () => import('@/components/simulations/PollinationViewer'),
  { ssr: false, loading: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#0a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🌸</div>
      <p style={{ color: '#9ca3af' }}>Loading pollination garden…</p>
    </div>
  )}
);

export default function PollinationPage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a1f0a' }}>
      <Link href="/" style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.5)', color: '#e5e7eb', fontSize: '0.85rem', backdropFilter: 'blur(4px)' }}>
        ← Back
      </Link>
      <PollinationViewer />
    </div>
  );
}
