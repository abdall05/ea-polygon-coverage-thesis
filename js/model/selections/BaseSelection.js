export class BaseSelection {
  constructor(params = {}, rng = null) {
    if (new.target === BaseSelection) {
      throw new TypeError('BaseSelection is abstract');
    }

    if (new.target.TYPE === undefined) {
      throw new TypeError(`${new.target.name} must define static TYPE`);
    }

    this.type = new.target.TYPE;
    this.params = { ...params };
    this.rng = rng ?? Math;
  }

  select(population, compareFitness) {
    throw new TypeError(`${this.type} must implement select(population, compareFitness)`);
  }
}