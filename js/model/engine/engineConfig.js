export const evolutionFieldConfig = Object.freeze({
  populationSize: Object.freeze({
    label: 'Population Size',
    default: 100,
    min: 1,
    step: 1
  }),

  maxGenerations: Object.freeze({
    label: 'Generations',
    default: 150,
    min: 1,
    step: 1
  }),

  elitismCount: Object.freeze({
    label: 'Elitism Count',
    default: 2,
    min: 1,
    step: 1
  })
});

export const DEFAULT_EVOLUTION_CONFIG = Object.freeze({
  populationSize: evolutionFieldConfig.populationSize.default,
  maxGenerations: evolutionFieldConfig.maxGenerations.default,
  elitismCount: evolutionFieldConfig.elitismCount.default
});