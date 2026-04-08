import { CartesianPolygonIndividual } from './CartesianPolygonIndividual.js';
import { PolarPolygonIndividual } from './PolarPolygonIndividual.js';

export class IndividualFactory {
  static create(type, N) {
    switch(type) {
      case 'cartesian':
        return new CartesianPolygonIndividual(N);
      case 'polar':
        return new PolarPolygonIndividual(N);
      default:
        throw new Error(`Unknown individual type: ${type}`);
    }
  }
}