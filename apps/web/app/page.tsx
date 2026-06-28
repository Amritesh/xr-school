import Link from 'next/link';
import { SCIENCE_SIMULATION_CATALOG } from '@/lib/scienceCatalog.generated';
import { getSimulationCatalogSections } from '@/lib/simulationAvailability';

const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

export default function Home() {
  return (
    <main className="home-shell">
      <nav className="home-nav">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" aria-hidden="true">XR</span>
          <span>
            <strong>XR School</strong>
            <small>Immersive science platform</small>
          </span>
        </Link>
        <Link className="nav-link" href="/simulations">Curriculum library</Link>
      </nav>

      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">Meta Quest + browser · CBSE Classes 5–10</span>
          <h1>Curriculum intelligence for immersive science.</h1>
          <p>
            XR School turns difficult-to-see science into guided, interactive learning—while keeping
            every course link, learning concept, and release claim transparent.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" href="/simulations">Explore curriculum library</Link>
            <Link className="secondary-action" href="/simulations/pollination">View featured simulation</Link>
          </div>
          <div className="trust-line">
            <span>✓ Stationary comfort design</span>
            <span>✓ Offline-first architecture</span>
            <span>✓ Explicit release governance</span>
          </div>
        </div>

        <div className="hero-console" aria-label="XR School platform snapshot">
          <div className="console-header">
            <span><i /> Platform snapshot</span>
            <small>28 June 2026</small>
          </div>
          <div className="console-feature">
            <span className="feature-index">01</span>
            <div>
              <small>Featured learning journey</small>
              <h2>Plant Pollination &amp; Growth Cycle</h2>
              <p>From pollen transfer to fertilisation, seed formation, and germination.</p>
            </div>
          </div>
          <div className="console-stats">
            <div><strong>{sections.launchable.length}</strong><span>Internal QA builds</span></div>
            <div><strong>{sections.catalogued.length}</strong><span>Curriculum candidates</span></div>
            <div><strong>18</strong><span>Canonical concepts</span></div>
          </div>
          <div className="console-footer">
            <span className="maturity-badge maturity-internalQA">Internal QA</span>
            <span>Quest acceptance still required</span>
          </div>
        </div>
      </section>

      <section className="value-grid">
        <ValueCard
          number="01"
          title="Start with curriculum"
          copy="Courses, chapters, and canonical concepts create the browse structure—not a loose wall of demos."
        />
        <ValueCard
          number="02"
          title="Make the invisible visible"
          copy="Particle motion, current flow, pollination, and dissolved materials become observable and discussable."
        />
        <ValueCard
          number="03"
          title="Release maturity, clearly shown"
          copy="Catalogued ideas remain discoverable, but only verified Internal QA builds receive launch access."
        />
      </section>

      <section className="home-cta">
        <div>
          <span className="eyebrow">Built for a credible demonstration</span>
          <h2>Show the working product and the curriculum system behind it.</h2>
        </div>
        <Link className="primary-action" href="/simulations">Open the showcase</Link>
      </section>
    </main>
  );
}

function ValueCard({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <article>
      <span>{number}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </article>
  );
}
