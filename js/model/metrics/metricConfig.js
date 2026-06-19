export const metricFieldConfig = Object.freeze({
  thresholdFraction: Object.freeze({
    label: 'Coverage threshold',
    default: 0.95,
    min: 0,
    max: 1,
    step: 0.01
  })
});

export const DEFAULT_METRIC_CONFIG = Object.freeze({
  thresholdFraction: metricFieldConfig.thresholdFraction.default
});

const METRIC_DEFINITIONS_RAW = Object.freeze({
  finalCoverage: Object.freeze({
    label: 'Final coverage',
    group: 'coverage'
  }),

  gensToCoverageThreshold: Object.freeze({
    label: 'Generations to coverage threshold',
    group: 'coverage',
    usesThresholdFraction: true
  }),

  aucCoverageNorm: Object.freeze({
    label: 'Normalized coverage AUC',
    group: 'coverage'
  }),

  finalArea: Object.freeze({
    label: 'Final area',
    group: 'area'
  }),

  refinementTime: Object.freeze({
    label: 'Area refinement time',
    group: 'area'
  }),

  diversityHalfLife: Object.freeze({
    label: 'Diversity half-life',
    group: 'diversity'
  }),

  diversityFinalInitialRatio: Object.freeze({
    label: 'Diversity final / initial ratio',
    group: 'diversity'
  }),

  aucDiversityNorm: Object.freeze({
    label: 'Normalized diversity AUC',
    group: 'diversity'
  }),

  reachedFullCoverage: Object.freeze({
    label: 'Success rate',
    group: 'coverage',
    descriptiveOnly: true
  })
});

export const METRIC_DEFINITIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(METRIC_DEFINITIONS_RAW).map(([key, def]) => [
      key,
      Object.freeze({
        key,
        ...def
      })
    ])
  )
);

export const METRIC_KEYS = Object.freeze(
  Object.keys(METRIC_DEFINITIONS)
);

export const INFERENTIAL_METRIC_KEYS = Object.freeze(
  Object.values(METRIC_DEFINITIONS)
    .filter(def => !def.descriptiveOnly)
    .map(def => def.key)
);

export const DESCRIPTIVE_METRIC_KEYS = Object.freeze(
  Object.values(METRIC_DEFINITIONS)
    .filter(def => def.descriptiveOnly)
    .map(def => def.key)
);

export const THRESHOLD_METRIC_KEYS = Object.freeze(
  Object.values(METRIC_DEFINITIONS)
    .filter(def => def.usesThresholdFraction)
    .map(def => def.key)
);

export const METRIC_GROUPS = Object.freeze(
  Array.from(
    new Set(Object.values(METRIC_DEFINITIONS).map(def => def.group))
  )
);