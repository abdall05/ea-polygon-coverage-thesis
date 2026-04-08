
import { createGenerator } from '../utils/random.js';
export const rngState = {
    generators: {
        global: null,
        points: null,
        mutation: null,
        crossover: null,
        selection: null
    },

    initialize(seed) {
        this.generators.global = createGenerator(seed);
        this.generators.points = createGenerator(seed + 1);
        this.generators.mutation = createGenerator(seed + 2);
        this.generators.crossover = createGenerator(seed + 3);
        this.generators.selection = createGenerator(seed + 4);

    },

    get(type) {
        return this.generators[type];
    }
};