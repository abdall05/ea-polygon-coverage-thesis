import { GaussianMutation } from './GaussianMutation.js';
import { CauchyMutation } from './CauchyMutation.js';
import { UniformMutation } from './UniformMutation.js';
import { PolynomialMutation } from './PolynomialMutation.js';
import { NonUniformMutation } from './NonUniformMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';

export class MutationFactory {
  static create(type, params = {}, rng = null) {
    switch (type) {
      case MUTATION_TYPES.GAUSSIAN:
        return new GaussianMutation(params, rng);

      case MUTATION_TYPES.CAUCHY:
        return new CauchyMutation(params, rng);

      case MUTATION_TYPES.UNIFORM:
        return new UniformMutation(params, rng);

      case MUTATION_TYPES.POLYNOMIAL:
        return new PolynomialMutation(params, rng);

      case MUTATION_TYPES.NON_UNIFORM:
        return new NonUniformMutation(params, rng);

      default:
        throw new Error(`Unknown mutation type: ${type}`);
    }
  }
}