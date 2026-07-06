export const metricFieldConfig = Object.freeze({
  thresholdFraction: Object.freeze({
    label: 'Coverage threshold fraction',
    default: 0.95,
    min: 0.5,
    max: 1,
    step: 0.01
  })
});

export const DEFAULT_METRIC_CONFIG = Object.freeze({
  thresholdFraction: metricFieldConfig.thresholdFraction.default,
  enabledGroups: Object.freeze({
    coverage: true,
    area: true,
    diversity: true
  })
});

const METRIC_DEFINITIONS_RAW = Object.freeze({
  bestCoverageReached: Object.freeze({
    label: 'Best coverage reached',
    group: 'coverage',
    kind: 'numeric',
    direction: 'higher'
  }),

  reachedFullCoverage: Object.freeze({
    label: 'Reached full coverage',
    group: 'coverage',
    kind: 'binary',
    direction: 'higher'
  }),

  gensToCoverageThreshold: Object.freeze({
    label: 'Generations to coverage threshold',
    group: 'coverage',
    usesThresholdFraction: true,
    kind: 'numeric',
    direction: 'lower',
    censoredAtRunBudgetPlusOne: true
  }),

  firstFullCoverageGeneration: Object.freeze({
    label: 'Generations to full coverage',
    group: 'coverage',
    kind: 'numeric',
    direction: 'lower',
    censoredAtRunBudgetPlusOne: true
  }),

  areaAtFirstFullCoverage: Object.freeze({
    label: 'Area at first full coverage',
    group: 'area',
    kind: 'numeric',
    direction: 'lower',
    conditionalOnFullCoverage: true
  }),

  bestFullCoverageArea: Object.freeze({
    label: 'Best full-coverage area',
    group: 'area',
    kind: 'numeric',
    direction: 'lower',
    conditionalOnFullCoverage: true
  }),

  areaReductionAfterFullCoverage: Object.freeze({
    label: 'Area reduction after full coverage',
    group: 'area',
    kind: 'numeric',
    direction: 'higher',
    conditionalOnFullCoverage: true
  }),

  diversityHalfLife: Object.freeze({
    label: 'Generations to 50% diversity',
    group: 'diversity',
    kind: 'numeric',
    direction: 'diagnostic',
    censoredAtRunBudgetPlusOne: true
  }),

  diversityFinalInitialRatio: Object.freeze({
    label: 'Diversity final / initial ratio',
    group: 'diversity',
    kind: 'numeric',
    direction: 'diagnostic'
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
  Object.values(METRIC_DEFINITIONS).map(def => def.key)
);

export const NUMERIC_METRIC_KEYS = Object.freeze(
  Object.values(METRIC_DEFINITIONS)
    .filter(def => def.kind === 'numeric')
    .map(def => def.key)
);

export const BINARY_METRIC_KEYS = Object.freeze(
  Object.values(METRIC_DEFINITIONS)
    .filter(def => def.kind === 'binary')
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