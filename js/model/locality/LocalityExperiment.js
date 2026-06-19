import { LocalityMeasurement } from './LocalityMeasurement.js';
import { IndividualFactory } from '../individuals/IndividualFactory.js';
import { MutationFactory } from '../mutations/MutationFactory.js';
import { createRNG } from '../../utils/rng.js';
import { summarize } from '../../stats/statsUtils.js';

export class LocalityExperiment {
  constructor({
    individualType,
    mutationType,
    mutationParams,
    nVertices,
    sampleSize,
    seed
  }) {
    if (!individualType) {
      throw new Error('LocalityExperiment requires individualType');
    }

    if (!mutationType) {
      throw new Error('LocalityExperiment requires mutationType');
    }

    if (!mutationParams) {
      throw new Error('LocalityExperiment requires mutationParams');
    }

    if (!Number.isInteger(nVertices) || nVertices < 4) {
      throw new Error('LocalityExperiment requires a valid nVertices');
    }

    if (!Number.isInteger(sampleSize) || sampleSize <= 0) {
      throw new Error('LocalityExperiment requires a valid positive sampleSize');
    }

    this.individualType = individualType;
    this.mutationType = mutationType;
    this.mutationParams = mutationParams;
    this.nVertices = nVertices;
    this.sampleSize = sampleSize;
    this.seed = seed;
  }

  run() {
    const rngs = this.#createRngs();

    const ratios = [];
    const dGs = [];
    const dPs = [];

    let skippedNoGenotypeChange = 0;

    for (let i = 0; i < this.sampleSize; i++) {
      const individual = this.#createIndividual(rngs.individual);
      const mutation = this.#createMutation(rngs.mutation);

      const measurement = new LocalityMeasurement({
        individual,
        mutation
      });

      const { dG, dP, ratio } = measurement.compute();

      if (dG === 0) {
        skippedNoGenotypeChange++;
        continue;
      }

      dGs.push(dG);
      dPs.push(dP);
      ratios.push(ratio);
    }

    return {
      config: {
        individualType: this.individualType,
        mutationType: this.mutationType,
        mutationParams: { ...this.mutationParams },
        nVertices: this.nVertices,
        sampleSize: this.sampleSize,
        seed: this.seed
      },
      samples: {
        requestedSamples: this.sampleSize,
        validSamples: ratios.length,
        skippedNoGenotypeChange,
        invalidSamples: 0,
        ratios,
        dGs,
        dPs
      },
      summary: {
        ratio: summarize(ratios),
        dG: summarize(dGs),
        dP: summarize(dPs)
      }
    };
  }

  #createRngs() {
    if (this.seed === null || this.seed === undefined) {
      return {
        individual: null,
        mutation: null
      };
    }

    return {
      individual: createRNG(this.seed + 1),
      mutation: createRNG(this.seed + 2)
    };
  }

  #createIndividual(rng) {
    return IndividualFactory.create(this.individualType, this.nVertices, rng);
  }

  #createMutation(rng) {
    return MutationFactory.create(
      this.mutationType,
      this.mutationParams,
      rng
    );
  }
}