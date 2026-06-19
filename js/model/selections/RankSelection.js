import { Selection } from "./Selection.js";
import { SELECTION_TYPES } from "./selectionConfig.js";

export class RankSelection extends Selection {
  type = SELECTION_TYPES.RANK;

  constructor(params = {}, rng = null) {
    super(params, rng);

    const selectivePressure = this.params.selectivePressure;

    if (
      !Number.isFinite(selectivePressure) ||
      selectivePressure < 1 ||
      selectivePressure > 2
    ) {
      throw new Error(`${this.type} requires selectivePressure in [1, 2]`);
    }

    this.selectivePressure = selectivePressure;
  }

  select(population, compareFitness) {
    if (!Array.isArray(population) || population.length === 0) {
      throw new Error(`${this.type} requires a non-empty population`);
    }

    const n = population.length;

    if (n === 1) {
      return population[0];
    }

    const sp = this.selectivePressure;
    const probs = [];
    let sum = 0;

    for (let i = 0; i < n; i++) {
      const prob =
        (2 - sp) / n +
        (2 * (n - i - 1) * (sp - 1)) / (n * (n - 1));

      probs.push(prob);
      sum += prob;
    }

    const r = this.rng.random();
    let accum = 0;

    for (let i = 0; i < n; i++) {
      accum += probs[i] / sum;
      if (r <= accum) {
        return population[i];
      }
    }

    return population[n - 1];
  }
}