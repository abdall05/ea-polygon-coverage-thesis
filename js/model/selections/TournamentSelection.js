// selection/TournamentSelection.js
export class TournamentSelection {
  constructor(params = {}, rng = null) {
    this.params = {
      tournamentSize: 2,
      ...params
    };
    this.type = "TournamentSelection";
     this.rng = rng || Math;
  }

  select(population, compareFitness) {
    let best = null;
    const k = this.params.tournamentSize;
    
    for (let i = 0; i < k; i++) {
      const cand = population[Math.floor(this.rng.random() * population.length)];
      if (best === null || compareFitness(cand.fitness, best.fitness) < 0) {
        best = cand;
      }
    }
    return best;
  }
}