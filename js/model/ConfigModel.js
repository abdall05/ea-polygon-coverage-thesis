// models/ConfigModel.js
export class ConfigModel {
    constructor() {
        // Randomness
        this.globalSeed = 42;
        
        // Point Set
        this.pointSet = 'uniform';
        
        // Representation
        this.representation = 'cartesian';
        
        // Mutation
        this.mutation = {
            type: 'GaussianMutation',
            GaussianMutation: {
                rate: 0.1,
                stepSize: 0.1
            },
            UniformMutation: {
                rate: 0.1
            },
            BigJumpMutation: {
                rate: 0.1,
                jumpSize: 0.5
            }
        };
        
        // Crossover
        this.crossover = {
            type: 'none',
            none: {},
            UniformCrossover: {
                rate: 0.8,
                swapRate: 0.5
            }
        };
        
        // EA Parameters
        this.popSize = 100;
        this.genCount = 150;
        this.tournamentSize = 2;
        this.elitismCount = 2;
        this.nVertices = 7;
        
        // Experiment
        this.experiment = {
            type: 'general',
            numRuns: 30
        };
    }
}