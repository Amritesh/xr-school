import { findImplementedSimulation } from '@xr-school/simulation-content';
import {
  MONEY_NARRATION_EXTRAS,
  type MoneyNarrationCue,
} from './moneyTownNarrationExtras';
export type { MoneyNarrationCue } from './moneyTownNarrationExtras';
export const MONEY_NARRATION: Record<string, MoneyNarrationCue> =
  Object.fromEntries([
    ...findImplementedSimulation(
      'c1-math-ch01-introduction-to-money',
    )!.narration.cues.map((item) => [
      `stage-${item.stageId}`,
      {
        id: `stage-${item.stageId}`,
        text: item.text,
        audioUrl: item.audioUrl!,
      },
    ]),
    ...MONEY_NARRATION_EXTRAS.map((item) => [item.id, item]),
  ]);
