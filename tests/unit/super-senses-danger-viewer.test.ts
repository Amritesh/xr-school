import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SUPER_SENSES_DANGER_SCENE_METADATA,
  SUPER_SENSES_DANGER_SIMULATION,
} from "../../packages/simulation-content/src/implemented/guided/super-senses-danger";

const viewerPath = resolve(
  process.cwd(),
  "apps/web/components/simulations/SuperSensesDangerViewer.tsx",
);
const worldPath = resolve(
  process.cwd(),
  "apps/web/lib/world-builder/superSensesDangerWorld.ts",
);
const viewerSource = readFileSync(viewerPath, "utf8");
const worldSource = readFileSync(worldPath, "utf8");

describe("Super Senses danger investigation", () => {
  it("owns the canonical five-minute identity, route and original panorama", () => {
    expect(SUPER_SENSES_DANGER_SIMULATION.module).toMatchObject({
      id: "sim-c05-ch01-a03-super-sense-of-danger",
      slug: "c5-ch01-a03-super-sense-of-danger",
      viewerKey: "guided-super-senses-danger",
      title: "Super Senses: The Sense of Danger",
      expectedDurationMinutes: 5,
      maxSessionDurationMinutes: 5,
      simulationFormat: "immersiveVr",
      publicationStatus: "released",
      evidenceMaturity: "internalQA",
    });

    const routePath = resolve(
      process.cwd(),
      "apps/web/app/simulations/c5-ch01-a03-super-sense-of-danger/page.tsx",
    );
    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(routePath, "utf8")).toContain(
      'slug="c5-ch01-a03-super-sense-of-danger"',
    );

    const panoramaPath = resolve(
      process.cwd(),
      "apps/web/public/simulations/c5-ch01-a03-super-sense-of-danger/environment.webp",
    );
    expect(existsSync(panoramaPath)).toBe(true);
    expect(statSync(panoramaPath).size).toBe(332758);
    expect(worldSource).toContain(
      "SUPER_SENSES_DANGER_SCENE_METADATA.environmentUrl",
    );
    expect(worldSource).toContain("EquirectangularReflectionMapping");
  });

  it("keeps the authored hard timing and freezes at exactly five minutes", () => {
    for (const sourceFragment of [
      "const TOTAL_SECONDS = 300",
      "elephantRipples: 60",
      "webAlarm: 150",
      "electroVision: 240",
      "recap: 280",
      "graduation: 290",
      "geyser: 294",
      "stars: 296",
      "signalIcons: 298",
      "freeze: 300",
      "Math.min(TOTAL_SECONDS, elapsedRef.current + delta)",
      "worldRef.current?.freeze?.()",
      "Frozen at exactly 05:00",
    ]) {
      expect(viewerSource, sourceFragment).toContain(sourceFragment);
    }
  });

  it("implements all signal choices, checkpoint tracing and timed supports", () => {
    for (const choiceId of [
      "vibe-beetle",
      "vibe-footsteps",
      "vibe-disturbance",
      "seismic-left",
      "seismic-center",
      "seismic-right",
      "ripple-one",
      "ripple-two",
      "ripple-three",
      "web-leaf",
      "web-insect",
      "web-urgent",
      "escape-point",
      "scan-empty",
      "stingray-one",
      "scan-rock",
      "stingray-two",
    ]) {
      expect(viewerSource, choiceId).toContain(`"${choiceId}"`);
      expect(worldSource, choiceId).toContain(`"${choiceId}"`);
    }
    expect(viewerSource).toContain('? "assisted" : "independent"');
    expect(viewerSource).toContain('mode: "assisted"');
    expect(viewerSource).toContain("applyTimedSupports(next)");
    expect(viewerSource).toContain("seconds < definition.assistAt");
  });

  it("supports narration, captions, OrbitControls and Meta Quest navigation", () => {
    for (const sourceFragment of [
      "playNarration(text)",
      'data-testid="narration-replay"',
      'data-testid="danger-caption"',
      'role="status"',
      "new OrbitControls(camera, renderer.domElement)",
      "controls.enablePan = true",
      "controls.screenSpacePanning = true",
      'requestSession("immersive-vr"',
      'requiredFeatures: ["local-floor"]',
      "createQuestVrControls({",
      "movementBounds: new THREE.Box2(",
      "getSession()?.end()",
    ]) {
      expect(viewerSource, sourceFragment).toContain(sourceFragment);
    }
  });

  it("describes vibration and electroreception without literalising the overlays", () => {
    const record = SUPER_SENSES_DANGER_SIMULATION;
    expect(record.experience.stages.map((stage) => stage.id)).toEqual([
      "vibe-boots",
      "elephant-ripples",
      "web-alarm",
      "electro-vision",
    ]);
    expect(record.narration.cues).toHaveLength(4);
    expect(record.narration.cues.every((cue) => cue.caption === cue.text)).toBe(
      true,
    );

    const science = [
      record.module.scientificConceptExplanation,
      ...Object.values(SUPER_SENSES_DANGER_SCENE_METADATA.stageOutcomes),
      ...record.experience.stages.flatMap((stage) => [stage.cue, stage.detail]),
      ...record.assessment.prompts.flatMap((prompt) => [
        prompt.question,
        prompt.explanation,
        ...(prompt.options ?? []).map((option) => option.label),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    expect(science).toContain("seismic");
    expect(science).toContain("mechanoreceptors");
    expect(science).toContain("ampullae of lorenzini");
    expect(science).toContain("electric fields");
    expect(science).toMatch(/teaching model|explanatory tools|simulation cues/);
    expect(science).toMatch(/not visible|do not see|does not identify/);
  });
});
