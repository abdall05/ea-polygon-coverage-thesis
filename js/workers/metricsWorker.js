import {
    computeMetricsForResults,
} from '../model/metrics/runMetrics';

self.onmessage = (e) => {
    const { results, metricsConfig, outputConfig } = e.data;

    try {
        if (!Array.isArray(results)) {
            throw new Error('metricsWorker requires results array');
        }

        const processed = computeMetricsForResults(results, metricsConfig, outputConfig);
        self.postMessage({ type: 'complete', results: processed });
    } catch (err) {
        self.postMessage({
            type: 'error',
            message: err instanceof Error ? err.message : String(err)
        });
    }
};