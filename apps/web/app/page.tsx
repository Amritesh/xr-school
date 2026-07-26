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
            href="/simulations/up-you-go-rock-climbing"
            emoji="🧗🏽‍♀️"
            color="#fbbf24"
            subject="Environmental Studies · Class 5"
            title="Rock Climbing"
            desc="Observe a supervised Tekla climbing route, inspect the safety system, recover from a slip, climb with balanced posture and rappel down."
            tags={['NCERT', 'Chapter 9', 'VR Ready']}
          />
          <SimCard
            href="/simulations/mangoes-round-the-year-aam-papad"
            emoji="🥭"
            color="#facc15"
            subject="Environmental Studies · Class 5"
            title="The Making of Aam Papad"
            desc="Make mamidi tandra by straining ripe mango pulp, mixing sugar and jaggery, then sun-drying repeated thin layers."
            tags={['NCERT', 'Chapter 4', 'VR Ready']}
          />
          <SimCard
            href="/simulations/mangoes-round-the-year-milk-spoilage"
            emoji="🥛"
            color="#7dd3fc"
            subject="Environmental Studies · Class 5"
            title="Milk Spoilage"
            desc="Compare milk over 24 hours and observe how room temperature, boiling, covering and refrigeration affect microbial spoilage."
            tags={['NCERT', 'Chapter 4', 'VR Ready']}
          />
          <SimCard
            href="/simulations/seeds-and-seeds-pitcher-plant"
            emoji="🌿"
            color="#a3e635"
            subject="Environmental Studies · Class 5"
            title="Pitcher Plant — The Insect Hunter"
            desc="Follow an insect into a modified pitcher leaf and see how the plant absorbs minerals while still making sugars by photosynthesis."
            tags={['NCERT', 'Chapter 5', 'VR Ready']}
          />
          <SimCard
            href="/simulations/mangoes-round-the-year-food-spoilage"
            emoji="🥭"
            color="#fb923c"
            subject="Environmental Studies · Class 5"
            title="Mangoes Round the Year: Food Spoilage"
            desc="Compare mango pieces over five days and observe how warmth, air, refrigeration, covering and salt affect spoilage."
            tags={['NCERT', 'Chapter 4', 'VR Ready']}
          />
          <SimCard
            href="/simulations/sorting-materials-by-shape"
            emoji="⚽"
            color="#4ade80"
            subject="Science · Class 6"
            title="Sorting Materials According to Their Shape"
            desc="Observe everyday objects and sort them into sphere, cylinder, cuboid, and cone groups using visible shape properties."
            tags={['NCERT', 'Chapter 4', 'VR Ready']}
          />
          <SimCard
            href="/simulations/fibre-to-fabric-cotton-ginning"
            emoji="⚙️"
            color="#fbbf24"
            subject="Science · Class 6"
            title="The Process of Cotton Ginning"
            desc="Inspect picked cotton, operate rollers, and separate fluffy cotton fibres from the larger seeds."
            tags={['NCERT', 'Chapter 3', 'VR Ready']}
          />
          <SimCard
            href="/simulations/fibre-to-fabric-cotton-farming"
            emoji="☁️"
            color="#86efac"
            subject="Science · Class 6"
            title="Cotton Farming"
            desc="Prepare black soil, sow and water cotton seeds, grow cotton bolls, then harvest the soft white fibre."
            tags={['NCERT', 'Chapter 3', 'VR Ready']}
          />
          <SimCard
            href="/simulations/components-of-food-mineral-sources"
            emoji="🧂"
            color="#60a5fa"
            subject="Science · Class 6"
            title="The Sources of Minerals in Food"
            desc="Match calcium, iodine and iron to representative food sources and discover the important jobs they perform in the body."
            tags={['NCERT', 'Chapter 2', 'VR Ready']}
          />
          <SimCard
            href="/simulations/components-of-food-vitamins-deficiencies"
            emoji="🥕"
            color="#4ade80"
            subject="Science · Class 6"
            title="Sources of Vitamins and Their Deficiencies"
            desc="Match vitamins A, B1, C and D to their food or natural sources, then identify the deficiency condition caused by a long-term lack."
            tags={['NCERT', 'Chapter 2', 'VR Ready']}
          />
          <SimCard
            href="/simulations/components-of-food-lipid-test"
            emoji="🥜"
            color="#22d3ee"
            subject="Science · Class 6"
            title="Test the Presence of Lipids"
            desc="Crush food samples on paper, dry the sheets, inspect them against light, and use the translucent-spot test to identify lipids."
            tags={['NCERT', 'Chapter 2', 'VR Ready']}
          />
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
