import {
  METRIC_DEFINITIONS,
  METRIC_KEYS
} from './metricConfig.js';

function firstIndexWhere(series, predicate) {
  for (let i = 0; i < series.length; i++) {
    if (predicate(series[i], i)) return i;
  }

  return -1;
}

export function computeRunMetrics(history, config) {
  if (!Array.isArray(history) || history.length === 0) return null;

  const maxPossibleCoverage = Number(config?.maxPossibleCoverage);

  const thresholdFraction = Number.isFinite(config?.thresholdFraction)
    ? config.thresholdFraction
    : 0.95;

  const includeCoverageMetrics = config?.enabledGroups?.coverage !== false;
  const includeAreaMetrics = config?.enabledGroups?.area !== false;
  const includeDiversityMetrics = config?.enabledGroups?.diversity !== false;

  const coverageSeries = history.map(generation =>
    generation?.bestFitness?.coverage ?? 0
  );

  const areaSeries = history.map(generation =>
    generation?.bestFitness?.area ?? null
  );

  const generationCount = coverageSeries.length;
  const lastGenerationIndex = generationCount - 1;

  // Generations are indexed 0 ... T, so T + 1 means that the event was not reached.
  const censoredGeneration = lastGenerationIndex + 1;

  const metrics = {};

  const hasValidMaxCoverage =
    Number.isFinite(maxPossibleCoverage) && maxPossibleCoverage > 0;

  let bestCoverageReached = null;
  let reachedFullCoverage = null;
  let firstFullCoverageGeneration = censoredGeneration;

  if ((includeCoverageMetrics || includeAreaMetrics) && hasValidMaxCoverage) {
    bestCoverageReached = Math.max(...coverageSeries);

    const coverageThreshold = maxPossibleCoverage * thresholdFraction;

    const thresholdIndex = firstIndexWhere(
      coverageSeries,
      coverage => coverage >= coverageThreshold
    );

    const gensToCoverageThreshold =
      thresholdIndex === -1 ? censoredGeneration : thresholdIndex;

    reachedFullCoverage = bestCoverageReached >= maxPossibleCoverage ? 1 : 0;

    const fullCoverageIndex = firstIndexWhere(
      coverageSeries,
      coverage => coverage >= maxPossibleCoverage
    );

    if (fullCoverageIndex !== -1) {
      firstFullCoverageGeneration = fullCoverageIndex;
    }

    if (includeCoverageMetrics) {
      metrics.bestCoverageReached = bestCoverageReached;
      metrics.reachedFullCoverage = reachedFullCoverage;
      metrics.gensToCoverageThreshold = gensToCoverageThreshold;
      metrics.firstFullCoverageGeneration = firstFullCoverageGeneration;
    }
  }

  if (includeAreaMetrics) {
    let areaAtFirstFullCoverage = null;
    let bestFullCoverageArea = null;
    let areaReductionAfterFullCoverage = null;

    if (
      hasValidMaxCoverage &&
      reachedFullCoverage === 1 &&
      firstFullCoverageGeneration !== censoredGeneration
    ) {
      const firstArea = areaSeries[firstFullCoverageGeneration];

      if (Number.isFinite(firstArea)) {
        areaAtFirstFullCoverage = firstArea;

        for (let i = firstFullCoverageGeneration; i < generationCount; i++) {
          const coverage = coverageSeries[i];
          const area = areaSeries[i];

          // Area is only meaningful for generations with full coverage.
          if (
            coverage >= maxPossibleCoverage &&
            Number.isFinite(area)
          ) {
            if (
              bestFullCoverageArea === null ||
              area < bestFullCoverageArea
            ) {
              bestFullCoverageArea = area;
            }
          }
        }

        if (
          Number.isFinite(areaAtFirstFullCoverage) &&
          Number.isFinite(bestFullCoverageArea)
        ) {
          areaReductionAfterFullCoverage =
            areaAtFirstFullCoverage - bestFullCoverageArea;
        }
      }
    }

    metrics.areaAtFirstFullCoverage = areaAtFirstFullCoverage;
    metrics.bestFullCoverageArea = bestFullCoverageArea;
    metrics.areaReductionAfterFullCoverage = areaReductionAfterFullCoverage;
  }

  if (includeDiversityMetrics) {
    const diversitySeries = history.map(generation =>
      generation?.diversity ?? null
    );

    let diversityHalfLife = null;
    let diversityFinalInitialRatio = null;

    const hasDiversityData =
      diversitySeries.length === generationCount &&
      diversitySeries.every(value => Number.isFinite(value));

    if (hasDiversityData && generationCount > 0) {
      const initialDiversity = diversitySeries[0];
      const finalDiversity = diversitySeries[generationCount - 1];

      if (initialDiversity > 0) {
        diversityFinalInitialRatio = finalDiversity / initialDiversity;

        const halfDiversityTarget = initialDiversity * 0.5;

        for (let i = 1; i < generationCount; i++) {
          if (diversitySeries[i] <= halfDiversityTarget) {
            const previousDiversity = diversitySeries[i - 1];
            const currentDiversity = diversitySeries[i];
            const diversityDelta = currentDiversity - previousDiversity;

            if (diversityDelta === 0) {
              diversityHalfLife = i;
            } else {
              const interpolationFraction =
                (halfDiversityTarget - previousDiversity) /
                diversityDelta;

              diversityHalfLife =
                (i - 1) + Math.min(1, Math.max(0, interpolationFraction));
            }

            break;
          }
        }

        // Diversity did not fall to 50% within the run budget.
        if (diversityHalfLife === null) {
          diversityHalfLife = censoredGeneration;
        }
      } else if (initialDiversity === 0) {
        diversityFinalInitialRatio = finalDiversity === 0 ? 1 : null;
        diversityHalfLife = 0;
      }
    }

    metrics.diversityHalfLife = diversityHalfLife;
    metrics.diversityFinalInitialRatio = diversityFinalInitialRatio;
  }

  return metrics;
}

export function filterMetrics(metrics, outputConfig) {
  if (!metrics) return metrics;

  const requestedMetrics = (
    Array.isArray(outputConfig?.metrics) && outputConfig.metrics.length
      ? outputConfig.metrics
      : METRIC_KEYS
  ).filter(metricEntry => {
    const metricKey =
      typeof metricEntry === 'string' ? metricEntry : metricEntry?.key;

    return metricKey && metricKey in METRIC_DEFINITIONS;
  });

  const filteredMetrics = {};

  for (const metricEntry of requestedMetrics) {
    const metricKey =
      typeof metricEntry === 'string' ? metricEntry : metricEntry?.key;

    if (metricKey && metricKey in METRIC_DEFINITIONS && metricKey in metrics) {
      filteredMetrics[metricKey] = metrics[metricKey];
    }
  }

  return filteredMetrics;
}

export function computeMetricsForResults(results, metricsConfig, outputConfig) {
  if (!Array.isArray(results)) return [];

  return results.map(runData => ({
    run: runData?.run ?? null,
    metrics: filterMetrics(
      computeRunMetrics(runData?.history, metricsConfig),
      outputConfig
    )
  }));
}

export function getMetricLabel(metricKey, thresholdFraction = null) {
  const metricDefinition = METRIC_DEFINITIONS[metricKey];
  if (!metricDefinition) return metricKey ?? '-';

  if (
    metricDefinition.usesThresholdFraction &&
    Number.isFinite(thresholdFraction)
  ) {
    return `${metricDefinition.label} (${(thresholdFraction * 100).toFixed(0)}%)`;
  }

  return metricDefinition.label;
}