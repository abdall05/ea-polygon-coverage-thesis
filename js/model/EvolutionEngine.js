export class EvolutionEngine {
  constructor(config, operators, rngs = {}) {
    // ===== SETTINGS (first object) =====
    this.config = {
      populationSize: 50,
      maxGenerations: 100,
      elitismCount: 2,
      repair: true,  // fixed algorithm choice
      ...config
    };

    // ===== DEPENDENCIES (second object) =====
    this.mutationOp = operators.mutationOp;
    this.crossoverOp = operators.crossoverOp;
    this.fitnessEvaluator = operators.fitnessEvaluator;
    this.selectionOp = operators.selectionOp;

    this.rngs = {
      initialization: rngs.initialization || null
    };

    // ===== STATS (fresh for this run) =====
    this.stats = {
      generation: 0,
      bestFitness: { coverage: 0, area: Infinity },
      bestShape: null,
      avgFitness: { coverage: 0, area: Infinity },
      diversity: 0,
      history: [],
      totals: {
        offspringRepairedCount: 0,
        offspringClampAnyCount: 0,
        offspringOrderFixCount: 0,
        clampFracSum: 0
      },
      gen: {
        offspringRepairedCount: 0,
        offspringClampAnyCount: 0,
        offspringOrderFixCount: 0,
        clampFracSum: 0
      }
    };
  }

  getOffspringCountPerGeneration() {
    const P = this.config.populationSize;
    const E = Math.min(this.config.elitismCount, P);
    return P - E;
  }

  resetGenerationStats() {
    this.stats.gen = {
      offspringRepairedCount: 0,
      offspringClampAnyCount: 0,
      offspringOrderFixCount: 0,
      clampFracSum: 0
    };
  }

  initializePopulation(IndividualClass, N) {
    const population = [];
    const initRng = this.rngs.initialization || null;

    for (let i = 0; i < this.config.populationSize; i++) {
      population.push(new IndividualClass(N, initRng));
    }
    return population;
  }

  evaluatePopulation(population) {
    for (const ind of population) {
      this.fitnessEvaluator.evaluate(ind);
    }
  }

  getBestFitness(population) {
    return population.reduce(
      (best, ind) =>
        this.fitnessEvaluator.compare(ind.fitness, best) < 0 ? ind.fitness : best,
      population[0].fitness
    );
  }

  calculateAvgFitness(population) {
    let sumCoverage = 0;
    let sumArea = 0;

    for (const ind of population) {
      sumCoverage += ind.fitness.coverage;
      sumArea += ind.fitness.area;
    }

    return {
      coverage: sumCoverage / population.length,
      area: sumArea / population.length
    };
  }

  getBestIndividual(population) {
    return [...population].sort((a, b) =>
      this.fitnessEvaluator.compare(a.fitness, b.fitness)
    )[0];
  }

  getRepresentativeIndividuals(population) {
    const sorted = [...population].sort((a, b) =>
      this.fitnessEvaluator.compare(a.fitness, b.fitness)
    );

    const n = sorted.length;
    const mid = Math.floor(n / 2);

    const makeEntry = (ind, index) => ({
      rank: index + 1,
      fitness: { ...ind.fitness },
      shape: ind.decodePolygon()
    });

    return {
      best: makeEntry(sorted[0], 0),
      median: makeEntry(sorted[mid], mid),
      worst: makeEntry(sorted[n - 1], n - 1)
    };
  }

  calculateDiversity(population) {
    if (!population || population.length < 2) return 0;

    const polygons = population.map(ind => ind.decodePolygon());
    let total = 0;
    let pairCount = 0;

    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        total += this.polygonDistance(polygons[i], polygons[j]);
        pairCount++;
      }
    }

    return pairCount > 0 ? total / pairCount : 0;
  }

  polygonDistance(polyA, polyB) {
    if (!polyA || !polyB) return 0;
    if (polyA.length !== polyB.length || polyA.length === 0) return 0;

    const forward = this.bestCyclicDistance(polyA, polyB);
    const reversedB = [...polyB].reverse();
    const backward = this.bestCyclicDistance(polyA, reversedB);

    return Math.min(forward, backward);
  }

  bestCyclicDistance(polyA, polyB) {
    const n = polyA.length;
    let best = Infinity;

    for (let shift = 0; shift < n; shift++) {
      let sum = 0;

      for (let i = 0; i < n; i++) {
        const a = polyA[i];
        const b = polyB[(i + shift) % n];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        sum += Math.hypot(dx, dy);
      }

      const avg = sum / n;
      if (avg < best) best = avg;
    }

    return best;
  }

  updateStats(population) {
    this.stats.avgFitness = this.calculateAvgFitness(population);

    const bestInd = this.getBestIndividual(population);
    this.stats.bestFitness = { ...bestInd.fitness };
    this.stats.bestShape = bestInd.decodePolygon();
    this.stats.diversity = this.calculateDiversity(population);
  }

  selection(population) {
    return this.selectionOp.select(population, this.fitnessEvaluator.compare);
  }

  mutate(individual) {
    individual.mutate(this.mutationOp);
  }

  crossover(parent1, parent2) {
    if (!this.crossoverOp) return [parent1.clone(), parent2.clone()];
    return this.crossoverOp.apply(parent1, parent2);
  }

  repairOffspring(child) {
    if (!this.config.repair) return null;

    const r = child.repair({ fixOrder: true, clamp: true });

    this.stats.gen.clampFracSum += r.clampFrac;
    if (r.clampAny) this.stats.gen.offspringClampAnyCount += 1;
    if (r.orderChanged) this.stats.gen.offspringOrderFixCount += 1;
    if (r.anyChanged) this.stats.gen.offspringRepairedCount += 1;

    this.stats.totals.clampFracSum += r.clampFrac;
    if (r.clampAny) this.stats.totals.offspringClampAnyCount += 1;
    if (r.orderChanged) this.stats.totals.offspringOrderFixCount += 1;
    if (r.anyChanged) this.stats.totals.offspringRepairedCount += 1;

    return r;
  }

  recordGeneration(gen, population) {
    const M = Math.max(1, this.getOffspringCountPerGeneration());

    this.stats.history.push({
      generation: gen,
      bestFitness: { ...this.stats.bestFitness },
      bestShape: this.stats.bestShape,
      avgFitness: { ...this.stats.avgFitness },
      diversity: this.stats.diversity,
      representatives: this.getRepresentativeIndividuals(population),
      repairRate: this.stats.gen.offspringRepairedCount / M,
      clampAnyRate: this.stats.gen.offspringClampAnyCount / M,
      orderFixRate: this.stats.gen.offspringOrderFixCount / M,
      clampFracMean: this.stats.gen.clampFracSum / M
    });
  }

  getOrderedPopulationSummary(population) {
    return [...population]
      .sort((a, b) => this.fitnessEvaluator.compare(a.fitness, b.fitness))
      .map((ind, index) => ({
        rank: index + 1,
        coverage: ind.fitness.coverage,
        area: Number(ind.fitness.area.toFixed(4))
      }));
  }

  run(IndividualClass, N) {
    let population = this.initializePopulation(IndividualClass, N);
    this.evaluatePopulation(population);
    this.updateStats(population);

    this.resetGenerationStats();
    this.recordGeneration(0, population);

    for (let gen = 1; gen <= this.config.maxGenerations; gen++) {
      this.stats.generation = gen;
      this.resetGenerationStats();

      const P = this.config.populationSize;
      const eliteCount = Math.min(this.config.elitismCount, P);

      const sorted = [...population].sort((a, b) =>
        this.fitnessEvaluator.compare(a.fitness, b.fitness)
      );

      const nextPopulation = [];
      for (let i = 0; i < eliteCount; i++) {
        nextPopulation.push(sorted[i].clone());
      }

      while (nextPopulation.length < P) {
        const parent1 = this.selection(population);
        const parent2 = this.selection(population);

        let [child1, child2] = this.crossover(parent1, parent2);

        this.mutate(child1);
        this.repairOffspring(child1);
        nextPopulation.push(child1);

        if (nextPopulation.length < P) {
          this.mutate(child2);
          this.repairOffspring(child2);
          nextPopulation.push(child2);
        }
      }

      population = nextPopulation;
      this.evaluatePopulation(population);
      this.updateStats(population);
      this.recordGeneration(gen, population);
    }

    return {
      history: this.stats.history
    };
  }
}
