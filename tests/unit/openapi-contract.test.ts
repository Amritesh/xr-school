import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const OPENAPI_PATH = resolve(process.cwd(), 'generated/openapi/openapi.json');

describe('OpenAPI contract', () => {
  let spec: Record<string, unknown>;

  it('openapi.json exists and parses as valid JSON', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    expect(spec).toBeTruthy();
  });

  it('is OpenAPI 3.x', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    expect((spec.openapi as string)).toMatch(/^3\./);
  });

  it('has the correct API title', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    const info = spec.info as Record<string, unknown>;
    expect(info.title).toBe('XR School Lab Platform API');
  });

  const REQUIRED_ROUTES = [
    '/v1/learning-concepts',
    '/v1/curriculum-maps',
    '/v1/simulation-modules',
    '/v1/offline-content-packs',
    '/v1/batch-sessions',
    '/v1/evaluation-records',
    '/v1/sync-jobs',
    '/v1/cue-cards',
    '/v1/revision-cards',
    '/v1/assessment-hooks',
  ];

  REQUIRED_ROUTES.forEach(route => {
    it(`has route ${route}`, () => {
      const raw = readFileSync(OPENAPI_PATH, 'utf8');
      spec = JSON.parse(raw);
      const paths = spec.paths as Record<string, unknown>;
      expect(paths[route], `Missing route: ${route}`).toBeTruthy();
    });
  });

  it('simulation-modules route has GET and POST', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    const paths = spec.paths as Record<string, unknown>;
    const route = paths['/v1/simulation-modules'] as Record<string, unknown>;
    expect(route.get, 'GET /v1/simulation-modules missing').toBeTruthy();
    expect(route.post, 'POST /v1/simulation-modules missing').toBeTruthy();
  });

  it('evaluation-records route has GET and POST', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    const paths = spec.paths as Record<string, unknown>;
    const route = paths['/v1/evaluation-records'] as Record<string, unknown>;
    expect(route.get).toBeTruthy();
    expect(route.post).toBeTruthy();
  });

  it('has all 10 core entity schemas defined', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    const schemas = (spec.components as Record<string, unknown>)?.schemas as Record<string, unknown>;
    const REQUIRED = [
      'LearningConcept', 'CurriculumMap', 'CueCard', 'RevisionCard',
      'AssessmentHook', 'SimulationModule', 'OfflineContentPack',
      'BatchSession', 'EvaluationRecord', 'SyncJob',
    ];
    REQUIRED.forEach(name => {
      expect(schemas[name], `Schema missing: ${name}`).toBeTruthy();
    });
  });

  it('EvaluationRecord has all required evaluation fields', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    const schemas = (spec.components as Record<string, unknown>)?.schemas as Record<string, unknown>;
    const evalSchema = schemas['EvaluationRecord'] as Record<string, unknown>;
    const props = evalSchema.properties as Record<string, unknown>;
    const required = [
      'anonymousParticipantCount',
      'preUnderstandingScore',
      'postUnderstandingScore',
      'engagementScore',
      'completionRate',
      'syncStatus',
      'instructorId',
      'batchSessionId',
      'moduleId',
      'schoolId',
    ];
    required.forEach(field => {
      expect(props[field], `EvaluationRecord missing field: ${field}`).toBeTruthy();
    });
  });

  it('SimulationModule has xrFitType and xrFitJustification (XR fit must be documented)', () => {
    const raw = readFileSync(OPENAPI_PATH, 'utf8');
    spec = JSON.parse(raw);
    const schemas = (spec.components as Record<string, unknown>)?.schemas as Record<string, unknown>;
    const simSchema = schemas['SimulationModule'] as Record<string, unknown>;
    const props = simSchema.properties as Record<string, unknown>;
    expect(props['xrFitType']).toBeTruthy();
    expect(props['xrFitJustification']).toBeTruthy();
  });
});
