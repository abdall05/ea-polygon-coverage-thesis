import { PolygonGeometry } from '../geometry/PolygonGeometry.js';

export class BasePolygonIndividual {
  constructor(N, rng = null) {
    if (new.target === BasePolygonIndividual) {
      throw new TypeError(
        'BasePolygonIndividual is abstract and cannot be instantiated directly'
      );
    }

    if (new.target.TYPE === undefined) {
      throw new TypeError(`${new.target.name} must define static TYPE`);
    }

    this.type = new.target.TYPE;
    this.fitness = { coverage: 0, area: 0 };
    this.N = N;
    this.rng = rng ?? Math;
    this.lineage = null;

    this.genome = this.generateGenome();

    
  }


  isValid() {
    return PolygonGeometry.isValidPolygonPointSet(
      this.genomeToPoints()
    );
  }

  generateGenome() {
    throw new TypeError('generateGenome() must be implemented by subclass');
  }

  decodePolygon() {
    return PolygonGeometry.sortVerticesAroundCentroid(this.genomeToPoints());
  }

  genomeToPoints() {
    throw new TypeError('genomeToPoints() must be implemented by subclass');
  }

  mutate(operator, context = {}) {
    if (!operator || typeof operator.apply !== 'function') {
      throw new TypeError('operator must define apply(individual, context)');
    }

    operator.apply(this, context);
  }

  repair(options = { clamp: true }) {
    if (options?.clamp) {
      this.clampGenome();
    }
  }

  clampGenome() { }

  clone() {
    const copy = Object.create(Object.getPrototypeOf(this));
    copy.N = this.N;
    copy.type = this.type;
    copy.genome = this.genome ? [...this.genome] : null;
    copy.fitness = { ...this.fitness };
    copy.rng = this.rng;
    copy.lineage = this.lineage;
    return copy;
  }

  normalizedGenotypeDistance(other) {
    throw new TypeError(
      'normalizedGenotypeDistance(other) must be implemented by subclass'
    );
  }

}

