import { BaseCrossover } from './BaseCrossover.js';
import { CROSSOVER_TYPES } from './crossoverConfig.js';

export class UniformCrossover extends BaseCrossover {
  static TYPE = CROSSOVER_TYPES.UNIFORM;

  crossoverGenomes(child1, child2) {
    const g1 = child1.genome;
    const g2 = child2.genome;
    const geneSwapRate = this.params.geneSwapRate;

    for (let i = 0; i < g1.length; i++) {
      if (this.rng.random() < geneSwapRate) {
        const tmp = g1[i];
        g1[i] = g2[i];
        g2[i] = tmp;
      }
    }
  }
}