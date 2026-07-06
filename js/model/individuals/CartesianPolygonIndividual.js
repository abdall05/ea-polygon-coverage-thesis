import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { INDIVIDUAL_TYPES } from './individualConfig.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { GEOMETRY_CONFIG } from '../geometry/geometryConfig.js';

export class CartesianPolygonIndividual extends BasePolygonIndividual {
  static TYPE = INDIVIDUAL_TYPES.CARTESIAN;

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

  genomeToPoints() {
    const rawPoints = [];

    for (let i = 0; i < this.genome.length; i += 2) {
      rawPoints.push({
        x: this.genome[i],
        y: this.genome[i + 1]
      });
    }

    return rawPoints;
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

    const min = GEOMETRY_CONFIG.WORLD_MIN;
    const max = GEOMETRY_CONFIG.WORLD_MAX;
    const range = max - min;

    if (range <= 0) {
      return 0;
    }

    let sum = 0;

    for (let i = 0; i < this.genome.length; i++) {
      sum += Math.abs(this.genome[i] - other.genome[i]) / range;
    }

    return sum / this.genome.length;
  }
}