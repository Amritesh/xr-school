'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import {
  createAssessmentSession,
  type AssessmentAnswerResult,
  type AssessmentSession,
} from '../../../../packages/simulation-runtime/src/world/assessment';
import {
  createRapierWorld,
} from '../../../../packages/simulation-runtime/src/physics/rapierWorld';
import {
  createResourceRegistry,
} from '../../../../packages/simulation-runtime/src/world/resourceRegistry';
import {
  createScientificModelRegistry,
} from '../../../../packages/simulation-runtime/src/world/scientificModels';
import {
  createWorldRuntime,
} from '../../../../packages/simulation-runtime/src/world/runtime';
import {
  createLessonSession,
} from '../../../../packages/simulation-runtime/src/experience/lessonSession';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import { detectDeviceProfile } from '@/lib/world-builder/deviceProfile';
import {
  evaluatePresentationBudget,
  presentationBudgetForProfile,
} from '@/lib/world-builder/diagnostics';
import { createEnvironment } from '@/lib/world-builder/environmentFactory';
import { createMaterialFactory } from '@/lib/world-builder/materialFactory';
import { createPresentationPipeline } from '@/lib/world-builder/presentationPipeline';
import { DIAGNOSTIC_WORLD } from '@/lib/world-builder/diagnosticWorld';
import { verifyClearView } from '@/lib/world-builder/occlusionDiagnostics';
import { resolveCuePlacement } from '@/lib/world-builder/spatialCueSystem';

type DiagnosticState = {
  profile: string;
  fps: number;
  drawCalls: number;
  triangles: number;
  resources: number;
  budgetIssues: string[];
};

const INITIAL_DIAGNOSTICS: DiagnosticState = {
  profile: 'detecting',
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  resources: 0,
  budgetIssues: [],
};

const sequence = DIAGNOSTIC_WORLD.assessments[0];
const experience = DIAGNOSTIC_WORLD.experienceDefinitions![0];
const spatialLayout = DIAGNOSTIC_WORLD.spatialLayouts![0];
const INITIAL_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

function findMaterial(id: string) {
  const material = DIAGNOSTIC_WORLD.materials.find(item => item.id === id);
  if (!material) throw new Error(`Missing diagnostic material ${id}`);
  return material;
}

export default function WorldBuilderDiagnosticViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<AssessmentSession>(
    createAssessmentSession(sequence),
  );
  const lessonSessionRef = useRef(createLessonSession(experience));
  const [lessonSnapshot, setLessonSnapshot] = useState(
    lessonSessionRef.current.snapshot(),
  );
  const [started, setStarted] = useState(false);
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [runId, setRunId] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [diagnostics, setDiagnostics] = useState(INITIAL_DIAGNOSTICS);
  const [promptIndex, setPromptIndex] = useState(0);
  const [answerResult, setAnswerResult] =
    useState<AssessmentAnswerResult | null>(null);
  const [mastered, setMastered] = useState(false);

  const prompt = sequence.prompts[promptIndex];
  const progressLabel = useMemo(
    () => `${Math.min(promptIndex + 1, sequence.prompts.length)} of ${sequence.prompts.length}`,
    [promptIndex],
  );
  const cuePlacement = useMemo(() => resolveCuePlacement({
    primary: spatialLayout.cueBay.position,
    fallbacks: spatialLayout.cueBay.fallbackPositions,
    focusDirection: [0, 0, -1],
    minimumSeparationDegrees: 25,
  }), []);
  const clearViewIssues = useMemo(() => verifyClearView(
    spatialLayout.browserClearView,
    [
      { x: 0, y: 0, width: 1, height: 0.1 },
      { x: 0, y: 0.84, width: 1, height: 0.16 },
    ],
    0.08,
  ), []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let runtime: ReturnType<typeof createWorldRuntime> | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const resourceRegistry = createResourceRegistry();

    async function start() {
      setStatus('loading');
      setError('');

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local-floor');
      renderer.domElement.setAttribute(
        'aria-label',
        'Interactive material and gravity reference world',
      );
      mount!.replaceChildren(renderer.domElement);
      resourceRegistry.register('renderer', () => {
        renderer.setAnimationLoop(null);
        renderer.dispose();
      });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 60);
      camera.position.set(3.8, 2.5, 5.6);
      camera.lookAt(0, 0.85, -1.4);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.055;
      controls.target.set(0, 0.82, -1.4);
      controls.minDistance = 3;
      controls.maxDistance = 9;
      controls.maxPolarAngle = Math.PI * 0.49;

      const browserProfile = detectDeviceProfile(renderer);
      const pipeline = createPresentationPipeline(renderer, browserProfile);
      const browserMaterials = createMaterialFactory({
        assets: DIAGNOSTIC_WORLD.assetManifests[0],
        materials: DIAGNOSTIC_WORLD.materials,
        qualityProfileId: browserProfile,
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      });
      const questMaterials = createMaterialFactory({
        assets: DIAGNOSTIC_WORLD.assetManifests[0],
        materials: DIAGNOSTIC_WORLD.materials,
        qualityProfileId: 'questBaseline',
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      });
      resourceRegistry.register('browser-materials', () => browserMaterials.dispose());
      resourceRegistry.register('quest-materials', () => questMaterials.dispose());

      const [floorMaterial, paintedMaterial, metalMaterial, questMetalMaterial] =
        await Promise.all([
          browserMaterials.create(findMaterial('material-floor')),
          browserMaterials.create(findMaterial('material-painted')),
          browserMaterials.create(findMaterial('material-metal')),
          questMaterials.create(findMaterial('material-metal')),
        ]);
      if (cancelled) {
        await resourceRegistry.disposeAll();
        return;
      }

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 6, 1, 1),
        floorMaterial,
      );
      floor.name = 'mapped-studio-floor';
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, -1.4);
      floor.receiveShadow = true;
      scene.add(floor);

      const paintedSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 48, 32),
        paintedMaterial,
      );
      paintedSphere.name = 'gravity-sphere';
      paintedSphere.position.set(-0.85, 1.65, -1.4);
      paintedSphere.castShadow = true;
      paintedSphere.receiveShadow = true;
      scene.add(paintedSphere);

      const metalSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.54, 64, 40),
        metalMaterial,
      );
      metalSphere.name = 'material-comparison-sphere';
      metalSphere.position.set(0.9, 0.57, -1.4);
      metalSphere.castShadow = true;
      metalSphere.receiveShadow = true;
      scene.add(metalSphere);

      const backdrop = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 4),
        new THREE.MeshStandardMaterial({
          color: '#10262d',
          roughness: 0.78,
          metalness: 0,
        }),
      );
      backdrop.position.set(0, 2, -4.25);
      backdrop.receiveShadow = true;
      scene.add(backdrop);

      const environment = await createEnvironment({
        renderer,
        scene,
        definition: DIAGNOSTIC_WORLD.environments[0],
        assets: DIAGNOSTIC_WORLD.assetManifests[0],
      });
      const physics = await createRapierWorld({
        gravity: [0, -9.81, 0],
        fixedStepSeconds: 1 / 60,
      });
      physics.addSphere({
        id: 'painted-sphere',
        radiusMeters: 0.42,
        massKg: 1,
        positionMeters: [-0.85, 1.65, -1.4],
        restitution: 0.18,
        linearDamping: 0.08,
      });
      physics.addCuboid({
        id: 'floor',
        halfExtentsMeters: [4, 0.05, 3],
        positionMeters: [0, -0.05, -1.4],
        fixed: true,
        friction: 0.82,
      });

      const science = createScientificModelRegistry();
      science.register({
        manifest: DIAGNOSTIC_WORLD.scientificModels[0],
        evaluate: input => ({ finalMassKg: Number(input.initialMassKg) }),
      });
      const modelFailures = science.verify('model-material-mass');
      if (modelFailures.length > 0) {
        throw new Error(modelFailures.join('; '));
      }

      resourceRegistry.register('scene-geometry', () => {
        floor.geometry.dispose();
        paintedSphere.geometry.dispose();
        metalSphere.geometry.dispose();
        backdrop.geometry.dispose();
        (backdrop.material as THREE.Material).dispose();
      });
      resourceRegistry.register('environment', () => environment.dispose());
      resourceRegistry.register('presentation', () => pipeline.dispose());
      resourceRegistry.register('physics', () => physics.dispose());
      resourceRegistry.register('science', () => science.dispose());
      resourceRegistry.register('controls', () => controls.dispose());

      let profile = browserProfile;
      let frameCount = 0;
      let sampleStart = performance.now();
      let settledEvidenceRecorded = false;
      runtime = createWorldRuntime({
        resourceRegistry,
        systems: [
          {
            id: 'physics',
            dependencies: [],
            initialize() {},
            fixedUpdate() {
              physics.step();
              const body = physics.body('painted-sphere');
              paintedSphere.position.set(...body.positionMeters);
              paintedSphere.quaternion.set(...body.rotation);
              if (!settledEvidenceRecorded
                && body.positionMeters[1] <= 0.43
                && lessonSessionRef.current.snapshot().performedActionIds.includes('release-sphere')) {
                settledEvidenceRecorded = true;
                setLessonSnapshot(
                  lessonSessionRef.current.recordEvidence('sphere-settled'),
                );
              }
            },
            dispose() {},
          },
          {
            id: 'presentation',
            dependencies: ['physics'],
            initialize() {},
            renderUpdate() {
              controls.update();
              environment.lights[0].position.x =
                3.5 + Math.sin(performance.now() * 0.00035) * 0.9;
              pipeline.render(scene, camera);
              frameCount += 1;
              const now = performance.now();
              const sampleDuration = now - sampleStart;
              if (sampleDuration < 500) return;
              const fps = Math.round((frameCount * 1000) / sampleDuration);
              const budgetIssues = evaluatePresentationBudget(
                {
                  fps,
                  drawCalls: renderer.info.render.calls,
                  triangles: renderer.info.render.triangles,
                },
                presentationBudgetForProfile(profile),
              );
              setDiagnostics({
                profile,
                fps,
                drawCalls: renderer.info.render.calls,
                triangles: renderer.info.render.triangles,
                resources: resourceRegistry.size(),
                budgetIssues,
              });
              frameCount = 0;
              sampleStart = now;
            },
            dispose() {},
          },
        ],
      });
      await runtime.initialize();

      function resize() {
        const width = Math.max(1, mount!.clientWidth);
        const height = Math.max(1, mount!.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        pipeline.resize(width, height, window.devicePixelRatio);
      }
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount!);
      resize();

      const vrButton = VRButton.createButton(renderer);
      vrButton.classList.add('diagnostic-vr-button');
      mount!.appendChild(vrButton);
      resourceRegistry.register('vr-button', () => vrButton.remove());

      renderer.xr.addEventListener('sessionstart', () => {
        profile = 'questBaseline';
        pipeline.setQualityProfile(profile);
        metalSphere.material = questMetalMaterial;
      });
      renderer.xr.addEventListener('sessionend', () => {
        profile = browserProfile;
        pipeline.setQualityProfile(profile);
        metalSphere.material = metalMaterial;
      });

      let previousTime = performance.now();
      renderer.setAnimationLoop((time: number) => {
        if (!runtime || runtime.state() !== 'running') return;
        const deltaSeconds = Math.max(0, (time - previousTime) / 1000);
        previousTime = time;
        runtime.advance(deltaSeconds);
      });

      setDiagnostics(current => ({ ...current, profile }));
      setStatus('ready');
    }

    void start().catch(reason => {
      if (cancelled) return;
      setStatus('error');
      setError(reason instanceof Error ? reason.message : String(reason));
      rendererCleanup();
    });

    function rendererCleanup() {
      resizeObserver?.disconnect();
      if (runtime) {
        void runtime.dispose().finally(() => resourceRegistry.disposeAll());
      } else {
        void resourceRegistry.disposeAll();
      }
    }

    return () => {
      cancelled = true;
      rendererCleanup();
    };
  }, [runId]);

  function answer(evidenceId: string) {
    try {
      const result = sessionRef.current.answer(prompt.id, evidenceId);
      setAnswerResult(result);
      setMastered(sessionRef.current.mastery().mastered);
    } catch (reason) {
      setAnswerResult({
        promptId: prompt.id,
        correct: false,
        attempts: 0,
        hint: reason instanceof Error ? reason.message : String(reason),
      });
    }
  }

  function continueAssessment() {
    if (promptIndex < sequence.prompts.length - 1) {
      setPromptIndex(index => index + 1);
      setAnswerResult(null);
    }
  }

  function resetAssessment() {
    sessionRef.current.reset();
    setPromptIndex(0);
    setAnswerResult(null);
    setMastered(false);
  }

  function startBrowser() {
    const current = lessonSessionRef.current.snapshot();
    if (!current.performedActionIds.includes('release-sphere')) {
      setLessonSnapshot(
        lessonSessionRef.current.performAction('release-sphere'),
      );
    }
    setStarted(true);
    setRunId(value => value + 1);
  }

  return (
    <SimulationExperienceShell
      title="Material, light & evidence"
      classContext="W0 reference world · Internal QA"
      objective={experience.objective}
      snapshot={lessonSnapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={startBrowser}
      onPrevious={() => setLessonSnapshot(lessonSessionRef.current.previous())}
      onNext={() => setLessonSnapshot(lessonSessionRef.current.next())}
      evidence={lessonSnapshot.recordedEvidenceIds}
      error={status === 'error' ? error : undefined}
    >
    <main
      className="diagnostic-shell"
      data-cue-position={cuePlacement.join(',')}
      data-clear-view={clearViewIssues.length === 0 ? 'verified' : 'blocked'}
    >
      <header className="diagnostic-header">
        <div>
          <span>W0 REFERENCE WORLD · INTERNAL QA</span>
          <h1>Material, light &amp; evidence</h1>
          <p>
            A compact proof of the shared world-builder runtime. Scientific
            complexity stays under the hood; learners see only the variable,
            the evidence, and a clear question.
          </p>
        </div>
        <a href="/simulations">Back to simulations</a>
      </header>

      <section className="diagnostic-grid">
        <div className="world-card">
          <div className="world-toolbar">
            <div>
              <i className={status} />
              {status === 'loading' ? 'Preparing world' : status === 'ready' ? 'World ready' : 'World error'}
            </div>
            <button type="button" onClick={() => setRunId(value => value + 1)}>
              Replay gravity
            </button>
          </div>
          <div ref={mountRef} className="world-mount" data-testid="diagnostic-world" />
          {status === 'loading' && (
            <div className="world-overlay">Calibrating materials and physics…</div>
          )}
          {status === 'error' && (
            <div className="world-overlay error">
              <strong>Reference world could not start.</strong>
              <span>{error}</span>
            </div>
          )}
          <div className="world-legend">
            <span><i className="teal" /> Dynamic · 1 kg</span>
            <span><i className="metal" /> Fixed comparison</span>
            <span>Drag to orbit · scroll to zoom</span>
          </div>
        </div>

        <aside className="lesson-panel">
          <div className="lesson-progress">
            <span>Evidence check</span>
            <strong>{progressLabel}</strong>
          </div>
          {mastered ? (
            <div className="mastery-card" data-testid="mastery-complete">
              <span>Concept understood</span>
              <h2>Appearance is not mass.</h2>
              <p>
                You observed the motion, resolved the misconception, and
                transferred the idea to a new color.
              </p>
              <button type="button" onClick={resetAssessment}>Try again</button>
            </div>
          ) : (
            <>
              <div className="prompt-kind">{prompt.kind}</div>
              <h2>{prompt.question}</h2>
              <div className="answer-stack">
                {prompt.options?.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={answerResult?.correct}
                    onClick={() => answer(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {answerResult && (
                <div className={answerResult.correct ? 'feedback correct' : 'feedback retry'}>
                  <strong>{answerResult.correct ? 'Evidence matched' : 'Look again'}</strong>
                  <p>{answerResult.correct ? answerResult.explanation : answerResult.hint}</p>
                  {answerResult.correct && promptIndex < sequence.prompts.length - 1 && (
                    <button type="button" onClick={continueAssessment}>Continue</button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="diagnostic-readout">
            <div><span>Profile</span><strong>{diagnostics.profile}</strong></div>
            <div><span>FPS</span><strong>{diagnostics.fps || '—'}</strong></div>
            <div><span>Draw calls</span><strong>{diagnostics.drawCalls}</strong></div>
            <div><span>Triangles</span><strong>{diagnostics.triangles.toLocaleString()}</strong></div>
            <div><span>Resources</span><strong>{diagnostics.resources}</strong></div>
            <small>
              {diagnostics.budgetIssues.length === 0
                ? 'Within the selected presentation budget'
                : diagnostics.budgetIssues.join(' · ')}
            </small>
          </div>
        </aside>
      </section>

      <style jsx>{`
        .diagnostic-shell {
          min-height: 100vh;
          padding: 28px clamp(18px, 4vw, 56px) 48px;
          background:
            radial-gradient(circle at 70% 0%, rgba(65, 159, 157, .14), transparent 34rem),
            #071014;
          color: #eef5f7;
        }
        .diagnostic-header {
          width: min(1380px, 100%);
          margin: 0 auto 24px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 32px;
        }
        .diagnostic-header span, .lesson-progress span, .prompt-kind {
          color: #77d8d4;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .13em;
          text-transform: uppercase;
        }
        h1 {
          margin-top: 8px;
          font-size: clamp(32px, 5vw, 58px);
          font-weight: 650;
          letter-spacing: -.05em;
          line-height: 1;
        }
        .diagnostic-header p {
          max-width: 720px;
          margin-top: 14px;
          color: #91a1ab;
          font-size: 15px;
          line-height: 1.7;
        }
        .diagnostic-header a {
          flex: none;
          padding: 10px 14px;
          border: 1px solid rgba(205, 235, 236, .18);
          border-radius: 8px;
          color: #c4d2d7;
          font-size: 12px;
          font-weight: 750;
        }
        .diagnostic-grid {
          width: min(1380px, 100%);
          margin: auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 18px;
        }
        .world-card, .lesson-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(205, 235, 236, .14);
          border-radius: 16px;
          background: rgba(12, 24, 29, .92);
          box-shadow: 0 28px 80px rgba(0, 0, 0, .28);
        }
        .world-toolbar, .world-legend {
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 16px;
          color: #91a1ab;
          font-size: 11px;
          font-weight: 700;
        }
        .world-toolbar { border-bottom: 1px solid rgba(205, 235, 236, .1); }
        .world-toolbar > div, .world-legend span { display: flex; align-items: center; gap: 8px; }
        .world-toolbar i, .world-legend i {
          width: 7px;
          height: 7px;
          border-radius: 99px;
          background: #93dc9e;
          box-shadow: 0 0 0 4px rgba(147, 220, 158, .07);
        }
        .world-toolbar i.loading { background: #f2c675; }
        .world-toolbar i.error { background: #f47d7d; }
        .world-toolbar button, .feedback button, .mastery-card button {
          border: 0;
          border-radius: 7px;
          background: #77d8d4;
          color: #052326;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }
        .world-mount { width: 100%; height: min(68vh, 720px); min-height: 480px; }
        .world-mount :global(canvas) { display: block; width: 100%; height: 100%; }
        .world-overlay {
          position: absolute;
          inset: 53px 0 53px;
          display: grid;
          place-content: center;
          gap: 8px;
          background: rgba(7, 16, 20, .7);
          color: #b7c7cc;
          font-size: 13px;
          text-align: center;
          backdrop-filter: blur(8px);
        }
        .world-overlay.error { color: #f1b3b3; }
        .world-overlay span { max-width: 480px; color: #91a1ab; }
        .world-legend { border-top: 1px solid rgba(205, 235, 236, .1); }
        .world-legend i.teal { background: #4bc4bd; }
        .world-legend i.metal { background: #bac9cd; }
        .lesson-panel { padding: 22px; }
        .lesson-progress {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(205, 235, 236, .1);
        }
        .lesson-progress strong { color: #7c8d96; font-size: 11px; }
        .prompt-kind { margin-top: 28px; }
        .lesson-panel h2 {
          margin-top: 11px;
          font-size: 25px;
          font-weight: 650;
          letter-spacing: -.025em;
          line-height: 1.25;
        }
        .answer-stack { display: grid; gap: 9px; margin-top: 22px; }
        .answer-stack button {
          min-height: 48px;
          padding: 10px 13px;
          border: 1px solid rgba(205, 235, 236, .16);
          border-radius: 9px;
          background: rgba(255, 255, 255, .025);
          color: #dce7e9;
          font-size: 13px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }
        .answer-stack button:hover:not(:disabled) {
          border-color: rgba(119, 216, 212, .52);
          background: rgba(119, 216, 212, .07);
        }
        .answer-stack button:disabled { opacity: .55; cursor: default; }
        .feedback, .mastery-card {
          margin-top: 18px;
          padding: 14px;
          border: 1px solid rgba(205, 235, 236, .12);
          border-radius: 10px;
          background: rgba(255, 255, 255, .025);
        }
        .feedback.correct { border-color: rgba(147, 220, 158, .28); }
        .feedback.retry { border-color: rgba(242, 198, 117, .26); }
        .feedback strong { color: #eef5f7; font-size: 12px; }
        .feedback p, .mastery-card p {
          margin: 6px 0 12px;
          color: #91a1ab;
          font-size: 12px;
          line-height: 1.6;
        }
        .mastery-card { margin-top: 26px; }
        .mastery-card > span { color: #93dc9e; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .diagnostic-readout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid rgba(205, 235, 236, .1);
        }
        .diagnostic-readout div { display: flex; justify-content: space-between; gap: 8px; }
        .diagnostic-readout span { color: #64747f; font-size: 10px; text-transform: uppercase; }
        .diagnostic-readout strong { color: #bcc9cd; font-size: 10px; }
        .diagnostic-readout small { grid-column: 1 / -1; color: #64747f; font-size: 9px; line-height: 1.5; }
        @media (max-width: 920px) {
          .diagnostic-header { align-items: start; }
          .diagnostic-grid { grid-template-columns: 1fr; }
          .world-mount { min-height: 400px; height: 56vh; }
          .lesson-panel { min-height: 520px; }
        }
        @media (max-width: 620px) {
          .diagnostic-shell { padding-inline: 12px; }
          .diagnostic-header { display: grid; }
          .world-legend { align-items: start; flex-direction: column; padding-block: 12px; }
          .world-overlay { bottom: 100px; }
        }
      `}</style>
    </main>
    </SimulationExperienceShell>
  );
}
