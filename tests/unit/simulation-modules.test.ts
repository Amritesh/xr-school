import { describe, it, expect } from 'vitest';

/**
 * Validates the simulation module seed data against the TypeSpec contract rules.
 * These run offline — no server needed.
 */

const VALID_XR_FIT_TYPES = ['strongVrFit', 'arTabletFit'];
const VALID_BOARDS = ['cbse', 'icse', 'stateBoard'];
const VALID_GRADE_BANDS = ['kindergarten', 'class1To2', 'class3To5', 'class6To8', 'class9To10', 'class11To12'];
const VALID_SUBJECTS = ['science', 'physics', 'chemistry', 'biology', 'mathematics', 'geography', 'history', 'environmentalScience', 'computerScience', 'vocationalSkills', 'careerExposure'];
const VALID_STATUSES = ['draft', 'approved', 'released', 'deprecated', 'archived'];
const VALID_COMFORT_RISKS = ['low', 'medium', 'high'];
const VALID_FORMATS = ['immersiveVr', 'threeSixtyVr', 'interactive3d', 'guidedVisualization', 'practicalLabSimulation', 'virtualFieldVisit', 'revisionMode'];
const VALID_EVIDENCE_LEVELS = ['experimental', 'expertDesigned', 'internallyPiloted', 'schoolValidated', 'researchBacked'];

// Simulation module definitions — must stay in sync with apps/api/src/index.ts
const SIMULATIONS = [
  {
    id: 'sim-up-you-go-snow-mountain-climbing-001',
    slug: 'up-you-go-snow-mountain-climbing',
    title: 'Snow Mountain Climbing',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive snow route makes route markers, stick placement, protected rope practice and group movement directly inspectable.',
    learningObjective: 'Students will sequence a supervised snow-mountain journey and explain how route assessment, equipment, balanced steps, protection, teamwork and a timely return support responsible participation.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-up-you-go-camp-in-snow-001',
    slug: 'up-you-go-camp-in-snow',
    title: 'Camp in the Snow',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive snow camp makes tent insulation, anchoring, drainage and slippery conditions directly inspectable.',
    learningObjective: 'Students will sequence a responsible snow-camp routine and explain how insulation, drainage, warmth, cleanliness and teamwork support the group.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-up-you-go-rock-climbing-001',
    slug: 'up-you-go-rock-climbing',
    title: 'Rock Climbing',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive training rock makes holds, posture, rope tension and a protected climb-and-rappel sequence directly inspectable.',
    learningObjective: 'Students will sequence a supervised rock climb and explain how observation, equipment, posture, secure holds and instructor-controlled rope support safe participation.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-up-you-go-river-crossing-adventure-001',
    slug: 'up-you-go-river-crossing-adventure',
    title: 'River Crossing Adventure',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive mountain river makes the supervised rope-crossing system and moving current directly inspectable.',
    learningObjective: 'Students will explain how anchors, a safety sling, careful movement, supervision and teamwork support a protected river crossing.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-treat-for-mosquitoes-mosquito-life-cycle-001',
    slug: 'treat-for-mosquitoes-mosquito-life-cycle',
    title: 'Life Cycle of the Mosquito',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive wetland enlarges the aquatic life stages and adult emergence for direct inspection.',
    learningObjective: 'Students will sequence the four mosquito life stages and identify aquatic stages and safe prevention actions.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-treat-for-mosquitoes-malaria-diagnosis-001',
    slug: 'treat-for-mosquitoes-malaria-diagnosis',
    title: 'Diagnosis of Malaria',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive laboratory enlarges microscopic cells and parasites while learners follow a safe diagnostic sequence.',
    learningObjective: 'Students will explain why symptoms cannot confirm malaria and sequence professional parasite-based diagnostic tests.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-experiments-with-water-float-or-sink-001',
    slug: 'experiments-with-water-float-or-sink',
    title: 'What Floats, What Sinks?',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive transparent tank makes floating and sinking paths visible while learners predict and test directly.',
    learningObjective: 'Students will classify tested objects as floating or sinking and explain how material, shape and trapped air affect the outcome.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-experiments-with-water-dead-sea-salt-water-001',
    slug: 'experiments-with-water-dead-sea-salt-water',
    title: 'Dead Sea: Salt Water and Its Effects',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive dual-tank experiment makes dissolved salt, density changes and buoyant support directly visible.',
    learningObjective: 'Students will explain that dissolved salt increases water density and buoyant support and identify important effects of extreme salinity.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-experiments-with-water-soluble-insoluble-001',
    slug: 'experiments-with-water-soluble-insoluble',
    title: 'Soluble and Insoluble Substances',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive beaker makes dissolving, clouding, settling and floating directly comparable through learner-controlled tests.',
    learningObjective: 'Students will classify common substances as soluble or insoluble and distinguish solutions from visible particles.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-every-drop-counts-rainwater-storage-001',
    slug: 'every-drop-counts-rainwater-storage',
    title: 'The Storage of Rainwater',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive system makes roof runoff and every cleaning and storage stage visible in one connected journey.',
    learningObjective: 'Students will sequence rooftop rainwater collection and explain first-flush diversion, filtration and covered storage.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-every-drop-counts-stepwell-structure-001',
    slug: 'every-drop-counts-stepwell-structure',
    title: 'A Stepwell Structure',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive cutaway reveals the vertical relationship between stairways, changing water levels and the reservoir.',
    learningObjective: 'Students will identify the main parts of a stepwell and explain access to stored water at changing levels.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-seeds-and-seeds-seed-dispersal-001',
    slug: 'seeds-and-seeds-seed-dispersal',
    title: 'Seed Dispersal',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive habitat makes four seed journeys visible at an inspectable scale with direct learner interaction.',
    learningObjective: 'Students will compare seed dispersal by wind, water, animals and explosive pods and connect each method to seed adaptations.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-mangoes-round-the-year-aam-papad-001',
    slug: 'mangoes-round-the-year-aam-papad',
    title: 'The Making of Aam Papad',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive workshop makes a four-week layered mango preservation process visible and interactive.',
    learningObjective: 'Students will sequence aam papad making and explain how sun-drying preserves mango beyond its season.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-mangoes-round-the-year-milk-spoilage-001',
    slug: 'mangoes-round-the-year-milk-spoilage',
    title: 'Milk Spoilage',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive time-lapse makes gradual milk spoilage visible across controlled storage conditions without unsafe tasting.',
    learningObjective: 'Students will identify signs of milk spoilage and explain how boiling, covering and refrigeration slow microbial growth.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 6,
    status: 'released',
  },
  {
    id: 'sim-seeds-and-seeds-pitcher-plant-001',
    slug: 'seeds-and-seeds-pitcher-plant',
    title: 'Pitcher Plant — The Insect Hunter',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive cutaway makes the hidden trapping and nutrient-absorption sequence visible at an inspectable scale.',
    learningObjective: 'Students will sequence how a pitcher plant traps insects and distinguish mineral uptake from photosynthesis.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-mangoes-round-the-year-food-spoilage-001',
    slug: 'mangoes-round-the-year-food-spoilage',
    title: 'Mangoes Round the Year: Food Spoilage',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience'],
    applicableBoards: ['cbse'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive time-lapse comparison makes slow spoilage changes visible across controlled storage conditions.',
    learningObjective: 'Students will identify signs of food spoilage and explain how cooling, covering and salt can slow spoilage.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 6,
    status: 'released',
  },
  {
    id: 'sim-sorting-materials-by-shape-001',
    slug: 'sorting-materials-by-shape',
    title: 'Sorting Materials According to Their Shape',
    gradeBands: ['class6To8'],
    subjects: ['science'],
    applicableBoards: ['cbse'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive sorting table lets learners inspect and classify three-dimensional objects with immediate feedback.',
    learningObjective: 'Students will classify familiar objects by overall shape and explain the features of spheres, cylinders, cuboids and cones.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-fibre-to-fabric-cotton-ginning-001',
    slug: 'fibre-to-fabric-cotton-ginning',
    title: 'The Process of Cotton Ginning',
    gradeBands: ['class6To8'],
    subjects: ['science'],
    applicableBoards: ['cbse'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The interactive workshop makes the roller-separation mechanism visible and compares the fibre and seed outputs.',
    learningObjective: 'Students will explain that ginning separates cotton fibres from cotton seeds before spinning.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 6,
    status: 'released',
  },
  {
    id: 'sim-fibre-to-fabric-cotton-farming-001',
    slug: 'fibre-to-fabric-cotton-farming',
    title: 'Cotton Farming',
    gradeBands: ['class6To8'],
    subjects: ['science'],
    applicableBoards: ['cbse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive farm compresses a months-long plant-growth process into a spatial sequence with direct field tasks.',
    learningObjective: 'Students will sequence cotton farming from soil preparation and sowing through boll formation and harvesting.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-components-of-food-mineral-sources-001',
    slug: 'components-of-food-mineral-sources',
    title: 'The Sources of Minerals in Food',
    gradeBands: ['class6To8'],
    subjects: ['science'],
    applicableBoards: ['cbse'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive mineral lab turns a comparison chart into a spatial matching task with immediate feedback.',
    learningObjective: 'Students will match calcium, iodine and iron to representative food sources and their body functions.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 6,
    status: 'released',
  },
  {
    id: 'sim-components-of-food-vitamins-deficiencies-001',
    slug: 'components-of-food-vitamins-deficiencies',
    title: 'Sources of Vitamins and Their Deficiencies',
    gradeBands: ['class6To8'],
    subjects: ['science'],
    applicableBoards: ['cbse'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The immersive nutrition lab turns a comparison table into a spatial matching task with immediate body-system feedback.',
    learningObjective: 'Students will match vitamins A, B1, C and D to representative sources and their deficiency conditions.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 9,
    stages: 6,
    status: 'released',
  },
  {
    id: 'sim-components-of-food-lipid-test-001',
    slug: 'components-of-food-lipid-test',
    title: 'Test the Presence of Lipids',
    gradeBands: ['class6To8'],
    subjects: ['science'],
    applicableBoards: ['cbse'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'The simulation makes a translucent-paper observation large, repeatable, and comparable across food samples.',
    learningObjective: 'Students will perform the translucent-spot test and use observations to identify whether a food sample contains lipids.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 7,
    status: 'released',
  },
  {
    id: 'sim-pollination-001',
    slug: 'pollination',
    title: 'Plant Pollination & Growth Cycle',
    gradeBands: ['class6To8', 'class9To10'],
    subjects: ['biology', 'environmentalScience'],
    applicableBoards: ['cbse', 'icse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'Pollination occurs at microscopic scale and involves invisible pollen transfer that students cannot witness directly.',
    learningObjective: 'Students will be able to sequence the 8 stages of plant reproduction from pollen production through germination.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-circuit-001',
    slug: 'circuit',
    title: "Electric Circuits & Resistance (Ohm's Law)",
    gradeBands: ['class9To10'],
    subjects: ['physics'],
    applicableBoards: ['cbse', 'icse'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'Electric current is invisible. Visualising electron flow as glowing particles gives students a spatial, intuitive understanding.',
    learningObjective: "Students will apply Ohm's Law (V=IR) to predict how changing resistance affects current.",
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 4,
    status: 'released',
  },
];

describe('Simulation module contracts', () => {
  SIMULATIONS.forEach(sim => {
    describe(`[${sim.slug}] ${sim.title}`, () => {
      it('has a non-empty id and slug', () => {
        expect(sim.id).toBeTruthy();
        expect(sim.slug).toBeTruthy();
        expect(sim.slug).toMatch(/^[a-z0-9-]+$/);
      });

      it('has a non-empty title and learningObjective', () => {
        expect(sim.title.length).toBeGreaterThan(5);
        expect(sim.learningObjective.length).toBeGreaterThan(10);
      });

      it('has a valid xrFitType (not normalClassroomBetter or notWorthXr)', () => {
        expect(VALID_XR_FIT_TYPES).toContain(sim.xrFitType);
      });

      it('has an xrFitJustification of at least 30 characters', () => {
        expect(sim.xrFitJustification.length).toBeGreaterThanOrEqual(30);
      });

      it('has at least one valid board', () => {
        expect(sim.applicableBoards.length).toBeGreaterThan(0);
        sim.applicableBoards.forEach(b => expect(VALID_BOARDS).toContain(b));
      });

      it('has at least one valid grade band', () => {
        expect(sim.gradeBands.length).toBeGreaterThan(0);
        sim.gradeBands.forEach(g => expect(VALID_GRADE_BANDS).toContain(g));
      });

      it('has at least one valid subject', () => {
        expect(sim.subjects.length).toBeGreaterThan(0);
        sim.subjects.forEach(s => expect(VALID_SUBJECTS).toContain(s));
      });

      it('has a valid simulationFormat', () => {
        expect(VALID_FORMATS).toContain(sim.simulationFormat);
      });

      it('has a valid evidenceConfidenceLevel', () => {
        expect(VALID_EVIDENCE_LEVELS).toContain(sim.evidenceConfidenceLevel);
      });

      it('has a valid comfortRiskLevel', () => {
        expect(VALID_COMFORT_RISKS).toContain(sim.comfortRiskLevel);
      });

      it('has a valid status', () => {
        expect(VALID_STATUSES).toContain(sim.status);
      });

      it('has a positive expectedDurationMinutes (max 12 for batch safety)', () => {
        expect(sim.expectedDurationMinutes).toBeGreaterThan(0);
        expect(sim.expectedDurationMinutes).toBeLessThanOrEqual(12);
      });

      it('has at least 2 stages', () => {
        expect(sim.stages).toBeGreaterThanOrEqual(2);
      });

      it('slug matches id pattern (id starts with sim-{slug})', () => {
        expect(sim.id).toContain(sim.slug.replace(/-/g, '-'));
      });
    });
  });

  it('no two simulations share the same slug', () => {
    const slugs = SIMULATIONS.map(s => s.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('no two simulations share the same id', () => {
    const ids = SIMULATIONS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
