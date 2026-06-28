'use client';

import dynamic from 'next/dynamic';

const StatesOfMatterViewer = dynamic(() => import('../../../components/simulations/StatesOfMatterViewer'), { ssr: false });

export default function StatesOfMatterPage() {
  return <StatesOfMatterViewer />;
}
