export class BasePolygonIndividual {
  constructor(type, N, rng = null) {
    if (new.target === BasePolygonIndividual) {
      throw new Error('BasePolygonIndividual is abstract');
    }

    if (!type) {
      throw new Error('BasePolygonIndividual requires a type');
    }

    this.type = type;
    this.fitness = { coverage: 0, area: 0 };
    this.N = N;
    this.rng = rng ?? Math;
    this.lineage = null;
    this.genome = null;
  }

  generateGenome() {
    throw new Error('generateGenome() must be implemented by subclass');
  }

  decodePolygon() {
    throw new Error('decodePolygon() must be implemented by subclass');
  }

  mutate(operator, context = {}) {
    operator.apply(this, context);
  }

  repair(options = { clamp: true }) {
    if (options.clamp && typeof this.clampGenome === 'function') {
      this.clampGenome();
    }
  }

  fixOrder() {}
  clampGenome() {}

  clone() {
    throw new Error('clone() must be implemented by subclass');
  }

  normalizedGenotypeDistance(other) {
    throw new Error('normalizedGenotypeDistance(other) must be implemented by subclass');
  }
}