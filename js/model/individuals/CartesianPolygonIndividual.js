
import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../PolygonGeometry.js';
export class CartesianPolygonIndividual extends BasePolygonIndividual {
  type = 'cartesian';

  generateGenome(N) {
    const points = PolygonGeometry.generateRandomPolygon(N, 'cartesian', this.rng);
    const genome = [];
    for (const p of points) {
      genome.push(p.x, p.y);
    }
    return genome;
  }
  decodePolygon() {
    const points = [];
    for (let i = 0; i < this.genome.length; i += 2) {
      points.push({
        x: this.genome[i],
        y: this.genome[i + 1]
      });
    }
    return points;
  }

  clone() {
    // Create empty individual WITHOUT generating random genome
    const copy = Object.create(CartesianPolygonIndividual.prototype);
    copy.N = this.N;
    copy.clampableGenes = this.clampableGenes;
    copy.type = this.type;
    copy.genome = [...this.genome];
    copy.fitness = { ...this.fitness };
    return copy;
  }

  // Fix vertex order
  fixOrder() {
    const points = this.decodePolygon();
    const { points: fixedPoints, changed } = PolygonGeometry.fixPolygonOrder(points);

    if (changed) {
      for (let i = 0; i < fixedPoints.length; i++) {
        this.genome[2 * i] = fixedPoints[i].x;
        this.genome[2 * i + 1] = fixedPoints[i].y;
      }
    }

    return changed;
  }

  // Clamp points to bounding box and return clamp rate for this individual
  clampGenome() {
    const clampableGenes = 2 * this.N; // x,y for each vertex
    const points = this.decodePolygon();
    const { clampedPoints, numClampedValues } = PolygonGeometry.clampCartesianPoints(points);
    
    for (let i = 0; i < clampedPoints.length; i++) {
      this.genome[2 * i] = clampedPoints[i].x;
      this.genome[2 * i + 1] = clampedPoints[i].y;
    }

    return numClampedValues / clampableGenes; // return clamp rate for this individual
  }
}