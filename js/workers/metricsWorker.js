import {
    computeRunMetrics,
    computeMetricsForResults,
    filterMetrics
} from '../model/metrics/runMetrics';

self.onmessage = (e) => {
    const { history, results, metricsConfig, outputConfig } = e.data;

    try {
        if (Array.isArray(results)) {
            const processed = computeMetricsForResults(results, metricsConfig, outputConfig);
            self.postMessage({ type: 'complete', results: processed });
            return;
        }

        if (Array.isArray(history)) {
            const metrics = computeRunMetrics(history, metricsConfig);
            self.postMessage({
                type: 'complete',
                metrics: filterMetrics(metrics, outputConfig)
            });
            return;
        }

        throw new Error('metricsWorker requires history or results array');
    } catch (err) {
        self.postMessage({
            type: 'error',
            message: err instanceof Error ? err.message : String(err)
        });
    }
};