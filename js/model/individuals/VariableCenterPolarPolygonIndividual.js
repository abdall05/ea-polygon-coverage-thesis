import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { circularAngleDiff } from '../../utils/math.js';
import { INDIVIDUAL_TYPES } from './individualConfig.js';

export class VariableCenterPolarPolygonIndividual extends BasePolygonIndividual {
  constructor(N, rng = null) {
    super(INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER, N, rng);
    this.genome = this.generateGenome();
  }

  generateGenome() {
    const { cx, cy, angles, radii } = PolygonGeometry.generateRandomPolygon(
      this.N,
      this.type,
      this.rng
    );

    const genome = [cx, cy];
    for (let i = 0; i < angles.length; i++) {
      genome.push(angles[i], radii[i]);
    }
    return genome;
  }

  decodePolygon() {
    const cx = this.genome[0];
    const cy = this.genome[1];
    const rawPoints = [];

    for (let i = 2; i < this.genome.length; i += 2) {
      const theta = this.genome[i];
      const r = this.genome[i + 1];

      rawPoints.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta)
      });
    }

    return PolygonGeometry.fixPolygonOrder(rawPoints);
  }

  clone() {
    const copy = Object.create(VariableCenterPolarPolygonIndividual.prototype);
    copy.N = this.N;
    copy.type = this.type;
    copy.genome = [...this.genome];
    copy.fitness = { ...this.fitness };
    copy.rng = this.rng;
    copy.lineage = this.lineage;
    return copy;
  }

  clampGenome() {
    const cx = this.genome[0];
    const cy = this.genome[1];
    const angles = [];
    const radii = [];

    for (let i = 2; i < this.genome.length; i += 2) {
      angles.push(this.genome[i]);
      radii.push(this.genome[i + 1]);
    }

    const result = PolygonGeometry.clampPolarParams(cx, cy, angles, radii);

    this.genome[0] = result.cx;
    this.genome[1] = result.cy;

    for (let i = 0; i < this.N; i++) {
      this.genome[2 + 2 * i] = result.angles[i];
      this.genome[2 + 2 * i + 1] = result.radii[i];
    }
  }

  normalizedGenotypeDistance(other) {
    if (!other || !other.genome || other.genome.length !== this.genome.length) {
      return 0;
    }

    let sum = 0;

    sum += Math.abs(this.genome[0] - other.genome[0]);
    sum += Math.abs(this.genome[1] - other.genome[1]);

    for (let i = 2; i < this.genome.length; i += 2) {
      const thetaA = this.genome[i];
      const rA = this.genome[i + 1];

      const thetaB = other.genome[i];
      const rB = other.genome[i + 1];

      sum += circularAngleDiff(thetaA, thetaB) / Math.PI;
      sum += Math.abs(rA - rB);
    }

    return sum / this.genome.length;
  }
}