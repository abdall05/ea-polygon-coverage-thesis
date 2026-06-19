import { Selection } from "./Selection.js";
import { SELECTION_TYPES } from "./selectionConfig.js";

export class TournamentSelection extends Selection {
  type = SELECTION_TYPES.TOURNAMENT;

  constructor(params = {}, rng = null) {
    super(params, rng);

    const tournamentSize = this.params.tournamentSize;
    if (!Number.isInteger(tournamentSize) || tournamentSize < 2) {
      throw new Error(`${this.type} requires a valid integer tournamentSize >= 2`);
    }

    this.tournamentSize = tournamentSize;
  }

  select(population, compareFitness) {
    if (!Array.isArray(population) || population.length === 0) {
      throw new Error(`${this.type} requires a non-empty population`);
    }

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