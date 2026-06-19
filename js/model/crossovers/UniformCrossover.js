import { BaseCrossover } from './BaseCrossover.js';
import { CROSSOVER_TYPES } from './crossoverConfig.js';

export class UniformCrossover extends BaseCrossover {
  type = CROSSOVER_TYPES.UNIFORM;

  crossoverGenomes(child1, child2) {
    const g1 = child1.genome;
    const g2 = child2.genome;
    const geneSwapRate = this.params.geneSwapRate;

    if (g1.length !== g2.length) {
      throw new Error(`${this.type}: genome lengths differ`);
    }

    if (!Number.isFinite(geneSwapRate) || geneSwapRate < 0 || geneSwapRate > 1) {
      throw new Error(`${this.type} requires geneSwapRate in [0, 1]`);
    }

    for (let i = 0; i < g1.length; i++) {
      if (this.rng.random() < geneSwapRate) {
        const tmp = g1[i];
        g1[i] = g2[i];
        g2[i] = tmp;
      }
    }
  }
}