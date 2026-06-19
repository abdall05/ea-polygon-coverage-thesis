import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';

export class UniformMutation extends BaseMutation {
  constructor(params = {}, rng = null) {
    super(MUTATION_TYPES.UNIFORM, params, rng);
  }
  uniformRandom(min, max, rng) {
    return min + (max - min) * rng.random();
  }

  mutateGene(ind, index, min, max) {
    if (this.rng.random() < this.params.mutationRate) {
      ind.genome[index] = this.uniformRandom(min, max, this.rng);
    }
  }

  applyCartesian(ind, context = {}) {
    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, 0, 1);
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        this.mutateGene(ind, i, 0, 1);
      } else if (i % 2 === 0) {
        this.mutateGene(ind, i, 0, 2 * Math.PI);
      } else {
        this.mutateGene(ind, i, 0, 1);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        this.mutateGene(ind, i, 0, 2 * Math.PI);
      } else {
        this.mutateGene(ind, i, 0, 0.5);
      }
    }
  }
}