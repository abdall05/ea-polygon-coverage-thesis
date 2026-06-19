import { METRIC_DEFINITIONS } from './metricConfig.js';

const METRIC_KEYS = Object.keys(METRIC_DEFINITIONS);

export function computeRunMetrics(history, cfg) {
    if (!Array.isArray(history) || history.length === 0) return null;

    const { maxPossibleCoverage, coverageThreshold } = cfg ?? {};

    if (!Number.isFinite(maxPossibleCoverage) || maxPossibleCoverage <= 0) {
        throw new Error('maxPossibleCoverage must be a positive number');
    }

    if (!Number.isFinite(coverageThreshold) || coverageThreshold <= 0 || coverageThreshold > 1) {
        throw new Error('coverageThreshold must be a number in (0, 1]');
    }

    const coverage = history.map(g => g?.bestFitness?.coverage ?? 0);
    const area = history.map(g => g?.bestFitness?.area ?? 0);
    const diversity = history.map(g => g?.diversity ?? null);

    const genCount = coverage.length;
    const maxGen = genCount - 1;

    const finalCoverage = Math.max(...coverage);

    const targetCov = maxPossibleCoverage * coverageThreshold;
    let gensToCoverageThreshold = maxGen;
    for (let i = 0; i < genCount; i++) {
        if (coverage[i] >= targetCov) {
            gensToCoverageThreshold = i;
            break;
        }
    }

    let aucCoverageRaw = 0;
    if (maxGen > 0) {
        for (let i = 0; i < maxGen; i++) {
            aucCoverageRaw += (coverage[i] + coverage[i + 1]) / 2;
        }
    }
    const aucCoverageNorm = maxGen > 0 ? aucCoverageRaw / (maxGen * maxPossibleCoverage) : 0;

    const reachedFullCoverage = finalCoverage >= maxPossibleCoverage ? 1 : 0;

    let finalArea = null;
    let refinementTime = null;

    if (reachedFullCoverage) {
        let firstSuccessIdx = -1;
        for (let i = 0; i < genCount; i++) {
            if (coverage[i] >= maxPossibleCoverage) {
                firstSuccessIdx = i;
                break;
            }
        }

        if (firstSuccessIdx === -1) {
            firstSuccessIdx = coverage.indexOf(finalCoverage);
        }

        if (firstSuccessIdx !== -1 && firstSuccessIdx < area.length) {
            let best = area[firstSuccessIdx];
            let bestIdx = firstSuccessIdx;

            for (let i = firstSuccessIdx + 1; i < area.length; i++) {
                if (area[i] < best) {
                    best = area[i];
                    bestIdx = i;
                }
            }

            finalArea = best;
            refinementTime = bestIdx - firstSuccessIdx;
        } else {
            finalArea = Math.min(...area);
            refinementTime = maxGen;
        }
    }

    let diversityHalfLife = null;
    let diversityFinalInitialRatio = null;
    let aucDiversityNorm = null;

    const hasDiversity =
        diversity.length === genCount &&
        diversity.every(v => v !== null && v !== undefined);

    if (hasDiversity && genCount > 0) {
        const initDiv = diversity[0];
        const finalDiv = diversity[genCount - 1];

        if (Number.isFinite(initDiv) && initDiv !== 0) {
            diversityFinalInitialRatio = finalDiv / initDiv;
        } else if (initDiv === 0) {
            diversityFinalInitialRatio = finalDiv === 0 ? 1 : Infinity;
        }

        if (initDiv > 0) {
            const halfTarget = initDiv * 0.5;

            for (let i = 1; i < genCount; i++) {
                if (diversity[i] <= halfTarget) {
                    const prev = diversity[i - 1];
                    const curr = diversity[i];
                    const denom = curr - prev;

                    if (denom === 0) {
                        diversityHalfLife = i;
                    } else {
                        const frac = (halfTarget - prev) / denom;
                        diversityHalfLife = (i - 1) + Math.min(1, Math.max(0, frac));
                    }
                    break;
                }
            }

            if (diversityHalfLife === null) {
                diversityHalfLife = Infinity;
            }
        } else if (initDiv === 0) {
            diversityHalfLife = 0;
        }

        let aucDivRaw = 0;
        if (maxGen > 0) {
            for (let i = 0; i < maxGen; i++) {
                aucDivRaw += (diversity[i] + diversity[i + 1]) / 2;
            }
        }

        if (maxGen > 0) {
            if (Number.isFinite(initDiv) && initDiv > 0) {
                aucDiversityNorm = aucDivRaw / (maxGen * initDiv);
            } else if (initDiv === 0) {
                aucDiversityNorm = aucDivRaw === 0 ? 0 : Infinity;
            }
        }
    }

    return {
        finalCoverage,
        gensToCoverageThreshold,
        aucCoverageNorm,
        finalArea,
        refinementTime,
        diversityHalfLife,
        diversityFinalInitialRatio,
        aucDiversityNorm,
        reachedFullCoverage
    };
}

export function filterMetrics(metrics, outputConfig) {
    if (!metrics) return metrics;

    const requested = Array.isArray(outputConfig?.metrics) && outputConfig.metrics.length
        ? outputConfig.metrics
        : METRIC_KEYS;

    const filtered = {};
    for (const entry of requested) {
        const key = typeof entry === 'string' ? entry : entry?.key;
        if (key && key in METRIC_DEFINITIONS && key in metrics) {
            filtered[key] = metrics[key];
        }
    }

    return filtered;
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
    const def = METRIC_DEFINITIONS[metricKey];
    if (!def) return metricKey ?? '-';

    if (def.usesThresholdFraction && Number.isFinite(thresholdFraction)) {
        return `${def.label} (${(thresholdFraction * 100).toFixed(0)}%)`;
    }

    return def.label;
}