// experimentConfig.js

export const randomSeedValueConfig = Object.freeze({
  label: 'Seed',
  default: 42,
  min: 0,
  max: 999999,
  step: 1
});

export const seedFieldConfig = Object.freeze({
  enabled: Object.freeze({
    label: 'Use fixed seed',
    default: true
  }),

  value: randomSeedValueConfig
});

export const experimentFieldConfig = Object.freeze({
  numRuns: Object.freeze({
    label: 'Number of Runs',
    default: 30,
    min: 1,
    max: 100,
    step: 1
  }),

  seed: Object.freeze({
    ...randomSeedValueConfig,
    label: 'Random Seed'
  }),

  thresholdFraction: Object.freeze({
    label: 'Coverage Threshold (tCov)',
    default: 0.95,
    min: 0,
    max: 1,
    step: 0.01
  })
});

export const DEFAULT_SEED_CONFIG = Object.freeze({
  enabled: seedFieldConfig.enabled.default,
  value: seedFieldConfig.value.default
});

export const DEFAULT_EXPERIMENT_CONFIG = Object.freeze({
  numRuns: experimentFieldConfig.numRuns.default,
  seed: experimentFieldConfig.seed.default,
  thresholdFraction: experimentFieldConfig.thresholdFraction.default
});