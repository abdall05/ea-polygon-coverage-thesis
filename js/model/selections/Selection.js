export class Selection {
  type = 'base-selection';

  constructor(params = {}, rng = null) {
    if (new.target === Selection) {
      throw new Error('Selection is abstract');
    }

    this.params = { ...params };
    this.rng = rng ?? Math;
  }

  select(population, compareFitness) {
    throw new Error(`${this.type} must implement select(population, compareFitness)`);
  }
}