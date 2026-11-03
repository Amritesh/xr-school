import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SUPER_SENSES_SMELL_SCENE_METADATA,
  SUPER_SENSES_SMELL_SIMULATION,
} from "../../packages/simulation-content/src/implemented/guided/super-senses-smell";

const viewerPath = resolve(
  process.cwd(),
  "apps/web/components/simulations/SuperSensesSmellViewer.tsx",
);
const viewerSource = readFileSync(viewerPath, "utf8");

describe("Super Senses smell investigation", () => {
  it("owns the canonical five-minute launch identity and dedicated route", () => {
    expect(SUPER_SENSES_SMELL_SIMULATION.module).toMatchObject({
      id: "sim-c05-ch01-a01-supersense-of-smell",
      slug: "c5-ch01-a01-supersense-of-smell",
      viewerKey: "guided-super-senses-smell",
      title: "Super Senses: The Sense of Smell",
      expectedDurationMinutes: 5,
      maxSessionDurationMinutes: 5,
      simulationFormat: "immersiveVr",
      publicationStatus: "released",
      evidenceMaturity: "internalQA",
    });

    const routePath = resolve(
      process.cwd(),
      "apps/web/app/simulations/c5-ch01-a01-supersense-of-smell/page.tsx",
    );
    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(routePath, "utf8")).toContain(
      'slug="c5-ch01-a01-supersense-of-smell"',
    );
  });

  it("keeps the authored master beats at 1:00, 2:30, 4:00, 4:50, 4:55, 4:58 and exactly 5:00", () => {
    for (const sourceFragment of [
      "const TOTAL_SECONDS = 300",
      "antHighway: 60",
      "rescueDog: 150",
      "silkmoth: 240",
      "finalRecap: 290",
      "confetti: 295",
      "badge: 298",
      "freeze: 300",
      "Math.min(TOTAL_SECONDS, elapsedRef.current + delta)",
      "worldRef.current?.freeze?.()",
      "Frozen at exactly 05:00",
    ]) {
      expect(viewerSource, sourceFragment).toContain(sourceFragment);
    }

    const orderedBeats = [
      "antHighway: 60",
      "rescueDog: 150",
      "silkmoth: 240",
      "finalRecap: 290",
      "confetti: 295",
      "badge: 298",
      "freeze: 300",
    ].map((fragment) => viewerSource.indexOf(fragment));
    expect(orderedBeats.every((index) => index >= 0)).toBe(true);
    expect(orderedBeats).toEqual([...orderedBeats].sort((a, b) => a - b));
  });

  it("requires meaningful choices and distinguishes independent from timed-assisted evidence", () => {
    for (const correctChoice of [
      "food-scent",
      "ant-pheromone-trail",
      "lollipop",
      "target-scent",
      "teddy-bear",
      "ant-recap",
      "dog-recap",
      "moth-recap",
    ]) {
      expect(viewerSource, correctChoice).toContain(`["${correctChoice}"`);
    }
    for (const distractor of [
      "flower-scent",
      "ant-weak-trail",
      "squirrel-scent",
      "pizza-scent",
    ]) {
      expect(viewerSource, distractor).toContain(`["${distractor}"`);
    }
    expect(viewerSource).toContain("if (!selected[2])");
    expect(viewerSource).toContain('mode: "independent"');
    expect(viewerSource).toContain('mode: "assisted"');
    expect(viewerSource).toContain("applyTimedAssists(next)");
    expect(viewerSource).toContain("seconds < definition.closesAt");
  });

  it("provides captions, narration replay, reduced motion, keyboard access and Quest-safe navigation", () => {
    for (const sourceFragment of [
      "playNarration(text)",
      'data-testid="narration-replay"',
      'data-testid="smell-caption"',
      'role="status"',
      "(prefers-reduced-motion: reduce)",
      'event.key >= "1" && event.key <= "3"',
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

  it("states the science honestly and labels every coloured trail as a model", () => {
    const record = SUPER_SENSES_SMELL_SIMULATION;
    expect(record.experience.stages.map((stage) => stage.id)).toEqual([
      "smell-o-vision",
      "ant-pheromone-trail",
      "dog-odour-tracking",
      "silkmoth-recap",
    ]);
    expect(record.narration.cues).toHaveLength(4);
    expect(record.narration.cues.every((cue) => cue.caption === cue.text)).toBe(
      true,
    );

    const science = [
      record.module.scientificConceptExplanation,
      ...Object.values(SUPER_SENSES_SMELL_SCENE_METADATA.stageOutcomes),
      ...record.experience.stages.flatMap((stage) => [stage.cue, stage.detail]),
      ...record.assessment.prompts.flatMap((prompt) => [
        prompt.question,
        prompt.explanation,
        ...(prompt.options ?? []).map((option) => option.label),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    expect(science).toContain("odour molecules");
    expect(science).toContain("pheromone");
    expect(science).toContain("antennae");
    expect(science).toContain("trained dogs");
    expect(science).toContain("wind");
    expect(science).toMatch(/visual model|explanatory model|coloured trails/);
    expect(science).toMatch(/do not literally see|not visible|invisible/);
  });
});
