import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { circularAngleDiff } from '../../utils/math.js';
import { GEOMETRY_CONFIG } from '../geometry/geometryConfig.js';
import { INDIVIDUAL_TYPES } from './individualConfig.js';


export class FixedCenterPolarPolygonIndividual extends BasePolygonIndividual {
  static TYPE = INDIVIDUAL_TYPES.POLAR_FIXED_CENTER;

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

  genomeToPoints() {
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

    return rawPoints;
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

    const { x: cx, y: cy } = GEOMETRY_CONFIG.FIXED_POLAR_CENTER;
    const min = GEOMETRY_CONFIG.WORLD_MIN;
    const max = GEOMETRY_CONFIG.WORLD_MAX;

    const maxRadius = Math.max(
      Math.hypot(cx - min, cy - min),
      Math.hypot(cx - min, cy - max),
      Math.hypot(cx - max, cy - min),
      Math.hypot(cx - max, cy - max)
    );

    let sum = 0;

    for (let i = 0; i < this.genome.length; i += 2) {
      const thetaA = this.genome[i];
      const rA = this.genome[i + 1];

      const thetaB = other.genome[i];
      const rB = other.genome[i + 1];

      const angleDistance = circularAngleDiff(thetaA, thetaB) / Math.PI;
      const radiusDistance =
        maxRadius > 0 ? Math.abs(rA - rB) / maxRadius : 0;

      sum += angleDistance;
      sum += radiusDistance;
    }

    return sum / this.genome.length;
  }
}