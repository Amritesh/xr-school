import { describe, expect, it } from 'vitest';
import { IMPLEMENTED_SIMULATIONS } from '../../packages/simulation-content/src/implemented/registry';
import {
  COURSES,
  CURRICULUM_CHAPTERS,
  LEARNING_CONCEPTS,
} from '../../packages/simulation-content/src/curriculum';
import { validateCurriculumGraph } from '../../packages/simulation-schema/src/index';

describe('canonical curriculum content', () => {
  it('defines typed courses, chapters, and concepts for every working simulation', () => {
    expect(COURSES).toHaveLength(11);
    expect(CURRICULUM_CHAPTERS).toHaveLength(22);
    expect(LEARNING_CONCEPTS.length).toBeGreaterThanOrEqual(71);

    const linkedSimulationIds = new Set(COURSES.flatMap(course => course.simulationIds));
    for (const { module } of IMPLEMENTED_SIMULATIONS) {
      expect(linkedSimulationIds.has(module.id)).toBe(true);
    }
  });

  it('has no broken or duplicate curriculum references', () => {
    expect(validateCurriculumGraph({
      courses: COURSES,
      chapters: CURRICULUM_CHAPTERS,
      concepts: LEARNING_CONCEPTS,
      simulationIds: IMPLEMENTED_SIMULATIONS.map(({ module }) => module.id),
    })).toEqual([]);
  });

  it('links every guided class through its exact CBSE chapter and concept', () => {
    const class5 = COURSES.find(
      item => item.id === 'course-cbse-c5-environmental-science',
    );
    const class6 = COURSES.find(item => item.id === 'course-cbse-c6-science');

    expect(class5?.chapterIds).toEqual(expect.arrayContaining([
      'chapter-cbse-c5-mangoes-round-year',
      'chapter-cbse-c5-seeds-and-seeds',
      'chapter-cbse-c5-every-drop-counts',
      'chapter-cbse-c5-treat-for-mosquitoes',
      'chapter-cbse-c5-up-you-go',
      'chapter-cbse-c5-walls-tell-stories',
    ]));
    expect(class5?.simulationIds).toHaveLength(18);
    expect(class6?.simulationIds).toEqual(expect.arrayContaining([
      'sim-c06-ch03-a01-cotton-farming',
      'sim-c06-ch03-a02-the-process-of-cotton-ginning',
    ]));
    expect(CURRICULUM_CHAPTERS.find(
      item => item.id === 'chapter-cbse-c5-water-experiments',
    )?.simulationIds).toEqual([
      'sim-c05-ch07-a01-a-concept-about-what-floats-what-sinks',
      'sim-c05-ch07-a02-dead-sea-salt-water-and-its-effects',
      'sim-c05-ch07-a03-soluble-and-insoluble-substances',
    ]);
  });

  it('links the digestive journey through Class 5 Chapter 3 and its course', () => {
    const course = COURSES.find(
      item => item.id === 'course-cbse-c5-environmental-science',
    );
    const chapter = CURRICULUM_CHAPTERS.find(
      item => item.id === 'chapter-cbse-c5-from-tasting-to-digesting',
    );

    expect(course?.chapterIds).toContain('chapter-cbse-c5-from-tasting-to-digesting');
    expect(course?.simulationIds).toContain(
      'sim-c05-ch03-a02-introduction-of-digestive-system',
    );
    expect(chapter).toMatchObject({
      chapterNumber: 3,
      title: 'From Tasting to Digesting',
      simulationIds: ['sim-c05-ch03-a02-introduction-of-digestive-system'],
    });
  });

  it('links newly authored simulations through the managed curriculum system', () => {
    const linkedSimulationIds = new Set(COURSES.flatMap(course => course.simulationIds));

    for (const simulationId of [
      'sim-c1-art-a01-learning-of-colours',
      'sim-c1-math-ch01-introduction-to-money',
      'sim-c2-english-ch01-prepositions',
      'sim-c8-10-science-solar-system',
    ]) {
      expect(linkedSimulationIds.has(simulationId)).toBe(true);
    }

    expect(CURRICULUM_CHAPTERS.find(
      item => item.id === 'chapter-cbse-c1-art-colours',
    )?.simulationIds).toEqual(['sim-c1-art-a01-learning-of-colours']);
    expect(CURRICULUM_CHAPTERS.find(
      item => item.id === 'chapter-cbse-c1-math-money',
    )?.simulationIds).toEqual(['sim-c1-math-ch01-introduction-to-money']);
    expect(CURRICULUM_CHAPTERS.find(
      item => item.id === 'chapter-cbse-c2-english-prepositions',
    )?.simulationIds).toEqual(['sim-c2-english-ch01-prepositions']);
    expect(CURRICULUM_CHAPTERS.find(
      item => item.id === 'chapter-cbse-c8-solar-system',
    )?.simulationIds).toEqual(['sim-c8-10-science-solar-system']);
  });

  it('links Colour Adventure through honest Class 1 Art concepts', () => {
    const course = COURSES.find(item => item.id === 'course-cbse-c1-art');
    const chapter = CURRICULUM_CHAPTERS.find(
      item => item.id === 'chapter-cbse-c1-art-colours',
    );

    expect(course).toMatchObject({
      classLevel: 1,
      gradeBand: 'class1To2',
      subject: 'art',
      chapterIds: ['chapter-cbse-c1-art-colours'],
      simulationIds: ['sim-c1-art-a01-learning-of-colours'],
    });
    expect(chapter).toMatchObject({
      courseId: 'course-cbse-c1-art',
      chapterNumber: 1,
      title: 'Learning of Colours',
      conceptIds: [
        'concept-colour-names',
        'concept-colour-object-matching',
      ],
    });
    expect(
      LEARNING_CONCEPTS.filter(concept => chapter?.conceptIds.includes(concept.id))
        .map(concept => concept.subject),
    ).toEqual(['art', 'art']);
  });
});
