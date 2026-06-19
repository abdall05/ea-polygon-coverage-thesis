import { POINT_DISTRIBUTION_TYPES } from "./pointDistributionConfig.js";

export class PointSetGenerator {
  static clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  static randomInRange(min, max, rng) {
    return min + rng.random() * (max - min);
  }

  static gaussianRandom(mean, stdDev, rng) {
    let u1 = 0;
    let u2 = 0;

    while (u1 === 0) u1 = rng.random();
    while (u2 === 0) u2 = rng.random();

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  static generate(distribution, params = {}, rng = null) {
    const R = rng || Math;

    const count = params.count;
    const margin = params.margin ?? 0.02;

    if (!Number.isInteger(count) || count <= 0) {
      console.log(count)
      throw new Error("PointSetGenerator requires count as a positive integer");
    }

    if (!Number.isFinite(margin) || margin < 0 || margin >= 0.5) {
      throw new Error("PointSetGenerator requires margin in [0, 0.5)");
    }

    const min = margin;
    const max = 1 - margin;
    const points = [];

    switch (distribution) {
      case POINT_DISTRIBUTION_TYPES.UNIFORM: {
        for (let i = 0; i < count; i++) {
          points.push({
            x: this.randomInRange(min, max, R),
            y: this.randomInRange(min, max, R)
          });
        }
        break;
      }

      case POINT_DISTRIBUTION_TYPES.CLUSTERED: {
        const clusterCount = params.clusterCount;
        const clusterSpread = params.clusterSpread;

        if (!Number.isInteger(clusterCount) || clusterCount <= 0) {
          throw new Error("Clustered distribution requires clusterCount as a positive integer");
        }

        if (!Number.isFinite(clusterSpread) || clusterSpread <= 0) {
          throw new Error("Clustered distribution requires clusterSpread as a positive number");
        }

        const centers = [];
        for (let i = 0; i < clusterCount; i++) {
          centers.push({
            x: this.randomInRange(min, max, R),
            y: this.randomInRange(min, max, R)
          });
        }

        for (let i = 0; i < count; i++) {
          const center = centers[Math.floor(R.random() * centers.length)];

          const x = this.clamp(
            this.gaussianRandom(center.x, clusterSpread, R),
            min,
            max
          );

          const y = this.clamp(
            this.gaussianRandom(center.y, clusterSpread, R),
            min,
            max
          );

          points.push({ x, y });
        }
        break;
      }

      default:
        throw new Error(`Unknown point distribution type: ${distribution}`);
    }

    return points;
  }
}