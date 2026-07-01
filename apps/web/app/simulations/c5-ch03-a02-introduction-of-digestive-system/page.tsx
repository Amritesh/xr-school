'use client';

import dynamic from 'next/dynamic';

const DigestiveSystemViewer = dynamic(
  () => import('../../../components/simulations/DigestiveSystemViewer'),
  { ssr: false },
);

export default function DigestiveSystemPage() {
  return <DigestiveSystemViewer />;
}
