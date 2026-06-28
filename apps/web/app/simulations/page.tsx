import Link from 'next/link';
import { SCIENCE_SIMULATION_CATALOG } from '@/lib/scienceCatalog.generated';
import { getSimulationCatalogSections } from '@/lib/simulationAvailability';

const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

export default function SimulationsPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem', background: '#0a0f1a' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#6b7280', fontSize: '0.875rem', display: 'inline-block', marginBottom: 28, textDecoration: 'none' }}>Back</Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Science Simulation Catalog</h1>
        <p style={{ color: '#94a3b8', marginBottom: 28 }}>
          {sections.implemented.length} simulations ready to test · PDF catalog rows now launch through reusable archetype runtimes
        </p>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.15rem', marginBottom: 14 }}>Ready To Launch</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {sections.implemented.map(s => (
              <Link key={s.slug} href={s.href ?? '#'} style={cardStyle}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color }}>
                  {s.subject} · {s.grade}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#f3f4f6', fontSize: '1rem', lineHeight: 1.25 }}>{s.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8, lineHeight: 1.35 }}>{s.topic}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{s.archetype} · {s.minutes} min</span>
                  <span style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#86efac', fontWeight: 800 }}>Launch</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

const cardStyle = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr auto',
  minHeight: 164,
  gap: 12,
  padding: '16px 18px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  textDecoration: 'none',
} as const;
