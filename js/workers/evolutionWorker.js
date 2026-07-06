import { MutationFactory } from '../model/mutations/MutationFactory.js';
import { CrossoverFactory } from '../model/crossovers/CrossoverFactory.js';
import { SelectionFactory } from '../model/selections/SelectionFactory.js';
import { FitnessEvaluator } from '../model/fitness/FitnessEvaluator.js';
import { EvolutionEngine } from '../model/engine/EvolutionEngine.js';
import { createRNG } from '../utils/rng.js';

function buildEngine({ evolutionParams, points, resultConfig, seed }) {
    const useSeed = (seed !== undefined && seed !== null);
    const rngs = useSeed ? {
        initialization: createRNG(seed + 1),
        mutation: createRNG(seed + 2),
        crossover: createRNG(seed + 3),
        selection: createRNG(seed + 4)
    } : {
        initialization: null,
        mutation: null,
        crossover: null,
        selection: null
    };

    const mutationOp = MutationFactory.create(
        evolutionParams.mutation.type,
        evolutionParams.mutation.params,
        rngs.mutation
    );

    const crossoverOp = evolutionParams.crossover.type !== 'none'
        ? CrossoverFactory.create(
            evolutionParams.crossover.type,
            evolutionParams.crossover.params,
            rngs.crossover
        )
        : null;

    const selectionOp = SelectionFactory.create(
        evolutionParams.selection.type,
        evolutionParams.selection.params,
        rngs.selection
    );
    const fitnessEvaluator = new FitnessEvaluator(points);

    const engineConfig = {
        populationSize: evolutionParams.popSize,
        maxGenerations: evolutionParams.genCount,
        elitismCount: evolutionParams.elitismCount
    };

    const problemConfig = {
        representationType: evolutionParams.representation,
        nVertices: evolutionParams.nVertices
    };

    const operators = {
        mutationOp: mutationOp,
        crossoverOp: crossoverOp,
        fitnessEvaluator: fitnessEvaluator,
        selectionOp: selectionOp
    };

    return new EvolutionEngine(
        engineConfig,
        resultConfig,
        problemConfig,
        operators,
        rngs.initialization
    );
}

self.onmessage = async (e) => {
    const { evolutionParams, points, resultConfig, updateInterval, numRuns, seed } = e.data;
    const runs = (numRuns !== undefined && numRuns > 0) ? numRuns : 1;

    try {
        if (runs === 1) {
            const engine = buildEngine({ evolutionParams, points, resultConfig, seed });
            const result = engine.runWithProgress(
                (gen) => self.postMessage({ type: 'progress', generation: gen }),
                updateInterval || 10
            );
            self.postMessage({ type: 'complete', history: result.history || [] });
            return;
        }

        const results = [];
        const baseSeed = (seed !== undefined && seed !== null) ? Number(seed) : null;
        for (let runIdx = 0; runIdx < runs; runIdx++) {
            const runSeed = baseSeed !== null ? baseSeed + runIdx * 10000 : null;
            const engine = buildEngine({ evolutionParams, points, resultConfig, seed: runSeed });
            const result = engine.run();
            results.push({ run: runIdx + 1, history: result.history || [] });
            self.postMessage({ type: 'runProgress', runCompleted: runIdx + 1, totalRuns: runs });
        }
        self.postMessage({ type: 'complete', results });
    } catch (err) {
        self.postMessage({ type: 'error', message: err?.message ?? String(err) });
    }
};