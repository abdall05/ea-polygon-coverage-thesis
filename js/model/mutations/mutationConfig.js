import { INDIVIDUAL_TYPES } from '../individuals/individualConfig.js';

export const MUTATION_TYPES = Object.freeze({
  GAUSSIAN: 'gaussian',
  CAUCHY: 'cauchy',
  UNIFORM: 'uniform',
  POLYNOMIAL: 'polynomial',
  NON_UNIFORM: 'non-uniform'
});

export const DEFAULT_MUTATION_TYPE = MUTATION_TYPES.GAUSSIAN;

const commonParams = Object.freeze({
  mutationRate: Object.freeze({
    label: 'Mutation Rate',
    default: 0.1,
    min: 0,
    max: 1,
    step: 0.01
  })
});

const noParams = Object.freeze({});

const polynomialParams = Object.freeze({
  eta: Object.freeze({
    label: 'Eta',
    default: 20,
    min: 0,
    max: 100,
    step: 1
  })
});

const nonUniformParams = Object.freeze({
  b: Object.freeze({
    label: 'B',
    default: 2,
    min: 0.1,
    max: 10,
    step: 0.1
  })
});

const stepSizeParamsByRepresentation = Object.freeze({
  [INDIVIDUAL_TYPES.CARTESIAN]: Object.freeze({
    stepSize: Object.freeze({
      label: 'Step Size',
      default: 0.1,
      min: 0,
      step: 0.01
    })
  }),
  [INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER]: Object.freeze({
    centerStepSize: Object.freeze({
      label: 'Center Step Size',
      default: 0.1,
      min: 0,
      step: 0.01
    }),
    angleStepSize: Object.freeze({
      label: 'Angle Step Size',
      default: 0.1,
      min: 0,
      step: 0.01
    }),
    radiusStepSize: Object.freeze({
      label: 'Radius Step Size',
      default: 0.1,
      min: 0,
      step: 0.01
    })
  }),
  [INDIVIDUAL_TYPES.POLAR_FIXED_CENTER]: Object.freeze({
    angleStepSize: Object.freeze({
      label: 'Angle Step Size',
      default: 0.1,
      min: 0,
      step: 0.01
    }),
    radiusStepSize: Object.freeze({
      label: 'Radius Step Size',
      default: 0.1,
      min: 0,
      step: 0.01
    })
  })
});

function buildParamsByRepresentation(uniqueParams, repParams = null) {
  return Object.freeze({
    [INDIVIDUAL_TYPES.CARTESIAN]: Object.freeze({
      ...commonParams,
      ...uniqueParams,
      ...(repParams?.[INDIVIDUAL_TYPES.CARTESIAN] ?? {})
    }),
    [INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER]: Object.freeze({
      ...commonParams,
      ...uniqueParams,
      ...(repParams?.[INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER] ?? {})
    }),
    [INDIVIDUAL_TYPES.POLAR_FIXED_CENTER]: Object.freeze({
      ...commonParams,
      ...uniqueParams,
      ...(repParams?.[INDIVIDUAL_TYPES.POLAR_FIXED_CENTER] ?? {})
    })
  });
}

export const mutationRegistry = Object.freeze({
  [MUTATION_TYPES.GAUSSIAN]: Object.freeze({
    label: 'Gaussian',
    paramsByRepresentation: buildParamsByRepresentation(noParams, stepSizeParamsByRepresentation)
  }),
  [MUTATION_TYPES.CAUCHY]: Object.freeze({
    label: 'Cauchy',
    paramsByRepresentation: buildParamsByRepresentation(noParams, stepSizeParamsByRepresentation)
  }),
  [MUTATION_TYPES.UNIFORM]: Object.freeze({
    label: 'Uniform',
    paramsByRepresentation: buildParamsByRepresentation(noParams)
  }),
  [MUTATION_TYPES.POLYNOMIAL]: Object.freeze({
    label: 'Polynomial',
    paramsByRepresentation: buildParamsByRepresentation(polynomialParams)
  }),
  [MUTATION_TYPES.NON_UNIFORM]: Object.freeze({
    label: 'Non-Uniform',
    paramsByRepresentation: buildParamsByRepresentation(nonUniformParams)
  })
});

export function getMutationTypes() {
  return Object.keys(mutationRegistry);
}

export function getMutationDefinition(type, representationType) {
  const entry = mutationRegistry[type];
  if (!entry) return null;

  const params = entry.paramsByRepresentation?.[representationType];
  if (!params) return null;

  return Object.freeze({
    type,
    label: entry.label,
    params
  });
}