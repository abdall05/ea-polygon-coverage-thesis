
import { point, polygon } from '@turf/helpers';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { GEOMETRY_CONFIG } from "./config.js";
import { clamp, wrapTo2Pi } from '../utils/math.js';


export class PolygonGeometry {
    // Returns array of points in order: [{x, y}, {x, y}, ...]
    static generateRandomPolygon(N, representation = 'cartesian', rng = null, margin = GEOMETRY_CONFIG.INIT_CENTER_MARGIN, angleJitterFactor = GEOMETRY_CONFIG.ANGLE_JITTER_FACTOR) {

        const R = rng || Math;
        // 1. Generate the shape data (common for both representations)
        const min = GEOMETRY_CONFIG.WORLD_MIN;
        const max = GEOMETRY_CONFIG.WORLD_MAX;
        const size = max - min;

        // Center in [min+margin*size, max-margin*size]
        const cx = (min + margin * size) + R.random() * (size - 2 * margin * size);
        const cy = (min + margin * size) + R.random() * (size - 2 * margin * size);
        const angles = [];
        const radii = [];

        for (let i = 0; i < N; i++) {
            const baseAngle = (i / N) * 2 * Math.PI;

            const spacing = (2 * Math.PI) / N;
            const maxPossibleAngleJitter = spacing / 2; // Half the spacing in each direction
            // Use 90% of max to be safe
            const maxAngleJitter = maxPossibleAngleJitter * angleJitterFactor;
            const jitter = (R.random() - 0.5) * maxAngleJitter;
            const angle = baseAngle + jitter;

            const maxR = this.maxRadiusInDirection(cx, cy, angle);
            const r = R.random() * maxR;

            angles.push(angle);
            radii.push(r);
        }

        // 2. Return in requested representation
        if (representation === 'cartesian') {
            const points = [];
            for (let i = 0; i < N; i++) {
                points.push({
                    x: cx + radii[i] * Math.cos(angles[i]),
                    y: cy + radii[i] * Math.sin(angles[i])
                });
            }
            return points; // Array of points for Cartesian
        }
        else if (representation === 'polar') {
            return { cx, cy, angles, radii }; // Polar data
        }
        else {
            throw new Error(`Unknown representation: ${representation}`);
        }
    }

    static maxRadiusInDirection(cx, cy, angle) {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        let maxR = Infinity;

        if (cosA > 0) maxR = Math.min(maxR, (1 - cx) / cosA);
        else if (cosA < 0) maxR = Math.min(maxR, cx / Math.abs(cosA));

        if (sinA > 0) maxR = Math.min(maxR, (1 - cy) / sinA);
        else if (sinA < 0) maxR = Math.min(maxR, cy / Math.abs(sinA));

        return maxR;
    }

    static pointInPolygon(pointObj, polygonPts) {
        const turfPoint = point([pointObj.x, pointObj.y]);

        const closed = [...polygonPts, polygonPts[0]]; // close ring
        const turfPoly = polygon([closed.map(p => [p.x, p.y])]);

        return booleanPointInPolygon(turfPoint, turfPoly, { ignoreBoundary: false });
    }

    static calculateCoverage(polygonPts, targetPoints) {
        if (targetPoints.length === 0) return 0;

        const closed = [...polygonPts, polygonPts[0]];
        let turfPoly = polygon([closed.map(p => [p.x, p.y])]);


        let count = 0;
        for (const pt of targetPoints) {
            const turfPt = point([pt.x, pt.y]);
            if (booleanPointInPolygon(turfPt, turfPoly, { ignoreBoundary: false })) {
                count++;
            }
        }
        return count;
    }
    static polygonArea(polygon) {
        let area = 0;
        const n = polygon.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += polygon[i].x * polygon[j].y;
            area -= polygon[j].x * polygon[i].y;
        }
        return Math.abs(area) / 2;  // Returns area in [0,1] units
    }



    static clampCartesianPoints(points, min = 0, max = 1) {
        return points.map(p => ({
            x: clamp(p.x, min, max),
            y: clamp(p.y, min, max)
        }));
    }


    static clampPolarParams(cx, cy, angles, radii, min = 0, max = 1) {

        cx = clamp(cx, min, max);
        cy = clamp(cy, min, max);

        const N = angles.length;
        const safeAngles = new Array(N);
        const safeRadii = new Array(N);

        for (let i = 0; i < N; i++) {

            // Clamp radius to max allowed in this direction
            const angle = angles[i]
            const radius = radii[i]
            const effectiveAngle = radius < 0 ? angle + Math.PI : angle;
            let rMax = PolygonGeometry.maxRadiusInDirection(cx, cy, effectiveAngle);
            let newR = clamp(radius, -rMax, rMax);

            safeAngles[i] = angle;
            safeRadii[i] = newR;  // Always >= 0
        }

        return {
            cx,
            cy,
            angles: safeAngles,
            radii: safeRadii,
        };
    }    // PolygonGeometry.js - CLEAN version
    static fixPolygonOrder(points) {
        if (points.length < 3) return points;

        // Compute centroid
        const center = points.reduce((acc, p) => {
            acc.x += p.x; acc.y += p.y;
            return acc;
        }, { x: 0, y: 0 });
        center.x /= points.length;
        center.y /= points.length;

        // Sort by angle around centroid
        return [...points].sort((a, b) => {
            const angleA = Math.atan2(a.y - center.y, a.x - center.x);
            const angleB = Math.atan2(b.y - center.y, b.x - center.x);
            return angleA - angleB;
        });
    }

}
