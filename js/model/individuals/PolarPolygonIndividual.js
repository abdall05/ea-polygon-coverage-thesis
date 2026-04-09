import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { PolygonGeometry } from '../PolygonGeometry.js';

export class PolarPolygonIndividual extends BasePolygonIndividual {
  type = 'polar';


  generateGenome() {
    const { cx, cy, angles, radii } = PolygonGeometry.generateRandomPolygon(this.N, 'polar', this.rng);
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

  // REPAIR METHOD - fixes ordering after mutation/crossover
  // PolarPolygonIndividual.js
  // fixOrder() {
  //   const N = this.N;
  //   const cx = this.genome[0];
  //   const cy = this.genome[1];

  //   // Extract (angle, radius) with original index
  //   const pairs = [];
  //   for (let i = 0; i < N; i++) {
  //     const angle = this.genome[2 + 2 * i];
  //     const radius = this.genome[2 + 2 * i + 1];

  //     pairs.push({
  //       angle: angle,
  //       radius: radius,
  //       index: i
  //     });
  //   }

  //   // Sort by angle only (simple)
  //   pairs.sort((a, b) => a.angle - b.angle);

  //   // Check if order changed
  //   let changed = false;
  //   for (let i = 0; i < N; i++) {
  //     if (pairs[i].index !== i) {
  //       changed = true;
  //       break;
  //     }
  //   }
  //   if (!changed) return false;

  //   // Rebuild genome in sorted order
  //   const newGenome = [cx, cy];
  //   for (let i = 0; i < N; i++) {
  //     newGenome.push(pairs[i].angle, pairs[i].radius);
  //   }
  //   this.genome = newGenome;
  //   return true;
  // }


  clone() {
    // Create empty individual WITHOUT generating random genome
    const copy = Object.create(PolarPolygonIndividual.prototype);
    copy.N = this.N;
    copy.type = this.type;
    copy.genome = [...this.genome];
    copy.fitness = { ...this.fitness };
    return copy;
  }

  clampGenome() {
    // Read current values
    const cx = this.genome[0];
    const cy = this.genome[1];
    const angles = [];
    const radii = [];
    for (let i = 2; i < this.genome.length; i += 2) {
      angles.push(this.genome[i]);
      radii.push(this.genome[i + 1]);
    }

    // Get clamped values (pure function, doesn't modify inputs)
    const result = PolygonGeometry.clampPolarParams(cx, cy, angles, radii);

    // Count changes by comparing result with original
    let changedCount = 0;
    if (result.cx !== cx) changedCount++;
    if (result.cy !== cy) changedCount++;
    for (let i = 0; i < this.N; i++) {
      if (result.radii[i] !== radii[i]) changedCount++;
    }

    // Write back to genome
    this.genome[0] = result.cx;
    this.genome[1] = result.cy;
    for (let i = 0; i < this.N; i++) {
      this.genome[2 + 2 * i + 1] = result.radii[i];
      // Angles unchanged
    }

    const clampableGenes = 2 + this.N;
    return changedCount / clampableGenes;
  }
}