import { findImplementedSimulation } from '@xr-school/simulation-content';

/** Returns the packaged narration assets in authored cue order. */
export function narrationAudioUrls(slug: string) {
  const record = findImplementedSimulation(slug);
  if (!record) throw new Error(`Missing implemented simulation narration for ${slug}`);
  return record.narration.cues.map(cue => cue.audioUrl);
}
