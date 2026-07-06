import { BaseSelection } from "./BaseSelection.js";
import { SELECTION_TYPES } from "./selectionConfig.js";

export class TournamentSelection extends BaseSelection {
  static TYPE = SELECTION_TYPES.TOURNAMENT;

  constructor(params = {}, rng = null) {
    super(params, rng);
    this.tournamentSize = this.params.tournamentSize;
  }

  select(population, compareFitness) {
    let best = null;

    for (let i = 0; i < this.tournamentSize; i++) {
      const idx = Math.floor(this.rng.random() * population.length);
      const candidate = population[idx];

      if (best === null || compareFitness(candidate.fitness, best.fitness) < 0) {
        best = candidate;
      }
    }

    return best;
  }
}