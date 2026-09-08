import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { IMPLEMENTED_SIMULATIONS } from "@xr-school/simulation-content";
import {
  narrationAssetKey,
  packagedNarrationUrl,
} from "../../packages/simulation-content/src/implemented/narrationAssets";
import {
  CATALOG_NARRATION_PROFILES,
  profileForSimulation,
} from "../../scripts/lib/catalog-narration-profiles";

describe("catalog narration assets", () => {
  it("assigns an offline recording to every narration cue", () => {
    const cues = IMPLEMENTED_SIMULATIONS.flatMap((definition) =>
      definition.narration.cues.map((cue) => ({ definition, cue })),
    );

    expect(cues).toHaveLength(240);
    expect(cues.every(({ cue }) => Boolean(cue.audioUrl))).toBe(true);
    expect(
      cues.filter(({ cue }) => cue.audioUrl?.startsWith("/narration/")),
    ).toHaveLength(204);

    for (const { cue } of cues) {
      if (!cue.audioUrl?.startsWith("/narration/")) continue;
      expect(cue.audioUrl).toBe(packagedNarrationUrl(cue.text));
      const assetPath = resolve(
        process.cwd(),
        "apps/web/public",
        cue.audioUrl.replace(/^\/+/, ""),
      );
      expect(existsSync(assetPath), assetPath).toBe(true);
      expect(statSync(assetPath).size, assetPath).toBeGreaterThanOrEqual(1024);
    }
  });

  it("preserves authored recordings and uses both requested preview voices", () => {
    const pollination = IMPLEMENTED_SIMULATIONS.find(
      (definition) => definition.module.slug === "pollination",
    );
    expect(pollination?.narration.cues[0].audioUrl).toBe(
      "/audio/pollination/stage-01.mp3",
    );

    const usedPreviewNumbers = new Set(
      IMPLEMENTED_SIMULATIONS.filter((definition) =>
        definition.narration.cues.some((cue) =>
          cue.audioUrl?.startsWith("/narration/"),
        ),
      ).map(
        (definition) =>
          profileForSimulation(definition.module.slug).previewNumber,
      ),
    );
    expect(usedPreviewNumbers).toEqual(new Set([7, 9]));
    expect(CATALOG_NARRATION_PROFILES.dramaticTeacher.voice).toBe(
      "en-IN-NeerjaExpressiveNeural",
    );
    expect(CATALOG_NARRATION_PROFILES.animatedStoryTeacher.voice).toBe(
      "en-IN-PrabhatNeural",
    );
  });

  it("keeps the packaged key compatible with the established FNV-1a contract", () => {
    expect(narrationAssetKey("Narration fallback contract smoke test.")).toBe(
      "1kanxeu",
    );
  });
});
