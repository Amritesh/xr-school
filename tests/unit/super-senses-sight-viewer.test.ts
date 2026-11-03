import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SUPER_SENSES_SIGHT_SCENE_METADATA,
  SUPER_SENSES_SIGHT_SIMULATION,
} from "../../packages/simulation-content/src/implemented/guided/super-senses-sight";

const viewerPath = resolve(
  process.cwd(),
  "apps/web/components/simulations/SuperSensesSightViewer.tsx",
);
const worldPath = resolve(
  process.cwd(),
  "apps/web/lib/world-builder/superSensesSightWorld.ts",
);
const viewerSource = readFileSync(viewerPath, "utf8");
const worldSource = readFileSync(worldPath, "utf8");

describe("Super Senses sight investigation", () => {
  it("owns the canonical five-minute identity, route and panorama", () => {
    expect(SUPER_SENSES_SIGHT_SIMULATION.module).toMatchObject({
      id: "sim-c05-ch01-a02-supersense-of-sights",
      slug: "c5-ch01-a02-supersense-of-sights",
      viewerKey: "guided-super-senses-sight",
      title: "Super Senses: The Super Sense of Sight",
      expectedDurationMinutes: 5,
      maxSessionDurationMinutes: 5,
      simulationFormat: "immersiveVr",
      publicationStatus: "released",
      evidenceMaturity: "internalQA",
    });

    const routePath = resolve(
      process.cwd(),
      "apps/web/app/simulations/c5-ch01-a02-supersense-of-sights/page.tsx",
    );
    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(routePath, "utf8")).toContain(
      'slug="c5-ch01-a02-supersense-of-sights"',
    );

    const panoramaPath = resolve(
      process.cwd(),
      "apps/web/public/simulations/c5-ch01-a02-supersense-of-sights/environment.webp",
    );
    expect(existsSync(panoramaPath)).toBe(true);
    expect(statSync(panoramaPath).size).toBe(309372);
    expect(worldSource).toContain(
      SUPER_SENSES_SIGHT_SCENE_METADATA.environmentUrl,
    );
    expect(worldSource).toContain("EquirectangularReflectionMapping");
  });

  it("keeps the hard master beats and freezes at exactly five minutes", () => {
    for (const sourceFragment of [
      "const TOTAL_SECONDS = 300",
      "fieldMouse: 60",
      "nightLemur: 150",
      "chameleonFly: 240",
      "recap: 280",
      "graduation: 290",
      "fireworks: 293",
      "feathersAndStars: 295",
      "badgePulse: 298",
      "freeze: 300",
      "Math.min(TOTAL_SECONDS, elapsedRef.current + delta)",
      "worldRef.current?.freeze?.()",
      "Frozen at exactly 05:00",
    ]) {
      expect(viewerSource, sourceFragment).toContain(sourceFragment);
    }
  });

  it("implements the authored choices and ordered target scans", () => {
    for (const choiceId of [
      "mountain-calibration",
      "eagle-calibration",
      "cloud-calibration",
      "valley-rock",
      "valley-bush",
      "valley-grass",
      "field-mouse",
      "night-left-bush",
      "night-right-tree",
      "night-eyes",
      "lemur",
      "fly-left",
      "fly-rear",
      "fly-right",
      "fly-front",
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
      'data-testid="sight-caption"',
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

    const questControlsSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/web/components/simulations/questVrControls.ts",
      ),
      "utf8",
    );
    expect(questControlsSource).toContain(
      'if (hand === "right") void session.end()',
    );
    expect(questControlsSource).toContain(
      'if (event.inputSource.handedness !== "left") void activeSession?.end()',
    );
  });

  it("states the animal-vision science without presenting effects as literal sight", () => {
    const record = SUPER_SENSES_SIGHT_SIMULATION;
    expect(record.experience.stages.map((stage) => stage.id)).toEqual([
      "eagle-calibration",
      "field-mouse",
      "night-lemur",
      "chameleon-fly",
    ]);
    expect(record.narration.cues).toHaveLength(4);
    expect(record.narration.cues.every((cue) => cue.caption === cue.text)).toBe(
      true,
    );

    const science = [
      record.module.scientificConceptExplanation,
      ...Object.values(SUPER_SENSES_SIGHT_SCENE_METADATA.stageOutcomes),
      ...record.experience.stages.flatMap((stage) => [stage.cue, stage.detail]),
      ...record.assessment.prompts.flatMap((prompt) => [
        prompt.question,
        prompt.explanation,
        ...(prompt.options ?? []).map((option) => option.label),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    expect(science).toContain("visual acuity");
    expect(science).toContain("available light");
    expect(science).toContain("eyeshine");
    expect(science).toContain("independently");
    expect(science).toMatch(
      /learning model|comparison model|explanatory overlay/,
    );
    expect(science).toMatch(/does not zoom|do not create light|not a literal/);
  });
});
