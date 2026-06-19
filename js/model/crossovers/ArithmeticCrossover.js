import { BaseCrossover } from './BaseCrossover.js';
import { CROSSOVER_TYPES } from './crossoverConfig.js';

export class ArithmeticCrossover extends BaseCrossover {
  type = CROSSOVER_TYPES.ARITHMETIC;

  crossoverGenomes(c1, c2) {
    const g1 = c1.genome;
    const g2 = c2.genome;

    if (g1.length !== g2.length) {
      throw new Error(`${this.type}: genome lengths differ`);
    }

    const configuredAlpha = this.params.alpha;
    const alpha = configuredAlpha ?? this.rng.random();

    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
      throw new Error(`${this.type} requires alpha to be null/undefined or a number in [0, 1]`);
    }

    const beta = 1 - alpha;

    for (let i = 0; i < g1.length; i++) {
      const x1 = g1[i];
      const x2 = g2[i];

      g1[i] = alpha * x1 + beta * x2;
      g2[i] = beta * x1 + alpha * x2;
    }
  }
}