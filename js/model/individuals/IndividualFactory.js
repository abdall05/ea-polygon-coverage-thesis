import { CartesianPolygonIndividual } from './CartesianPolygonIndividual.js';
import { VariableCenterPolarPolygonIndividual } from './VariableCenterPolarPolygonIndividual.js';
import { FixedCenterPolarPolygonIndividual } from './FixedCenterPolarPolygonIndividual.js';

import { INDIVIDUAL_TYPES } from './individualConfig.js';
export class IndividualFactory {
  static create(type, N, rng = null) {
    switch (type) {
      case INDIVIDUAL_TYPES.CARTESIAN:
        return new CartesianPolygonIndividual(N, rng);

      case INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER:
        return new VariableCenterPolarPolygonIndividual(N, rng);

      case INDIVIDUAL_TYPES.POLAR_FIXED_CENTER:
        return new FixedCenterPolarPolygonIndividual(N, rng);

      default:
        throw new Error(`Unknown individual type: ${type}`);
    }
  }
}