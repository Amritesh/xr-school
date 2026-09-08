'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CHALLENGE_FOODS,
  SPOILAGE_COVERAGE,
  VILLAGE_STORE_BRIEF,
  evaluateStorageChallenge,
  respectsBrief,
  scoreStoragePrediction,
} from '@xr-school/simulation-runtime';
import type {
  StorageChallengeResult,
  StorageConditions,
} from '@xr-school/simulation-runtime';
import {
  createStorageChallengeWorld,
  type StorageChallengeWorld,
} from '@/lib/storage-challenge/storageChallengeWorld';
import './food-storage-challenge.css';

type Phase = 'brief' | 'predict' | 'setup' | 'run' | 'report';

const DAY_SECONDS = 1.1;

const FOOD_NOTE: Record<string, string> = {
  bread: 'Soft, a little damp inside.',
  fruit: 'Ripe and full of juice.',
  rice: 'Bone dry in an open bowl.',
  chapati: 'Cooked this morning, still soft.',
};

function conditionsEqual(a: StorageConditions, b: StorageConditions): boolean {
  const seal = (c: StorageConditions) => [...(c.sealedFoodIds ?? [])].sort().join(',');
  return (
    a.temperatureC === b.temperatureC &&
    a.humidityPercent === b.humidityPercent &&
    seal(a) === seal(b)
  );
}

/**
 * Counts how many settings changed between two attempts. A learner who moves
 * one thing at a time is testing; a learner who moves everything is guessing,
 * and the closing report says so.
 */
function changedSettings(a: StorageConditions, b: StorageConditions): number {
  const seal = (c: StorageConditions) => [...(c.sealedFoodIds ?? [])].sort().join(',');
  let changed = 0;
  if (a.temperatureC !== b.temperatureC) changed += 1;
  if (a.humidityPercent !== b.humidityPercent) changed += 1;
  if (seal(a) !== seal(b)) changed += 1;
  return changed;
}

export default function FoodStorageChallengeViewer() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<StorageChallengeWorld | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>('brief');
  const [ranking, setRanking] = useState<string[]>([]);
  const [conditions, setConditions] = useState<StorageConditions>({
    temperatureC: 26,
    humidityPercent: 65,
    sealed: false,
    sealedFoodIds: [],
  });
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [attempts, setAttempts] = useState<StorageConditions[]>([]);

  const result: StorageChallengeResult = useMemo(
    () => evaluateStorageChallenge(conditions, CHALLENGE_FOODS, VILLAGE_STORE_BRIEF.days),
    [conditions],
  );

  const legal = respectsBrief(conditions, VILLAGE_STORE_BRIEF);

  const prediction = useMemo(() => {
    if (ranking.length !== CHALLENGE_FOODS.length) return undefined;
    try {
      return scoreStoragePrediction(ranking, result);
    } catch {
      return undefined;
    }
  }, [ranking, result]);

  // ── One 3D pantry for the life of the page ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1712);
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 60);
    // The shelf sits in the upper half of the frame so the card below never
    // covers the food the learner is being asked about.
    camera.position.set(0, 2.05, 5.0);
    camera.lookAt(0, 1.28, 0);

    const key = new THREE.DirectionalLight(0xfff2da, 2.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd8e6ff, 0.8);
    fill.position.set(-4, 2.5, 3);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xffeed6, 0x2f2620, 1.3));
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const world = createStorageChallengeWorld();
    worldRef.current = world;
    scene.add(world.root);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    rendererRef.current = renderer;
    mount.replaceChildren(renderer.domElement);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Push the rendered view upward so the shelf clears the card below it.
      // Framing the food above the interface, rather than behind it, is the
      // difference between a learner seeing the evidence and reading about it.
      camera.setViewOffset(width, height, 0, height * 0.19, width, height);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      world.update(1 / 60, elapsed);
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      world.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      worldRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // ── The shelf always shows the day the learner is looking at ──
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const shown = phase === 'run' || phase === 'report' ? day : 0;
    world.project({
      day: shown,
      temperatureC: conditions.temperatureC,
      humidityPercent: conditions.humidityPercent,
      foods: result.outcomes.map((outcome) => {
        const reading = outcome.readings[shown] ?? outcome.readings[0]!;
        return {
          foodId: outcome.foodId,
          surfaceCoverage: reading.surfaceCoverage,
          sealed: (conditions.sealedFoodIds ?? []).includes(outcome.foodId),
          spoiled: reading.spoiled,
        };
      }),
    });
  }, [result, day, phase, conditions]);

  // ── Playing the week forward ──
  useEffect(() => {
    if (!playing) return;
    if (day >= VILLAGE_STORE_BRIEF.days) {
      setPlaying(false);
      setPhase('report');
      return;
    }
    const timer = setTimeout(() => setDay((value) => value + 1), DAY_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [playing, day]);

  const toggleSeal = useCallback((foodId: string) => {
    setConditions((current) => {
      const sealedFoodIds = current.sealedFoodIds ?? [];
      return {
        ...current,
        sealedFoodIds: sealedFoodIds.includes(foodId)
          ? sealedFoodIds.filter((id) => id !== foodId)
          : [...sealedFoodIds, foodId],
      };
    });
  }, []);

  const runWeek = useCallback(() => {
    setAttempts((list) =>
      list.some((entry) => conditionsEqual(entry, conditions)) ? list : [...list, conditions],
    );
    setDay(0);
    setPhase('run');
    setPlaying(true);
  }, [conditions]);

  const tryAgain = useCallback(() => {
    setPhase('setup');
    setDay(0);
    setPlaying(false);
  }, []);

  const isolatedVariables =
    attempts.length < 2
      ? undefined
      : attempts
          .slice(1)
          .every((entry, index) => changedSettings(attempts[index]!, entry) === 1);

  const foodLabel = (foodId: string) =>
    CHALLENGE_FOODS.find((food) => food.id === foodId)?.label ?? foodId;

  return (
    <main className="store" data-phase={phase}>
      <div className="store__stage" ref={mountRef} role="img" aria-label="A pantry shelf holding bread, a mango, dry rice and chapatis" />

      <header className="store__bar">
        <span className="store__eyebrow">Class 8 · Microorganisms</span>
        <h1>The Village Store</h1>
        <ol className="store__steps" aria-label="Progress">
          {(['brief', 'predict', 'setup', 'run', 'report'] as Phase[]).map((step) => (
            <li key={step} data-state={step === phase ? 'current' : 'other'} />
          ))}
        </ol>
      </header>

      {phase === 'brief' ? (
        <section className="store__card store__card--wide" data-testid="store-brief">
          <h2>Seven days, no electricity</h2>
          <p>{VILLAGE_STORE_BRIEF.question}</p>
          <p className="store__aside">
            There is no setting that saves everything. Part of the answer is
            working out which food cannot be saved — and being able to say why.
          </p>
          <button type="button" data-testid="store-begin" onClick={() => setPhase('predict')}>
            Look at the shelf
          </button>
        </section>
      ) : null}

      {phase === 'predict' ? (
        <section className="store__card store__card--wide" data-testid="store-predict">
          <h2>Before you touch anything — which will spoil worst?</h2>
          <p className="store__aside">
            Tap them worst first. You are not marked on this; it is compared
            with what actually happens.
          </p>
          <ol className="store__ranking">
            {ranking.map((foodId, index) => (
              <li key={foodId}>
                <span className="store__rank">{index + 1}</span>
                {foodLabel(foodId)}
              </li>
            ))}
            {ranking.length === 0 ? <li className="store__empty">Nothing ranked yet</li> : null}
          </ol>
          <div className="store__row">
            {CHALLENGE_FOODS.filter((food) => !ranking.includes(food.id)).map((food) => (
              <button
                key={food.id}
                type="button"
                data-testid={`store-rank-${food.id}`}
                onClick={() => setRanking((list) => [...list, food.id])}
              >
                {food.label}
                <small>{FOOD_NOTE[food.id]}</small>
              </button>
            ))}
          </div>
          <div className="store__row">
            {ranking.length > 0 ? (
              <button type="button" className="ghost" onClick={() => setRanking([])}>
                Start again
              </button>
            ) : null}
            <button
              type="button"
              data-testid="store-to-setup"
              disabled={ranking.length !== CHALLENGE_FOODS.length}
              onClick={() => setPhase('setup')}
            >
              Set up the store
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'setup' ? (
        <section className="store__card" data-testid="store-setup">
          <h2>Set up the store</h2>

          <label className="store__dial">
            <span>Temperature</span>
            <input
              type="range"
              min={10}
              max={38}
              step={1}
              data-testid="store-temperature"
              value={conditions.temperatureC}
              onChange={(event) =>
                setConditions((c) => ({ ...c, temperatureC: Number(event.target.value) }))
              }
            />
            <b>{conditions.temperatureC}°C</b>
          </label>

          <label className="store__dial">
            <span>Humidity</span>
            <input
              type="range"
              min={5}
              max={95}
              step={5}
              data-testid="store-humidity"
              value={conditions.humidityPercent}
              onChange={(event) =>
                setConditions((c) => ({ ...c, humidityPercent: Number(event.target.value) }))
              }
            />
            <b>{conditions.humidityPercent}%</b>
          </label>

          {!legal ? (
            <p className="store__warn" data-testid="store-brief-warning">
              The store has no power. It cannot be held below{' '}
              {VILLAGE_STORE_BRIEF.minimumTemperatureC}°C.
            </p>
          ) : null}

          <fieldset className="store__wraps">
            <legend>Wrap anything you want to</legend>
            {CHALLENGE_FOODS.map((food) => {
              const sealed = (conditions.sealedFoodIds ?? []).includes(food.id);
              return (
                <button
                  key={food.id}
                  type="button"
                  aria-pressed={sealed}
                  data-testid={`store-wrap-${food.id}`}
                  onClick={() => toggleSeal(food.id)}
                >
                  {sealed ? '🫙' : '🍽'} {food.label}
                </button>
              );
            })}
          </fieldset>

          <button
            type="button"
            className="store__go"
            data-testid="store-run"
            disabled={!legal}
            onClick={runWeek}
          >
            Run the week →
          </button>
        </section>
      ) : null}

      {phase === 'run' ? (
        <section className="store__card" data-testid="store-run-panel">
          <h2 data-testid="store-day">Day {day}</h2>
          <ul className="store__readout">
            {result.outcomes.map((outcome) => {
              const reading = outcome.readings[day] ?? outcome.readings[0]!;
              return (
                <li key={outcome.foodId} data-spoiled={reading.spoiled}>
                  <span>{foodLabel(outcome.foodId)}</span>
                  <i
                    className="store__bar-fill"
                    style={{ width: `${Math.round(reading.surfaceCoverage * 100)}%` }}
                  />
                  <b>{reading.spoiled ? 'mouldy' : 'still good'}</b>
                </li>
              );
            })}
          </ul>
          <input
            type="range"
            min={0}
            max={VILLAGE_STORE_BRIEF.days}
            step={1}
            data-testid="store-scrub"
            value={day}
            onChange={(event) => {
              setPlaying(false);
              setDay(Number(event.target.value));
            }}
          />
          <div className="store__row">
            <button type="button" className="ghost" onClick={() => setPlaying((p) => !p)}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" data-testid="store-see-report" onClick={() => setPhase('report')}>
              See what happened
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'report' ? (
        <section className="store__card store__card--wide store__report" data-testid="store-report">
          <h2>
            You kept {result.safeCount} of {CHALLENGE_FOODS.length} edible
          </h2>

          <ul className="store__findings">
            {result.outcomes.map((outcome) => (
              <li key={outcome.foodId}>
                <b>{foodLabel(outcome.foodId)}</b>{' '}
                {outcome.safeAtEnd
                  ? `stayed good — its surface sat at ${Math.round(outcome.effectiveMoisturePercent)}% moisture.`
                  : `went mouldy on day ${outcome.spoiledOnDay}, at ${Math.round(outcome.effectiveMoisturePercent)}% moisture.`}
              </li>
            ))}
          </ul>

          {prediction ? (
            <p data-testid="store-prediction-score">
              Your ranking matched what happened in{' '}
              <b>
                {prediction.correctlyRanked} of {CHALLENGE_FOODS.length}
              </b>{' '}
              places.{' '}
              {prediction.firstToSpoilCalled
                ? 'You called the worst one correctly.'
                : `The worst was actually the ${foodLabel(prediction.observedOrder[0]!).toLowerCase()}.`}
            </p>
          ) : null}

          {isolatedVariables === undefined ? null : (
            <p data-testid="store-method">
              {isolatedVariables
                ? 'You changed one thing at a time between attempts — that is how a fair test is run.'
                : 'You changed several settings at once between attempts, so it is hard to tell which one mattered.'}
            </p>
          )}

          <p className="store__aside" data-testid="store-insight">
            {(conditions.sealedFoodIds ?? []).includes('fruit')
              ? 'Wrapping the mango sealed it in with its own juice. A wrap decides where a food’s water comes from — it does not keep water out of something already full of it.'
              : 'A wrap decides where a food’s water comes from: it shuts dry rice away from a damp room, and shuts a ripe mango in with its own juice.'}
          </p>

          <p className="store__aside">
            At {conditions.temperatureC}°C no one can keep a ripe mango for a
            week. That is why we dry, pickle, and cool food.
          </p>

          <label className="store__replay">
            <span>Walk the week again</span>
            <input
              type="range"
              min={0}
              max={VILLAGE_STORE_BRIEF.days}
              step={1}
              data-testid="store-scrub"
              value={day}
              onChange={(event) => setDay(Number(event.target.value))}
            />
            <b>Day {day}</b>
          </label>

          <div className="store__row">
            <button type="button" data-testid="store-try-again" onClick={tryAgain}>
              Try different settings
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
