import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { circularAngleDiff } from '../../utils/math.js';
import { INDIVIDUAL_TYPES } from './individualConfig.js';
import { GEOMETRY_CONFIG } from '../geometry/geometryConfig.js';


export class VariableCenterPolarPolygonIndividual extends BasePolygonIndividual {
  static TYPE = INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER;

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

  genomeToPoints() {
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

    return rawPoints;
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

    const min = GEOMETRY_CONFIG.WORLD_MIN;
    const max = GEOMETRY_CONFIG.WORLD_MAX;
    const range = max - min;
    const diagonal = Math.hypot(range, range);

    if (range <= 0 || diagonal <= 0) {
      return 0;
    }

    let sum = 0;

    // Centre coordinates
    sum += Math.abs(this.genome[0] - other.genome[0]) / range;
    sum += Math.abs(this.genome[1] - other.genome[1]) / range;

    // Angle-radius pairs
    for (let i = 2; i < this.genome.length; i += 2) {
      const thetaA = this.genome[i];
      const rA = this.genome[i + 1];

      const thetaB = other.genome[i];
      const rB = other.genome[i + 1];

      const angleDistance = circularAngleDiff(thetaA, thetaB) / Math.PI;
      const radiusDistance = Math.abs(rA - rB) / diagonal;

      sum += angleDistance;
      sum += radiusDistance;
    }

    return sum / this.genome.length;
  }
}