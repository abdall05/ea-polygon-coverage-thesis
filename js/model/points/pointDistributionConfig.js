export const POINT_DISTRIBUTION_TYPES = Object.freeze({
  UNIFORM: 'uniform',
  CLUSTERED: 'clustered'
});

export const pointDistributionCommonParams = Object.freeze({
  count: Object.freeze({
    label: 'Count',
    default: 100,
    min: 10,
    max: 2000,
    step: 10
  }),
  margin: Object.freeze({
    label: 'Margin',
    default: 0.03,
    min: 0,
    max: 0.15,
    step: 0.01
  })
});

export const pointDistributionRegistry = Object.freeze({
  [POINT_DISTRIBUTION_TYPES.UNIFORM]: Object.freeze({
    label: 'Uniform',
    uniqueParams: Object.freeze({})
  }),

  [POINT_DISTRIBUTION_TYPES.CLUSTERED]: Object.freeze({
    label: 'Clustered',
    uniqueParams: Object.freeze({
      clusterCount: Object.freeze({
        label: 'Cluster Count',
        default: 4,
        min: 2,
        max: 10,
        step: 1
      }),
      clusterSpread: Object.freeze({
        label: 'Cluster Spread',
        default: 0.05,
        min: 0.01,
        max: 0.12,
        step: 0.005
      })
    })
  })
});

export function getPointDistributionTypes() {
  return Object.keys(pointDistributionRegistry);
}

export function getPointDistributionDefinition(type) {
  const entry = pointDistributionRegistry[type];
  if (!entry) return null;

  return Object.freeze({
    type,
    label: entry.label,
    params: Object.freeze({
      ...pointDistributionCommonParams,
      ...entry.uniqueParams
    })
  });
}