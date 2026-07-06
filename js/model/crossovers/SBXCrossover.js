import { BaseCrossover } from './BaseCrossover.js';
import { CROSSOVER_TYPES } from './crossoverConfig.js';

export class SBXCrossover extends BaseCrossover {
  static TYPE = CROSSOVER_TYPES.SBX;

  crossoverGenomes(c1, c2) {
    const eta = this.params.distributionIndex;
    const eps = 1e-14;

    for (let i = 0; i < c1.genome.length; i++) {
      const x1 = c1.genome[i];
      const x2 = c2.genome[i];

      if (Math.abs(x1 - x2) < eps) continue;

      const u = this.rng.random();
      const betaq = u <= 0.5
        ? Math.pow(2 * u, 1 / (eta + 1))
        : Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));

      c1.genome[i] = 0.5 * ((1 + betaq) * x1 + (1 - betaq) * x2);
      c2.genome[i] = 0.5 * ((1 - betaq) * x1 + (1 + betaq) * x2);
    }
  }
}