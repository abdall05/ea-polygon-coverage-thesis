import { UniformCrossover } from './UniformCrossover.js';

export class CrossoverFactory {
  static create(type, params = {}, rng = null) {
    switch (type) {
      case 'UniformCrossover':
        return new UniformCrossover(params, rng);
      case 'none':
        return null; 
      default:
        throw new Error(`Unknown crossover type: ${type}`);
    }
  }
}