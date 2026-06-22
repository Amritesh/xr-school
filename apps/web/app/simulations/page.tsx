import Link from 'next/link';

const SIMS = [
  {
    slug: 'pollination',
    emoji: '🌸',
    color: '#34d399',
    subject: 'Biology',
    grade: 'Class 6–10',
    title: 'Plant Pollination & Growth Cycle',
    xrFit: 'Strong VR Fit',
    stages: 8,
    minutes: 10,
  },
  {
    slug: 'circuit',
    emoji: '⚡',
    color: '#fbbf24',
    subject: 'Physics',
    grade: 'Class 8–10',
    title: 'Electric Circuits & Resistance',
    xrFit: 'Strong VR Fit',
    stages: 4,
    minutes: 8,
  },
];

export default function SimulationsPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem', background: '#0a0f1a' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#6b7280', fontSize: '0.875rem', display: 'inline-block', marginBottom: 32 }}>← Back</Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Simulation Catalog</h1>
        <p style={{ color: '#6b7280', marginBottom: 40 }}>2 simulations · MVP release</p>

        <div style={{ display: 'grid', gap: 16 }}>
          {SIMS.map(s => (
            <Link key={s.slug} href={`/simulations/${s.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
              <span style={{ fontSize: 40, flexShrink: 0 }}>{s.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color, marginBottom: 4 }}>{s.subject} · {s.grade}</div>
                <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '1.05rem' }}>{s.title}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', fontWeight: 600 }}>Launch →</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{s.stages} stages · {s.minutes} min</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
