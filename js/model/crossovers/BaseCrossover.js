export class BaseCrossover {
  constructor(params = {}, rng = null) {
    if (new.target === BaseCrossover) {
      throw new TypeError('BaseCrossover is abstract');
    }

    if (new.target.TYPE === undefined) {
      throw new TypeError(`${new.target.name} must define static TYPE`);
    }

    this.type = new.target.TYPE;
    this.params = { ...params };
    this.rng = rng ?? Math;
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
    throw new TypeError(`${this.type} must implement crossoverGenomes(c1, c2)`);
  }
}