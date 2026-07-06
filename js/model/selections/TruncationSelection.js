import { BaseSelection } from "./BaseSelection.js";
import { SELECTION_TYPES } from "./selectionConfig.js";

export class TruncationSelection extends BaseSelection {
  static TYPE = SELECTION_TYPES.TRUNCATION;

  constructor(params = {}, rng = null) {
    super(params, rng);
    this.selectedFraction = this.params.selectedFraction;
  }

  select(population) {
    // population is assumed to be sorted from best to worst
    let eligibleCount = Math.floor(population.length * this.selectedFraction);
    eligibleCount = Math.max(1, Math.min(eligibleCount, population.length));

    const idx = Math.floor(this.rng.random() * eligibleCount);
    return population[idx];
  }
}