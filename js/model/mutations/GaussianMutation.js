// GaussianMutation.js
import { BaseMutation } from './BaseMutation.js';

export class GaussianMutation extends BaseMutation {
  type = "GaussianMutation";
  constructor(params = {}, rng = null) {
    super({ stepSize: 0.1, ...params }, rng);
  }
  // Using Box-Muller transform to generate Gaussian(0, sigma)
  gaussianRandom(mean, sigma, rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng.random();
    while (v === 0) v = rng.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + sigma * z;
  }
  // Cartesian version
  applyCartesian(ind) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (this.rng.random() < this.params.mutationRate) {
        ind.genome[i] += this.gaussianRandom(0, this.params.stepSize, this.rng);;
        // NO CLAMPING/ NO ORDER FiX - let repair handle it
      }
    }
  }

  // Polar version
  applyPolar(ind) {
    const centerStep = this.params.stepSize * 1.0;
    const angleStep = this.params.stepSize * (2 * Math.PI);
    const radiusStep = this.params.stepSize * 1.0;

    for (let i = 0; i < ind.genome.length; i++) {
      if (this.rng.random() < this.params.mutationRate) {
        if (i < 2) {
          // Center coordinates
          ind.genome[i] += this.gaussianRandom(0, centerStep, this.rng);
        } else if (i % 2 === 0) {
          // Angles
          ind.genome[i] += this.gaussianRandom(0, angleStep, this.rng);
          // No modulo here — let repair() wrap to [0, 2π)
        } else {
          // Radii
          ind.genome[i] += this.gaussianRandom(0, radiusStep, this.rng);
          // No clamping here — let repair() enforce feasibility
        }
      }
    }
  }
}