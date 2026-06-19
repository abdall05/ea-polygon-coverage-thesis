import { PolygonGeometry } from '../geometry/PolygonGeometry.js';

export class LocalityMeasurement {
  constructor({ individual, mutation }) {
    if (!individual) {
      throw new Error('LocalityMeasurement requires an individual');
    }

    if (!mutation) {
      throw new Error('LocalityMeasurement requires a mutation operator');
    }

    this.individual = individual;
    this.mutation = mutation;
  }

  compute() {
    const original = this.individual;
    const mutated = original.clone();

    const polyBefore = original.decodePolygon();

    this.mutation.apply(mutated);
    mutated.repair();

    const polyAfter = mutated.decodePolygon();

    const dG = original.normalizedGenotypeDistance(mutated);
    const dP = PolygonGeometry.normalizedPolygonDistance(polyBefore, polyAfter);

    if (dG === 0) {
      return { dG, dP, ratio: null };
    }

    return { dG, dP, ratio: dP / dG };
  }
}