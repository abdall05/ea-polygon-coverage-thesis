import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { circularAngleDiff } from '../../utils/math.js';
import { GEOMETRY_CONFIG } from '../geometry/geometryConfig.js';
import { INDIVIDUAL_TYPES } from './individualConfig.js';

export class FixedCenterPolarPolygonIndividual extends BasePolygonIndividual {
  constructor(N, rng = null) {
    super(INDIVIDUAL_TYPES.POLAR_FIXED_CENTER, N, rng);
    this.genome = this.generateGenome();
  }

  generateGenome() {
    const { angles, radii } = PolygonGeometry.generateRandomPolygon(
      this.N,
      this.type,
      this.rng
    );

    const genome = [];
    for (let i = 0; i < angles.length; i++) {
      genome.push(angles[i], radii[i]);
    }
    return genome;
  }

  decodePolygon() {
    const { x: cx, y: cy } = GEOMETRY_CONFIG.FIXED_POLAR_CENTER;
    const rawPoints = [];

    for (let i = 0; i < this.genome.length; i += 2) {
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
    const copy = Object.create(FixedCenterPolarPolygonIndividual.prototype);
    copy.N = this.N;
    copy.type = this.type;
    copy.genome = [...this.genome];
    copy.fitness = { ...this.fitness };
    copy.rng = this.rng;
    copy.lineage = this.lineage;
    return copy;
  }

  clampGenome() {
    const { x: cx, y: cy } = GEOMETRY_CONFIG.FIXED_POLAR_CENTER;
    const angles = [];
    const radii = [];

    for (let i = 0; i < this.genome.length; i += 2) {
      angles.push(this.genome[i]);
      radii.push(this.genome[i + 1]);
    }

    const result = PolygonGeometry.clampPolarParams(cx, cy, angles, radii);

    for (let i = 0; i < this.N; i++) {
      this.genome[2 * i] = result.angles[i];
      this.genome[2 * i + 1] = result.radii[i];
    }
  }

  normalizedGenotypeDistance(other) {
    if (!other || !other.genome || other.genome.length !== this.genome.length) {
      return 0;
    }

    let sum = 0;

    for (let i = 0; i < this.genome.length; i += 2) {
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