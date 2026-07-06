import { BaseSelection } from "./BaseSelection.js";
import { SELECTION_TYPES } from "./selectionConfig.js";

export class RankSelection extends BaseSelection {
  static TYPE = SELECTION_TYPES.RANK;

  constructor(params = {}, rng = null) {
    super(params, rng);
    this.selectivePressure = this.params.selectivePressure;
  }

  select(population) {
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