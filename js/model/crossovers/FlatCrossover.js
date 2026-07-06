import { BaseCrossover } from './BaseCrossover.js';
import { CROSSOVER_TYPES } from './crossoverConfig.js';

export class FlatCrossover extends BaseCrossover {
  static TYPE = CROSSOVER_TYPES.FLAT;

  crossoverGenomes(c1, c2) {
    const g1 = c1.genome;
    const g2 = c2.genome;

    for (let i = 0; i < g1.length; i++) {
      const x1 = g1[i];
      const x2 = g2[i];

      const min = Math.min(x1, x2);
      const max = Math.max(x1, x2);
      const range = max - min;

      g1[i] = min + this.rng.random() * range;
      g2[i] = min + this.rng.random() * range;
    }
  }
}