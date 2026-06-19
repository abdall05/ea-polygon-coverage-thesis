export class LexicographicFitnessComparator {
  static compare(a, b) {
    if (a.coverage !== b.coverage) {
      return b.coverage - a.coverage;
    }
    return a.area - b.area;
  }
}