import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';

export class NonUniformMutation extends BaseMutation {
  constructor(params = {}, rng = null) {
    super(MUTATION_TYPES.NON_UNIFORM, params, rng);
  }
  delta(y, generation, maxGenerations, b, rng) {
    const r = rng.random();
    return y * (1 - Math.pow(r, Math.pow(1 - generation / maxGenerations, b)));
  }

  mutateGene(ind, index, min, max, context = {}) {
    if (this.rng.random() < this.params.mutationRate) {
      const generation = context.currentGeneration;
      const maxGenerations = context.maxGenerations;
      const b = this.params.b;
      const x = ind.genome[index];

      if (!Number.isFinite(x)) {
        throw new Error(`${this.type} requires a finite gene value at index ${index}`);
      }

      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        throw new Error(`${this.type} requires valid bounds for gene ${index}`);
      }

      if (!Number.isFinite(generation) || generation < 0) {
        throw new Error(`${this.type} requires a valid non-negative context.currentGeneration`);
      }

      if (!Number.isFinite(maxGenerations) || maxGenerations <= 0) {
        throw new Error(`${this.type} requires a valid positive context.maxGenerations`);
      }

      if (generation > maxGenerations) {
        throw new Error(`${this.type} requires context.currentGeneration <= context.maxGenerations`);
      }

      if (!Number.isFinite(b) || b <= 0) {
        throw new Error(`${this.type} requires a valid positive b`);
      }

      const direction = this.rng.random() < 0.5 ? -1 : 1;
      let mutated;

      if (direction < 0) {
        mutated = x - this.delta(x - min, generation, maxGenerations, b, this.rng);
      } else {
        mutated = x + this.delta(max - x, generation, maxGenerations, b, this.rng);
      }

      ind.genome[index] = Math.min(Math.max(mutated, min), max);
    }
  }

  applyCartesian(ind, context = {}) {
    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, 0, 1, context);
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        this.mutateGene(ind, i, 0, 1, context);
      } else if (i % 2 === 0) {
        this.mutateGene(ind, i, 0, 2 * Math.PI, context);
      } else {
        this.mutateGene(ind, i, 0, 1, context);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        this.mutateGene(ind, i, 0, 2 * Math.PI, context);
      } else {
        this.mutateGene(ind, i, 0, 0.5, context);
      }
    }
  }
}