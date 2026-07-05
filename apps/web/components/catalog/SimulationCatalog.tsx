'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type {
  CurriculumSearchDocument,
  ReleaseMaturity,
  Subject,
} from '../../../../packages/simulation-schema/src/index';
import { CURRICULUM_SEARCH_DOCUMENTS } from '@/lib/curriculumSearch.generated';
import { searchCurriculum } from '@/lib/curriculumSearch';
import { SCIENCE_SIMULATION_CATALOG } from '@/lib/scienceCatalog.generated';
import {
  getSimulationCatalogSections,
  matchesCatalogFilters,
  type CatalogCard,
} from '@/lib/simulationAvailability';

const defaultSections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

const SUBJECT_OPTIONS: { value: Subject; label: string }[] = [
  { value: 'science', label: 'Science' },
  { value: 'environmentalScience', label: 'Environmental Science' },
  { value: 'biology', label: 'Biology' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'physics', label: 'Physics' },
];

const MATURITY_LABELS: Record<ReleaseMaturity, string> = {
  catalogued: 'Catalogued',
  inDevelopment: 'In development',
  internalQA: 'Internal QA',
  pilotReady: 'Pilot ready',
  schoolValidated: 'School validated',
};

const KIND_LABELS: Record<CurriculumSearchDocument['kind'], string> = {
  course: 'Course',
  chapter: 'Chapter',
  concept: 'Concept',
  simulation: 'Simulation',
};

export type SimulationCatalogProps = {
  documents?: readonly CurriculumSearchDocument[];
  launchableCards?: CatalogCard[];
  cataloguedCards?: CatalogCard[];
  isLoading?: boolean;
  errorMessage?: string;
};

export default function SimulationCatalog({
  documents = CURRICULUM_SEARCH_DOCUMENTS,
  launchableCards = defaultSections.launchable,
  cataloguedCards = defaultSections.catalogued,
  isLoading = false,
  errorMessage,
}: SimulationCatalogProps = {}) {
  const [query, setQuery] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [releaseMaturity, setReleaseMaturity] = useState('');

  // A text query always runs the full curriculum search (courses, chapters,
  // concepts, and simulations together). Class/subject/maturity alone
  // instead filter the existing simulation-card sections in place, so
  // picking "Class 7" still shows the same card treatment — including the
  // "no Internal QA build yet" empty state — rather than falling back to a
  // generic search-result list that can't tell a real build from a
  // catalogued candidate.
  const hasTextQuery = Boolean(query);
  const cardFilters = {
    classLevel: classLevel ? Number(classLevel) : undefined,
    subject: subject || undefined,
    releaseMaturity: releaseMaturity || undefined,
  };
  const filtersActive = Boolean(query || classLevel || subject || releaseMaturity);
  const results = useMemo(() => searchCurriculum(
    documents,
    query,
    {
      classLevel: classLevel ? Number(classLevel) : undefined,
      subject: subject ? subject as Subject : undefined,
      releaseMaturity: releaseMaturity ? releaseMaturity as ReleaseMaturity : undefined,
    },
  ), [classLevel, documents, query, releaseMaturity, subject]);

  const filteredLaunchableCards = useMemo(
    () => launchableCards.filter(card => matchesCatalogFilters(card, cardFilters)),
    [launchableCards, classLevel, subject, releaseMaturity],
  );
  const filteredCataloguedCards = useMemo(
    () => cataloguedCards.filter(card => matchesCatalogFilters(card, cardFilters)),
    [cataloguedCards, classLevel, subject, releaseMaturity],
  );

  const courseDocuments = documents.filter(document => document.kind === 'course'
    && (!classLevel || document.classLevels.includes(Number(classLevel)))
    && (!subject || (document.subjects as readonly string[]).includes(subject)));
  const chapterDocuments = documents.filter(document => document.kind === 'chapter');
  const canonicalConceptCount = documents.filter(document => document.kind === 'concept').length;

  const resetFilters = () => {
    setQuery('');
    setClassLevel('');
    setSubject('');
    setReleaseMaturity('');
  };

  if (isLoading) {
    return <CatalogStateFrame title="Loading curriculum library" copy="Preparing courses, concepts, and release classifications." state="loading" />;
  }

  if (errorMessage) {
    return <CatalogStateFrame title="Curriculum library unavailable" copy={errorMessage} state="error" />;
  }

  if (documents.length === 0 && launchableCards.length === 0 && cataloguedCards.length === 0) {
    return <CatalogStateFrame title="No curriculum records yet" copy="Add a course, chapter, concept, or simulation record to begin." state="empty" />;
  }

  return (
    <main className="showcase-shell">
      <header className="product-header">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" aria-hidden="true">XR</span>
          <span>
            <strong>XR School</strong>
            <small>Immersive science platform</small>
          </span>
        </Link>
        <div className="header-status">
          <span className="status-dot" />
          {launchableCards.length} Internal QA builds
        </div>
      </header>

      <section className="catalog-hero">
        <div>
          <span className="eyebrow">Curriculum library · CBSE Classes 5–10</span>
          <h1>Find the concept. See its course context. Launch only what is ready.</h1>
          <p>
            Search a structured science curriculum spanning courses, chapters, concepts, and XR simulations.
            Every result carries a plain-language release level.
          </p>
        </div>
        <div className="catalog-metrics" aria-label="Catalog summary">
          <Metric value={String(launchableCards.length + cataloguedCards.length)} label="unique simulation opportunities" />
          <Metric value={String(canonicalConceptCount)} label="canonical learning concepts" />
          <Metric value={String(launchableCards.length)} label="headset-testable builds" />
        </div>
      </section>

      <section className="search-workbench" aria-label="Curriculum search controls">
        <label className="search-field">
          <span className="sr-only">Search curriculum</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search courses, chapters, concepts, and simulations"
          />
        </label>
        <div className="filter-row">
          <label>
            <span>Class level</span>
            <select value={classLevel} onChange={event => setClassLevel(event.target.value)}>
              <option value="">All classes</option>
              {[5, 6, 7, 8, 9, 10].map(value => <option key={value} value={value}>Class {value}</option>)}
            </select>
          </label>
          <label>
            <span>Subject</span>
            <select value={subject} onChange={event => setSubject(event.target.value)}>
              <option value="">All subjects</option>
              {SUBJECT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Release maturity</span>
            <select value={releaseMaturity} onChange={event => setReleaseMaturity(event.target.value)}>
              <option value="">All levels</option>
              {Object.entries(MATURITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {filtersActive && <button className="reset-button" type="button" onClick={resetFilters}>Clear filters</button>}
        </div>
      </section>

      {hasTextQuery ? (
        <section className="catalog-section" aria-live="polite">
          <SectionHeading
            eyebrow="Search results"
            title={`${results.length} curriculum ${results.length === 1 ? 'match' : 'matches'}`}
            copy="Results are ranked by canonical concept, title, alias, and curriculum keywords."
          />
          {results.length > 0 ? (
            <div className="search-results-grid">
              {results.slice(0, 36).map(document => <SearchResultCard key={document.id} document={document} />)}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No curriculum match yet.</strong>
              <span>Try a broader concept such as “matter”, “current”, “food”, or “water”.</span>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="catalog-section" aria-live="polite">
            <SectionHeading
              eyebrow="Featured simulations"
              title="Working builds for controlled testing"
              copy="These simulations have reached Internal QA. They are ready to demonstrate, but remain explicitly below pilot and school-validated status."
            />
            {filteredLaunchableCards.length > 0 ? (
              <div className="catalog-grid featured-grid">
                {filteredLaunchableCards.map(card => <SimulationCard key={card.slug} card={card} />)}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No Internal QA build yet for this filter.</strong>
                <span>Browse the catalogued candidates below, or clear the filter to see all {launchableCards.length} working builds.</span>
              </div>
            )}
          </section>

          <section className="catalog-section">
            <SectionHeading
              eyebrow="Course structure"
              title="Browse from class to chapter to concept"
              copy="Canonical links keep course material searchable without duplicating or losing the teaching context."
            />
            <div className="course-grid">
              {courseDocuments.map(course => {
                const chapters = chapterDocuments.filter(chapter =>
                  chapter.classLevels.some(level => course.classLevels.includes(level))
                  && chapter.subjects.some(item => (course.subjects as readonly string[]).includes(item)),
                );
                return (
                  <article className="course-card" id={course.id.replace('course:', '')} key={course.id}>
                    <div className="course-card-topline">
                      <span>{course.classLevels.map(level => `Class ${level}`).join(', ')}</span>
                      <span>{formatSubject(course.subjects[0])}</span>
                    </div>
                    <h3>{course.title}</h3>
                    <p>{course.summary}</p>
                    <div className="chapter-list">
                      {chapters.map(chapter => (
                        <div id={chapter.id.replace('chapter:', '')} key={chapter.id}>
                          <span>Chapter</span>
                          <strong>{chapter.title}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="catalog-section">
            <SectionHeading
              eyebrow="Curriculum roadmap"
              title="Structured candidates, clearly gated"
              copy="These records are searchable planning opportunities—not finished simulations. Launch remains disabled until Internal QA."
            />
            <div className="catalog-grid">
              {filteredCataloguedCards.slice(0, 9).map(card => <SimulationCard key={card.slug} card={card} />)}
            </div>
            <p className="section-footnote">
              {filtersActive
                ? `${filteredCataloguedCards.length} catalogued candidates match this filter.`
                : `Search or filter above to explore all ${cataloguedCards.length} catalogued candidates.`}
            </p>
          </section>
        </>
      )}

      <section className="release-policy">
        <div>
          <span className="eyebrow">Release maturity, clearly shown</span>
          <h2>Deployment is not the same as school readiness.</h2>
          <p>Launch access begins at Internal QA. School validated is only earned after a controlled school session and accepted evaluation evidence.</p>
        </div>
        <ol>
          {Object.values(MATURITY_LABELS).map((label, index) => (
            <li className={index === 2 ? 'current' : ''} key={label}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function CatalogStateFrame({
  title,
  copy,
  state,
}: {
  title: string;
  copy: string;
  state: 'empty' | 'loading' | 'error';
}) {
  return (
    <main className="showcase-shell">
      <header className="product-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">XR</span>
          <span><strong>XR School</strong><small>Immersive science platform</small></span>
        </div>
      </header>
      <section className={`catalog-state catalog-state-${state}`} role={state === 'error' ? 'alert' : 'status'}>
        <span className="eyebrow">Curriculum library</span>
        <h1>{title}</h1>
        <p>{copy}</p>
        {state === 'loading' && <div className="state-progress" aria-hidden="true"><span /></div>}
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function SimulationCard({ card }: { card: CatalogCard }) {
  const content = (
    <>
      <div className="simulation-card-topline">
        <span style={{ color: card.color }}>{formatSubject(card.subject)}</span>
        <span className={`maturity-badge maturity-${card.releaseMaturity}`}>
          {MATURITY_LABELS[card.releaseMaturity]}
        </span>
      </div>
      <div>
        <p className="card-kicker">{card.grade} · {card.topic}</p>
        <h3>{card.title}</h3>
      </div>
      <div className="simulation-card-footer">
        <span>{formatArchetype(card.archetype)} · {card.minutes} min</span>
        <strong>{card.href ? 'Open test build ↗' : 'Launch gated'}</strong>
      </div>
    </>
  );

  if (card.href) {
    return <Link className="simulation-card launchable" href={card.href}>{content}</Link>;
  }

  return <article className="simulation-card gated" id={card.slug}>{content}</article>;
}

function SearchResultCard({ document }: { document: CurriculumSearchDocument }) {
  const isGated = document.kind === 'simulation' && document.releaseMaturity === 'catalogued';
  return (
    <Link className="search-result-card" href={document.href} id={document.id.replace(':', '-')}>
      <div>
        <span>{KIND_LABELS[document.kind]}</span>
        {document.releaseMaturity && (
          <span className={`maturity-badge maturity-${document.releaseMaturity}`}>
            {MATURITY_LABELS[document.releaseMaturity]}
          </span>
        )}
      </div>
      <h3>{document.title}</h3>
      <p>{document.summary}</p>
      <small>
        {document.classLevels.map(level => `Class ${level}`).join(', ') || 'Cross-class'}
        {' · '}
        {document.subjects.map(formatSubject).join(', ')}
        {isGated ? ' · Launch gated' : ''}
      </small>
    </Link>
  );
}

function formatSubject(value = '') {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function formatArchetype(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase());
}
