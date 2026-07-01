'use client';

import dynamic from 'next/dynamic';

const WorldBuilderDiagnosticViewer = dynamic(
  () => import('../../../components/simulations/WorldBuilderDiagnosticViewer'),
  { ssr: false },
);

export default function WorldBuilderDiagnosticPage() {
  return <WorldBuilderDiagnosticViewer />;
}
