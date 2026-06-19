import { INDIVIDUAL_TYPES } from '../individuals/individualConfig.js';

export class BaseMutation {
  constructor(type, params = {}, rng = null) {
    if (new.target === BaseMutation) {
      throw new Error('BaseMutation is abstract');
    }

    if (!type) {
      throw new Error('BaseMutation requires a type');
    }

    this.type = type;
    this.params = { ...params };
    this.rng = rng ?? Math;

    const mutationRate = this.params.mutationRate;
    if (!Number.isFinite(mutationRate) || mutationRate < 0 || mutationRate > 1) {
      throw new Error(`${this.type} requires a valid mutationRate in [0, 1]`);
    }
  }

  apply(individual, context = {}) {
    if (individual.type === INDIVIDUAL_TYPES.CARTESIAN) {
      this.applyCartesian(individual, context);
      return;
    }

    if (individual.type === INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER) {
      this.applyPolarVariableCenter(individual, context);
      return;
    }

    if (individual.type === INDIVIDUAL_TYPES.POLAR_FIXED_CENTER) {
      this.applyPolarFixedCenter(individual, context);
      return;
    }

    throw new Error(`Unknown individual type: ${individual.type}`);
  }

  applyCartesian(ind, context = {}) {
    throw new Error(`${this.type} must implement applyCartesian(ind, context)`);
  }

  applyPolarVariableCenter(ind, context = {}) {
    throw new Error(`${this.type} must implement applyPolarVariableCenter(ind, context)`);
  }

  applyPolarFixedCenter(ind, context = {}) {
    throw new Error(`${this.type} must implement applyPolarFixedCenter(ind, context)`);
  }
}