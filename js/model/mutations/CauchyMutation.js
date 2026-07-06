import { BaseMutation } from './BaseMutation.js';
import { MUTATION_TYPES } from './mutationConfig.js';
import { cauchyRandom } from '../../utils/math.js';
export class CauchyMutation extends BaseMutation {
  static TYPE = MUTATION_TYPES.CAUCHY;

  mutateGene(ind, index, scale) {
    if (this.rng.random() < this.params.mutationRate) {
      ind.genome[index] += cauchyRandom(0, scale, this.rng);
    }
  }

  applyCartesian(ind, context = {}) {
    const { stepSize } = this.params;

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, stepSize);
    }
  }

  applyCenterRelativeCartesian(ind, context = {}) {
    const { stepSize } = this.params;

    for (let i = 0; i < ind.genome.length; i++) {
      this.mutateGene(ind, i, stepSize);
    }
  }

  applyPolarVariableCenter(ind, context = {}) {
    const { centerStepSize, angleStepSize, radiusStepSize } = this.params;

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
    const { angleStepSize, radiusStepSize } = this.params;

    for (let i = 0; i < ind.genome.length; i++) {
      if (i % 2 === 0) {
        this.mutateGene(ind, i, angleStepSize);
      } else {
        this.mutateGene(ind, i, radiusStepSize);
      }
    }
  }
}