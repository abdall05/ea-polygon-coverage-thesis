import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../PolygonGeometry.js';

export class PolarPolygonIndividual extends BasePolygonIndividual {
  type = 'polar';


  generateGenome(N) {
    const { cx, cy, angles, radii } = PolygonGeometry.generateRandomPolygon(N, 'polar', this.rng);
    const genome = [cx, cy];
    for (let i = 0; i < angles.length; i++) {
      genome.push(angles[i], radii[i]);
    }
    return genome;
  }
  decodePolygon() {
    const points = [];
    const cx = this.genome[0];
    const cy = this.genome[1];

    for (let i = 2; i < this.genome.length; i += 2) {
      const theta = this.genome[i];
      const r = this.genome[i + 1];
      points.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta)
      });
    }
    return points;
  }

  // REPAIR METHOD - fixes ordering after mutation/crossover
  // PolarPolygonIndividual.js
  fixOrder() {
    const N = this.N;
    const cx = this.genome[0];
    const cy = this.genome[1];

    // Extract (angle, radius) with original index
    const pairs = [];
    for (let i = 0; i < N; i++) {
      const angle = this.genome[2 + 2 * i];
      const radius = this.genome[2 + 2 * i + 1];

      pairs.push({
        angle: angle,
        radius: radius,
        index: i
      });
    }

    // Sort by angle only (simple)
    pairs.sort((a, b) => a.angle - b.angle);

    // Check if order changed
    let changed = false;
    for (let i = 0; i < N; i++) {
      if (pairs[i].index !== i) {
        changed = true;
        break;
      }
    }
    if (!changed) return false;

    // Rebuild genome in sorted order
    const newGenome = [cx, cy];
    for (let i = 0; i < N; i++) {
      newGenome.push(pairs[i].angle, pairs[i].radius);
    }
    this.genome = newGenome;
    return true;
  } clone() {
    // Create empty individual WITHOUT generating random genome
    const copy = Object.create(PolarPolygonIndividual.prototype);
    copy.N = this.N;
    copy.type = this.type;
    copy.genome = [...this.genome];
    copy.fitness = { ...this.fitness };
    return copy;
  }

  clampGenome() {
    // 1) read genome -> params
    const cx = this.genome[0];
    const cy = this.genome[1];

    const angles = [];
    const radii = [];
    for (let i = 2; i < this.genome.length; i += 2) {
      angles.push(this.genome[i]);
      radii.push(this.genome[i + 1]);
    }

    // 2) clamp in geometry (center + r <= rMax per direction)
    const result = PolygonGeometry.clampPolarParams(cx, cy, angles, radii);

    // 3) write back
    this.genome[0] = result.cx;
    this.genome[1] = result.cy;

    for (let i = 0; i < angles.length; i++) {
      this.genome[2 + 2 * i] = result.angles[i];
      this.genome[2 + 2 * i + 1] = result.radii[i];
    }
    const clampableGenes = 2 + this.N; // 2(cx,cy) + N (radii) to compute clamp rate per representation.
    return result.numClampedValues / clampableGenes; // return clamp rate for this individual
  }

}