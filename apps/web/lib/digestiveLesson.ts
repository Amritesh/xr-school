export type DigestiveStageId =
  | 'welcome'
  | 'mouth'
  | 'esophagus'
  | 'stomach'
  | 'supporting-organs'
  | 'small-intestine'
  | 'large-intestine'
  | 'rectum-anus'
  | 'healthy-habits'
  | 'recap';

export type DigestiveStage = {
  id: DigestiveStageId;
  title: string;
  subtitle: string;
  instruction: string;
  durationSeconds: number;
  environment: string;
  teacherNarration: string;
  interactionPrompt: string;
  cinematicTransition: string;
  visualTreatment: string;
  spatialAudioProfile: string;
  soundCues: readonly string[];
  requiredActionIds: readonly string[];
};

export type DigestiveQuizQuestion = {
  id: string;
  prompt: string;
  options: readonly { id: string; label: string }[];
  correctAnswerId: string;
  explanation: string;
};

export type DigestiveProgress = {
  completedActions: Partial<Record<DigestiveStageId, string[]>>;
  quizAnswers: Record<string, string>;
};

export const DIGESTIVE_PATHWAY = [
  'Mouth',
  'Esophagus',
  'Stomach',
  'Small Intestine',
  'Large Intestine',
  'Rectum',
  'Anus',
] as const;

export const DIGESTIVE_CLASSROOM_FEATURES = [
  'Modern futuristic science room with soft ambient lighting',
  'Large interactive smart board',
  'Digestive system hologram',
  'Human body hologram',
  'AI teacher guide with pointing, walking, gestures, organ focus, and praise',
  'Animated lighting, science lab equipment, and floating UI panels',
  'Glowing shrink portal for the journey into the mouth',
  'Spatial science-room ambience without student NPCs',
] as const;

export const DIGESTIVE_AUDIO_REQUIREMENTS = [
  'Teacher narration for every level',
  'Slow clear Class 5 English voice',
  'Low background music',
  'Spatial sound effects',
  'Button click sounds',
  'Success chime',
  'Applause on correct quiz answers',
  'Organ ambience for digestion processes',
  'Unique spatial audio profile per scene',
] as const;

export const DIGESTIVE_VR_FEATURES = [
  'Full 6DoF room-scale viewing',
  'Meta Quest 3S controller support',
  'Hand tracking for grab, point, and interact',
  'Teleport locomotion',
  'Optional smooth turning',
  'Object highlights and subtitles',
  'Comfort vignette',
  'Pause menu, restart, progress indicator, and achievement badge',
  'Cinematic fades, camera fly-throughs, zooms, and portal transitions',
] as const;

export const DIGESTIVE_IMMERSION_REQUIREMENTS = [
  'The user travels inside the digestive system instead of watching floating models',
  'No student NPCs are present; only the user, AI teacher guide, digestive system, and interactive objects',
  'Every stage begins with a 5-8 second cinematic transition cue',
  'Mouth is an inside-mouth environment with gums, teeth, moving tongue, saliva, food, and particles',
  'Esophagus is a peristalsis tunnel that carries the bolus downward',
  'Stomach is a living chamber with contracting walls, bubbles, acid particles, steam, and chyme',
  'Small intestine is the largest walk-through scene with folds, villi, glowing nutrients, and pulsing blood vessels',
  'Quiz uses floating holographic cards with green success, particles, applause, explanation, and retry',
] as const;

export const DIGESTIVE_PERFORMANCE_TARGETS = [
  'Target Meta Quest 3S at 72-90 FPS',
  'Use LOD-friendly procedural educational assets',
  'Use GPU-instanced repeated particles and folds where possible',
  'Prefer baked-style soft lighting and avoid expensive real-time shadow passes',
  'Use fog and occlusion-aware staging to limit visible scene complexity',
] as const;

export const DIGESTIVE_EDUCATIONAL_OBJECTIVES = [
  'Identify the organs of the digestive system',
  'Explain the food journey from mouth to anus',
  'Describe the function of each major organ',
  'Understand nutrient and water absorption',
  'Recognize healthy habits that support digestion',
] as const;

export const DIGESTIVE_HEALTHY_SORT_ACTIONS = [
  'sort-apple-healthy',
  'sort-pizza-unhealthy',
  'sort-milk-healthy',
  'sort-chips-unhealthy',
  'sort-banana-healthy',
  'sort-burger-unhealthy',
  'sort-water-healthy',
  'sort-soft-drink-unhealthy',
] as const;

export const DIGESTIVE_STAGES: readonly DigestiveStage[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Human Body',
    subtitle: 'Meet the digestive system - the body team that turns food into fuel.',
    instruction: 'Select Start Journey to reveal the path food follows.',
    durationSeconds: 50,
    environment: 'Futuristic classroom with a glowing human body on the smart board.',
    teacherNarration: 'Hello students! Today we are going on an exciting journey inside the human body to discover how food gives us energy.',
    interactionPrompt: 'Look around the classroom, find the glowing body model, and start the journey.',
    cinematicTransition: 'Science room lights dim, digestive hologram grows, and a glowing shrink portal opens toward the mouth.',
    visualTreatment: 'Modern science room with floating holograms, animated lighting, lab equipment, and no student NPCs.',
    spatialAudioProfile: 'Soft science-room ambience, low synth bed, smart-board hum, and portal swell.',
    soundCues: ['soft science-room ambience', 'smart board power-up', 'portal swell'],
    requiredActionIds: ['start-journey'],
  },
  {
    id: 'mouth',
    title: 'The Mouth',
    subtitle: 'Teeth break food down, the tongue moves it, and saliva helps form a soft bolus.',
    instruction: 'Place a food piece into the mouth and watch chewing begin.',
    durationSeconds: 60,
    environment: 'Giant mouth model with teeth, tongue, saliva, and an apple ready to chew.',
    teacherNarration: 'Our journey starts in the mouth. Incisors cut food, canines tear it, and molars grind it into smaller pieces. Saliva mixes with the food so it becomes a soft ball called a bolus.',
    interactionPrompt: 'Pick the food, place it on the tongue, and watch the teeth and saliva work together.',
    cinematicTransition: 'Camera flies through the portal, shrinks down, and glides between teeth into the warm mouth chamber.',
    visualTreatment: 'Inside-mouth environment with gum walls, surrounding teeth, moving tongue, flowing saliva, falling food, jaw motion, and particles.',
    spatialAudioProfile: 'Chewing, saliva flow, soft breathing, jaw motion, and warm close-up mouth ambience.',
    soundCues: ['chewing sounds', 'saliva sparkle', 'teacher praise chime'],
    requiredActionIds: ['place-food'],
  },
  {
    id: 'esophagus',
    title: 'Food Pipe (Esophagus)',
    subtitle: 'Wave-like muscle squeezes called peristalsis push the bolus downward.',
    instruction: 'Trigger the three muscle waves from top to bottom.',
    durationSeconds: 45,
    environment: 'Transparent esophagus tunnel with a moving bolus and glowing muscle rings.',
    teacherNarration: 'Now the bolus enters the esophagus, also called the food pipe. It does not simply fall down. Muscles squeeze in waves, called peristalsis, to push food safely toward the stomach.',
    interactionPrompt: 'Press each glowing muscle ring from top to bottom to operate peristalsis.',
    cinematicTransition: 'A glowing arrow pulls forward and the camera eases behind the bolus into the esophagus tunnel.',
    visualTreatment: 'Living esophagus tunnel with contracting walls, drifting particles, bolus tracking, and pulsing muscle highlights.',
    spatialAudioProfile: 'Heartbeat ambience, muscle contraction pulses, and tube whoosh following the bolus.',
    soundCues: ['muscle squeeze pulse', 'soft whoosh through tube'],
    requiredActionIds: [
      'peristalsis-wave-1',
      'peristalsis-wave-2',
      'peristalsis-wave-3',
    ],
  },
  {
    id: 'stomach',
    title: 'The Stomach',
    subtitle: 'The stomach stores food and churns it with digestive juices to make chyme.',
    instruction: 'Turn the virtual mixer three times to churn the food.',
    durationSeconds: 75,
    environment: 'Animated stomach chamber with gastric juice bubbles, HCl labels, enzymes, and chyme.',
    teacherNarration: 'The stomach is like a strong mixing bag. It churns food with gastric juices. Hydrochloric acid helps kill germs, enzymes begin breaking food down, and the mixture becomes a thick liquid called chyme.',
    interactionPrompt: 'Rotate the mixer wheel to start churning and watch bubbles appear in the stomach.',
    cinematicTransition: 'The tunnel opens into a large stomach chamber as fog and acid particles rise around the learner.',
    visualTreatment: 'Alive stomach chamber with contracting walls, rotating food, bubbling digestive juices, acid particles, steam, and chyme.',
    spatialAudioProfile: 'Acid bubbling, liquid churn, enzyme wheel resonance, and low stomach rumble.',
    soundCues: ['bubbling gastric juice', 'slow mixer wheel', 'liquid churn'],
    requiredActionIds: ['mixer-turn-1', 'mixer-turn-2', 'mixer-turn-3'],
  },
  {
    id: 'supporting-organs',
    title: 'Liver, Gallbladder & Pancreas',
    subtitle: 'These helper organs add bile and digestive juices to the food journey.',
    instruction: 'Inspect all three glowing organs to discover their jobs.',
    durationSeconds: 70,
    environment: 'Three glowing helper organs beside the stomach with touch-to-activate labels.',
    teacherNarration: 'The liver, gallbladder, and pancreas help digestion even though food does not travel through all of them. The liver makes bile, the gallbladder stores bile, and the pancreas sends helpful digestive juices.',
    interactionPrompt: 'Touch the liver, gallbladder, and pancreas to activate each explanation.',
    cinematicTransition: 'Camera drifts from the stomach chamber into a helper-organ bay where each organ glows as the teacher points.',
    visualTreatment: 'Digestive chamber with liver, gallbladder, and pancreas embedded in the scene; bile and enzyme streams merge into digestion.',
    spatialAudioProfile: 'Organ glow hum, bile stream, enzyme release, and subtle teacher-positioned narration.',
    soundCues: ['organ glow hum', 'bile release chime', 'pancreas sparkle'],
    requiredActionIds: ['inspect-liver', 'inspect-gallbladder', 'inspect-pancreas'],
  },
  {
    id: 'small-intestine',
    title: 'The Small Intestine',
    subtitle: 'Digestion finishes here. Tiny villi move nutrients into the blood.',
    instruction: 'Move all three glowing nutrients into the blood vessel.',
    durationSeconds: 90,
    environment: 'Coiled small intestine with villi, nutrient particles, and a nearby blood vessel.',
    teacherNarration: 'Most nutrient absorption happens in the small intestine. Tiny finger-like villi take useful nutrients from digested food and move them into the blood, which carries energy and building materials around the body.',
    interactionPrompt: 'Drag protein, sugar, and vitamin particles through the villi into the blood vessel.',
    cinematicTransition: 'Camera flies through a soft fold and opens into the largest walk-through villi environment.',
    visualTreatment: 'largest walk-through scene with giant intestinal folds, surrounding villi, glowing nutrients, pulsing blood vessels, and particles travelling away in the blood.',
    spatialAudioProfile: 'Blood flow, soft intestinal ambience, nutrient sparkle, and distant body pulse.',
    soundCues: ['gentle blood flow', 'nutrient sparkle', 'success chime'],
    requiredActionIds: ['absorb-nutrient-1', 'absorb-nutrient-2', 'absorb-nutrient-3'],
  },
  {
    id: 'large-intestine',
    title: 'The Large Intestine',
    subtitle: 'The large intestine absorbs water and the remaining material becomes solid waste.',
    instruction: 'Move all three water droplets back into the body.',
    durationSeconds: 55,
    environment: 'Large intestine tunnel with water droplets leaving the remaining waste.',
    teacherNarration: 'The large intestine absorbs water from what is left. As water returns to the body, the remaining material becomes more solid and is prepared as waste.',
    interactionPrompt: 'Collect each glowing water droplet to show water absorption.',
    cinematicTransition: 'A cooler blue-lit tunnel guides the camera into the wider large intestine environment.',
    visualTreatment: 'Distinct large-intestine chamber with glowing blue water particles and waste becoming gradually solid.',
    spatialAudioProfile: 'Water droplets, low tunnel ambience, and slower body resonance.',
    soundCues: ['water droplet plink', 'soft tunnel ambience'],
    requiredActionIds: ['absorb-water-1', 'absorb-water-2', 'absorb-water-3'],
  },
  {
    id: 'rectum-anus',
    title: 'Rectum & Anus',
    subtitle: 'Waste is stored briefly in the rectum, then leaves the body through the anus.',
    instruction: 'Follow the final glowing pathway to complete digestion.',
    durationSeconds: 35,
    environment: 'Simple final pathway showing storage in the rectum and removal through the anus.',
    teacherNarration: 'At the end of digestion, waste is stored for a short time in the rectum. Then it leaves the body through the anus. This is the body finishing the food journey.',
    interactionPrompt: 'Watch the final arrow and trace the last part of the pathway.',
    cinematicTransition: 'A gentle fade carries the camera through the final pathway without a sudden jump.',
    visualTreatment: 'Minimal, respectful final pathway with a clear storage-and-exit animation.',
    spatialAudioProfile: 'Soft completion tone, subtle body ambience, and calm teacher narration.',
    soundCues: ['soft completion tone', 'pathway glow'],
    requiredActionIds: [],
  },
  {
    id: 'healthy-habits',
    title: 'Healthy Digestion Habits',
    subtitle: 'Food choices and daily habits help the digestive system work well.',
    instruction: 'Sort apple, pizza, milk, chips, banana, burger, water, and soft drink into the correct baskets.',
    durationSeconds: 60,
    environment: 'Classroom sorting table with healthy and limit-often baskets.',
    teacherNarration: 'Healthy digestion needs balanced choices. Foods like apple, banana, milk, and water help the body. Pizza, chips, burger, and soft drink are sometimes foods, so we limit them and choose them less often.',
    interactionPrompt: 'Move each food card to the healthy basket or the limit-often basket.',
    cinematicTransition: 'The body journey dissolves back into a clean futuristic science room and a virtual sorting table appears.',
    visualTreatment: 'Clean holographic sorting table with food cards, baskets, celebration particles, and teacher praise.',
    spatialAudioProfile: 'Light classroom music, food-card pickup, basket drop, and celebration particles.',
    soundCues: ['food card pickup', 'basket drop', 'teacher praise'],
    requiredActionIds: DIGESTIVE_HEALTHY_SORT_ACTIONS,
  },
  {
    id: 'recap',
    title: 'Recap Quiz',
    subtitle: 'Show what you know, then collect your Digestive Explorer badge.',
    instruction: 'Answer all five questions to finish your journey.',
    durationSeconds: 60,
    environment: 'Smart board quiz with green lights, stars, applause, and the Digestive Explorer badge.',
    teacherNarration: 'You have travelled with food through the digestive system. Now answer five quick questions. Correct answers earn green lights, stars, applause, and your Digestive Explorer badge.',
    interactionPrompt: 'Choose the best answer for each question on the quiz board.',
    cinematicTransition: 'Floating holographic quiz cards assemble around the user with the teacher facing the player.',
    visualTreatment: 'Holographic quiz cards with answer glow, green success particles, applause, teacher explanation, retry, and badge reveal.',
    spatialAudioProfile: 'Button click, success chime, applause, explanation cue, and badge fanfare.',
    soundCues: ['button click', 'green light chime', 'applause', 'badge fanfare'],
    requiredActionIds: [],
  },
] as const;

export const DIGESTIVE_QUIZ_QUESTIONS: readonly DigestiveQuizQuestion[] = [
  {
    id: 'digestion-begins',
    prompt: 'Where does digestion begin?',
    options: [
      { id: 'mouth', label: 'Mouth' },
      { id: 'stomach', label: 'Stomach' },
      { id: 'small-intestine', label: 'Small intestine' },
    ],
    correctAnswerId: 'mouth',
    explanation: 'Digestion begins in the mouth when chewing and saliva start breaking food down.',
  },
  {
    id: 'mixes-food',
    prompt: 'Which organ stores and mixes food with digestive juices?',
    options: [
      { id: 'liver', label: 'Liver' },
      { id: 'stomach', label: 'Stomach' },
      { id: 'large-intestine', label: 'Large intestine' },
    ],
    correctAnswerId: 'stomach',
    explanation: 'The stomach churns food with digestive juices to form chyme.',
  },
  {
    id: 'absorbs-nutrients',
    prompt: 'Which organ absorbs most nutrients?',
    options: [
      { id: 'esophagus', label: 'Esophagus' },
      { id: 'small-intestine', label: 'Small intestine' },
      { id: 'rectum', label: 'Rectum' },
    ],
    correctAnswerId: 'small-intestine',
    explanation: 'Villi in the small intestine absorb nutrients and move them into the blood.',
  },
  {
    id: 'absorbs-water',
    prompt: 'Which organ absorbs water from the remaining food?',
    options: [
      { id: 'large-intestine', label: 'Large intestine' },
      { id: 'mouth', label: 'Mouth' },
      { id: 'pancreas', label: 'Pancreas' },
    ],
    correctAnswerId: 'large-intestine',
    explanation: 'The large intestine absorbs water before the remaining material becomes waste.',
  },
  {
    id: 'produces-bile',
    prompt: 'Which organ produces bile?',
    options: [
      { id: 'gallbladder', label: 'Gallbladder' },
      { id: 'liver', label: 'Liver' },
      { id: 'stomach', label: 'Stomach' },
    ],
    correctAnswerId: 'liver',
    explanation: 'The liver produces bile. The gallbladder stores and releases it.',
  },
] as const;

const stagesById = new Map(DIGESTIVE_STAGES.map(stage => [stage.id, stage]));
const questionsById = new Map(DIGESTIVE_QUIZ_QUESTIONS.map(question => [question.id, question]));

export function createDigestiveProgress(): DigestiveProgress {
  return {
    completedActions: {},
    quizAnswers: {},
  };
}

export function recordStageAction(
  progress: DigestiveProgress,
  stageId: DigestiveStageId,
  actionId: string,
): DigestiveProgress {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown digestive lesson stage: ${stageId}`);
  if (!stage.requiredActionIds.includes(actionId)) {
    throw new Error(`Action "${actionId}" is not valid for stage "${stageId}"`);
  }

  const completed = progress.completedActions[stageId] ?? [];
  if (completed.includes(actionId)) return progress;

  return {
    ...progress,
    completedActions: {
      ...progress.completedActions,
      [stageId]: [...completed, actionId],
    },
  };
}

export function isStageComplete(
  progress: DigestiveProgress,
  stageId: DigestiveStageId,
): boolean {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown digestive lesson stage: ${stageId}`);
  const completed = progress.completedActions[stageId] ?? [];
  return stage.requiredActionIds.every(actionId => completed.includes(actionId));
}

export function answerQuizQuestion(
  progress: DigestiveProgress,
  questionId: string,
  answerId: string,
): DigestiveProgress {
  const question = questionsById.get(questionId);
  if (!question) throw new Error(`Unknown digestive quiz question: ${questionId}`);
  if (!question.options.some(option => option.id === answerId)) {
    throw new Error(`Unknown answer "${answerId}" for question "${questionId}"`);
  }

  return {
    ...progress,
    quizAnswers: {
      ...progress.quizAnswers,
      [questionId]: answerId,
    },
  };
}

export function getQuizScore(progress: DigestiveProgress) {
  return {
    correct: DIGESTIVE_QUIZ_QUESTIONS.filter(
      question => progress.quizAnswers[question.id] === question.correctAnswerId,
    ).length,
    total: DIGESTIVE_QUIZ_QUESTIONS.length,
  };
}

export function hasDigestiveExplorerBadge(progress: DigestiveProgress): boolean {
  const stagesComplete = DIGESTIVE_STAGES.every(stage => isStageComplete(progress, stage.id));
  const quizComplete = DIGESTIVE_QUIZ_QUESTIONS.every(
    question => Boolean(progress.quizAnswers[question.id]),
  );
  return stagesComplete && quizComplete;
}
