import { mannWhitneyUTest } from './mannWhitney.js';
import { kruskalWallis } from './kruskalWallis.js';
import { METRIC_DEFINITIONS } from '../model/metrics/metricConfig.js';

export function computeExperimentStatistics(configResults, options = {}) {
    const alpha = Number.isFinite(options.alpha) ? options.alpha : 0.05;
    const metricNames = Object.keys(METRIC_DEFINITIONS);

    const metricResults = metricNames.map((metric) => {
        const metricDef = METRIC_DEFINITIONS[metric] || {};

        const groups = (configResults || [])
            .map((cr) => ({
                configName: cr.configName,
                values: (cr.results || [])
                    .map((run) => run?.metrics?.[metric])
                    .filter((v) => typeof v === 'number' && Number.isFinite(v))
            }))
            .filter((group) => group.values.length > 0);

        const groupSummaries = buildGroupSummaries(groups);

        if (groups.length < 2) {
            return {
                metric,
                metricDef,
                nConfigs: groups.length,
                testType: 'insufficient-data',
                groupSummaries,
                omnibus: null,
                pairwise: []
            };
        }

        if (areAllValuesIdentical(groups)) {
            return {
                metric,
                metricDef,
                nConfigs: groups.length,
                testType: groups.length === 2 ? 'mann-whitney' : 'kruskal-then-pairwise',
                groupSummaries,
                omnibus: groups.length >= 3
                    ? {
                        test: 'Kruskal-Wallis',
                        H: 0,
                        df: groups.length - 1,
                        p: 1,
                        significant: false
                    }
                    : null,
                pairwise: buildFlatNoDifferencePairwise(groups)
            };
        }

        if (groups.length === 2) {
            const result = runPairwiseMannWhitney(groups[0], groups[1], alpha);
            return {
                metric,
                metricDef,
                nConfigs: 2,
                testType: 'mann-whitney',
                groupSummaries,
                omnibus: null,
                pairwise: [sanitizePairwiseResult(result, alpha)]
            };
        }

        const omnibus = sanitizeOmnibusResult(runKruskalWallis(groups, alpha), groups.length, alpha);

        const rawPairwise = [];
        for (let i = 0; i < groups.length; i++) {
            for (let j = i + 1; j < groups.length; j++) {
                rawPairwise.push(runPairwiseMannWhitney(groups[i], groups[j], alpha));
            }
        }

        const safeRawPValues = rawPairwise.map((row) => Number.isFinite(row.p) ? row.p : 1);
        const adjusted = adjustBonferroni(safeRawPValues);

        const pairwise = rawPairwise.map((row, idx) => ({
            ...row,
            p: Number.isFinite(row.p) ? row.p : 1,
            pAdjusted: adjusted[idx],
            significant: Number.isFinite(adjusted[idx]) ? adjusted[idx] <= alpha : false
        }));

        return {
            metric,
            metricDef,
            nConfigs: groups.length,
            testType: 'kruskal-then-pairwise',
            groupSummaries,
            omnibus,
            pairwise
        };
    });

    return {
        alpha,
        metricResults
    };
}

function runPairwiseMannWhitney(groupA, groupB, alpha) {
    const result = mannWhitneyUTest(groupA.values, groupB.values);
    const p = result.p;

    return {
        configA: groupA.configName,
        configB: groupB.configName,
        test: 'Mann-Whitney U',
        p,
        pAdjusted: p,
        significant: Number.isFinite(p) ? p <= alpha : false
    };
}

function runKruskalWallis(groups, alpha) {
    const arrays = groups.map((g) => g.values);
    const out = kruskalWallis(arrays);

    return {
        test: 'Kruskal-Wallis',
        H: out?.Hcorr ?? out?.H,
        df: out?.df,
        p: out?.p,
        significant: Number.isFinite(out?.p) ? out.p <= alpha : false
    };
}

function sanitizePairwiseResult(row, alpha) {
    const safeP = Number.isFinite(row?.p) ? row.p : 1;
    return {
        ...row,
        p: safeP,
        pAdjusted: Number.isFinite(row?.pAdjusted) ? row.pAdjusted : safeP,
        significant: safeP <= alpha
    };
}

function sanitizeOmnibusResult(row, nGroups, alpha) {
    const safeP = Number.isFinite(row?.p) ? row.p : 1;
    return {
        test: row?.test ?? 'Kruskal-Wallis',
        H: Number.isFinite(row?.H) ? row.H : 0,
        df: Number.isFinite(row?.df) ? row.df : Math.max(0, nGroups - 1),
        p: safeP,
        significant: safeP <= alpha
    };
}

function areAllValuesIdentical(groups) {
    const pooled = groups.flatMap((g) => g.values).filter(Number.isFinite);
    if (!pooled.length) return false;
    const first = pooled[0];
    return pooled.every((v) => v === first);
}

function buildFlatNoDifferencePairwise(groups) {
    const rows = [];
    for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
            rows.push({
                configA: groups[i].configName,
                configB: groups[j].configName,
                test: 'Mann-Whitney U',
                p: 1,
                pAdjusted: 1,
                significant: false
            });
        }
    }
    return rows;
}

function adjustBonferroni(pValues) {
    const m = pValues.length || 0;
    if (!m) return [];

    return pValues.map((p) => clamp01(Number.isFinite(p) ? p * m : 1));
}

function clamp01(x) {
    if (!Number.isFinite(x)) return NaN;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
}

function buildGroupSummaries(groups) {
    return groups.map((group) => {
        const summary = computeMedianQuartiles(group.values);
        return {
            configName: group.configName,
            n: group.values.length,
            median: summary?.median ?? NaN,
            q1: summary?.q1 ?? NaN,
            q3: summary?.q3 ?? NaN
        };
    });
}

function computeMedianQuartiles(values) {
    const sorted = [...values]
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b);

    if (!sorted.length) return null;

    return {
        median: quantile(sorted, 0.5),
        q1: quantile(sorted, 0.25),
        q3: quantile(sorted, 0.75)
    };
}

function quantile(sortedValues, p) {
    if (!sortedValues.length) return NaN;
    if (sortedValues.length === 1) return sortedValues[0];

    const pos = (sortedValues.length - 1) * p;
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);

    if (lower === upper) return sortedValues[lower];

    const weight = pos - lower;
    return sortedValues[lower] + weight * (sortedValues[upper] - sortedValues[lower]);
}