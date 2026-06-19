import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { INDIVIDUAL_TYPES } from './individualConfig.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';

export class CartesianPolygonIndividual extends BasePolygonIndividual {
  constructor(N, rng = null) {
    super(INDIVIDUAL_TYPES.CARTESIAN, N, rng);
    this.genome = this.generateGenome();
  }

  generateGenome() {
    const points = PolygonGeometry.generateRandomPolygon(
      this.N,
      this.type,
      this.rng
    );

    const genome = [];
    for (const p of points) {
      genome.push(p.x, p.y);
    }

    return genome;
  }

  decodePolygon() {
    const rawPoints = [];

    for (let i = 0; i < this.genome.length; i += 2) {
      rawPoints.push({
        x: this.genome[i],
        y: this.genome[i + 1]
      });
    }

    return PolygonGeometry.fixPolygonOrder(rawPoints);
  }

  clone() {
    const copy = Object.create(CartesianPolygonIndividual.prototype);
    copy.N = this.N;
    copy.type = this.type;
    copy.rng = this.rng;
    copy.genome = [...this.genome];
    copy.fitness = { ...this.fitness };
    copy.lineage = this.lineage;
    return copy;
  }

  clampGenome() {
    const rawPoints = [];

    for (let i = 0; i < this.genome.length; i += 2) {
      rawPoints.push({
        x: this.genome[i],
        y: this.genome[i + 1]
      });
    }

    const clampedPoints = PolygonGeometry.clampCartesianPoints(rawPoints);

    for (let i = 0; i < clampedPoints.length; i++) {
      this.genome[2 * i] = clampedPoints[i].x;
      this.genome[2 * i + 1] = clampedPoints[i].y;
    }
  }

  normalizedGenotypeDistance(other) {
    if (!other || !other.genome || other.genome.length !== this.genome.length) {
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < this.genome.length; i++) {
      sum += Math.abs(this.genome[i] - other.genome[i]);
    }

    return sum / this.genome.length;
  }
}