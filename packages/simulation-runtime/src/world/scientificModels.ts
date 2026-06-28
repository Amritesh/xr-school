import type {
  ScientificModelManifest,
  ScientificValue,
} from '../../../simulation-schema/src/world';

export type ScientificInput = Record<string, ScientificValue>;
export type ScientificOutput = Record<string, ScientificValue>;

export interface ScientificModelDefinition {
  manifest: ScientificModelManifest;
  evaluate(input: ScientificInput): ScientificOutput;
}

function validateNumericInput(
  manifest: ScientificModelManifest,
  input: ScientificInput,
) {
  for (const [inputId, range] of Object.entries(manifest.validInputRanges)) {
    const value = input[inputId];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${manifest.id}: ${inputId} must be a finite number`);
    }
    if (value < range.min || value > range.max) {
      throw new Error(
        `${manifest.id}: ${inputId} ${value} is outside valid range ${range.min}-${range.max} ${range.unit}`,
      );
    }
  }
}

function validateOutput(modelId: string, output: ScientificOutput) {
  for (const [outputId, value] of Object.entries(output)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(`${modelId}: output ${outputId} must be finite`);
    }
    if (value === undefined || value === null) {
      throw new Error(`${modelId}: output ${outputId} is undefined`);
    }
  }
}

export function createScientificModelRegistry() {
  const models = new Map<string, ScientificModelDefinition>();
  let disposed = false;

  function requireActive() {
    if (disposed) throw new Error('Scientific model registry has been disposed');
  }

  function model(id: string) {
    requireActive();
    const definition = models.get(id);
    if (!definition) throw new Error(`Unknown scientific model ${id}`);
    return definition;
  }

  function evaluate(id: string, input: ScientificInput) {
    const definition = model(id);
    validateNumericInput(definition.manifest, input);
    const output = definition.evaluate({ ...input });
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      throw new Error(`${id}: scientific model must return an output record`);
    }
    validateOutput(id, output);
    return { ...output };
  }

  return {
    register(definition: ScientificModelDefinition) {
      requireActive();
      const { manifest } = definition;
      if (!manifest.id.trim()) throw new Error('Scientific model ID is required');
      if (models.has(manifest.id)) {
        throw new Error(`Duplicate scientific model ${manifest.id}`);
      }
      if (typeof definition.evaluate !== 'function') {
        throw new Error(`${manifest.id}: evaluate function is required`);
      }
      if (!Number.isFinite(manifest.numericalTolerance)
        || manifest.numericalTolerance < 0) {
        throw new Error(`${manifest.id}: numerical tolerance must be non-negative`);
      }
      models.set(manifest.id, definition);
    },

    evaluate,

    verify(id: string) {
      const definition = model(id);
      const failures: string[] = [];
      for (const reference of definition.manifest.referenceVectors) {
        let actual: ScientificOutput;
        try {
          actual = evaluate(id, reference.inputs);
        } catch (error) {
          failures.push(
            `${id}/${reference.id}: evaluation failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          continue;
        }

        for (const [outputId, expected] of Object.entries(
          reference.expectedOutputs,
        )) {
          const received = actual[outputId];
          if (typeof expected === 'number') {
            if (typeof received !== 'number' || !Number.isFinite(received)) {
              failures.push(`${id}/${reference.id}: ${outputId} is not a finite number`);
              continue;
            }
            const tolerance = reference.toleranceOverrides?.[outputId]
              ?? definition.manifest.numericalTolerance;
            if (Math.abs(received - expected) > tolerance) {
              failures.push(
                `${id}/${reference.id}: ${outputId} expected ${expected} ± ${tolerance}, received ${received}`,
              );
            }
          } else if (received !== expected) {
            failures.push(
              `${id}/${reference.id}: ${outputId} expected ${String(expected)}, received ${String(received)}`,
            );
          }
        }
      }
      return failures;
    },

    manifests() {
      requireActive();
      return [...models.values()].map(definition => definition.manifest);
    },

    dispose() {
      models.clear();
      disposed = true;
    },
  };
}

export type ScientificModelRegistry = ReturnType<
  typeof createScientificModelRegistry
>;
