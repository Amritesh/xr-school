'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const FoodSourcesSortingViewer = dynamic(
  () => import('@/components/simulations/FoodSourcesSortingViewer'),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100vw', height: '100vh', background: '#10140f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>Food Sources</div>
        <p style={{ color: '#a7b7a0' }}>Setting up sorting table...</p>
      </div>
    ),
  }
);

export default function FoodSourcesPage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#10140f' }}>
      <Link href="/simulations" style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.5)', color: '#f4f7ee', fontSize: '0.85rem', backdropFilter: 'blur(4px)', textDecoration: 'none' }}>
        Back
      </Link>
      <FoodSourcesSortingViewer />
    </div>
  );
}
