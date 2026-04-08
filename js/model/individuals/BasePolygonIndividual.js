export class BasePolygonIndividual {
  type = 'base';
  constructor(N, rng = null) {
    if (this.constructor === BasePolygonIndividual) {
      throw new Error("BasePolygonIndividual is abstract");
    }
    this.fitness = { coverage: 0, area: 0 };
    this.N = N;
    this.rng = rng || Math;   // optional RNG
    // Call the abstract method in constructor!
    this.genome = this.generateGenome(N);
  }

  // Abstract method - subclasses MUST implement
  generateGenome(N) {
    throw new Error("generateGenome() must be implemented by subclass");
  }

  decodePolygon() {
    throw new Error("decodePolygon() must be implemented by subclass");
  }

  mutate(operator) {
    operator.apply(this);
  }

  // Repair - can be overridden, but base provides default structure
  repair(options = { fixOrder: true, clamp: true }) {
    const result = {
      orderChanged: false,   // fixOrder() changed genome order this call
      clampFrac: 0,          // fraction of clampable genes clamped this call
      clampAny: false,       // clampFrac > 0
      anyChanged: false      // orderChanged || clampAny
    };

    if (options.clamp && typeof this.clampGenome === "function") {
      result.clampFrac = this.clampGenome(); //returns fraction of clampable genes that were clamped this call
      result.clampAny = result.clampFrac > 0;
    }
    if (options.fixOrder && typeof this.fixOrder === "function")
      result.orderChanged = this.fixOrder(); //returns true if order was changed




    result.anyChanged = result.orderChanged || result.clampAny;
    return result;
  }

  // Optional methods with default implementations
  fixOrder() { return false; }  // Default: no order fixing

  clampGenome() { return 0; }    // Default: no clamping

  clone() {
    throw new Error("clone() must be implemented by subclass");
  }

}