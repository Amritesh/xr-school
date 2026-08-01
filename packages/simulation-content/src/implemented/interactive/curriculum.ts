import type {
  CurriculumChapterRecord,
  LearningConceptRecord,
  Subject,
} from '@xr-school/simulation-schema';

function interactiveConcept(input: {
  id: string;
  name: string;
  aliases: string[];
  subject?: Subject;
  description: string;
  misconception: string;
  relevance: string;
  keywords: string[];
  related?: string[];
}): LearningConceptRecord {
  return {
    id: input.id,
    canonicalName: input.name,
    aliases: input.aliases,
    subject: input.subject ?? 'science',
    description: input.description,
    prerequisiteConceptIds: [],
    relatedConceptIds: input.related ?? [],
    commonMisconceptions: [input.misconception],
    practicalRelevance: input.relevance,
    searchKeywords: input.keywords,
  };
}

export const INTERACTIVE_LEARNING_CONCEPTS: LearningConceptRecord[] = [
  interactiveConcept({
    id: 'concept-buoyancy',
    name: 'Buoyant support',
    aliases: ['upthrust', 'water support'],
    subject: 'physics',
    description: 'Water exerts an upward force related to the volume an object displaces.',
    misconception: 'Water supports an object only when that object is small.',
    relevance: 'Explains boats, life jackets, floating containers, and submerged objects.',
    keywords: ['buoyancy', 'upthrust', 'water', 'float', 'support'],
    related: ['concept-density', 'concept-displacement'],
  }),
  interactiveConcept({
    id: 'concept-density',
    name: 'Average density',
    aliases: ['mass per volume', 'compactness of matter'],
    subject: 'physics',
    description: 'Average density compares mass with total occupied volume, including enclosed air.',
    misconception: 'A heavier object must always be denser than every lighter object.',
    relevance: 'Supports comparison of solid objects, hollow containers, and material choices.',
    keywords: ['density', 'mass', 'volume', 'material', 'trapped air'],
    related: ['concept-buoyancy', 'concept-displacement'],
  }),
  interactiveConcept({
    id: 'concept-displacement',
    name: 'Water displacement',
    aliases: ['displaced water', 'occupied water volume'],
    subject: 'physics',
    description: 'An immersed object moves aside a volume of water, which determines possible buoyant support.',
    misconception: 'Changing shape cannot change how much water the same material displaces.',
    relevance: 'Connects foil boats, hull shapes, measuring cans, and volume experiments.',
    keywords: ['displacement', 'volume', 'waterline', 'boat', 'shape'],
    related: ['concept-buoyancy', 'concept-density'],
  }),
  interactiveConcept({
    id: 'concept-lipids',
    name: 'Lipids in food',
    aliases: ['food fats', 'oils in food'],
    subject: 'biology',
    description: 'Lipids are food components that can leave a persistent translucent patch in a comparative paper test.',
    misconception: 'A darker paper patch gives an exact measurement of lipid quantity.',
    relevance: 'Supports evidence-based food comparison and balanced-diet discussions.',
    keywords: ['lipid', 'fat', 'oil', 'food', 'translucent patch'],
    related: ['concept-food-tests', 'concept-balanced-diet'],
  }),
  interactiveConcept({
    id: 'concept-food-tests',
    name: 'Qualitative food tests',
    aliases: ['food-component test', 'paper lipid test'],
    subject: 'biology',
    description: 'A qualitative food test uses a controlled procedure and visible evidence to support a component conclusion.',
    misconception: 'Any wet mark on paper is positive lipid evidence.',
    relevance: 'Builds practical-lab habits around controls, observations, and cautious conclusions.',
    keywords: ['food test', 'evidence', 'paper', 'drying', 'observation'],
    related: ['concept-lipids', 'concept-fair-comparison'],
  }),
  interactiveConcept({
    id: 'concept-fair-comparison',
    name: 'Fair comparison',
    aliases: ['fair test', 'controlled comparison'],
    description: 'A fair comparison changes the intended factor while keeping relevant conditions equivalent.',
    misconception: 'Results can be compared even when sample amount or procedure changes arbitrarily.',
    relevance: 'Applies across school investigations, product comparisons, and everyday evidence claims.',
    keywords: ['fair test', 'control', 'same amount', 'procedure', 'comparison'],
    related: ['concept-food-tests', 'concept-mixture-observation'],
  }),
  interactiveConcept({
    id: 'concept-vitamins',
    name: 'Vitamins and representative sources',
    aliases: ['vitamin sources', 'micronutrients'],
    subject: 'biology',
    description: 'Different vitamins have distinct body roles and multiple representative food sources or exposures.',
    misconception: 'All vitamins perform the same body function.',
    relevance: 'Supports varied meal planning without turning a lesson into medical advice.',
    keywords: ['vitamin', 'source', 'food', 'body role', 'micronutrient'],
    related: ['concept-deficiency-diseases', 'concept-balanced-diet'],
  }),
  interactiveConcept({
    id: 'concept-deficiency-diseases',
    name: 'Long-term nutrient deficiency',
    aliases: ['deficiency conditions', 'sustained nutrient lack'],
    subject: 'biology',
    description: 'Characteristic deficiency conditions are associated with sustained inadequate intake or availability, not one missed serving.',
    misconception: 'Missing one serving immediately causes a deficiency disease.',
    relevance: 'Helps learners interpret textbook examples responsibly and seek qualified care for health concerns.',
    keywords: ['deficiency', 'long-term', 'scurvy', 'rickets', 'beriberi'],
    related: ['concept-vitamins', 'concept-balanced-diet'],
  }),
  interactiveConcept({
    id: 'concept-balanced-diet',
    name: 'Balanced and varied diet',
    aliases: ['diet variety', 'balanced meals'],
    subject: 'biology',
    description: 'A varied diet combines food groups and nutrient sources rather than relying on a single food.',
    misconception: 'One food can supply every nutrient in the required pattern.',
    relevance: 'Supports age-appropriate meal comparison and food-source reasoning.',
    keywords: ['balanced diet', 'variety', 'meal', 'nutrient', 'food group'],
    related: ['concept-vitamins', 'concept-minerals', 'concept-lipids'],
  }),
  interactiveConcept({
    id: 'concept-minerals',
    name: 'Minerals in food',
    aliases: ['dietary minerals', 'mineral sources'],
    subject: 'biology',
    description: 'Calcium, iodine, iron, and other minerals have distinct roles and multiple dietary sources.',
    misconception: 'Minerals are needed only for bones and teeth.',
    relevance: 'Connects diverse foods to growth, thyroid function, blood, bones, and teeth.',
    keywords: ['mineral', 'calcium', 'iodine', 'iron', 'food source'],
    related: ['concept-haemoglobin', 'concept-balanced-diet'],
  }),
  interactiveConcept({
    id: 'concept-haemoglobin',
    name: 'Iron and haemoglobin',
    aliases: ['iron body role', 'red blood cells'],
    subject: 'biology',
    description: 'Iron is required to make haemoglobin, which helps red blood cells carry oxygen.',
    misconception: 'Iron in food acts as a visible metal piece inside blood.',
    relevance: 'Explains why representative iron sources belong in a varied diet.',
    keywords: ['iron', 'haemoglobin', 'oxygen', 'blood', 'red blood cell'],
    related: ['concept-minerals'],
  }),
  interactiveConcept({
    id: 'concept-material-properties',
    name: 'Observable material properties',
    aliases: ['properties of objects', 'material and shape'],
    description: 'Objects can be compared using distinct observable properties such as material, shape, texture, and hardness.',
    misconception: 'Material and shape are the same property.',
    relevance: 'Supports systematic classification of classroom and household objects.',
    keywords: ['material', 'property', 'shape', 'texture', 'classification'],
    related: ['concept-three-dimensional-shapes', 'concept-classification'],
  }),
  interactiveConcept({
    id: 'concept-three-dimensional-shapes',
    name: 'Three-dimensional shapes',
    aliases: ['solid shapes', '3D forms'],
    subject: 'mathematics',
    description: 'Spheres, cylinders, cuboids, and cones can be distinguished by faces, curved surfaces, edges, and points.',
    misconception: 'An object’s material determines its three-dimensional shape.',
    relevance: 'Connects geometric vocabulary to packages, tools, toys, and buildings.',
    keywords: ['sphere', 'cylinder', 'cuboid', 'cone', '3D shape'],
    related: ['concept-material-properties', 'concept-classification'],
  }),
  interactiveConcept({
    id: 'concept-classification',
    name: 'Evidence-based classification',
    aliases: ['sorting by properties', 'grouping objects'],
    description: 'Classification groups items by a stated observable rule and supports each placement with evidence.',
    misconception: 'An item can be placed by appearance without naming the classification rule.',
    relevance: 'Builds reusable reasoning for science collections, geometry, and data organization.',
    keywords: ['classify', 'sort', 'group', 'evidence', 'rule'],
    related: ['concept-material-properties', 'concept-three-dimensional-shapes'],
  }),
];

export const INTERACTIVE_CURRICULUM_CHAPTERS: CurriculumChapterRecord[] = [
  {
    id: 'chapter-cbse-c6-components-of-food',
    courseId: 'course-cbse-c6-science',
    chapterNumber: 2,
    title: 'Components of Food',
    topicIds: ['topic-food-components'],
    conceptIds: [
      'concept-lipids',
      'concept-food-tests',
      'concept-fair-comparison',
      'concept-vitamins',
      'concept-deficiency-diseases',
      'concept-balanced-diet',
      'concept-minerals',
      'concept-haemoglobin',
    ],
    simulationIds: [
      'sim-c06-ch02-a03-test-the-presence-of-lipids',
      'sim-c06-ch02-a04-the-sources-of-vitamins-and-their-deficiencies',
      'sim-c06-ch02-a05-the-sources-of-minerals-in-food',
    ],
  },
  {
    id: 'chapter-cbse-c6-sorting-materials-groups',
    courseId: 'course-cbse-c6-science',
    chapterNumber: 4,
    title: 'Sorting Materials into Groups',
    topicIds: ['topic-sorting-materials'],
    conceptIds: [
      'concept-material-properties',
      'concept-three-dimensional-shapes',
      'concept-classification',
    ],
    simulationIds: [
      'sim-c06-ch04-a01-sorting-materials-according-to-their-shape',
    ],
  },
];

export const INTERACTIVE_CLASS6_CHAPTER_IDS = INTERACTIVE_CURRICULUM_CHAPTERS.map(
  chapter => chapter.id,
);
export const INTERACTIVE_CLASS6_CONCEPT_IDS = INTERACTIVE_LEARNING_CONCEPTS
  .filter(concept => !['concept-buoyancy', 'concept-density', 'concept-displacement'].includes(concept.id))
  .map(concept => concept.id);
export const INTERACTIVE_CLASS6_SIMULATION_IDS = INTERACTIVE_CURRICULUM_CHAPTERS.flatMap(
  chapter => chapter.simulationIds,
);
