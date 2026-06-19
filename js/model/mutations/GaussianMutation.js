import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';

export class GaussianMutation extends BaseMutation {
  constructor(params = {}, rng = null) {
    super(MUTATION_TYPES.GAUSSIAN, params, rng);
  }

  gaussianRandom(mean, sigma, rng) {
    let u = 0;
    let v = 0;

    while (u === 0) u = rng.random();
    while (v === 0) v = rng.random();

    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + sigma * z;
  }

  mutateGene(ind, index, sigma) {
    if (this.rng.random() < this.params.mutationRate) {
      ind.genome[index] += this.gaussianRandom(0, sigma, this.rng);
    }
  }

  applyCartesian(ind, context = {}) {
    const sigma = this.params.stepSize;

    if (!Number.isFinite(sigma) || sigma < 0) {
      throw new Error(`${this.type} requires a valid non-negative stepSize`);
    }

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, sigma);
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    const centerStepSize = this.params.centerStepSize;
    const angleStepSize = this.params.angleStepSize;
    const radiusStepSize = this.params.radiusStepSize;

    if (!Number.isFinite(centerStepSize) || centerStepSize < 0) {
      throw new Error(`${this.type} requires a valid non-negative centerStepSize`);
    }

    if (!Number.isFinite(angleStepSize) || angleStepSize < 0) {
      throw new Error(`${this.type} requires a valid non-negative angleStepSize`);
    }

    if (!Number.isFinite(radiusStepSize) || radiusStepSize < 0) {
      throw new Error(`${this.type} requires a valid non-negative radiusStepSize`);
    }

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        this.mutateGene(ind, i, centerStepSize);
      } else if (i % 2 === 0) {
        this.mutateGene(ind, i, angleStepSize);
      } else {
        this.mutateGene(ind, i, radiusStepSize);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    const angleStepSize = this.params.angleStepSize;
    const radiusStepSize = this.params.radiusStepSize;

    if (!Number.isFinite(angleStepSize) || angleStepSize < 0) {
      throw new Error(`${this.type} requires a valid non-negative angleStepSize`);
    }

    if (!Number.isFinite(radiusStepSize) || radiusStepSize < 0) {
      throw new Error(`${this.type} requires a valid non-negative radiusStepSize`);
    }

    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        this.mutateGene(ind, i, angleStepSize);
      } else {
        this.mutateGene(ind, i, radiusStepSize);
      }
    }
  }
}