import { LocalityExperiment } from '../model/locality/LocalityExperiment';

self.onmessage = (e) => {
  try {
    const { type, config } = e.data ?? {};

    if (type !== 'runLocalityExperiment') {
      throw new Error('Unsupported worker message type');
    }

    if (!config) {
      throw new Error('Missing locality config');
    }

    const experiment = new LocalityExperiment({
      individualType: config.representation.type,
      mutationType: config.mutation.type,
      mutationParams: config.mutation.params,
      nVertices: config.representation.nVertices,
      sampleSize: config.experiment.sampleSize,
      seed: config.experiment.seed
    });

    const result = experiment.run();

    self.postMessage({
      type: 'localityResult',
      result
    });
  } catch (error) {
    self.postMessage({
      type: 'localityError',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};