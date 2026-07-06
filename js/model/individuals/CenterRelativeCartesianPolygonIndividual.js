import { BasePolygonIndividual } from './BasePolygonIndividual.js';
import { INDIVIDUAL_TYPES } from './individualConfig.js';
import { PolygonGeometry } from '../geometry/PolygonGeometry.js';
import { GEOMETRY_CONFIG } from '../geometry/geometryConfig.js';
import { clamp } from '../../utils/math.js';


export class CenterRelativeCartesianPolygonIndividual extends BasePolygonIndividual {
    static TYPE = INDIVIDUAL_TYPES.CENTER_RELATIVE_CARTESIAN;


    generateGenome() {
        const {
            cx,
            cy,
            offsets
        } = PolygonGeometry.generateRandomPolygon(
            this.N,
            this.type,
            this.rng
        );

        const genome = [cx, cy];

        for (const offset of offsets) {
            genome.push(offset.dx, offset.dy);
        }

        return genome;
    }


    genomeToPoints() {
        const points = [];

        const cx = this.genome[0];
        const cy = this.genome[1];

        for (let i = 2; i < this.genome.length; i += 2) {
            points.push({
                x: cx + this.genome[i],
                y: cy + this.genome[i + 1]
            });
        }

        return points;
    }

    clampGenome() {
        const min = GEOMETRY_CONFIG.WORLD_MIN;
        const max = GEOMETRY_CONFIG.WORLD_MAX;

        // 1. Clamp centre first.
        this.genome[0] = clamp(this.genome[0], min, max);
        this.genome[1] = clamp(this.genome[1], min, max);

        const cx = this.genome[0];
        const cy = this.genome[1];

        // 2. Decode using the repaired centre.
        const rawPoints = this.genomeToPoints();

        // 3. Clamp decoded absolute points to the world.
        const clampedPoints = PolygonGeometry.clampCartesianPoints(rawPoints);

        // 4. Recompute offsets relative to the repaired centre.
        for (let i = 0; i < clampedPoints.length; i++) {
            this.genome[2 + 2 * i] = clampedPoints[i].x - cx;
            this.genome[2 + 2 * i + 1] = clampedPoints[i].y - cy;
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
            const diff = Math.abs(this.genome[i] - other.genome[i]);

            if (i < 2) {
                // Centre genes lie in the world coordinate range.
                sum += diff / range;
            } else {
                // Offset genes can range from -range to +range.
                sum += diff / (2 * range);
            }
        }

        return sum / this.genome.length;
    }
}