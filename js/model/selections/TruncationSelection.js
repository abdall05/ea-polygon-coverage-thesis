import { Selection } from "./Selection.js";
import { SELECTION_TYPES } from "./selectionConfig.js";

export class TruncationSelection extends Selection {
  type = SELECTION_TYPES.TRUNCATION;

  constructor(params = {}, rng = null) {
    super(params, rng);

    const truncationSize = this.params.truncationSize;
    const isValidIntegerCount =
      Number.isInteger(truncationSize) && truncationSize >= 1;
    const isValidFraction =
      Number.isFinite(truncationSize) && truncationSize > 0 && truncationSize <= 1;

    if (!isValidIntegerCount && !isValidFraction) {
      throw new Error(
        `${this.type} requires truncationSize as either an integer >= 1 or a fraction in (0, 1]`
      );
    }

    this.truncationSize = truncationSize;
  }

  select(population, compareFitness) {
    if (!Array.isArray(population) || population.length === 0) {
      throw new Error(`${this.type} requires a non-empty population`);
    }

    const sorted = [...population].sort((a, b) =>
      compareFitness(a.fitness, b.fitness)
    );

    let k = this.truncationSize;

    if (k < 1) {
      k = Math.floor(population.length * k);
    }

    k = Math.max(1, Math.min(k, population.length));

    const idx = Math.floor(this.rng.random() * k);
    return sorted[idx];
  }
}