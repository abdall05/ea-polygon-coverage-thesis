import { PolygonGeometry } from '../geometry/PolygonGeometry.js';

export class FitnessEvaluator {
    constructor(targetPoints) {
        this.targetPoints = targetPoints;
    }

    evaluate(individual) {
        const polygon = individual.decodePolygon();
        const coverage = PolygonGeometry.calculateCoverage(polygon, this.targetPoints);
        const area = PolygonGeometry.polygonArea(polygon);

        const fitness = { coverage, area };
        individual.fitness = fitness;
        return fitness;
    }

}

