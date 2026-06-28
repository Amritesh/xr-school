import Link from 'next/link';
import { notFound } from 'next/navigation';
import GenericCatalogSimulationViewer from '@/components/simulations/GenericCatalogSimulationViewer';
import { SCIENCE_SIMULATION_CATALOG } from '@/lib/scienceCatalog.generated';

const CUSTOM_VIEWER_SLUGS = new Set([
  'c5-ch07-a03-soluble-and-insoluble-substances',
  'c6-ch01-a01-sources-of-food',
  'c9-ch01-a02-states-of-matter',
]);

export function generateStaticParams() {
  return SCIENCE_SIMULATION_CATALOG.filter(item => !CUSTOM_VIEWER_SLUGS.has(item.slug)).map(item => ({ slug: item.slug }));
}

export default async function CatalogSimulationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const simulation = SCIENCE_SIMULATION_CATALOG.find(item => item.slug === slug);
  if (!simulation) notFound();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#07111f' }}>
      <Link href="/simulations" style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.5)', color: '#f4f7fb', fontSize: '0.85rem', backdropFilter: 'blur(4px)', textDecoration: 'none' }}>
        Back
      </Link>
      <GenericCatalogSimulationViewer simulation={simulation} />
    </div>
  );
}
