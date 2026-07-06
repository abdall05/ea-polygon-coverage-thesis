import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { clamp } from '../../utils/math.js';

export class PolynomialMutation extends BaseMutation {
  static TYPE = MUTATION_TYPES.POLYNOMIAL;

  polynomialDelta(y, yl, yu, eta, rng) {
    if (yu <= yl) return 0;

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
    if (this.rng.random() >= this.params.mutationRate) return;

    if (min === max) {
      ind.genome[index] = min;
      return;
    }

    const y = clamp(ind.genome[index], min, max);
    const delta = this.polynomialDelta(y, min, max, eta, this.rng);
    const mutated = y + delta;

    ind.genome[index] = clamp(mutated, min, max);
  }

  applyCartesian(ind, context = {}) {
    const eta = Number.isFinite(this.params.eta)
      ? this.params.eta
      : 20;

    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, min, max, eta);
    }
  }

  applyCenterRelativeCartesian(ind, context = {}) {
    const eta = Number.isFinite(this.params.eta)
      ? this.params.eta
      : 20;

    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();
    const range = PolygonGeometry.worldRange();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        // centre genes: cx, cy
        this.mutateGene(ind, i, min, max, eta);
      } else {
        // relative offsets: dx_i, dy_i
        this.mutateGene(ind, i, -range, range, eta);
      }
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    const eta = Number.isFinite(this.params.eta)
      ? this.params.eta
      : 20;

    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();
    const maxRadius = PolygonGeometry.worldDiagonalLength();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        // centre genes: cx, cy
        this.mutateGene(ind, i, min, max, eta);
      } else if (i % 2 === 0) {
        // angle genes
        this.mutateGene(ind, i, 0, 2 * Math.PI, eta);
      } else {
        // radius genes
        this.mutateGene(ind, i, 0, maxRadius, eta);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    const eta = Number.isFinite(this.params.eta)
      ? this.params.eta
      : 20;

    const maxRadius = PolygonGeometry.fixedPolarMaxRadius();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        // angle genes
        this.mutateGene(ind, i, 0, 2 * Math.PI, eta);
      } else {
        // radius genes
        this.mutateGene(ind, i, 0, maxRadius, eta);
      }
    }
  }
}