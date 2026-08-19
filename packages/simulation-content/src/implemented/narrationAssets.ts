import type { NarrationCueDefinition } from "@xr-school/simulation-schema";

/**
 * Keep this key function aligned with the legacy viewer narration adapter so
 * one recorded clip can be addressed consistently from desktop and Quest.
 */
export function narrationAssetKey(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function packagedNarrationUrl(text: string): string {
  return `/narration/${narrationAssetKey(text)}.mp3`;
}

export function withPackagedNarration<Cue extends NarrationCueDefinition>(
  cue: Cue,
): Cue {
  if (cue.audioUrl) return cue;
  return {
    ...cue,
    audioUrl: packagedNarrationUrl(cue.text),
  };
}
