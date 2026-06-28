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
          {sections.launchable.length} headset-testable simulations · {sections.catalogued.length} curriculum candidates
        </p>

        <section style={{ ...cardStyle, minHeight: 'auto', marginBottom: 34 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#67e8f9' }}>
            Release governance
          </div>
          <div style={{ fontWeight: 800, color: '#f3f4f6', fontSize: '1.05rem' }}>
            Every simulation follows one verified maturity ladder
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Catalogued', 'In development', 'Internal QA', 'Pilot ready', 'School validated'].map((label, index) => (
              <span key={label} style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: `1px solid ${index === 2 ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.09)'}`,
                background: index === 2 ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.025)',
                color: index === 2 ? '#86efac' : '#94a3b8',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {index + 1}. {label}
              </span>
            ))}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.55 }}>
            Launch access begins at Internal QA. “School validated” is reserved for simulations backed by completed school evaluation evidence.
          </div>
        </section>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.15rem', marginBottom: 6 }}>Internal QA · Ready to test</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 0, marginBottom: 14 }}>Working builds for controlled browser and Meta Quest verification.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {sections.launchable.map(s => (
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
                  <span style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#86efac', fontWeight: 800 }}>Launch test build</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 34 }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.15rem', marginBottom: 6 }}>Catalogued · Curriculum roadmap</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 0, marginBottom: 14 }}>
            Structured course candidates are visible for planning, but remain locked until they pass development and internal QA.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {sections.catalogued.slice(0, 12).map(s => (
              <article key={s.slug} style={{ ...cardStyle, opacity: 0.74 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color }}>
                  {s.subject} · {s.grade}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#e2e8f0', fontSize: '1rem', lineHeight: 1.25 }}>{s.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8, lineHeight: 1.35 }}>{s.topic}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{s.archetype} · {s.minutes} min</span>
                  <span style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, background: 'rgba(148,163,184,0.1)', color: '#94a3b8', fontWeight: 800 }}>Not released</span>
                </div>
              </article>
            ))}
          </div>
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 14 }}>
            Showing 12 of {sections.catalogued.length}. Full concept search and class filters arrive in the next release.
          </p>
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
