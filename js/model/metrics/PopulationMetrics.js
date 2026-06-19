import { PolygonGeometry } from "../geometry/PolygonGeometry";

export class PopulationMetrics {
  static averageFitness(population) {
    let sumCov = 0;
    let sumArea = 0;

    for (const ind of population) {
      sumCov += ind.fitness.coverage;
      sumArea += ind.fitness.area;
    }

    const n = population.length;
    return { coverage: sumCov / n, area: sumArea / n };
  }

  static diversity(population) {
    if (population.length < 2) return 0;

    const polygons = population.map(ind => ind.decodePolygon());
    let total = 0;
    let pairs = 0;

    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        total += PolygonGeometry.normalizedPolygonDistance(polygons[i], polygons[j]);
        pairs++;
      }
    }

    return pairs > 0 ? total / pairs : 0;
  }
}