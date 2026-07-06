import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { clamp } from '../../utils/math.js';

export class NonUniformMutation extends BaseMutation {
  static TYPE = MUTATION_TYPES.NON_UNIFORM;

  delta(y, generation, maxGenerations, b, rng) {
    const r = rng.random();

    const safeMaxGenerations =
      Number.isFinite(maxGenerations) && maxGenerations > 0
        ? maxGenerations
        : 1;

    const safeGeneration = Number.isFinite(generation)
      ? generation
      : 0;

    const progress = clamp(safeGeneration / safeMaxGenerations, 0, 1);

    return y * (
      1 - Math.pow(
        r,
        Math.pow(1 - progress, b)
      )
    );
  }

  mutateGene(ind, index, min, max, context = {}) {
    if (this.rng.random() >= this.params.mutationRate) return;

    const generation = Number.isFinite(context.currentGeneration)
      ? context.currentGeneration
      : 0;

    const maxGenerations = Number.isFinite(context.maxGenerations)
      ? context.maxGenerations
      : 1;

    const b = Number.isFinite(this.params.b)
      ? this.params.b
      : 2;

    const x = clamp(ind.genome[index], min, max);

    const direction = this.rng.random() < 0.5 ? -1 : 1;

    let mutated;

    if (direction < 0) {
      mutated = x - this.delta(
        x - min,
        generation,
        maxGenerations,
        b,
        this.rng
      );
    } else {
      mutated = x + this.delta(
        max - x,
        generation,
        maxGenerations,
        b,
        this.rng
      );
    }

    ind.genome[index] = clamp(mutated, min, max);
  }

  applyCartesian(ind, context = {}) {
    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, min, max, context);
    }
  }

  applyCenterRelativeCartesian(ind, context = {}) {
    const min = PolygonGeometry.worldMin();
    const max = PolygonGeometry.worldMax();
    const range = PolygonGeometry.worldRange();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        // centre x, centre y
        this.mutateGene(ind, i, min, max, context);
      } else {
        // relative offsets dx, dy
        this.mutateGene(ind, i, -range, range, context);
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
        this.mutateGene(ind, i, min, max, context);
      } else if (i % 2 === 0) {
        // angle
        this.mutateGene(ind, i, 0, 2 * Math.PI, context);
      } else {
        // radius
        this.mutateGene(ind, i, 0, maxRadius, context);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    const maxRadius = PolygonGeometry.fixedPolarMaxRadius();

    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        // angle
        this.mutateGene(ind, i, 0, 2 * Math.PI, context);
      } else {
        // radius
        this.mutateGene(ind, i, 0, maxRadius, context);
      }
    }
  }
}