import Image from 'next/image';
import Link from 'next/link';
import { SCIENCE_SIMULATION_CATALOG } from '@/lib/scienceCatalog.generated';
import { getSimulationCatalogSections } from '@/lib/simulationAvailability';
import './home.css';

const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

const FLAGSHIPS = [
  {
    classLevel: 5,
    slug: 'c5-ch03-a02-introduction-of-digestive-system',
    shortTitle: 'Journey through digestion',
    motif: 'Digest',
    tone: 'coral',
  },
  {
    classLevel: 6,
    slug: 'c6-ch01-a01-sources-of-food',
    shortTitle: 'Trace where food begins',
    motif: 'Source',
    tone: 'mint',
  },
  {
    classLevel: 7,
    slug: 'c7-ch10-a02-the-breathing-process-in-human',
    shortTitle: 'Make a breath happen',
    motif: 'Breathe',
    tone: 'sky',
  },
  {
    classLevel: 8,
    slug: 'c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape',
    shortTitle: 'Feel force change motion',
    motif: 'Force',
    tone: 'peach',
  },
  {
    classLevel: 9,
    slug: 'c9-ch01-a02-states-of-matter',
    shortTitle: 'Move between states',
    motif: 'Matter',
    tone: 'lilac',
  },
  {
    classLevel: 10,
    slug: 'circuit',
    shortTitle: 'Bring a circuit to life',
    motif: 'Current',
    tone: 'yellow',
  },
] as const;

const FEATURES = [
  {
    kicker: 'Learning you can feel',
    title: 'Don’t just explain it. Let them reach in.',
    copy: 'Students transfer pollen, pull a diaphragm, push against inertia, and rearrange particles. The hard-to-see part of science becomes the part they can act on.',
    image: '/home/learning-by-doing.webp',
    alt: 'Two learners exploring pollination inside an enlarged flower model',
    detail: 'Every interaction is tied to a visible scientific response.',
    reverse: false,
  },
  {
    kicker: 'One calm classroom',
    title: 'Ten headsets. One lesson. Teacher in control.',
    copy: 'Launch, pause, guide, and bring everyone back together from one simple teacher room. Seated comfort and shared pacing keep the technology out of the way.',
    image: '/home/teacher-orchestration.webp',
    alt: 'A teacher guiding four seated learners through a shared VR science lesson',
    detail: 'Designed for stationary use and local classroom networks.',
    reverse: true,
  },
  {
    kicker: 'A curriculum, not a demo wall',
    title: 'A growing world behind every chapter.',
    copy: 'Browse by class, chapter, and concept. Start with working flagship experiences, then see the wider CBSE-aligned map they are built to serve.',
    image: '/home/curriculum-worlds.webp',
    alt: 'An open illustrated science atlas containing six interactive learning worlds',
    detail: `${sections.catalogued.length} curriculum candidates connected to a clear release path.`,
    reverse: false,
  },
] as const;

export default function Home() {
  return (
    <main className="home-editorial">
      <nav className="home-editorial-nav" aria-label="Primary navigation">
        <Link className="home-brand" href="/" aria-label="XR School home">
          <span className="home-brand-mark" aria-hidden="true">
            <span>XR</span>
          </span>
          <span className="home-brand-name">XR School</span>
        </Link>

        <div className="home-nav-pill">
          <Link href="/simulations">Curriculum</Link>
          <Link href="/robotree/login">Teacher room</Link>
          <Link href="/robotree/headset">Join room</Link>
        </div>

        <Link className="home-nav-action" href="/simulations">
          Explore simulations <span aria-hidden="true">↗</span>
        </Link>
      </nav>

      <section className="home-editorial-hero" aria-labelledby="home-title">
        <p className="home-kicker">Immersive science for CBSE Classes 5–10</p>
        <h1 id="home-title" aria-label="Step inside the lesson">
          Step inside <em>the lesson.</em>
        </h1>
        <p className="home-hero-copy">
          XR School turns the science students struggle to picture into a world they can explore,
          test, and remember.
        </p>
        <div className="home-hero-actions">
          <Link className="home-button home-button-primary" href="/simulations">
            Explore the curriculum <span aria-hidden="true">→</span>
          </Link>
          <Link className="home-button home-button-quiet" href="/robotree/login">
            Set up a teacher room
          </Link>
        </div>
        <div className="home-hero-art">
          <span className="home-doodle home-doodle-one" aria-hidden="true">✦</span>
          <span className="home-doodle home-doodle-two" aria-hidden="true">✧</span>
          <Image
            src="/home/hero-learning-world.webp"
            alt="A learner entering a portal surrounded by interactive flower, lungs, particles, planets, and a circuit"
            width={1696}
            height={938}
            priority
            sizes="(max-width: 720px) 112vw, min(1240px, 96vw)"
          />
        </div>
        <div className="home-hero-proof" aria-label="Platform highlights">
          <span>Quest + browser</span>
          <span>Offline-first</span>
          <span>Teacher-paced</span>
          <span>Visible science</span>
        </div>
      </section>

      <section className="home-opening-statement">
        <p className="home-section-number" aria-hidden="true">01</p>
        <div>
          <p className="home-kicker">Science changes when perspective changes</p>
          <h2>Some ideas only click when students can stand next to them.</h2>
        </div>
      </section>

      <section className="home-features" aria-label="How XR School works">
        {FEATURES.map((feature, index) => (
          <article
            className={`home-feature-row${feature.reverse ? ' home-feature-row-reverse' : ''}`}
            key={feature.title}
          >
            <div className="home-feature-art">
              <Image
                src={feature.image}
                alt={feature.alt}
                width={1696}
                height={938}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
            <div className="home-feature-copy">
              <span className="home-feature-index" aria-hidden="true">0{index + 1}</span>
              <p className="home-kicker">{feature.kicker}</p>
              <h2>{feature.title}</h2>
              <p>{feature.copy}</p>
              <div className="home-feature-note">
                <span aria-hidden="true">↳</span>
                {feature.detail}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="home-capabilities" aria-labelledby="capabilities-title">
        <div className="home-capability-heading">
          <p className="home-kicker">Built for the room you already have</p>
          <h2 id="capabilities-title">Immersion without the operational drama.</h2>
        </div>
        <div className="home-capability-grid">
          <Capability icon="◎" title="Comfort comes first">
            Stationary scenes, clear focus cues, and calm transitions keep attention on the lesson.
          </Capability>
          <Capability icon="⌁" title="Works close to home">
            Offline-first architecture keeps the classroom moving when the internet does not.
          </Capability>
          <Capability icon="✦" title="The model stays visible">
            Students see the evidence behind every change—not just a correct-answer animation.
          </Capability>
          <Capability icon="↯" title="Teachers set the pace">
            Start together, pause together, and guide the room without visiting every headset.
          </Capability>
        </div>
      </section>

      <section className="home-class-band" aria-labelledby="class-band-title">
        <div className="home-class-band-inner">
          <div className="home-band-heading">
            <div>
              <p className="home-kicker">One flagship for every class</p>
              <h2 id="class-band-title">Six lessons ready to open.</h2>
            </div>
            <p>
              Start with a working journey from each class. Every one asks students to do something
              that changes the science in front of them.
            </p>
          </div>
          <div className="home-class-grid">
            {FLAGSHIPS.map((flagship) => (
              <Link
                className={`home-class-card home-class-card-${flagship.tone}`}
                href={`/simulations/${flagship.slug}`}
                key={flagship.slug}
              >
                <span className="home-class-card-topline">
                  <span>Class {flagship.classLevel}</span>
                  <span aria-hidden="true">↗</span>
                </span>
                <span className="home-class-orbit" aria-hidden="true">
                  <i />
                  <b>{flagship.motif.slice(0, 1)}</b>
                </span>
                <strong>{flagship.shortTitle}</strong>
                <small>{flagship.motif} lab</small>
              </Link>
            ))}
          </div>
          <Link className="home-band-link" href="/simulations">
            Browse the complete curriculum library <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="home-proof" aria-labelledby="proof-title">
        <div className="home-proof-copy">
          <p className="home-kicker">Clear about what is ready</p>
          <h2 id="proof-title">A credible platform grows in the open.</h2>
          <p>
            Working experiences are separated from curriculum candidates. Release maturity stays
            visible, so a school always knows what it is opening.
          </p>
          <Link href="/simulations">See release status in the library <span aria-hidden="true">→</span></Link>
        </div>
        <div className="home-proof-card" aria-label="Current platform snapshot">
          <div className="home-proof-card-header">
            <span><i /> Platform snapshot</span>
            <span>Live catalog</span>
          </div>
          <div className="home-proof-metrics">
            <div><strong>{sections.launchable.length}</strong><span>working experiences</span></div>
            <div><strong>{sections.catalogued.length}</strong><span>curriculum candidates</span></div>
            <div><strong>5–10</strong><span>CBSE class range</span></div>
          </div>
          <div className="home-proof-status">
            <span>Internal QA</span>
            <p>Browser builds are available. Quest acceptance remains explicitly tracked.</p>
          </div>
        </div>
      </section>

      <section className="home-closing" aria-labelledby="closing-title">
        <span className="home-closing-star" aria-hidden="true">✦</span>
        <p className="home-kicker">The next lesson can feel bigger</p>
        <h2 id="closing-title">Open a world. Let curiosity do the rest.</h2>
        <div className="home-hero-actions">
          <Link className="home-button home-button-primary" href="/simulations">Enter the curriculum</Link>
          <Link className="home-button home-button-quiet" href="/robotree/headset">Join a teacher room</Link>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <div>
            <Link className="home-brand home-brand-footer" href="/">
              <span className="home-brand-mark" aria-hidden="true"><span>XR</span></span>
              <span className="home-brand-name">XR School</span>
            </Link>
            <p>Immersive science, made teachable.</p>
          </div>
          <div className="home-footer-links">
            <div><strong>Explore</strong><Link href="/simulations">Curriculum library</Link><Link href="/robotree/headset">Join room</Link></div>
            <div><strong>Teach</strong><Link href="/robotree/login">Teacher setup</Link><Link href="/robotree/dashboard">Classroom dashboard</Link></div>
            <div><strong>Platform</strong><span>Quest + browser</span><span>Offline-first</span></div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Capability({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <article>
      <span className="home-capability-icon" aria-hidden="true">{icon}</span>
      <div><h3>{title}</h3><p>{children}</p></div>
    </article>
  );
}
