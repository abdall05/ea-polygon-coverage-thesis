import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { randomInRange } from '../../utils/math.js';

export class UniformMutation extends BaseMutation {
  static TYPE = MUTATION_TYPES.UNIFORM;

  mutateGene(ind, index, min, max) {
    if (this.rng.random() < this.params.mutationRate) {
      ind.genome[index] = randomInRange(min, max, this.rng);
    }
  }

  applyCartesian(ind, context = {}) {
    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, min, max);
    }
  }

  applyCenterRelativeCartesian(ind, context = {}) {
    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();
    const range = PolygonGeometry.worldRange();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        // centre x, centre y
        this.mutateGene(ind, i, min, max);
      } else {
        // relative offsets dx, dy
        this.mutateGene(ind, i, -range, range);
      }
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();
    const maxRadius = PolygonGeometry.worldDiagonalLength();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        // centre x, centre y
        this.mutateGene(ind, i, min, max);
      } else if (i % 2 === 0) {
        // angle
        this.mutateGene(ind, i, 0, 2 * Math.PI);
      } else {
        // radius
        this.mutateGene(ind, i, 0, maxRadius);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    const maxRadius = PolygonGeometry.fixedPolarMaxRadius();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        // angle
        this.mutateGene(ind, i, 0, 2 * Math.PI);
      } else {
        // radius
        this.mutateGene(ind, i, 0, maxRadius);
      }
    }
  }
}