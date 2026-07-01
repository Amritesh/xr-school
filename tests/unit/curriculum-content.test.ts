import { describe, expect, it } from 'vitest';
import { SIMULATION_MODULES } from '../../packages/simulation-content/src/modules';
import {
  COURSES,
  CURRICULUM_CHAPTERS,
  LEARNING_CONCEPTS,
} from '../../packages/simulation-content/src/curriculum';
import { validateCurriculumGraph } from '../../packages/simulation-schema/src/index';

describe('canonical curriculum content', () => {
  it('defines typed courses, chapters, and concepts for every working simulation', () => {
    expect(COURSES).toHaveLength(5);
    expect(CURRICULUM_CHAPTERS).toHaveLength(6);
    expect(LEARNING_CONCEPTS.length).toBeGreaterThanOrEqual(22);

    const linkedSimulationIds = new Set(COURSES.flatMap(course => course.simulationIds));
    for (const simulation of SIMULATION_MODULES) {
      expect(linkedSimulationIds.has(simulation.id)).toBe(true);
    }
  });

  it('has no broken or duplicate curriculum references', () => {
    expect(validateCurriculumGraph({
      courses: COURSES,
      chapters: CURRICULUM_CHAPTERS,
      concepts: LEARNING_CONCEPTS,
      simulationIds: SIMULATION_MODULES.map(module => module.id),
    })).toEqual([]);
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
});
