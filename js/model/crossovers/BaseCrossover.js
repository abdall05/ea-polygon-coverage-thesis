export class BaseCrossover {
  type = 'base-crossover';

  constructor(params = {}, rng = null) {
    if (new.target === BaseCrossover) {
      throw new Error('BaseCrossover is abstract');
    }

    this.params = { ...params };
    this.rng = rng ?? Math;

    const crossoverRate = this.params.crossoverRate;
    if (!Number.isFinite(crossoverRate) || crossoverRate < 0 || crossoverRate > 1) {
      throw new Error(`${this.type} requires a valid crossoverRate in [0, 1]`);
    }
  }

  apply(p1, p2) {
    if (this.rng.random() > this.params.crossoverRate) {
      return [p1.clone(), p2.clone()];
    }

    const c1 = p1.clone();
    const c2 = p2.clone();
    this.crossoverGenomes(c1, c2);
    return [c1, c2];
  }

  crossoverGenomes(c1, c2) {
    throw new Error(`${this.type} must implement crossoverGenomes(c1, c2)`);
  }
}