/**
 * Evaluation engine — scoring logic.
 * All scores are 0.0–1.0 proportions. No individual student identifiers.
 * Evaluation is always batch-level.
 */

export function calculateImprovement(pre: number, post: number): number {
  if (!isValidScore(pre) || !isValidScore(post)) {
    throw new Error(`Scores must be between 0 and 1. Got pre=${pre}, post=${post}`);
  }
  if (pre === 1) return 0; // already perfect, no room to improve
  return Math.round(((post - pre) / (1 - pre)) * 10000) / 10000; // normalised gain
}

export function isValidScore(score: number): boolean {
  return typeof score === 'number' && isFinite(score) && score >= 0 && score <= 1;
}

export function expectedBatchCount(classSize: number, batchSize: number): number {
  if (classSize <= 0 || batchSize <= 0) throw new Error('Class size and batch size must be positive');
  return Math.ceil(classSize / batchSize);
}

export function completionRate(stagesCompleted: number, totalStages: number): number {
  if (totalStages <= 0) throw new Error('totalStages must be positive');
  return Math.min(stagesCompleted / totalStages, 1);
}

export function engagementScore(
  handsRaised: number,
  questionsAsked: number,
  participantCount: number
): number {
  if (participantCount <= 0) return 0;
  const rate = (handsRaised + questionsAsked) / (participantCount * 2);
  return Math.min(Math.round(rate * 100) / 100, 1);
}

export type SyncStatus = 'localOnly' | 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict';

export function nextSyncState(current: SyncStatus, event: 'trigger' | 'start' | 'success' | 'error' | 'resolve'): SyncStatus {
  const transitions: Record<SyncStatus, Partial<Record<typeof event, SyncStatus>>> = {
    localOnly: { trigger: 'queued' },
    queued:    { start: 'syncing' },
    syncing:   { success: 'synced', error: 'failed' },
    synced:    {},
    failed:    { trigger: 'queued' },
    conflict:  { resolve: 'synced' },
  };
  const next = transitions[current]?.[event];
  if (!next) throw new Error(`Invalid transition: ${current} + ${event}`);
  return next;
}
