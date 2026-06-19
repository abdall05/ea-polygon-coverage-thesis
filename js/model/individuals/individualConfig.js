export const INDIVIDUAL_TYPES = Object.freeze({
  CARTESIAN: 'cartesian',
  POLAR_VARIABLE_CENTER: 'polar-variable-center',
  POLAR_FIXED_CENTER: 'polar-fixed-center'
});

export const representationFieldConfig = Object.freeze({
  type: Object.freeze({
    label: 'Representation',
    default: INDIVIDUAL_TYPES.CARTESIAN,
    options: Object.freeze([
      Object.freeze({
        value: INDIVIDUAL_TYPES.CARTESIAN,
        label: 'Cartesian'
      }),
      Object.freeze({
        value: INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER,
        label: 'Polar Variable Center'
      }),
      Object.freeze({
        value: INDIVIDUAL_TYPES.POLAR_FIXED_CENTER,
        label: 'Polar Fixed Center'
      })
    ])
  }),

  nVertices: Object.freeze({
    label: 'Vertices',
    default: 8,
    min: 4,
    max: 100,
    step: 1
  })
});

export const DEFAULT_REPRESENTATION_CONFIG = Object.freeze({
  type: representationFieldConfig.type.default,
  nVertices: representationFieldConfig.nVertices.default
});