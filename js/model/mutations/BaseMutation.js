export class BaseMutation {
  type = "BaseMutation";
  constructor(params = {}, rng = null) {
    if (new.target === BaseMutation) throw new Error("BaseMutation is abstract");

    this.params = { mutationRate: 0.1, ...params };
    this.rng = rng || Math;
  }

  setParams(params) {
    this.params = { ...this.params, ...params };
  }

  // This decides WHICH version to call
  apply(individual) {
    if (individual.type === 'cartesian') {
      this.applyCartesian(individual);
    } else if (individual.type === 'polar') {
      this.applyPolar(individual);
    } else {
      throw new Error(`Unknown individual type: ${individual.type}`);
    }
  }
  // These MUST be implemented by child classes!
  applyCartesian(ind) {
    throw new Error(`${this.type} must implement applyCartesian()`);
  }

  applyPolar(ind) {
    throw new Error(`${this.type} must implement applyPolar()`);
  }
}