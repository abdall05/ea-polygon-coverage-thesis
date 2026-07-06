import { BaseCrossover } from './BaseCrossover.js';
import { CROSSOVER_TYPES } from './crossoverConfig.js';

export class ArithmeticCrossover extends BaseCrossover {
  static TYPE = CROSSOVER_TYPES.ARITHMETIC;

  crossoverGenomes(c1, c2) {
    const g1 = c1.genome;
    const g2 = c2.genome;

    const configuredAlpha = this.params.alpha;
    const alpha = configuredAlpha ?? this.rng.random();
    const beta = 1 - alpha;

    for (let i = 0; i < g1.length; i++) {
      const x1 = g1[i];
      const x2 = g2[i];

      g1[i] = alpha * x1 + beta * x2;
      g2[i] = beta * x1 + alpha * x2;
    }
  }
}