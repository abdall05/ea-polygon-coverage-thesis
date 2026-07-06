import { SBXCrossover } from './SBXCrossover.js';
import { BLXAlphaCrossover } from './BLXAlphaCrossover.js';
import { ArithmeticCrossover } from './ArithmeticCrossover.js';
import { FlatCrossover } from './FlatCrossover.js';
import { UniformCrossover } from './UniformCrossover.js';

import { CROSSOVER_TYPES } from './crossoverConfig.js';

export class CrossoverFactory {
  static create(type, params = {}, rng = null) {
    switch (type) {
      case CROSSOVER_TYPES.SBX:
        return new SBXCrossover(params, rng);

      case CROSSOVER_TYPES.BLX_ALPHA:
        return new BLXAlphaCrossover(params, rng);

      case CROSSOVER_TYPES.ARITHMETIC:
        return new ArithmeticCrossover(params, rng);

      case CROSSOVER_TYPES.FLAT:
        return new FlatCrossover(params, rng);

      case CROSSOVER_TYPES.UNIFORM:
        return new UniformCrossover(params, rng);

      case CROSSOVER_TYPES.NONE:
        return null;

      default:
        throw new TypeError(`Unknown crossover type: ${type}`);
    }
  }
}