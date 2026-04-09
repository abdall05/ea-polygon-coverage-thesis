
import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../PolygonGeometry.js';
export class CartesianPolygonIndividual extends BasePolygonIndividual {
  type = 'cartesian';

  generateGenome() {
    const points = PolygonGeometry.generateRandomPolygon(this.N, 'cartesian', this.rng);
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
  // fixOrder() {
  //   const points = this.decodePolygon();
  //   const { points: fixedPoints, changed } = PolygonGeometry.fixPolygonOrder(points);

  //   if (changed) {
  //     for (let i = 0; i < fixedPoints.length; i++) {
  //       this.genome[2 * i] = fixedPoints[i].x;
  //       this.genome[2 * i + 1] = fixedPoints[i].y;
  //     }
  //   }

  //   return changed;
  // }

  // Clamp points to bounding box and return clamp rate for this individual
  clampGenome() {
    const oldPoints = this.decodePolygon();
    const newPoints = PolygonGeometry.clampCartesianPoints(oldPoints);

    // Count changes HERE (genome responsibility)
    let changedCount = 0;
    for (let i = 0; i < this.N; i++) {
      if (oldPoints[i].x !== newPoints[i].x) changedCount++;
      if (oldPoints[i].y !== newPoints[i].y) changedCount++;
    }

    // Write to genome
    for (let i = 0; i < newPoints.length; i++) {
      this.genome[2 * i] = newPoints[i].x;
      this.genome[2 * i + 1] = newPoints[i].y;
    }

    const clampableGenes = 2 * this.N;
    return changedCount / clampableGenes;
  }

}