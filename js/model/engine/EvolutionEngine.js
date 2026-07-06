import { IndividualFactory } from "../individuals/IndividualFactory.js";
import { PopulationMetrics } from "../metrics/PopulationMetrics.js";
import { LexicographicFitnessComparator } from "../fitness/LexicographicFitnessComparator.js";

export class EvolutionEngine {
  constructor(
    engineConfig,
    resultConfig,
    problemConfig,
    operators,
    initializationRng = null
  ) {
    if (!engineConfig) {
      throw new Error("EvolutionEngine requires engineConfig");
    }

    if (!resultConfig) {
      throw new Error("EvolutionEngine requires resultConfig");
    }

    if (!problemConfig) {
      throw new Error("EvolutionEngine requires problemConfig");
    }

    if (!operators?.mutationOp) {
      throw new Error("EvolutionEngine requires operators.mutationOp");
    }

    if (!operators?.fitnessEvaluator) {
      throw new Error("EvolutionEngine requires operators.fitnessEvaluator");
    }

    if (!operators?.selectionOp) {
      throw new Error("EvolutionEngine requires operators.selectionOp");
    }

    this.engineConfig = engineConfig;
    this.resultConfig = resultConfig;
    this.problemConfig = problemConfig;

    if (this.resultConfig.lineageTracking && !this.resultConfig.storePopulation) {
      throw new Error("lineageTracking requires storePopulation=true");
    }

    this.mutationOp = operators.mutationOp;
    this.crossoverOp = operators.crossoverOp ?? null;
    this.fitnessEvaluator = operators.fitnessEvaluator;
    this.selectionOp = operators.selectionOp;

    this.initializationRng = initializationRng;
    this.history = [];
  }

  isLineageEnabled() {
    return !!this.resultConfig.lineageTracking;
  }

  cloneData(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
  }

  cloneRef(ref) {
    return ref ? { ...ref } : null;
  }

  buildParentRefs(...parents) {
    return parents
      .map(parent => this.cloneRef(parent?.lineageRef))
      .filter(Boolean);
  }

  setLineageRef(individual, generation, rank) {
    individual.lineageRef = { generation, rank };
  }

  assignLineageRefs(gen, sortedPopulation) {
    sortedPopulation.forEach((ind, rank) => {
      this.setLineageRef(ind, gen, rank);
    });
  }

  captureStage(individual) {
    if (!individual) {
      return {
        shape: null,
        fitness: null
      };
    }

    const snapshot = individual.clone();
    this.fitnessEvaluator.evaluate(snapshot);

    return {
      shape: this.cloneData(snapshot.decodePolygon()),
      fitness: snapshot.fitness ? { ...snapshot.fitness } : null
    };
  }

  initializePopulation() {
    const population = [];
    const { representationType, nVertices } = this.problemConfig;

    for (let i = 0; i < this.engineConfig.populationSize; i++) {
      const ind = IndividualFactory.create(
        representationType,
        nVertices,
        this.initializationRng
      );

      if (this.isLineageEnabled()) {
        ind.lineage = {
          state: "initial",
          parents: []
        };
      }

      population.push(ind);
    }

    return population;
  }

  evaluatePopulation(population) {
    for (const ind of population) {
      this.fitnessEvaluator.evaluate(ind);
    }
  }

  getSortedPopulation(population) {
    return [...population].sort((a, b) =>
      LexicographicFitnessComparator.compare(a.fitness, b.fitness)
    );
  }

  selectParent(population) {
    return this.selectionOp.select(
      population,
      LexicographicFitnessComparator.compare
    );
  }

  buildMutationContext(generation) {
    return {
      currentGeneration: generation,
      maxGenerations: this.engineConfig.maxGenerations
    };
  }

  mutate(individual, context = {}) {
    individual.mutate(this.mutationOp, context);

    if (this.isLineageEnabled() && individual.lineage?.state === "offspring") {
      individual.lineage.stages ??= {
        afterCrossover: null,
        afterMutation: null
      };

      individual.lineage.stages.afterMutation = this.captureStage(individual);
    }
  }

  crossover(parent1, parent2) {
    const parentRefs = this.buildParentRefs(parent1, parent2);

    let c1, c2;

    if (!this.crossoverOp) {
      c1 = parent1.clone();
      c2 = parent2.clone();
      c1.lineageRef = null;
      c2.lineageRef = null;
    } else {
      [c1, c2] = this.crossoverOp.apply(parent1, parent2);
      c1.lineageRef = null;
      c2.lineageRef = null;
    }

    if (this.isLineageEnabled()) {
      const snapshot1 = this.captureStage(c1);
      const snapshot2 = this.captureStage(c2);

      c1.lineage = {
        state: "offspring",
        parents: this.cloneData(parentRefs),
        stages: {
          afterCrossover: snapshot1,
          afterMutation: null
        }
      };

      c2.lineage = {
        state: "offspring",
        parents: this.cloneData(parentRefs),
        stages: {
          afterCrossover: snapshot2,
          afterMutation: null
        }
      };
    }

    return [c1, c2];
  }

  repairOffspring(child) {
    child.repair({ clamp: true });
  }

  shouldIncludeDiversity() {
    return !!this.resultConfig.includeDiversity;
  }

  buildStoredIndividual(ind) {
    const stored = {
      shape: this.cloneData(ind.decodePolygon()),
      fitness: { ...ind.fitness }
    };

    if (this.isLineageEnabled()) {
      stored.lineage = this.cloneData(ind.lineage);
      stored.lineageRef = this.cloneRef(ind.lineageRef);
    }

    return stored;
  }

  buildGenerationEntry(gen, sortedPopulation) {
    const entry = {
      generation: gen,
      bestFitness: { ...sortedPopulation[0].fitness },
      bestShape: this.cloneData(sortedPopulation[0].decodePolygon())
    };

    if (this.resultConfig.includeAvgFitness) {
      entry.avgFitness = PopulationMetrics.averageFitness(sortedPopulation);
    }

    if (this.shouldIncludeDiversity()) {
      entry.diversity = PopulationMetrics.diversity(sortedPopulation);
    }

    if (this.resultConfig.storePopulation) {
      entry.sortedPopulation = sortedPopulation.map(ind =>
        this.buildStoredIndividual(ind)
      );
    }

    return entry;
  }

  recordGeneration(gen, sortedPopulation) {
    if (this.isLineageEnabled()) {
      this.assignLineageRefs(gen, sortedPopulation);
    }

    const entry = this.buildGenerationEntry(gen, sortedPopulation);
    this.history.push(entry);
    return entry;
  }

  evolveNextPopulation(sortedPopulation, generation) {
    const P = this.engineConfig.populationSize;
    const eliteCount = Math.min(this.engineConfig.elitismCount, P);

    const elites = sortedPopulation.slice(0, eliteCount).map(parent => {
      const clone = parent.clone();
      clone.lineageRef = null;
      if (this.isLineageEnabled()) {
        clone.lineage = {
          state: "elite",
          parents: parent.lineageRef ? [this.cloneRef(parent.lineageRef)] : []
        };
      }
      return clone;
    });

    const nextPopulation = [...elites];
    const mutationContext = this.buildMutationContext(generation);

    while (nextPopulation.length < P) {
      const p1 = this.selectParent(sortedPopulation);
      const p2 = this.selectParent(sortedPopulation);

      let [c1, c2] = this.crossover(p1, p2);

      this.mutate(c1, mutationContext);
      this.mutate(c2, mutationContext);

      this.repairOffspring(c1);
      this.repairOffspring(c2);

      // Collinear offspring are rare, but if they occur,
      // they are discarded and the loop continues.

      if (c1.isValid()) {
        nextPopulation.push(c1);
      }

      if (nextPopulation.length < P && c2.isValid()) {
        nextPopulation.push(c2);
      }
    }

    return nextPopulation;
  }

  run() {
    this.history = [];

    let population = this.initializePopulation();
    this.evaluatePopulation(population);

    let sorted = this.getSortedPopulation(population);
    this.recordGeneration(0, sorted);

    for (let gen = 1; gen <= this.engineConfig.maxGenerations; gen++) {
      population = this.evolveNextPopulation(sorted, gen);
      this.evaluatePopulation(population);
      sorted = this.getSortedPopulation(population);
      this.recordGeneration(gen, sorted);
    }

    return { history: this.history };
  }

  runWithProgress(onGeneration, updateInterval = 1) {
    this.history = [];

    const step = Math.max(1, updateInterval);

    let population = this.initializePopulation();
    this.evaluatePopulation(population);

    let sorted = this.getSortedPopulation(population);
    this.recordGeneration(0, sorted);

    if (onGeneration) {
      onGeneration(0);
    }

    for (let gen = 1; gen <= this.engineConfig.maxGenerations; gen++) {
      population = this.evolveNextPopulation(sorted, gen);
      this.evaluatePopulation(population);
      sorted = this.getSortedPopulation(population);
      this.recordGeneration(gen, sorted);

      if (
        onGeneration &&
        (gen % step === 0 || gen === this.engineConfig.maxGenerations)
      ) {
        onGeneration(gen);
      }
    }

    return { history: this.history };
  }
}