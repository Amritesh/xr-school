import { describe, expect, it } from "vitest";

import {
  FUNGI_MISSIONS,
  createFungiExperienceDirector,
} from "../../apps/web/lib/fungi/fungiExperienceDirector";
import type {
  FungiDirectorAction,
  FungiInputSource,
} from "../../apps/web/lib/fungi/fungiExperienceDirector";

const sources: readonly FungiInputSource[] = [
  "mouse",
  "touch",
  "keyboard",
  "xr-controller",
];

const warmTrial = {
  temperatureC: 27,
  moisturePercent: 82,
  substrate: "bread" as const,
  elapsedHours: 96,
  inoculumViability: 0.9,
};

const specimenCrossingPositions = {
  mushroom: [-2, 1, 0] as const,
  "bread-mould": [0, 1, 0] as const,
  "green-plant": [2, 1, 0] as const,
};

function action(
  actionId: string,
  source: FungiInputSource = "mouse",
  fields: Record<string, unknown> = {},
): FungiDirectorAction {
  return { actionId, source, ...fields } as FungiDirectorAction;
}

function diagnose(source: FungiInputSource = "mouse") {
  const director = createFungiExperienceDirector();
  director.dispatch(
    action("diagnose.classify", source, {
      value: "mushroom-and-green-plant",
    }),
  );
  for (const targetId of ["mushroom", "bread-mould", "green-plant"]) {
    director.dispatch(
      action("diagnose.inspect", source, {
        targetId,
        pose: { position: specimenCrossingPositions[targetId] },
      }),
    );
  }
  director.dispatch(
    action("diagnose.classify", source, {
      value: "mushroom-and-bread-mould",
    }),
  );
  return director;
}

function reachGrowth(source: FungiInputSource = "mouse") {
  const director = diagnose(source);
  for (const targetId of ["branch-a", "branch-b", "branch-c"]) {
    director.dispatch(action("mycelium.trace", source, { targetId }));
  }
  director.dispatch(
    action("mycelium.interpret", source, {
      value: "connected-feeding-network",
    }),
  );
  director.dispatch(
    action("spore.record-landing", source, { value: "dormant" }),
  );
  director.dispatch(
    action("spore.record-landing", source, { value: "germinating" }),
  );
  return director;
}

function completeJourney(source: FungiInputSource) {
  const director = reachGrowth(source);
  director.dispatch(
    action("growth.predict", source, { value: "rapid-growth" }),
  );
  director.dispatch(action("growth.run-trial", source, { input: warmTrial }));
  director.dispatch(action("growth.save-trial", source));
  director.dispatch(
    action("growth.run-trial", source, {
      input: { ...warmTrial, moisturePercent: 30 },
    }),
  );
  director.dispatch(action("growth.save-trial", source));
  director.dispatch(
    action("growth.compare-trials", source, {
      trialIds: ["trial-1", "trial-2"],
    }),
  );
  director.dispatch(
    action("growth.interpret", source, {
      value: "moisture-changed-growth",
    }),
  );

  director.dispatch(
    action("useful.observe-dough", source, {
      value: "yeast-expanded-more-than-control",
    }),
  );
  director.dispatch(
    action("useful.match-role", source, {
      targetId: "yeast",
      value: "food",
    }),
  );
  director.dispatch(
    action("useful.match-role", source, {
      targetId: "antibiotic-producing-fungus",
      value: "medicine",
    }),
  );
  director.dispatch(
    action("useful.match-role", source, {
      targetId: "saprotrophic-fungus",
      value: "decomposer",
    }),
  );

  director.dispatch(action("safety.scan", source, { value: 0.8 }));
  director.dispatch(
    action("safety.classify", source, {
      targetId: "fresh-item",
      value: "check-use",
    }),
  );
  director.dispatch(
    action("safety.classify", source, {
      targetId: "mouldy-item",
      value: "do-not-eat",
    }),
  );
  director.dispatch(
    action("safety.explain", source, { value: "cut-off-visible-patch" }),
  );
  director.dispatch(
    action("safety.explain", source, {
      value: "hidden-hyphae-extend-beyond-visible-patch",
    }),
  );

  director.dispatch(
    action("recommendation.change-storage", source, {
      value: "cool-and-dry",
    }),
  );
  director.dispatch(
    action("recommendation.cite-evidence", source, { value: "trial-2" }),
  );
  director.dispatch(
    action("recommendation.distinguish", source, {
      value: "spoilage-harmful-decomposition-useful",
    }),
  );
  return director;
}

describe("fungi experience director", () => {
  it("declares seven complete mission descriptors in journey order", () => {
    expect(FUNGI_MISSIONS.map(({ id }) => id)).toEqual([
      "diagnose",
      "mycelium",
      "spore-flight",
      "growth-chamber",
      "useful-fungi",
      "safety",
      "recommendation",
    ]);

    for (const mission of FUNGI_MISSIONS) {
      expect(mission.objective).toBeTruthy();
      expect(mission.landmark).toBeTruthy();
      expect(mission.persistentLandmarkId).toBe(mission.landmark);
      expect(mission.cameraPose.position).toHaveLength(3);
      expect(mission.cameraPose.target).toHaveLength(3);
      expect(mission.focusBounds.minimum).toHaveLength(3);
      expect(mission.focusBounds.maximum).toHaveLength(3);
      expect(mission.tools.length).toBeGreaterThan(0);
      expect(mission.actions.length).toBeGreaterThan(0);
      expect(mission.hints).toHaveLength(3);
      expect(mission.entryMode).toBeTruthy();
      expect(mission.exitMode).toBeTruthy();
      expect(mission.resetBoundary).toBeTruthy();
      expect(typeof mission.evidenceSatisfied).toBe("function");
    }
  });

  it("requires a lens pose to cross all three specimen bounds before a correct revision", () => {
    const director = createFungiExperienceDirector();
    director.dispatch(
      action("diagnose.classify", "mouse", {
        value: "mushroom-and-bread-mould",
      }),
    );
    expect(director.snapshot().missionId).toBe("diagnose");

    director.dispatch(
      action("diagnose.classify", "mouse", {
        value: "mushroom-and-green-plant",
      }),
    );
    director.dispatch(
      action("diagnose.inspect", "mouse", {
        targetId: "mushroom",
        pose: { position: [9, 9, 9] },
      }),
    );
    expect(director.snapshot()).toMatchObject({
      missionId: "diagnose",
      evidence: { diagnose: { lensCrossings: [] } },
      feedback: {
        outcome: expect.stringMatching(/did not cross.*mushroom/i),
      },
    });
    const spoofedPosition = [9, 9, 9];
    spoofedPosition.every = () => true;
    director.dispatch(
      action("diagnose.inspect", "mouse", {
        targetId: "mushroom",
        pose: { position: spoofedPosition },
      }),
    );
    expect(director.snapshot().evidence.diagnose.lensCrossings).toEqual([]);

    for (const targetId of ["mushroom", "bread-mould", "green-plant"]) {
      director.dispatch(
        action("diagnose.inspect", "mouse", {
          targetId,
          pose: { position: specimenCrossingPositions[targetId] },
        }),
      );
    }
    expect(director.snapshot().missionId).toBe("diagnose");

    director.dispatch(
      action("diagnose.classify", "mouse", {
        value: "mushroom-and-bread-mould",
      }),
    );
    expect(director.snapshot()).toMatchObject({
      missionId: "mycelium",
      visitedMissionIds: ["diagnose", "mycelium"],
      completedMissionIds: ["diagnose"],
      evidence: {
        diagnose: {
          firstPrediction: "mushroom-and-bread-mould",
          classificationAttempts: [
            "mushroom-and-bread-mould",
            "mushroom-and-green-plant",
            "mushroom-and-bread-mould",
          ],
          lensCrossings: ["mushroom", "bread-mould", "green-plant"],
        },
      },
    });
  });

  it("requires three unique branches and the correct network interpretation", () => {
    const director = diagnose();
    director.dispatch(action("mycelium.trace", "mouse", { targetId: "a" }));
    director.dispatch(action("mycelium.trace", "mouse", { targetId: "a" }));
    expect(director.snapshot().feedback).toMatchObject({
      outcome: expect.stringMatching(/already traced/i),
    });
    director.dispatch(action("mycelium.trace", "mouse", { targetId: "b" }));
    director.dispatch(
      action("mycelium.interpret", "mouse", { value: "separate-roots" }),
    );
    expect(director.snapshot().missionId).toBe("mycelium");

    director.dispatch(action("mycelium.trace", "mouse", { targetId: "c" }));
    director.dispatch(
      action("mycelium.interpret", "mouse", {
        value: "connected-feeding-network",
      }),
    );
    expect(director.snapshot()).toMatchObject({
      missionId: "spore-flight",
      evidence: {
        mycelium: {
          branchTraces: ["a", "b", "c"],
          interpretationAttempts: [
            "separate-roots",
            "connected-feeding-network",
          ],
        },
      },
    });
  });

  it("stores dormant and successful landing outcomes and requires germination", () => {
    const director = diagnose();
    for (const targetId of ["a", "b", "c"]) {
      director.dispatch(action("mycelium.trace", "mouse", { targetId }));
    }
    director.dispatch(
      action("mycelium.interpret", "mouse", {
        value: "connected-feeding-network",
      }),
    );
    director.dispatch(
      action("spore.record-landing", "mouse", { value: "missed" }),
    );
    director.dispatch(
      action("spore.record-landing", "mouse", { value: "dormant" }),
    );
    expect(director.snapshot().missionId).toBe("spore-flight");
    director.dispatch(
      action("spore.record-landing", "mouse", { value: "germinating" }),
    );

    expect(director.snapshot()).toMatchObject({
      missionId: "growth-chamber",
      evidence: {
        sporeFlight: {
          landingOutcomes: ["missed", "dormant", "germinating"],
        },
      },
    });
  });

  it("requires two trials, a fair comparison, and a correct interpretation while preserving confounded history", () => {
    const director = reachGrowth();
    director.dispatch(
      action("growth.run-trial", "mouse", { input: warmTrial }),
    );
    director.dispatch(action("growth.save-trial"));
    director.dispatch(
      action("growth.run-trial", "mouse", {
        input: {
          ...warmTrial,
          temperatureC: 8,
          moisturePercent: 30,
        },
      }),
    );
    director.dispatch(action("growth.save-trial"));
    director.dispatch(
      action("growth.compare-trials", "mouse", {
        trialIds: ["trial-1", "trial-2"],
      }),
    );
    director.dispatch(
      action("growth.interpret", "mouse", { value: "warmer-grew-faster" }),
    );
    expect(director.snapshot().missionId).toBe("growth-chamber");

    director.dispatch(
      action("growth.run-trial", "mouse", {
        input: { ...warmTrial, moisturePercent: 30 },
      }),
    );
    director.dispatch(action("growth.save-trial"));
    director.dispatch(
      action("growth.compare-trials", "mouse", {
        trialIds: ["trial-1", "trial-3"],
      }),
    );
    director.dispatch(
      action("growth.interpret", "mouse", {
        value: "moisture-changed-growth",
      }),
    );

    expect(director.snapshot()).toMatchObject({
      missionId: "useful-fungi",
      evidence: {
        growth: {
          comparisonHistory: [
            expect.objectContaining({
              quality: "confounded",
              changedVariables: ["temperatureC", "moisturePercent"],
            }),
            expect.objectContaining({
              quality: "fair",
              changedVariables: ["moisturePercent"],
            }),
          ],
          interpretationAttempts: [
            "warmer-grew-faster",
            "moisture-changed-growth",
          ],
        },
      },
    });
  });

  it("preserves wrong role and safety explanation attempts before corrections", () => {
    const director = reachGrowth();
    director.dispatch(
      action("growth.run-trial", "mouse", { input: warmTrial }),
    );
    director.dispatch(action("growth.save-trial"));
    director.dispatch(
      action("growth.run-trial", "mouse", {
        input: { ...warmTrial, moisturePercent: 30 },
      }),
    );
    director.dispatch(action("growth.save-trial"));
    director.dispatch(
      action("growth.compare-trials", "mouse", {
        trialIds: ["trial-1", "trial-2"],
      }),
    );
    director.dispatch(
      action("growth.interpret", "mouse", {
        value: "moisture-changed-growth",
      }),
    );

    director.dispatch(
      action("useful.observe-dough", "mouse", {
        value: "no-difference-from-control",
      }),
    );
    expect(director.snapshot().feedback).toMatchObject({
      outcome: expect.stringMatching(/no difference/i),
    });
    director.dispatch(
      action("useful.observe-dough", "mouse", {
        value: "yeast-expanded-more-than-control",
      }),
    );
    director.dispatch(
      action("useful.match-role", "mouse", {
        targetId: "yeast",
        value: "medicine",
      }),
    );
    for (const [targetId, value] of [
      ["yeast", "food"],
      ["antibiotic-producing-fungus", "medicine"],
      ["saprotrophic-fungus", "decomposer"],
    ]) {
      director.dispatch(
        action("useful.match-role", "mouse", { targetId, value }),
      );
    }

    director.dispatch(action("safety.scan", "mouse", { value: 0.5 }));
    director.dispatch(
      action("safety.classify", "mouse", {
        targetId: "fresh-item",
        value: "check-use",
      }),
    );
    director.dispatch(
      action("safety.classify", "mouse", {
        targetId: "mouldy-item",
        value: "do-not-eat",
      }),
    );
    director.dispatch(
      action("safety.explain", "mouse", { value: "cut-off-visible-patch" }),
    );
    director.dispatch(
      action("safety.explain", "mouse", {
        value: "hidden-hyphae-extend-beyond-visible-patch",
      }),
    );
    expect(director.snapshot().missionId).toBe("safety");
    expect(director.snapshot().feedback).toMatchObject({
      outcome: expect.stringMatching(/hidden hyphae/i),
    });
    director.dispatch(action("safety.scan", "mouse", { value: 0.9 }));

    expect(director.snapshot()).toMatchObject({
      missionId: "recommendation",
      evidence: {
        usefulFungi: {
          roleAttempts: [
            { actorId: "yeast", role: "medicine", correct: false },
            { actorId: "yeast", role: "food", correct: true },
            {
              actorId: "antibiotic-producing-fungus",
              role: "medicine",
              correct: true,
            },
            {
              actorId: "saprotrophic-fungus",
              role: "decomposer",
              correct: true,
            },
          ],
        },
        safety: {
          maximumScanDepth: 0.9,
          explanationAttempts: [
            "cut-off-visible-patch",
            "hidden-hyphae-extend-beyond-visible-patch",
          ],
        },
      },
    });
  });

  it("requires an evidence-backed storage change and harmful/useful distinction", () => {
    const director = completeJourney("mouse");
    const snapshot = director.snapshot();

    expect(snapshot).toMatchObject({
      missionId: "recommendation",
      journeyComplete: true,
      completedMissionIds: [
        "diagnose",
        "mycelium",
        "spore-flight",
        "growth-chamber",
        "useful-fungi",
        "safety",
        "recommendation",
      ],
      evidence: {
        recommendation: {
          storageChanges: ["cool-and-dry"],
          citedTrialIds: ["trial-2"],
          distinctionAttempts: ["spoilage-harmful-decomposition-useful"],
        },
      },
    });
  });

  it("produces source-neutral snapshots for mouse, touch, keyboard, and XR", () => {
    const snapshots = sources.map((source) =>
      completeJourney(source).snapshot(),
    );
    expect(snapshots.slice(1)).toEqual([
      snapshots[0],
      snapshots[0],
      snapshots[0],
    ]);
  });

  it("validates type, source, action IDs, and payloads before mutation", () => {
    const director = createFungiExperienceDirector();
    const initial = director.snapshot();

    for (const malformed of [
      { actionId: "constructor", source: "mouse" },
      { actionId: "__proto__", source: "mouse" },
      { actionId: "ordinary.unknown-action", source: "mouse" },
      {
        actionId: "answer:diagnose:mushroom-and-bread-mould",
        source: "mouse",
        value: "mushroom-and-bread-mould",
      },
      { actionId: 42, source: "mouse" },
      { actionId: "diagnose.inspect", source: ["mouse"], targetId: "mushroom" },
      {
        type: new String("fungi-action"),
        actionId: "diagnose.inspect",
        source: "mouse",
        targetId: "mushroom",
      },
      {
        actionId: "diagnose.inspect",
        source: "mouse",
        targetId: new String("mushroom"),
      },
      {
        actionId: "diagnose.inspect",
        source: "mouse",
        targetId: "mushroom",
        pose: { position: Array(3) },
      },
    ]) {
      expect(() =>
        director.dispatch(malformed as unknown as FungiDirectorAction),
      ).toThrow();
      expect(director.snapshot()).toEqual(initial);
    }
  });

  it("keeps experiment, camera, and journey reset boundaries distinct", () => {
    const director = reachGrowth();
    director.dispatch(
      action("growth.predict", "mouse", { value: "rapid-growth" }),
    );
    director.dispatch(
      action("growth.run-trial", "mouse", { input: warmTrial }),
    );
    director.dispatch(action("growth.save-trial"));
    const beforeCamera = director.snapshot();

    const camera = director.resetCameraRequest();
    expect(camera.cameraRequestId).toBe(beforeCamera.cameraRequestId + 1);
    expect(camera.experiment).toEqual(beforeCamera.experiment);
    expect(camera.evidence).toEqual(beforeCamera.evidence);

    const experiment = director.resetExperiment();
    expect(experiment.experiment.savedTrials).toEqual([]);
    expect(experiment.experiment.firstPrediction).toBe("rapid-growth");
    expect(experiment.evidence.diagnose).toEqual(
      beforeCamera.evidence.diagnose,
    );
    expect(experiment.cameraRequestId).toBe(camera.cameraRequestId);

    const restarted = director.restartJourney();
    expect(restarted).toEqual(createFungiExperienceDirector().snapshot());
  });

  it("escalates three hints and returns deeply copied, frozen snapshots", () => {
    const director = createFungiExperienceDirector();
    for (let index = 0; index < 4; index += 1) {
      director.dispatch(action("director.request-hint"));
    }
    const first = director.snapshot();
    const second = director.snapshot();

    expect(first.hintLevel).toBe(3);
    expect(first.currentHint).toBe(FUNGI_MISSIONS[0]?.hints[2]);
    expect(first).not.toBe(second);
    expect(first.evidence).not.toBe(second.evidence);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.evidence.diagnose.lensCrossings)).toBe(true);
    expect(() => {
      (first.evidence.diagnose.lensCrossings as string[]).push("forged");
    }).toThrow();
    expect(director.snapshot().evidence.diagnose.lensCrossings).toEqual([]);
  });

  it("keeps hint dispatch source-neutral across every normalized input source", () => {
    const snapshots = sources.map((source) => {
      const director = createFungiExperienceDirector();
      director.dispatch(action("director.request-hint", source));
      return director.snapshot();
    });

    expect(snapshots.slice(1)).toEqual([
      snapshots[0],
      snapshots[0],
      snapshots[0],
    ]);
    expect(snapshots[0]?.feedback).toMatchObject({
      outcome: expect.stringMatching(/objective/i),
      hint: FUNGI_MISSIONS[0]?.hints[0],
    });
  });

  it("exposes the current descriptor and only its normalized actions", () => {
    const director = createFungiExperienceDirector();
    expect(director.descriptor()).toEqual(FUNGI_MISSIONS[0]);
    expect(director.currentMission()).toEqual(FUNGI_MISSIONS[0]);
    expect(director.availableActions()).toEqual([
      "diagnose.classify",
      "diagnose.inspect",
      "director.request-hint",
    ]);
  });
});
