import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../apps/web/components/robotree/ClassroomSync", () => ({
  ClassroomSync: () => null,
}));

import BrowserExperienceHud from "../../apps/web/components/simulation-experience/BrowserExperienceHud";
import LaunchPortal from "../../apps/web/components/simulation-experience/LaunchPortal";
import SimulationCanvasHost from "../../apps/web/components/simulation-experience/SimulationCanvasHost";
import SimulationExperienceShell from "../../apps/web/components/simulation-experience/SimulationExperienceShell";
import type { LessonSnapshot } from "@xr-school/simulation-runtime";

vi.stubGlobal("React", React);

const snapshot: LessonSnapshot = {
  experienceId: "fixture",
  objective: "Compare the evidence.",
  stageIndex: 0,
  stageCount: 2,
  stageId: "observe",
  stageTitle: "Observe",
  cue: "Inspect both samples.",
  performedActionIds: [],
  recordedEvidenceIds: [],
  stageComplete: false,
  lessonComplete: false,
};

const experienceCss = readFileSync(resolve(
  process.cwd(),
  "apps/web/components/simulation-experience/simulation-experience.css",
), "utf8");

function cssRule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return experienceCss.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`))?.[1]
    ?? "";
}

function renderShell(simulationId?: string) {
  return renderToStaticMarkup(React.createElement(SimulationExperienceShell, {
    simulationId,
    title: "Fixture",
    classContext: "Class 5 Science",
    objective: "Compare evidence",
    snapshot,
    started: true,
    preferences: {
      audio: true,
      subtitles: true,
      comfort: true,
      seated: false,
      reducedMotion: false,
    },
    onPreferencesChange: vi.fn(),
    onStartBrowser: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    evidence: [],
    children: React.createElement(SimulationCanvasHost, {
      ariaLabel: "Fixture world",
    }),
  }));
}

describe("simulation experience accessibility contract", () => {
  it("renders one labelled, busy-aware shared canvas mount with a forwarded ref", () => {
    const ref = { current: null };
    const html = renderToStaticMarkup(React.createElement(SimulationCanvasHost, {
      ref,
      ariaLabel: "Interactive sample comparison",
      className: "fixture-canvas",
      busy: true,
    }));

    expect(html).toContain('data-testid="simulation-canvas"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Interactive sample comparison"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('class="fixture-canvas"');
  });

  it("puts the launch hook on the clickable browser-launch button", () => {
    const html = renderToStaticMarkup(React.createElement(LaunchPortal, {
      title: "Fixture",
      classContext: "Class 5 Science",
      objective: "Compare evidence",
      preferences: {
        audio: true,
        subtitles: true,
        comfort: true,
        seated: false,
        reducedMotion: false,
      },
      onPreferencesChange: vi.fn(),
      onStartBrowser: vi.fn(),
    }));

    expect(html).toMatch(
      /<button[^>]*data-testid="simulation-launch"[^>]*>Explore in browser<\/button>/,
    );
  });

  it("exposes scene action, assessment, captions, feedback, replay, and restart without unlocking Continue", () => {
    const html = renderToStaticMarkup(React.createElement(BrowserExperienceHud, {
      title: "Fixture",
      snapshot,
      evidence: [],
      onPrevious: vi.fn(),
      onNext: vi.fn(),
      primaryAction: {
        label: "Place sample",
        onActivate: vi.fn(),
      },
      assessment: {
        promptId: "compare-prompt",
        question: "Which sample changed?",
        options: [
          { id: "a", label: "Sample A" },
          { id: "b", label: "Sample B" },
        ],
        selectedId: "a",
        feedback: "Use the visible result as evidence.",
        onAnswer: vi.fn(),
      },
      caption: "Inspect both samples before answering.",
      onReplayNarration: vi.fn(),
      onRestart: vi.fn(),
      helpText: "You can use the labelled action button instead of the canvas.",
    }));

    for (const hook of [
      "stage-title",
      "stage-cue",
      "primary-action",
      "feedback",
      "narration-replay",
      "restart",
    ]) {
      expect(html).toContain(`data-testid="${hook}"`);
    }
    expect(html).toContain("Which sample changed?");
    expect(html).toContain("Sample A");
    expect(html).toContain("Inspect both samples before answering.");
    expect(html).toContain('class="simulation-experience__topbar-actions"');
    expect(html).toContain('class="simulation-experience__stage-copy"');
    expect(html).toContain('class="simulation-experience__assessment"');
    expect(html).not.toContain(">Continue<");
  });

  it("keeps Continue gated by stage completion and marks completion explicitly", () => {
    const completeStage = renderToStaticMarkup(React.createElement(
      BrowserExperienceHud,
      {
        title: "Fixture",
        snapshot: { ...snapshot, stageComplete: true },
        evidence: ["observation"],
        onPrevious: vi.fn(),
        onNext: vi.fn(),
      },
    ));
    const completed = renderToStaticMarkup(React.createElement(
      BrowserExperienceHud,
      {
        title: "Fixture",
        snapshot: { ...snapshot, stageComplete: true, lessonComplete: true },
        evidence: ["observation"],
        completed: true,
        onPrevious: vi.fn(),
        onNext: vi.fn(),
      },
    ));

    expect(completeStage).toContain(">Continue</button>");
    expect(completed).toContain('data-testid="completion"');
  });

  it("renders explicit and migration-fallback simulation identities at runtime", () => {
    const explicit = renderShell("module-fixture");
    const fallback = renderShell();

    expect(explicit).toContain('data-simulation-id="module-fixture"');
    expect(explicit).toContain('data-stage-id="observe"');
    expect(fallback).toContain('data-simulation-id="fixture"');
    expect(fallback).toContain('data-stage-id="observe"');
    expect(explicit).toContain('data-testid="simulation-canvas"');
  });

  it("positions captions above the world with a responsive overlay contract", () => {
    const caption = cssRule(".simulation-experience__caption");

    expect(caption).toContain("position: absolute");
    expect(caption).toMatch(/z-index:\s*[6-9]/);
    expect(caption).toContain("left: 50%");
    expect(caption).toContain("transform: translateX(-50%)");
    expect(experienceCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.simulation-experience__caption\s*\{/,
    );
  });

  it("assigns topbar controls and assessment content to deliberate grid areas", () => {
    expect(cssRule(".simulation-experience__topbar")).toContain(
      "grid-template-areas",
    );
    expect(cssRule(".simulation-experience__topbar-actions")).toContain(
      "grid-area: actions",
    );
    expect(cssRule(".simulation-experience__mission-dock")).toContain(
      "grid-template-areas",
    );
    expect(cssRule(".simulation-experience__stage-copy")).toContain(
      "grid-area: content",
    );
    expect(cssRule(".simulation-experience__mission-actions")).toContain(
      "grid-area: actions",
    );
    expect(cssRule(".simulation-experience__assessment")).toContain(
      "grid-area: assessment",
    );
    expect(experienceCss).toMatch(/['"]assessment assessment(?: assessment)?['"]/);
  });
});
