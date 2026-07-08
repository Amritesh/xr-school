'use client';

import dynamic from 'next/dynamic';

const ColourAdventureViewer = dynamic(
  () => import('@/components/simulations/ColourAdventureViewer'),
  { ssr: false },
);

export default function ColourAdventurePage() {
  return <ColourAdventureViewer />;
}
