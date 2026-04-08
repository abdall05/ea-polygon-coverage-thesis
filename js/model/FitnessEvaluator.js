// FitnessEvaluator.js
import { PolygonGeometry } from './PolygonGeometry.js';

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

    compare(fitnessA, fitnessB) {
        if (fitnessA.coverage !== fitnessB.coverage) {
            return fitnessB.coverage - fitnessA.coverage;
        }
        return fitnessA.area - fitnessB.area;
    }
}

