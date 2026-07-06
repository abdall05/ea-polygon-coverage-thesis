import { INDIVIDUAL_TYPES } from '../individuals/individualConfig.js';

export class BaseMutation {
  constructor(params = {}, rng = null) {
    if (new.target === BaseMutation) {
      throw new Error('BaseMutation is abstract');
    }

    if (new.target.TYPE === undefined) {
      throw new Error(`${new.target.name} must define static TYPE`);
    }

    this.type = new.target.TYPE;
    this.params = { ...params };
    this.rng = rng ?? Math;
  }

  apply(individual, context = {}) {
    if (individual.type === INDIVIDUAL_TYPES.CARTESIAN) {
      this.applyCartesian(individual, context);
      return;
    }

    if (individual.type === INDIVIDUAL_TYPES.CENTER_RELATIVE_CARTESIAN) {
      this.applyCenterRelativeCartesian(individual, context);
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

    throw new TypeError(`Unsupported individual type: ${individual.type}`);
  }

  applyCartesian(ind, context = {}) {
    throw new Error(`${this.type} must implement applyCartesian(ind, context)`);
  }

  applyCenterRelativeCartesian(ind, context = {}) {
    throw new Error(`${this.type} must implement applyCenterRelativeCartesian(ind, context)`);
  }

  applyPolarVariableCenter(ind, context = {}) {
    throw new Error(`${this.type} must implement applyPolarVariableCenter(ind, context)`);
  }

  applyPolarFixedCenter(ind, context = {}) {
    throw new Error(`${this.type} must implement applyPolarFixedCenter(ind, context)`);
  }
}