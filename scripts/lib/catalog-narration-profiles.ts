export interface CatalogNarrationProfile {
  previewNumber: 7 | 9;
  label: string;
  voice: string;
  rate: string;
  pitch: string;
}

export const CATALOG_NARRATION_PROFILES = {
  dramaticTeacher: {
    previewNumber: 7,
    label: "Neerja — Dramatic Narrator",
    voice: "en-IN-NeerjaExpressiveNeural",
    rate: "-12%",
    pitch: "-2Hz",
  },
  animatedStoryTeacher: {
    previewNumber: 9,
    label: "Prabhat — Animated Story Teacher",
    voice: "en-IN-PrabhatNeural",
    rate: "+6%",
    pitch: "+1Hz",
  },
} as const satisfies Record<string, CatalogNarrationProfile>;

// These lessons benefit from the more energetic story-teacher delivery. The
// remaining science, experiment, safety, and observation lessons use Neerja's
// slower explanatory delivery.
export const PRABHAT_STORY_SIMULATIONS = new Set([
  "c5-ch03-a02-introduction-of-digestive-system",
  "c1-art-a01-learning-of-colours",
  "c1-math-ch01-introduction-to-money",
  "c2-english-ch01-prepositions",
  "c5-ch04-a03-the-making-of-aam-papad",
  "c5-ch05-a01-pitcher-plant-the-insect-hunter",
  "c5-ch05-a02-seed-dispersal",
  "c5-ch06-a01-the-storage-of-rainwater",
  "c5-ch08-a02-life-cycle-of-the-mosquito",
  "c5-ch09-a01-river-crossing-adventure",
  "c5-ch09-a03-camp-in-the-snow",
  "c5-ch09-a04-snow-mountain-climbing",
]);

export function profileForSimulation(slug: string): CatalogNarrationProfile {
  return PRABHAT_STORY_SIMULATIONS.has(slug)
    ? CATALOG_NARRATION_PROFILES.animatedStoryTeacher
    : CATALOG_NARRATION_PROFILES.dramaticTeacher;
}
