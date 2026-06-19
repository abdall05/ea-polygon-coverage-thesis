// FitnessEvaluator.js
import { PolygonGeometry } from '../geometry/PolygonGeometry';

export class FitnessEvaluator {
    constructor(targetPoints) {
        this.targetPoints = targetPoints;
    }

    evaluate(individual) {
        const polygon = individual.decodePolygon();

        const coverage = PolygonGeometry.calculateCoverage(polygon, this.targetPoints);
        const area = PolygonGeometry.polygonArea(polygon);

        individual.fitness = { coverage, area };
        return individual.fitness;
    }

}

