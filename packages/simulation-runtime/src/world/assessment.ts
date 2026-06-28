import type {
  AssessmentPromptKind,
  AssessmentSequence,
} from '../../../simulation-schema/src/world';

export interface AssessmentEvidence {
  promptId: string;
  kind: AssessmentPromptKind;
  stageId: string;
  evidenceId: string;
  attempts: number;
  hinted: boolean;
}

export interface AssessmentAnswerResult {
  promptId: string;
  correct: boolean;
  attempts: number;
  hint?: string;
  explanation?: string;
  alreadyResolved?: boolean;
}

function validateSequence(sequence: AssessmentSequence) {
  const prompts = new Set<string>();
  for (const prompt of sequence.prompts) {
    if (prompts.has(prompt.id)) throw new Error(`Duplicate assessment prompt ${prompt.id}`);
    prompts.add(prompt.id);
    if (prompt.acceptedEvidenceIds.length === 0) {
      throw new Error(`${prompt.id}: accepted evidence is required`);
    }
  }
  if (!Number.isInteger(sequence.masteryRule.requiredEvidenceCount)
    || sequence.masteryRule.requiredEvidenceCount <= 0
    || sequence.masteryRule.requiredEvidenceCount > sequence.prompts.length) {
    throw new Error(`${sequence.id}: invalid mastery evidence count`);
  }
  const kinds = new Set(sequence.prompts.map(prompt => prompt.kind));
  for (const kind of sequence.masteryRule.requiredKinds) {
    if (!kinds.has(kind)) throw new Error(`${sequence.id}: missing required ${kind} prompt`);
  }
}

export function createAssessmentSession(sequence: AssessmentSequence) {
  validateSequence(sequence);
  const prompts = new Map(sequence.prompts.map(prompt => [prompt.id, prompt]));
  const attempts = new Map<string, number>();
  const hinted = new Set<string>();
  const evidenceByPrompt = new Map<string, AssessmentEvidence>();

  function evidence() {
    return [...evidenceByPrompt.values()].map(item => ({ ...item }));
  }

  return {
    answer(promptId: string, evidenceId: string): AssessmentAnswerResult {
      const prompt = prompts.get(promptId);
      if (!prompt) throw new Error(`Unknown assessment prompt ${promptId}`);
      if (!evidenceId.trim()) throw new Error(`${promptId}: evidence ID is required`);
      if (prompt.options
        && !prompt.options.some(option => option.id === evidenceId)) {
        throw new Error(`${promptId}: unknown option ${evidenceId}`);
      }

      const existing = evidenceByPrompt.get(promptId);
      if (existing) {
        return {
          promptId,
          correct: true,
          attempts: existing.attempts,
          explanation: prompt.explanation,
          alreadyResolved: true,
        };
      }

      const previousAttempts = attempts.get(promptId) ?? 0;
      if (previousAttempts > 0 && prompt.retryPolicy === 'afterObservation') {
        const hasObservation = evidence().some(item =>
          item.kind === 'observation' && item.stageId === prompt.stageId);
        if (!hasObservation) {
          throw new Error(`${promptId}: retry requires observation evidence`);
        }
      }

      const nextAttempts = previousAttempts + 1;
      attempts.set(promptId, nextAttempts);
      const correct = prompt.acceptedEvidenceIds.includes(evidenceId);
      if (!correct) {
        hinted.add(promptId);
        return {
          promptId,
          correct: false,
          attempts: nextAttempts,
          hint: prompt.hint,
        };
      }

      evidenceByPrompt.set(promptId, {
        promptId,
        kind: prompt.kind,
        stageId: prompt.stageId,
        evidenceId,
        attempts: nextAttempts,
        hinted: hinted.has(promptId),
      });
      return {
        promptId,
        correct: true,
        attempts: nextAttempts,
        explanation: prompt.explanation,
      };
    },

    evidence,

    mastery() {
      const allEvidence = evidence();
      const eligibleEvidence = sequence.masteryRule.allowHintedMastery
        ? allEvidence
        : allEvidence.filter(item => !item.hinted);
      const eligibleKinds = new Set(eligibleEvidence.map(item => item.kind));
      const missingKinds = sequence.masteryRule.requiredKinds.filter(
        kind => !eligibleKinds.has(kind),
      );
      return {
        mastered: eligibleEvidence.length >= sequence.masteryRule.requiredEvidenceCount
          && missingKinds.length === 0,
        evidenceCount: allEvidence.length,
        eligibleEvidenceCount: eligibleEvidence.length,
        requiredEvidenceCount: sequence.masteryRule.requiredEvidenceCount,
        missingKinds,
      };
    },

    reset() {
      attempts.clear();
      hinted.clear();
      evidenceByPrompt.clear();
    },
  };
}

export type AssessmentSession = ReturnType<typeof createAssessmentSession>;
