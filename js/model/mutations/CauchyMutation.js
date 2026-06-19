import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';

export class CauchyMutation extends BaseMutation {
  constructor(params = {}, rng = null) {
    super(MUTATION_TYPES.CAUCHY, params, rng);
  }
  cauchyRandom(location, scale, rng) {
    let u = 0;
    while (u === 0 || u === 1) u = rng.random();
    return location + scale * Math.tan(Math.PI * (u - 0.5));
  }

  mutateGene(ind, index, scale) {
    if (this.rng.random() < this.params.mutationRate) {
      ind.genome[index] += this.cauchyRandom(0, scale, this.rng);
    }
  }

  applyCartesian(ind, context = {}) {
    const scale = this.params.stepSize;

    if (!Number.isFinite(scale) || scale < 0) {
      throw new Error(`${this.type} requires a valid non-negative stepSize`);
    }

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, scale);
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