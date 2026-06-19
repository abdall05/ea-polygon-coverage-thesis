export const CROSSOVER_TYPES = Object.freeze({
  NONE: 'none',
  SBX: 'sbx',
  BLX_ALPHA: 'blx-alpha',
  ARITHMETIC: 'arithmetic',
  FLAT: 'flat',
  UNIFORM: 'uniform'
});
export const DEFAULT_CROSSOVER_TYPE = CROSSOVER_TYPES.NONE;

export const crossoverCommonParams = Object.freeze({
  crossoverRate: Object.freeze({
    label: 'Crossover Rate',
    default: 0.8,
    min: 0,
    max: 1,
    step: 0.01
  })
});

export const crossoverRegistry = Object.freeze({
  [CROSSOVER_TYPES.NONE]: Object.freeze({
    label: 'None',
    uniqueParams: Object.freeze({})
  }),

  [CROSSOVER_TYPES.SBX]: Object.freeze({
    label: 'SBX',
    uniqueParams: Object.freeze({
      distributionIndex: Object.freeze({
        label: 'Distribution Index',
        default: 5,
        min: 0.1,
        max: 100,
        step: 0.1
      })
    })
  }),

  [CROSSOVER_TYPES.BLX_ALPHA]: Object.freeze({
    label: 'BLX-Alpha',
    uniqueParams: Object.freeze({
      alpha: Object.freeze({
        label: 'Alpha',
        default: 0.5,
        min: 0,
        max: 2,
        step: 0.05
      })
    })
  }),

  [CROSSOVER_TYPES.ARITHMETIC]: Object.freeze({
    label: 'Arithmetic',
    uniqueParams: Object.freeze({
      alpha: Object.freeze({
        label: 'Alpha',
        default: 0.5,
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
        placeholder: 'Random'
      })
    })
  }),

  [CROSSOVER_TYPES.FLAT]: Object.freeze({
    label: 'Flat',
    uniqueParams: Object.freeze({})
  }),

  [CROSSOVER_TYPES.UNIFORM]: Object.freeze({
    label: 'Uniform',
    uniqueParams: Object.freeze({
      geneSwapRate: Object.freeze({
        label: 'Gene Swap Rate',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01
      })
    })
  })
});

export function getCrossoverTypes() {
  return Object.keys(crossoverRegistry);
}

export function getCrossoverDefinition(type) {
  const entry = crossoverRegistry[type];
  if (!entry) return null;

  return Object.freeze({
    type,
    label: entry.label,
    params: Object.freeze(
      type === CROSSOVER_TYPES.NONE
        ? {}
        : {
          ...crossoverCommonParams,
          ...entry.uniqueParams
        }
    )
  });
}