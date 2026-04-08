// UniformMutation.js
import { BaseMutation } from './BaseMutation.js';

export class UniformMutation extends BaseMutation {
  type = "UniformMutation";

  
  applyCartesian(ind) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (this.rng.random() < this.params.mutationRate) {
        ind.genome[i] = this.rng.random(); // Completely new random value
      }
    }
  }
  
  applyPolar(ind) {
    for (let i = 0; i < ind.genome.length; i++) {
      if (this.rng.random() < this.params.mutationRate) {
        if (i < 2) {
          ind.genome[i] = this.rng.random(); // New center
        } else if (i % 2 === 0) {
          ind.genome[i] = this.rng.random() * 2 * Math.PI; // New angle
        } else {
          ind.genome[i] = this.rng.random() * 0.5; // New radius
        }
      }
    }
  }
}