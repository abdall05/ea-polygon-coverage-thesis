import { SBXCrossover } from './SBXCrossover.js';
import { BLXAlphaCrossover } from './BLXAlphaCrossover.js';

export class CrossoverFactory {
  static create(type, params = {}, rng = null) {
    switch (type) {
      case 'SBXCrossover':
        return new SBXCrossover(params, rng);
      case 'BLXAlphaCrossover':
        return new BLXAlphaCrossover(params, rng);
      case 'none':
        return null;
      default:
        throw new Error(`Unknown crossover type: ${type}`);
    }
  }
}