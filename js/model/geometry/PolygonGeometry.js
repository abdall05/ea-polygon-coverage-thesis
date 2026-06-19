
import { point, polygon } from '@turf/helpers';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { GEOMETRY_CONFIG } from "./geometryConfig.js";
import { clamp, wrapTo2Pi } from '../../utils/math.js';
import { INDIVIDUAL_TYPES } from '../individuals/individualConfig.js';


export class PolygonGeometry {
    // Returns array of points in order: [{x, y}, {x, y}, ...]

    static generateRandomPolygon(
        N,
        representation,
        rng
    ) {
        const R = rng || Math;
        const min = GEOMETRY_CONFIG.WORLD_MIN;
        const max = GEOMETRY_CONFIG.WORLD_MAX;
        const size = max - min;

        const points = [];
        for (let i = 0; i < N; i++) {
            points.push({
                x: min + R.random() * size,
                y: min + R.random() * size
            });
        }

        if (representation === INDIVIDUAL_TYPES.CARTESIAN) {
            return points;
        }

        if (representation === INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER) {
            const cx = min + R.random() * size;
            const cy = min + R.random() * size;
            const { angles, radii } = PolygonGeometry.cartesianPointsToPolar(points, cx, cy);

            return { cx, cy, angles, radii };
        }

        if (representation === INDIVIDUAL_TYPES.POLAR_FIXED_CENTER) {
            const { x: cx, y: cy } = GEOMETRY_CONFIG.FIXED_POLAR_CENTER;
            const { angles, radii } = PolygonGeometry.cartesianPointsToPolar(points, cx, cy);

            return { angles, radii };
        }

        throw new Error(`Unknown representation: ${representation}`);
    }

    static cartesianPointsToPolar(points, cx, cy) {
        const angles = [];
        const radii = [];

        for (const p of points) {
            const dx = p.x - cx;
            const dy = p.y - cy;
            angles.push(wrapTo2Pi(Math.atan2(dy, dx)));
            radii.push(Math.hypot(dx, dy));
        }

        return { angles, radii };
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



    static clampCartesianPoints(points, min = GEOMETRY_CONFIG.WORLD_MIN, max = GEOMETRY_CONFIG.WORLD_MAX) {
        return points.map(p => ({
            x: clamp(p.x, min, max),
            y: clamp(p.y, min, max)
        }));
    }


    static clampPolarParams(cx, cy, angles, radii, min = GEOMETRY_CONFIG.WORLD_MIN, max = GEOMETRY_CONFIG.WORLD_MAX) {
        cx = clamp(cx, min, max);
        cy = clamp(cy, min, max);

        const N = angles.length;
        const safeAngles = new Array(N);
        const safeRadii = new Array(N);

        for (let i = 0; i < N; i++) {
            const angle = wrapTo2Pi(angles[i]);
            const radius = radii[i];

            const rMax = PolygonGeometry.maxRadiusInDirection(cx, cy, angle);
            const newR = clamp(radius, 0, rMax);

            safeAngles[i] = angle;
            safeRadii[i] = newR;
        }

        return {
            cx,
            cy,
            angles: safeAngles,
            radii: safeRadii,
        };
    }
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

    // PoLiS (Polygon and Line Segment metric / polygon comparison metric)
    static polygonDistance(polyA, polyB) {
        if (!polyA || !polyB) return 0;
        if (polyA.length < 3 || polyB.length < 3) return 0;

        const avgAtoB = PolygonGeometry.averageVertexToBoundaryDistance(polyA, polyB);
        const avgBtoA = PolygonGeometry.averageVertexToBoundaryDistance(polyB, polyA);

        return 0.5 * (avgAtoB + avgBtoA);
    }
    static normalizedPolygonDistance(polyA, polyB) {
        const raw = PolygonGeometry.polygonDistance(polyA, polyB);
        const width = GEOMETRY_CONFIG.WORLD_MAX - GEOMETRY_CONFIG.WORLD_MIN;
        const height = GEOMETRY_CONFIG.WORLD_MAX - GEOMETRY_CONFIG.WORLD_MIN;
        const maxDist = Math.hypot(width, height);
        return maxDist > 0 ? raw / maxDist : 0;
    }

    static averageVertexToBoundaryDistance(sourcePoly, targetPoly) {
        let sum = 0;
        for (const p of sourcePoly) {
            sum += PolygonGeometry.pointToPolygonBoundaryDistance(p, targetPoly);
        }
        return sum / sourcePoly.length;
    }

    static pointToPolygonBoundaryDistance(point, polygon) {
        const n = polygon.length;
        let best = Infinity;

        for (let i = 0; i < n; i++) {
            const a = polygon[i];
            const b = polygon[(i + 1) % n];
            const d = PolygonGeometry.pointToSegmentDistance(point, a, b);
            if (d < best) best = d;
        }

        return best;
    }

    static pointToSegmentDistance(p, a, b) {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = p.x - a.x;
        const apy = p.y - a.y;

        const abLenSq = abx * abx + aby * aby;
        if (abLenSq === 0) {
            return Math.hypot(p.x - a.x, p.y - a.y);
        }

        let t = (apx * abx + apy * aby) / abLenSq;
        t = Math.max(0, Math.min(1, t));

        const closestX = a.x + t * abx;
        const closestY = a.y + t * aby;

        return Math.hypot(p.x - closestX, p.y - closestY);
    }

}
