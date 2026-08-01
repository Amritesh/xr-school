import {
  createAssessmentSession,
  createLessonSession,
  type AssessmentAnswerResult,
  type LessonSnapshot,
} from '@xr-school/simulation-runtime';
import type {
  AssessmentPromptDefinition,
  GuidedSimulationDefinition,
  ImplementedSimulationDefinition,
  NormalizedAction,
} from '@xr-school/simulation-schema';
import type {
  SimulationHost,
} from '@xr-school/simulation-web';

type GuidedControllerHost = Pick<
  SimulationHost,
  'applySnapshot' | 'narration' | 'dispose'
>;

export interface GuidedSimulationControllerView {
  snapshot: LessonSnapshot;
  stage: GuidedSimulationDefinition['stages'][number];
  evidence: readonly string[];
  caption: string;
  feedback?: string;
  selectedId?: string;
  assessment?: AssessmentPromptDefinition;
  completed: boolean;
  mastery: ReturnType<ReturnType<typeof createAssessmentSession>['mastery']>;
}

export interface GuidedSimulationController {
  view(): GuidedSimulationControllerView;
  dispatch(action: NormalizedAction): void;
  recordEvidence(evidenceId: string): void;
  answer(optionId: string): AssessmentAnswerResult;
  previous(): void;
  next(): void;
  restart(): void;
  replayNarration(): Promise<unknown>;
  dispose(): Promise<void>;
}

export interface CreateGuidedSimulationControllerInput {
  record: ImplementedSimulationDefinition;
  guidance: GuidedSimulationDefinition;
  host: GuidedControllerHost;
  onChange(view: GuidedSimulationControllerView): void;
  narrationEnabled?: () => boolean;
}

export function createGuidedSimulationController(
  input: CreateGuidedSimulationControllerInput,
): GuidedSimulationController {
  if (input.record.module.id !== input.guidance.moduleId) {
    throw new Error('Guided controller record and definition do not match');
  }
  const lesson = createLessonSession(input.record.experience);
  const assessment = createAssessmentSession(input.record.assessment);
  const narrationEnabled = input.narrationEnabled ?? (() => true);
  const selectedByPrompt = new Map<string, string>();
  let feedback: string | undefined;
  let disposed = false;

  const stage = () => input.guidance.stages[lesson.snapshot().stageIndex];
  const prompt = () => {
    const current = stage();
    const promptId = current.misconceptionId ?? current.transferPromptId;
    if (!promptId) return undefined;
    return input.record.assessment.prompts.find(item => item.id === promptId);
  };
  const caption = () => input.record.narration.cues.find(
    cue => cue.id === stage().narrationId,
  )?.caption ?? '';
  const view = (): GuidedSimulationControllerView => {
    const snapshot = lesson.snapshot();
    const currentPrompt = prompt();
    const actionPerformed = stage().requiredActionIds.every(actionId =>
      snapshot.performedActionIds.includes(actionId));
    return {
      snapshot,
      stage: stage(),
      evidence: [...snapshot.recordedEvidenceIds],
      caption: caption(),
      ...(feedback ? { feedback } : {}),
      ...(currentPrompt && selectedByPrompt.has(currentPrompt.id)
        ? { selectedId: selectedByPrompt.get(currentPrompt.id) }
        : {}),
      ...(currentPrompt && actionPerformed
        ? { assessment: currentPrompt }
        : {}),
      completed: snapshot.lessonComplete,
      mastery: assessment.mastery(),
    };
  };
  const notify = () => {
    const nextView = view();
    input.host.applySnapshot(nextView.snapshot);
    input.onChange(nextView);
  };
  const playCurrentNarration = () => {
    if (!narrationEnabled()) {
      input.host.narration.stop();
      return Promise.resolve('silent');
    }
    return input.host.narration.play(stage().narrationId).catch(() => 'silent');
  };
  const enterStage = () => {
    feedback = undefined;
    notify();
    void playCurrentNarration();
  };

  notify();
  void playCurrentNarration();

  return {
    view,
    dispatch(action) {
      if (disposed || action.phase !== 'commit') return;
      const current = stage();
      if (action.stageId !== current.id) return;
      if (!current.requiredActionIds.includes(action.actionId)) return;
      const snapshot = lesson.snapshot();
      if (snapshot.performedActionIds.includes(action.actionId)) return;
      lesson.performAction(action.actionId);
      feedback = undefined;
      notify();
    },
    recordEvidence(evidenceId) {
      if (disposed) return;
      const current = stage();
      if (current.evidenceMode !== 'scene') return;
      if (!current.completionEvidenceIds.includes(evidenceId)) return;
      const snapshot = lesson.snapshot();
      if (!current.requiredActionIds.every(actionId =>
        snapshot.performedActionIds.includes(actionId))) return;
      if (snapshot.recordedEvidenceIds.includes(evidenceId)) return;
      lesson.recordEvidence(evidenceId);
      notify();
    },
    answer(optionId) {
      if (disposed) throw new Error('Guided controller is disposed');
      const current = stage();
      const currentPrompt = prompt();
      if (current.evidenceMode !== 'answer' || !currentPrompt) {
        throw new Error(`${current.id}: no assessment answer is expected`);
      }
      const snapshot = lesson.snapshot();
      if (!current.requiredActionIds.every(actionId =>
        snapshot.performedActionIds.includes(actionId))) {
        throw new Error(`${current.id}: perform the stage action before answering`);
      }
      const result = assessment.answer(currentPrompt.id, optionId);
      selectedByPrompt.set(currentPrompt.id, optionId);
      feedback = result.correct ? result.explanation : result.hint;
      if (
        result.correct
        && !snapshot.recordedEvidenceIds.includes(current.completionEvidenceIds[0])
      ) {
        lesson.recordEvidence(current.completionEvidenceIds[0]);
      }
      notify();
      return result;
    },
    previous() {
      if (disposed) return;
      if (lesson.snapshot().stageIndex === 0) return;
      lesson.previous();
      enterStage();
    },
    next() {
      if (disposed) return;
      const before = lesson.snapshot();
      if (before.lessonComplete) return;
      lesson.next();
      enterStage();
    },
    restart() {
      if (disposed) return;
      input.host.narration.stop();
      assessment.reset();
      selectedByPrompt.clear();
      feedback = undefined;
      lesson.restart();
      notify();
      void playCurrentNarration();
    },
    replayNarration() {
      if (disposed) return Promise.reject(new Error('Guided controller is disposed'));
      return playCurrentNarration();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      input.host.narration.stop();
      await input.host.dispose();
    },
  };
}
