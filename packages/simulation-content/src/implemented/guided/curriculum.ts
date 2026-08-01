import type {
  CurriculumChapterRecord,
  LearningConceptRecord,
  Subject,
} from '@xr-school/simulation-schema';

function guidedConcept(input: {
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
  if (input.keywords.length < 4) {
    throw new Error(`${input.id}: at least four search keywords are required`);
  }
  return {
    id: input.id,
    canonicalName: input.name,
    aliases: input.aliases,
    subject: input.subject ?? 'environmentalScience',
    description: input.description,
    prerequisiteConceptIds: [],
    relatedConceptIds: input.related ?? [],
    commonMisconceptions: [input.misconception],
    practicalRelevance: input.relevance,
    searchKeywords: input.keywords,
  };
}

export const GUIDED_LEARNING_CONCEPTS: LearningConceptRecord[] = [
  guidedConcept({
    id: 'concept-food-spoilage',
    name: 'Food spoilage and preservation',
    aliases: ['mango spoilage', 'slowing food spoilage'],
    description: 'Microorganisms, warmth, air, and moisture change food over time, while cold, covering, and salt can slow those changes.',
    misconception: 'Salt and cold reverse spoilage and make spoiled food fresh again.',
    relevance: 'Supports safe storage of cut fruit and recognition of food that must be discarded.',
    keywords: ['spoilage', 'mould', 'refrigeration', 'salt', 'food safety'],
    related: ['concept-milk-spoilage', 'concept-sun-drying-preservation'],
  }),
  guidedConcept({
    id: 'concept-milk-spoilage',
    name: 'Milk spoilage and safe storage',
    aliases: ['souring milk', 'milk storage'],
    description: 'Microbial activity can sour milk, form curds and whey, and produce gas at rates affected by heat, exposure, boiling, and refrigeration.',
    misconception: 'Refrigeration removes every microorganism forever.',
    relevance: 'Distinguishes accidental spoilage from hygienic curd-making and supports safe milk handling.',
    keywords: ['milk', 'microorganisms', 'curds', 'whey', 'refrigeration'],
    related: ['concept-food-spoilage'],
  }),
  guidedConcept({
    id: 'concept-sun-drying-preservation',
    name: 'Sun drying for preservation',
    aliases: ['aam papad drying', 'moisture removal'],
    description: 'Thin protected layers lose moisture more evenly, and sufficiently dried food can then be stored in a clean dry container.',
    misconception: 'Sugar instantly removes all water and microorganisms from a thick wet layer.',
    relevance: 'Connects hygienic preparation, surface area, drying time, and safe storage of preserved foods.',
    keywords: ['sun drying', 'aam papad', 'moisture', 'thin layer', 'storage'],
    related: ['concept-food-spoilage'],
  }),
  guidedConcept({
    id: 'concept-carnivorous-plant-nutrition',
    name: 'Carnivorous plant nutrition',
    aliases: ['pitcher plant nutrition', 'insect-eating plants'],
    description: 'A pitcher is a modified leaf that traps insects to obtain mineral nutrients while green tissue continues photosynthesis.',
    misconception: 'An insect replaces photosynthesis as the pitcher plant’s energy source.',
    relevance: 'Explains how plants adapt to mineral-poor habitats without becoming animals.',
    keywords: ['pitcher plant', 'modified leaf', 'nitrogen', 'photosynthesis', 'nectar'],
  }),
  guidedConcept({
    id: 'concept-seed-dispersal',
    name: 'Seed dispersal adaptations',
    aliases: ['seed travel', 'wind water animal dispersal'],
    description: 'Seed structures suit movement by wind, water, animals, or explosive pods and help offspring avoid crowding.',
    misconception: 'A seed decides where an animal carries it.',
    relevance: 'Supports identification of dispersal adaptations in local plants and crops.',
    keywords: ['seed', 'wind', 'water', 'burr', 'fruit', 'pod'],
  }),
  guidedConcept({
    id: 'concept-rainwater-harvesting',
    name: 'Rainwater harvesting system',
    aliases: ['roof-water collection', 'rainwater storage'],
    description: 'A safe collection sequence uses catchment, gutter, first flush, filter, covered storage, and reuse appropriate to water quality.',
    misconception: 'Gravel-and-sand filtration automatically makes roof runoff drinkable.',
    relevance: 'Helps learners inspect household and school water-saving systems without overstating potability.',
    keywords: ['rainwater', 'catchment', 'first flush', 'filter', 'covered tank'],
    related: ['concept-stepwell-water-storage'],
  }),
  guidedConcept({
    id: 'concept-stepwell-water-storage',
    name: 'Stepwell water storage',
    aliases: ['baoli structure', 'step well'],
    description: 'Steps, landings, shade, catchment, groundwater, and a deep reservoir preserve access as stored-water level changes.',
    misconception: 'The stairs move the reservoir water level up and down.',
    relevance: 'Connects historic architecture with water access, conservation, and community responsibility.',
    keywords: ['stepwell', 'steps', 'groundwater', 'reservoir', 'shade'],
    related: ['concept-rainwater-harvesting', 'concept-historical-evidence'],
  }),
  guidedConcept({
    id: 'concept-density-and-buoyancy',
    name: 'Density and buoyant support',
    aliases: ['salt-water floating', 'Dead Sea buoyancy'],
    description: 'Dissolved salt raises water density, increasing buoyant support for the same displaced volume without changing object weight.',
    misconception: 'Salt removes some of a floating object’s weight.',
    relevance: 'Explains why an egg or swimmer floats higher in denser liquid while gravity still acts.',
    keywords: ['density', 'buoyancy', 'salt water', 'floating', 'Dead Sea'],
    related: ['concept-solubility'],
  }),
  guidedConcept({
    id: 'concept-malaria-diagnosis',
    name: 'Evidence-based malaria diagnosis',
    aliases: ['malaria testing', 'blood film and RDT'],
    description: 'Symptoms and exposure are clues; trained health workers confirm malaria with microscopy or a valid rapid diagnostic test.',
    misconception: 'Fever and chills alone confirm malaria.',
    relevance: 'Promotes professional testing and care rather than self-diagnosis or self-medication.',
    keywords: ['malaria', 'microscopy', 'blood film', 'RDT', 'professional care'],
    related: ['concept-mosquito-life-cycle'],
  }),
  guidedConcept({
    id: 'concept-mosquito-life-cycle',
    name: 'Anopheles mosquito life cycle',
    aliases: ['egg larva pupa adult', 'malaria mosquito'],
    description: 'Anopheles mosquitoes develop through egg, larva, pupa, and adult stages, with safe prevention focused on breeding water and barriers.',
    misconception: 'Every male and female mosquito carries malaria from birth.',
    relevance: 'Supports household container care, covered water, nets, screens, and community action.',
    keywords: ['Anopheles', 'egg', 'larva', 'pupa', 'adult', 'prevention'],
    related: ['concept-malaria-diagnosis'],
  }),
  guidedConcept({
    id: 'concept-protected-river-crossing',
    name: 'Protected river-crossing systems',
    aliases: ['supervised rope crossing', 'river safety model'],
    description: 'Checked anchors, harness, sling, rope technique, calm movement, recovery, and teamwork form one supervised protection system.',
    misconception: 'Courage means ignoring current and moving without protection.',
    relevance: 'Shows why real crossings require qualified experts, approved equipment, and site assessment.',
    keywords: ['river', 'anchor', 'harness', 'sling', 'supervision'],
    related: ['concept-protected-rock-climbing'],
  }),
  guidedConcept({
    id: 'concept-protected-rock-climbing',
    name: 'Protected rock-climbing systems',
    aliases: ['climbing safety model', 'top-rope protection'],
    description: 'Route observation, checked equipment, three-point movement, slip protection, posture, and controlled rappelling work as a supervised system.',
    misconception: 'A helmet alone holds a climber during a slip.',
    relevance: 'Distinguishes a stationary learning model from real climbing instruction.',
    keywords: ['climbing', 'belay', 'harness', 'three points', 'rappel'],
    related: ['concept-protected-river-crossing', 'concept-snow-mountain-safety'],
  }),
  guidedConcept({
    id: 'concept-cold-weather-camping',
    name: 'Cold-weather camping decisions',
    aliases: ['snow camp', 'tent insulation'],
    description: 'Tent layers, still air, anchoring, drainage, supervised cooking, waste removal, and sleeping bags reduce cold-camp risk.',
    misconception: 'Tent layers and feathers create heat rather than slow heat loss.',
    relevance: 'Connects insulation and leave-no-trace principles with expert site and weather decisions.',
    keywords: ['snow camp', 'insulation', 'tent', 'drainage', 'sleeping bag'],
    related: ['concept-snow-mountain-safety'],
  }),
  guidedConcept({
    id: 'concept-snow-mountain-safety',
    name: 'Snow-mountain turnaround decisions',
    aliases: ['mountain group safety', 'fixed-rope practice'],
    description: 'Route, equipment, group pacing, balanced steps, supervised rope practice, recovery, and early turnaround are linked safety decisions.',
    misconception: 'A fixed rope guarantees safety or permission to climb alone.',
    relevance: 'Explains why groups turn back before weather, visibility, time, or energy become unsafe.',
    keywords: ['snow mountain', 'fixed rope', 'turnaround', 'group pace', 'weather'],
    related: ['concept-cold-weather-camping', 'concept-protected-rock-climbing'],
  }),
  guidedConcept({
    id: 'concept-historical-evidence',
    name: 'Historical evidence and monument care',
    aliases: ['fort evidence', 'interpreting artefacts'],
    description: 'Buildings, maps, objects, paintings, records, water systems, and acoustics provide partial evidence that historians compare.',
    misconception: 'One broken object proves every detail of past daily life.',
    relevance: 'Supports careful interpretation and responsible behaviour at heritage sites.',
    keywords: ['fort', 'artefact', 'historian', 'architecture', 'monument care'],
    related: ['concept-stepwell-water-storage'],
  }),
  guidedConcept({
    id: 'concept-cotton-farming',
    name: 'Cotton farming sequence',
    aliases: ['cotton crop', 'boll development'],
    description: 'Cotton grows from spaced seed in prepared soil through seedling, flower, green boll, open boll, and careful harvest stages.',
    misconception: 'Cotton fibre is made from flower petals after picking.',
    relevance: 'Connects plant growth and farm work to the fibre that later reaches a gin.',
    keywords: ['cotton', 'black soil', 'seedling', 'flower', 'boll', 'harvest'],
    related: ['concept-cotton-ginning'],
  }),
  guidedConcept({
    id: 'concept-cotton-ginning',
    name: 'Cotton ginning',
    aliases: ['separating cotton fibre', 'cotton gin rollers'],
    subject: 'science',
    description: 'A guarded narrow roller gap lets soft cotton fibre pass while holding back larger seeds, producing two useful outputs.',
    misconception: 'Ginning rollers dissolve cotton seeds.',
    relevance: 'Links harvested cotton to clean fibre ready for spinning and separated seed.',
    keywords: ['cotton gin', 'roller', 'fibre', 'seed', 'spinning'],
    related: ['concept-cotton-farming'],
  }),
];

export const GUIDED_CURRICULUM_CHAPTERS: CurriculumChapterRecord[] = [
  {
    id: 'chapter-cbse-c5-mangoes-round-year',
    courseId: 'course-cbse-c5-environmental-science',
    chapterNumber: 4,
    title: 'Mangoes Round the Year',
    topicIds: ['topic-food-preservation'],
    conceptIds: ['concept-food-spoilage', 'concept-milk-spoilage', 'concept-sun-drying-preservation'],
    simulationIds: ['sim-c05-ch04-a01-food-spoilage', 'sim-c05-ch04-a02-milk-spoilage', 'sim-c05-ch04-a03-the-making-of-aam-papad'],
  },
  {
    id: 'chapter-cbse-c5-seeds-and-seeds',
    courseId: 'course-cbse-c5-environmental-science',
    chapterNumber: 5,
    title: 'Seeds and Seeds',
    topicIds: ['topic-plant-adaptations'],
    conceptIds: ['concept-carnivorous-plant-nutrition', 'concept-seed-dispersal'],
    simulationIds: ['sim-c05-ch05-a01-pitcher-plant-the-insect-hunter', 'sim-c05-ch05-a02-seed-dispersal'],
  },
  {
    id: 'chapter-cbse-c5-every-drop-counts',
    courseId: 'course-cbse-c5-environmental-science',
    chapterNumber: 6,
    title: 'Every Drop Counts',
    topicIds: ['topic-water-storage'],
    conceptIds: ['concept-rainwater-harvesting', 'concept-stepwell-water-storage'],
    simulationIds: ['sim-c05-ch06-a01-the-storage-of-rainwater', 'sim-c05-ch06-a02-a-step-well-structure'],
  },
  {
    id: 'chapter-cbse-c5-treat-for-mosquitoes',
    courseId: 'course-cbse-c5-environmental-science',
    chapterNumber: 8,
    title: 'A Treat for Mosquitoes',
    topicIds: ['topic-malaria-and-mosquitoes'],
    conceptIds: ['concept-malaria-diagnosis', 'concept-mosquito-life-cycle'],
    simulationIds: ['sim-c05-ch08-a01-diagnosis-of-malaria', 'sim-c05-ch08-a02-life-cycle-of-the-mosquito'],
  },
  {
    id: 'chapter-cbse-c5-up-you-go',
    courseId: 'course-cbse-c5-environmental-science',
    chapterNumber: 9,
    title: 'Up You Go!',
    topicIds: ['topic-supervised-adventure'],
    conceptIds: ['concept-protected-river-crossing', 'concept-protected-rock-climbing', 'concept-cold-weather-camping', 'concept-snow-mountain-safety'],
    simulationIds: ['sim-c05-ch09-a01-river-crossing-adventure', 'sim-c05-ch09-a02-rock-climbing', 'sim-c05-ch09-a03-camp-in-the-snow', 'sim-c05-ch09-a04-snow-mountain-climbing'],
  },
  {
    id: 'chapter-cbse-c5-walls-tell-stories',
    courseId: 'course-cbse-c5-environmental-science',
    chapterNumber: 10,
    title: 'Walls Tell Stories',
    topicIds: ['topic-historical-evidence'],
    conceptIds: ['concept-historical-evidence'],
    simulationIds: ['sim-c05-ch10-a01-a-visit-of-ancient-fort'],
  },
  {
    id: 'chapter-cbse-c6-fibre-to-fabric',
    courseId: 'course-cbse-c6-science',
    chapterNumber: 3,
    title: 'Fibre to Fabric',
    topicIds: ['topic-cotton-fibre'],
    conceptIds: ['concept-cotton-farming', 'concept-cotton-ginning'],
    simulationIds: ['sim-c06-ch03-a01-cotton-farming', 'sim-c06-ch03-a02-the-process-of-cotton-ginning'],
  },
];

export const GUIDED_CLASS5_CHAPTER_IDS = GUIDED_CURRICULUM_CHAPTERS
  .filter(chapter => chapter.courseId === 'course-cbse-c5-environmental-science')
  .map(chapter => chapter.id);
export const GUIDED_CLASS5_CONCEPT_IDS = GUIDED_LEARNING_CONCEPTS
  .filter(concept => !['concept-cotton-farming', 'concept-cotton-ginning'].includes(concept.id))
  .map(concept => concept.id);
export const GUIDED_CLASS5_SIMULATION_IDS = GUIDED_CURRICULUM_CHAPTERS
  .filter(chapter => chapter.courseId === 'course-cbse-c5-environmental-science')
  .flatMap(chapter => chapter.simulationIds);
export const GUIDED_CLASS6_CHAPTER_IDS = ['chapter-cbse-c6-fibre-to-fabric'];
export const GUIDED_CLASS6_CONCEPT_IDS = ['concept-cotton-farming', 'concept-cotton-ginning'];
export const GUIDED_CLASS6_SIMULATION_IDS = ['sim-c06-ch03-a01-cotton-farming', 'sim-c06-ch03-a02-the-process-of-cotton-ginning'];
