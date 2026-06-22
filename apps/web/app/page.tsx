import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f35 100%)' }}>
      <div style={{ maxWidth: 720, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿⚡</div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 16, background: 'linear-gradient(135deg, #4f8ef7, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          XR School Lab Platform
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1.1rem', marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>
          Offline-first immersive science simulations for K–12 students in North East India. Built for Meta Quest, works in any browser.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
          <SimCard
            href="/simulations/pollination"
            emoji="🌸"
            color="#34d399"
            subject="Biology · Class 6–10"
            title="Plant Pollination & Growth Cycle"
            desc="Walk through a flowering garden in VR. Watch pollen transfer, seed formation, germination, and a full plant life cycle unfold."
            tags={['CBSE', 'ICSE', 'VR Ready']}
          />
          <SimCard
            href="/simulations/circuit"
            emoji="⚡"
            color="#fbbf24"
            subject="Physics · Class 8–10"
            title="Electric Circuits & Resistance"
            desc="Toggle switches, change resistors, and watch electrons flow in real-time. Discover Ohm's Law through hands-on interaction."
            tags={['CBSE', 'ICSE', 'Interactive']}
          />
        </div>

        <Link href="/simulations" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 8, background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', color: '#4f8ef7', fontWeight: 600, fontSize: '0.95rem' }}>
          View All Simulations →
        </Link>

        <div style={{ marginTop: 64, padding: '24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem', color: '#6b7280' }}>
          <strong style={{ color: '#9ca3af' }}>Meta Quest users:</strong> Open this page in the Quest Browser, then tap <em>Enter VR</em> on any simulation. For best performance, connect both devices to the same Wi-Fi network.
        </div>
      </div>
    </main>
  );
}

function SimCard({ href, emoji, color, subject, title, desc, tags }: {
  href: string; emoji: string; color: string; subject: string;
  title: string; desc: string; tags: string[];
}) {
  return (
    <Link href={href} style={{ display: 'block', padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', transition: 'border-color 0.2s, transform 0.15s', textDecoration: 'none' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: color, marginBottom: 8 }}>{subject}</div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f3f4f6', marginBottom: 10, lineHeight: 1.3 }}>{title}</h2>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 }}>{desc}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tags.map(t => (
          <span key={t} style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{t}</span>
        ))}
      </div>
    </Link>
  );
}
