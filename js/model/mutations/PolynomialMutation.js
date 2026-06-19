import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';

export class PolynomialMutation extends BaseMutation {
  constructor(params = {}, rng = null) {
    super(MUTATION_TYPES.POLYNOMIAL, params, rng);
  }
  polynomialDelta(y, yl, yu, eta, rng) {
    const delta1 = (y - yl) / (yu - yl);
    const delta2 = (yu - y) / (yu - yl);
    const rnd = rng.random();
    const mutPow = 1 / (eta + 1);

    let deltaq;

    if (rnd <= 0.5) {
      const xy = 1 - delta1;
      const val = 2 * rnd + (1 - 2 * rnd) * Math.pow(xy, eta + 1);
      deltaq = Math.pow(val, mutPow) - 1;
    } else {
      const xy = 1 - delta2;
      const val = 2 * (1 - rnd) + 2 * (rnd - 0.5) * Math.pow(xy, eta + 1);
      deltaq = 1 - Math.pow(val, mutPow);
    }

    return deltaq * (yu - yl);
  }

  mutateGene(ind, index, min, max, eta) {
    if (this.rng.random() < this.params.mutationRate) {
      const y = ind.genome[index];

      if (!Number.isFinite(y)) {
        throw new Error(`${this.type} requires a finite gene value at index ${index}`);
      }

      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        throw new Error(`${this.type} requires valid bounds for gene ${index}`);
      }

      if (!Number.isFinite(eta) || eta < 0) {
        throw new Error(`${this.type} requires a valid non-negative eta`);
      }

      if (min === max) {
        ind.genome[index] = min;
        return;
      }

      const clamped = Math.min(Math.max(y, min), max);
      const delta = this.polynomialDelta(clamped, min, max, eta, this.rng);
      const mutated = clamped + delta;

      ind.genome[index] = Math.min(Math.max(mutated, min), max);
    }
  }

  applyCartesian(ind, context = {}) {
    const eta = this.params.eta;

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, 0, 1, eta);
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    const eta = this.params.eta;

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        this.mutateGene(ind, i, 0, 1, eta);
      } else if (i % 2 === 0) {
        this.mutateGene(ind, i, 0, 2 * Math.PI, eta);
      } else {
        this.mutateGene(ind, i, 0, 1, eta);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    const eta = this.params.eta;

    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        this.mutateGene(ind, i, 0, 2 * Math.PI, eta);
      } else {
        this.mutateGene(ind, i, 0, 0.5, eta);
      }
    }
  }
}