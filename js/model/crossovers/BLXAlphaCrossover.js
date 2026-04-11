import { BaseCrossover } from './BaseCrossover.js';

export class BLXAlphaCrossover extends BaseCrossover {
    type = 'BLXAlphaCrossover';

    constructor(params = {}, rng = null) {
        super({ alpha: 0.5, ...params }, rng);
    }

    crossoverGenomes(c1, c2) {
        const alpha = this.params.alpha;

        for (let i = 0; i < c1.genome.length; i++) {
            const x1 = c1.genome[i];
            const x2 = c2.genome[i];

            const min = Math.min(x1, x2);
            const max = Math.max(x1, x2);
            const d = max - min;

            const lower = min - alpha * d;
            const upper = max + alpha * d;

            c1.genome[i] = lower + this.rng.random() * (upper - lower);
            c2.genome[i] = lower + this.rng.random() * (upper - lower);
        }
    }
}