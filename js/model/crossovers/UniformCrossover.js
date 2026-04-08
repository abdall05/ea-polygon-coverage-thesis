import { BaseCrossover } from "./BaseCrossover.js";

export class UniformCrossover extends BaseCrossover {
    type = "UniformCrossover";
    constructor(params = {}, rng = null) {
        super({ geneSwapRate: 0.5, ...params });
    }

    crossoverGenomes(child1, child2) {
        const g1 = child1.genome;
        const g2 = child2.genome;

        if (g1.length !== g2.length) {
            throw new Error("UniformCrossover: genome lengths differ");
        }

        for (let i = 0; i < g1.length; i++) {
            if (this.rng.random() < this.params.geneSwapRate) {
                const tmp = g1[i];
                g1[i] = g2[i];
                g2[i] = tmp;
            }
        }
    }
}
