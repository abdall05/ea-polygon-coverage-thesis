import { BaseMutation } from './BaseMutation.js';

export class CauchyMutation extends BaseMutation {
  type = "CauchyMutation";

  constructor(params = {}, rng = null) {
    super({ stepSize: 0.1, ...params }, rng);
  }

  cauchyRandom(location, scale, rng) {
    let u = 0;
    while (u === 0 || u === 1) u = rng.random();
    return location + scale * Math.tan(Math.PI * (u - 0.5));
  }

  applyCartesian(ind) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (this.rng.random() < this.params.mutationRate) {
        ind.genome[i] += this.cauchyRandom(0, this.params.stepSize, this.rng);
      }
    }
  }

  applyPolar(ind) {
    const centerStep = this.params.stepSize * 1.0;
    const angleStep = this.params.stepSize * (2 * Math.PI);
    const radiusStep = this.params.stepSize * 1.0;

    for (let i = 0; i < ind.genome.length; i++) {
      if (this.rng.random() < this.params.mutationRate) {
        if (i < 2) {
          ind.genome[i] += this.cauchyRandom(0, centerStep, this.rng);
        } else if (i % 2 === 0) {
          ind.genome[i] += this.cauchyRandom(0, angleStep, this.rng);
        } else {
          ind.genome[i] += this.cauchyRandom(0, radiusStep, this.rng);
        }
      }
    }
  }
}