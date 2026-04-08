import { GaussianMutation } from './GaussianMutation.js';
import { CauchyMutation } from './CauchyMutation.js';

export class MutationFactory {
  static create(type, params = {}, rng = null) {
    switch (type) {
      case 'GaussianMutation':
        return new GaussianMutation(params, rng);
      case 'CauchyMutation':
        return new CauchyMutation(params, rng);
      default:
        throw new Error(`Unknown mutation type: ${type}`);
    }
  }
}