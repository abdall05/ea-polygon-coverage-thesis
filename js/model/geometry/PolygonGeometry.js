import { point, polygon } from '@turf/helpers';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { GEOMETRY_CONFIG } from "./geometryConfig.js";
import { clamp, wrapTo2Pi } from '../../utils/math.js';
import { INDIVIDUAL_TYPES } from '../individuals/individualConfig.js';


export class PolygonGeometry {

    static worldMin() {
        return GEOMETRY_CONFIG.WORLD_MIN;
    }

    static worldMax() {
        return GEOMETRY_CONFIG.WORLD_MAX;
    }

    static worldRange() {
        return GEOMETRY_CONFIG.WORLD_MAX - GEOMETRY_CONFIG.WORLD_MIN;
    }

    static worldDiagonalLength() {
        const size = PolygonGeometry.worldRange();
        return Math.hypot(size, size);
    }

    static fixedPolarMaxRadius() {
        const {
            WORLD_MIN,
            WORLD_MAX,
            FIXED_POLAR_CENTER
        } = GEOMETRY_CONFIG;

        const maxDx = Math.max(
            Math.abs(FIXED_POLAR_CENTER.x - WORLD_MIN),
            Math.abs(WORLD_MAX - FIXED_POLAR_CENTER.x)
        );

        const maxDy = Math.max(
            Math.abs(FIXED_POLAR_CENTER.y - WORLD_MIN),
            Math.abs(WORLD_MAX - FIXED_POLAR_CENTER.y)
        );

        return Math.hypot(maxDx, maxDy);
    }


    static generateRandomPolygon(N, representation, rng = Math) {
        if (!Number.isInteger(N) || N < 3) {
            throw new Error("A polygon requires at least 3 vertices.");
        }

        const points = PolygonGeometry.generateNonCollinearRandomPoints(N, rng);

        if (representation === INDIVIDUAL_TYPES.CARTESIAN) {
            return points;
        }

        if (representation === INDIVIDUAL_TYPES.CENTER_RELATIVE_CARTESIAN) {
            const min = GEOMETRY_CONFIG.WORLD_MIN;
            const max = GEOMETRY_CONFIG.WORLD_MAX;
            const size = max - min;

            const cx = min + rng.random() * size;
            const cy = min + rng.random() * size;

            const offsets = points.map(p => ({
                dx: p.x - cx,
                dy: p.y - cy
            }));

            return { cx, cy, offsets };
        }

        if (representation === INDIVIDUAL_TYPES.POLAR_VARIABLE_CENTER) {
            const min = GEOMETRY_CONFIG.WORLD_MIN;
            const max = GEOMETRY_CONFIG.WORLD_MAX;
            const size = max - min;

            const cx = min + rng.random() * size;
            const cy = min + rng.random() * size;

            const { angles, radii } =
                PolygonGeometry.cartesianPointsToPolar(points, cx, cy);

            return { cx, cy, angles, radii };
        }

        if (representation === INDIVIDUAL_TYPES.POLAR_FIXED_CENTER) {
            const { x: cx, y: cy } = GEOMETRY_CONFIG.FIXED_POLAR_CENTER;

            const { angles, radii } =
                PolygonGeometry.cartesianPointsToPolar(points, cx, cy);

            return { angles, radii };
        }

        throw new Error(`Unknown representation: ${representation}`);
    }

    static generateNonCollinearRandomPoints(N, rng = Math) {
        const maxAttempts = 3;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const points = PolygonGeometry.generateRandomPoints(N, rng);

            if (!PolygonGeometry.areAllPointsCollinear(points)) {
                return points;
            }
        }

        // Extremely unlikely fallback
        return PolygonGeometry.generateFallbackPolygonPoints(N, rng);
    }

    static generateRandomPoints(N, rng = Math) {
        const min = GEOMETRY_CONFIG.WORLD_MIN;
        const max = GEOMETRY_CONFIG.WORLD_MAX;
        const size = max - min;

        const points = [];

        for (let i = 0; i < N; i++) {
            points.push({
                x: min + rng.random() * size,
                y: min + rng.random() * size
            });
        }

        return points;
    }

    static generateFallbackPolygonPoints(N, rng = Math) {
        const min = GEOMETRY_CONFIG.WORLD_MIN;
        const max = GEOMETRY_CONFIG.WORLD_MAX;
        const size = max - min;

        // Keep center away from borders so all fallback points stay inside world
        const margin = size * 0.25;

        const cx = min + margin + rng.random() * (size - 2 * margin);
        const cy = min + margin + rng.random() * (size - 2 * margin);

        const maxRadius = Math.min(
            cx - min,
            max - cx,
            cy - min,
            max - cy
        );

        // Random but safe radius
        const baseRadius = maxRadius * (0.4 + rng.random() * 0.4);

        // Random rotation so fallback polygons are not identical
        const rotation = rng.random() * 2 * Math.PI;

        const points = [];

        for (let i = 0; i < N; i++) {
            const angle = rotation + (2 * Math.PI * i) / N;

            // Small random radius variation, still safely inside bounds
            const radius = baseRadius * (0.75 + rng.random() * 0.25);

            points.push({
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle)
            });
        }

        return points;
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
        const min = GEOMETRY_CONFIG.WORLD_MIN;
        const max = GEOMETRY_CONFIG.WORLD_MAX;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        let maxR = Infinity;

        if (cosA > 0) maxR = Math.min(maxR, (max - cx) / cosA);
        else if (cosA < 0) maxR = Math.min(maxR, (cx - min) / -cosA);

        if (sinA > 0) maxR = Math.min(maxR, (max - cy) / sinA);
        else if (sinA < 0) maxR = Math.min(maxR, (cy - min) / -sinA);

        return maxR;
    }

    static toTurfPolygon(polygonPts) {
        if (!polygonPts || polygonPts.length < 3) return null;
        const closed = [...polygonPts, polygonPts[0]];
        return polygon([closed.map(p => [p.x, p.y])]);
    }
    static pointInPolygon(pointObj, polygonPts) {
        const turfPoly = PolygonGeometry.toTurfPolygon(polygonPts);
        if (!turfPoly) return false;

        return booleanPointInPolygon(point([pointObj.x, pointObj.y]), turfPoly, {
            ignoreBoundary: false
        });
    }
    static calculateCoverage(polygonPts, targetPoints) {
        if (!targetPoints || targetPoints.length === 0) return 0;

        const turfPoly = PolygonGeometry.toTurfPolygon(polygonPts);
        if (!turfPoly) return 0;

        let count = 0;
        for (const pt of targetPoints) {
            const turfPt = point([pt.x, pt.y]);
            if (booleanPointInPolygon(turfPt, turfPoly, { ignoreBoundary: false })) {
                count++;
            }
        }

        return count;
    }
    static polygonArea(points) {
        let area = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
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

    static sortVerticesAroundCentroid(points) {
        if (points.length < 3) return points;

        const center = points.reduce((acc, p) => {
            acc.x += p.x;
            acc.y += p.y;
            return acc;
        }, { x: 0, y: 0 });

        center.x /= points.length;
        center.y /= points.length;

        return [...points].sort((a, b) => {
            const ax = a.x - center.x;
            const ay = a.y - center.y;
            const bx = b.x - center.x;
            const by = b.y - center.y;

            const angleA = wrapTo2Pi(Math.atan2(ay, ax));
            const angleB = wrapTo2Pi(Math.atan2(by, bx));

            if (angleA !== angleB) {
                return angleA - angleB;
            }

            // Tie-breaker for points on the same ray from centroid
            const distA = ax * ax + ay * ay;
            const distB = bx * bx + by * by;

            return distA - distB;
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

    static isValidPolygonPointSet(points, eps = 1e-12) {
        if (!Array.isArray(points) || points.length < 3) {
            return false;
        }

        const min = GEOMETRY_CONFIG.WORLD_MIN;
        const max = GEOMETRY_CONFIG.WORLD_MAX;

        for (const p of points) {
            if (!p) return false;

            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
                return false;
            }

            // Edges are allowed. No epsilon here.
            if (
                p.x < min ||
                p.x > max ||
                p.y < min ||
                p.y > max
            ) {
                return false;
            }
        }

        // Only real geometric invalid case you care about:
        // all points lie on one line.
        return !PolygonGeometry.areAllPointsCollinear(points, eps);
    }

    static areAllPointsCollinear(points, eps = 1e-12) {
        if (!Array.isArray(points) || points.length < 3) {
            return true;
        }

        const a = points[0];

        let b = null;

        // Find first point different from a.
        // Duplicate points are allowed; we simply skip them.
        for (let i = 1; i < points.length; i++) {
            if (
                points[i].x !== a.x ||
                points[i].y !== a.y
            ) {
                b = points[i];
                break;
            }
        }

        // All points are exactly the same.
        // That is degenerate, so treat as collinear.
        if (!b) {
            return true;
        }

        const abx = b.x - a.x;
        const aby = b.y - a.y;

        for (const c of points) {
            const acx = c.x - a.x;
            const acy = c.y - a.y;

            const cross = abx * acy - aby * acx;

            if (Math.abs(cross) > eps) {
                return false;
            }
        }

        return true;
    }

}
