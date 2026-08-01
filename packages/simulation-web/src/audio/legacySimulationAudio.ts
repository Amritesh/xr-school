import { createNarrationController } from './createNarrationController.js';
import type { SimulationNarrationController } from './createNarrationController.js';

/**
 * Compatibility facade for released viewers that still narrate ad-hoc text.
 * It deliberately delegates to createNarrationController so manifest-driven
 * shell narration and legacy viewer narration share one playback owner.
 */
export class SimulationSoundManager {
  private static readonly shared = new SimulationSoundManager();
  private controller: SimulationNarrationController | undefined;
  private generation = 0;

  private constructor() {}

  static instance() {
    return SimulationSoundManager.shared;
  }

  async playNarration(text: string, cueIndex = 0, audioUrl?: string) {
    const request = this.generation + 1;
    this.generation = request;
    this.controller?.dispose();

    const cueId = `legacy-narration-${request}-${cueIndex}`;
    const controller = createNarrationController({
      id: `legacy-narration-${request}`,
      cues: [{
        id: cueId,
        stageId: `legacy-stage-${cueIndex}`,
        text,
        caption: text,
        ...(audioUrl ? { audioUrl } : {}),
      }],
      fallback: 'browserTts',
    });
    this.controller = controller;

    await controller.play(cueId);
    if (request !== this.generation || this.controller !== controller) {
      controller.dispose();
    }
  }

  stop() {
    this.generation += 1;
    this.controller?.dispose();
    this.controller = undefined;
  }
}

export function getSimulationSoundManager() {
  return SimulationSoundManager.instance();
}

export async function playSimulationNarration(
  text: string,
  cueIndex = 0,
  audioUrl?: string,
) {
  await getSimulationSoundManager().playNarration(text, cueIndex, audioUrl);
}

export function stopSimulationNarration() {
  getSimulationSoundManager().stop();
}
