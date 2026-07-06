import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';
import { gaussianRandom } from '../../utils/math.js';

export class GaussianMutation extends BaseMutation {
  static TYPE = MUTATION_TYPES.GAUSSIAN;

  mutateGene(ind, index, sigma) {
    if (this.rng.random() < this.params.mutationRate) {
      ind.genome[index] += gaussianRandom(0, sigma, this.rng);
    }
  }

  applyCartesian(ind, context = {}) {
    const sigma = this.params.stepSize;

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, sigma);
    }
  }

  applyCenterRelativeCartesian(ind, context = {}) {
    const sigma = this.params.stepSize;

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, sigma);
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    const centerStepSize = this.params.centerStepSize;
    const angleStepSize = this.params.angleStepSize;
    const radiusStepSize = this.params.radiusStepSize;

    for (let i = 0; i < ind.genome.length; i++) {
      if (i < 2) {
        this.mutateGene(ind, i, centerStepSize);
      } else if (i % 2 === 0) {
        this.mutateGene(ind, i, angleStepSize);
      } else {
        this.mutateGene(ind, i, radiusStepSize);
      }
    }
  }

  applyPolarFixedCenter(ind, context = {}) {
    const angleStepSize = this.params.angleStepSize;
    const radiusStepSize = this.params.radiusStepSize;

    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        this.mutateGene(ind, i, angleStepSize);
      } else {
        this.mutateGene(ind, i, radiusStepSize);
      }
    }
  }
}