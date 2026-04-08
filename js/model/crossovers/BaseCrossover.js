export class BaseCrossover {
  type = "BaseCrossover";

  constructor(params = {}, rng = null) {
    if (new.target === BaseCrossover) {
      throw new Error("BaseCrossover is abstract");
    }
    this.params = { crossoverRate: 0.8, ...params };
    this.rng = rng || Math;
  }

  apply(p1, p2) {
    if (this.rng.random() > this.params.crossoverRate) return [p1.clone(), p2.clone()];
    const c1 = p1.clone();
    const c2 = p2.clone();
    this.crossoverGenomes(c1, c2);
    return [c1, c2];
  }

  crossoverGenomes(c1, c2) { throw new Error("implement"); }
}
