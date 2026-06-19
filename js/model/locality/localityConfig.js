import {
  DEFAULT_REPRESENTATION_CONFIG,
  representationFieldConfig
} from '../individuals/individualConfig.js';

import {
  DEFAULT_MUTATION_TYPE,
  MUTATION_TYPES,
  getMutationDefinition,
  getMutationTypes
} from '../mutations/mutationConfig.js';

const LOCALITY_EXCLUDED_MUTATION_TYPES = Object.freeze([
  MUTATION_TYPES.NON_UNIFORM
]);

export const LOCALITY_MUTATION_TYPES = Object.freeze(
  getMutationTypes().filter(
    (type) => !LOCALITY_EXCLUDED_MUTATION_TYPES.includes(type)
  )
);

export const DEFAULT_LOCALITY_MUTATION_TYPE =
  LOCALITY_MUTATION_TYPES.includes(DEFAULT_MUTATION_TYPE)
    ? DEFAULT_MUTATION_TYPE
    : LOCALITY_MUTATION_TYPES[0];

export const LOCALITY_DEFAULTS = Object.freeze({
  representation: Object.freeze({
    ...DEFAULT_REPRESENTATION_CONFIG
  }),

  mutation: Object.freeze({
    type: DEFAULT_LOCALITY_MUTATION_TYPE
  }),

  experiment: Object.freeze({
    sampleSize: 1000,
    seed: 42
  })
});

export const localityFieldConfig = Object.freeze({
  representation: representationFieldConfig,

  mutation: Object.freeze({
    type: Object.freeze({
      label: 'Mutation Type',
      default: LOCALITY_DEFAULTS.mutation.type,
      options: LOCALITY_MUTATION_TYPES
    })
  }),

  experiment: Object.freeze({
    sampleSize: Object.freeze({
      label: 'Sample Size',
      default: LOCALITY_DEFAULTS.experiment.sampleSize,
      min: 1,
      max: 100000,
      step: 1
    }),
    seed: Object.freeze({
      label: 'Seed',
      default: LOCALITY_DEFAULTS.experiment.seed,
      min: 0,
      step: 1
    })
  })
});

export function createDefaultLocalityState() {
  const mutationDefinition = getMutationDefinition(
    LOCALITY_DEFAULTS.mutation.type,
    LOCALITY_DEFAULTS.representation.type
  );

  return {
    representation: {
      ...LOCALITY_DEFAULTS.representation
    },
    mutation: {
      type: LOCALITY_DEFAULTS.mutation.type,
      params: Object.fromEntries(
        Object.entries(mutationDefinition?.params ?? {}).map(([key, meta]) => [
          key,
          meta.default
        ])
      )
    },
    experiment: {
      ...LOCALITY_DEFAULTS.experiment
    }
  };
}