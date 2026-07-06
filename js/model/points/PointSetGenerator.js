import { POINT_DISTRIBUTION_TYPES } from "./pointDistributionConfig.js";
import {randomInRange, gaussianRandom, clamp} from "../../utils/math.js";

export class PointSetGenerator {

  static generate(distribution, params, rng) {
    const count = params.count;
    const margin = params.margin;

    const min = margin;
    const max = 1 - margin;
    const points = [];

    switch (distribution) {
      case POINT_DISTRIBUTION_TYPES.UNIFORM: {
        for (let i = 0; i < count; i++) {
          points.push({
            x: randomInRange(min, max, rng),
            y: randomInRange(min, max, rng)
          });
        }
        break;
      }

      case POINT_DISTRIBUTION_TYPES.CLUSTERED: {
        const clusterCount = params.clusterCount;
        const clusterSpread = params.clusterSpread;

        const centers = [];
        for (let i = 0; i < clusterCount; i++) {
          centers.push({
            x: randomInRange(min, max, rng),
            y: randomInRange(min, max, rng)
          });
        }

        for (let i = 0; i < count; i++) {
          const center = centers[Math.floor(rng.random() * centers.length)];

          const x = clamp(  
            gaussianRandom(center.x, clusterSpread, rng),
            min,
            max
          );

          const y = clamp(
            gaussianRandom(center.y, clusterSpread, rng),
            min,
            max
          );

          points.push({ x, y });
        }
        break;
      }

      default:
        throw new TypeError(`Unknown point distribution type: ${distribution}`);
    }

    return points;
  }
}