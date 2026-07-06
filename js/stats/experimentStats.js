import { mannWhitneyUTest } from './mannWhitney.js';
import { kruskalWallis } from './kruskalWallis.js';
import { fishersExactTest } from './fishersExactTest.js';
import { chiSquareContingencyTest } from './chiSquareContingencyTest.js';
import { clamp01, quantileSorted } from './statsUtils.js';
import { METRIC_DEFINITIONS, METRIC_KEYS } from '../model/metrics/metricConfig.js';

export function computeExperimentStatistics(configResults, options = {}) {
  const alpha = Number.isFinite(options.alpha) ? options.alpha : 0.05;

  const requestedMetrics = (
    Array.isArray(options.metrics) && options.metrics.length
      ? options.metrics
      : METRIC_KEYS
  ).filter(metric => metric in METRIC_DEFINITIONS);

  const metricResults = requestedMetrics.map(metric => {
    const metricDef = METRIC_DEFINITIONS[metric] || {};
    const metricKind = metricDef.kind || 'numeric';

    if (metricKind === 'binary') {
      return computeBinaryMetricStatistics(
        metric,
        metricDef,
        configResults,
        alpha
      );
    }

    return computeNumericMetricStatistics(
      metric,
      metricDef,
      configResults,
      alpha
    );
  });

  return {
    alpha,
    metricResults
  };
}

function computeNumericMetricStatistics(metric, metricDef, configResults, alpha) {
  const allGroups = (configResults || []).map(cr => ({
    configName: cr.configName,
    values: (cr.results || [])
      .map(run => run?.metrics?.[metric])
      .filter(value => Number.isFinite(value))
  }));

  const groupSummaries = buildNumericGroupSummaries(allGroups);
  const groups = allGroups.filter(group => group.values.length > 0);

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

  if (groups.length === 2) {
    const result = runPairwiseMannWhitney(groups[0], groups[1], alpha);

    return {
      metric,
      metricDef,
      nConfigs: 2,
      testType: 'mann-whitney',
      groupSummaries,
      omnibus: null,
      pairwise: [sanitizeNumericPairwiseResult(result, alpha)]
    };
  }

  const omnibus = sanitizeNumericOmnibusResult(
    runKruskalWallis(groups, alpha),
    groups.length,
    alpha
  );

  const rawPairwise = [];

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      rawPairwise.push(
        runPairwiseMannWhitney(groups[i], groups[j], alpha)
      );
    }
  }

  const adjusted = adjustBonferroni(
    rawPairwise.map(row => Number.isFinite(row.p) ? row.p : 1)
  );

  const pairwise = rawPairwise.map((row, index) => ({
    ...row,
    p: Number.isFinite(row.p) ? row.p : 1,
    pAdjusted: adjusted[index],
    significant: Number.isFinite(adjusted[index])
      ? adjusted[index] <= alpha
      : false
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
}

function computeBinaryMetricStatistics(metric, metricDef, configResults, alpha) {
  const groups = (configResults || [])
    .map(cr => {
      const values = (cr.results || [])
        .map(run => normalizeBinaryValue(run?.metrics?.[metric]))
        .filter(value => value === 0 || value === 1);

      const successes = values.reduce((sum, value) => sum + value, 0);
      const failures = values.length - successes;

      return {
        configName: cr.configName,
        values,
        successes,
        failures,
        n: values.length,
        proportion: values.length ? successes / values.length : NaN
      };
    })
    .filter(group => group.n > 0);

  const groupSummaries = buildBinaryGroupSummaries(groups);

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

  if (groups.length === 2) {
    const result = runPairwiseBinaryTest(groups[0], groups[1], alpha);

    return {
      metric,
      metricDef,
      nConfigs: 2,
      testType: 'fisher-exact',
      groupSummaries,
      omnibus: null,
      pairwise: [result]
    };
  }

  const omnibus = runBinaryOmnibus(groups, alpha);

  const rawPairwise = [];

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      rawPairwise.push(
        runPairwiseBinaryTest(groups[i], groups[j], alpha)
      );
    }
  }

  const adjusted = adjustBonferroni(
    rawPairwise.map(row => Number.isFinite(row.p) ? row.p : 1)
  );

  const pairwise = rawPairwise.map((row, index) => ({
    ...row,
    p: Number.isFinite(row.p) ? row.p : 1,
    pAdjusted: adjusted[index],
    significant: Number.isFinite(adjusted[index])
      ? adjusted[index] <= alpha
      : false
  }));

  return {
    metric,
    metricDef,
    nConfigs: groups.length,
    testType: 'chi-square-then-pairwise',
    groupSummaries,
    omnibus,
    pairwise
  };
}

function runPairwiseMannWhitney(groupA, groupB, alpha) {
  const result = mannWhitneyUTest(groupA.values, groupB.values);
  const p = result?.p;

  return {
    configA: groupA.configName,
    configB: groupB.configName,
    test: 'Mann-Whitney U',
    U: Number.isFinite(result?.U) ? result.U : NaN,
    U1: Number.isFinite(result?.U1) ? result.U1 : NaN,
    U2: Number.isFinite(result?.U2) ? result.U2 : NaN,
    z: Number.isFinite(result?.z) ? result.z : NaN,
    meanU: Number.isFinite(result?.meanU) ? result.meanU : NaN,
    sdU: Number.isFinite(result?.sdU) ? result.sdU : NaN,
    clEffect: Number.isFinite(result?.clEffect) ? result.clEffect : NaN,
    p: Number.isFinite(p) ? p : 1,
    pAdjusted: Number.isFinite(p) ? p : 1,
    significant: Number.isFinite(p) ? p <= alpha : false,
    method: result?.method ?? 'asymptotic',
    continuityCorrection: !!result?.continuityCorrection,
    tiesPresent: !!result?.tiesPresent
  };
}

function runPairwiseBinaryTest(groupA, groupB, alpha) {
  const result = fishersExactTest([
    [groupA.successes, groupA.failures],
    [groupB.successes, groupB.failures]
  ]);

  const p = result?.p;

  return {
    configA: groupA.configName,
    configB: groupB.configName,
    test: result?.test ?? "Fisher's exact test",
    oddsRatio: Number.isFinite(result?.oddsRatio)
      ? result.oddsRatio
      : result?.oddsRatio,
    p: Number.isFinite(p) ? p : 1,
    pAdjusted: Number.isFinite(p) ? p : 1,
    significant: Number.isFinite(p) ? p <= alpha : false,
    method: result?.method ?? 'exact'
  };
}

function runKruskalWallis(groups, alpha) {
  const arrays = groups.map(group => group.values);
  const out = kruskalWallis(arrays);

  return {
    test: 'Kruskal-Wallis',
    H: Number.isFinite(out?.Hcorr) ? out.Hcorr : out?.H,
    Hraw: Number.isFinite(out?.H) ? out.H : 0,
    df: Number.isFinite(out?.df) ? out.df : Math.max(0, groups.length - 1),
    p: Number.isFinite(out?.p) ? out.p : 1,
    significant: Number.isFinite(out?.p) ? out.p <= alpha : false,
    method: out?.method ?? 'asymptotic',
    tiesPresent: !!out?.tiesPresent
  };
}

function runBinaryOmnibus(groups, alpha) {
  const table = groups.map(group => [group.successes, group.failures]);
  const out = chiSquareContingencyTest(table);
  const p = out?.p;

  return {
    test: out?.test ?? 'Chi-square test of independence',
    chi2: Number.isFinite(out?.chi2) ? out.chi2 : NaN,
    df: Number.isFinite(out?.df) ? out.df : Math.max(0, groups.length - 1),
    p: Number.isFinite(p) ? p : 1,
    significant: Number.isFinite(p) ? p <= alpha : false,
    method: out?.method ?? 'asymptotic'
  };
}

function sanitizeNumericPairwiseResult(row, alpha) {
  const safeP = Number.isFinite(row?.p) ? row.p : 1;
  const safeAdjusted = Number.isFinite(row?.pAdjusted)
    ? row.pAdjusted
    : safeP;

  return {
    ...row,
    U: Number.isFinite(row?.U) ? row.U : NaN,
    U1: Number.isFinite(row?.U1) ? row.U1 : NaN,
    U2: Number.isFinite(row?.U2) ? row.U2 : NaN,
    z: Number.isFinite(row?.z) ? row.z : NaN,
    meanU: Number.isFinite(row?.meanU) ? row.meanU : NaN,
    sdU: Number.isFinite(row?.sdU) ? row.sdU : NaN,
    clEffect: Number.isFinite(row?.clEffect) ? row.clEffect : NaN,
    p: safeP,
    pAdjusted: safeAdjusted,
    significant: safeAdjusted <= alpha,
    method: row?.method ?? 'asymptotic',
    continuityCorrection: !!row?.continuityCorrection,
    tiesPresent: !!row?.tiesPresent
  };
}

function sanitizeNumericOmnibusResult(row, nGroups, alpha) {
  const safeP = Number.isFinite(row?.p) ? row.p : 1;

  return {
    test: row?.test ?? 'Kruskal-Wallis',
    H: Number.isFinite(row?.H) ? row.H : 0,
    Hraw: Number.isFinite(row?.Hraw) ? row.Hraw : 0,
    df: Number.isFinite(row?.df) ? row.df : Math.max(0, nGroups - 1),
    p: safeP,
    significant: safeP <= alpha,
    method: row?.method ?? 'asymptotic',
    tiesPresent: !!row?.tiesPresent
  };
}

function adjustBonferroni(pValues) {
  const m = pValues.length || 0;

  if (!m) {
    return [];
  }

  return pValues.map(p =>
    clamp01(Number.isFinite(p) ? p * m : 1)
  );
}

function buildNumericGroupSummaries(groups) {
  return groups.map(group => {
    const sorted = [...group.values]
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    if (!sorted.length) {
      return {
        configName: group.configName,
        n: 0,
        median: NaN,
        q1: NaN,
        q3: NaN
      };
    }

    return {
      configName: group.configName,
      n: sorted.length,
      median: quantileSorted(sorted, 0.5),
      q1: quantileSorted(sorted, 0.25),
      q3: quantileSorted(sorted, 0.75)
    };
  });
}

function buildBinaryGroupSummaries(groups) {
  return groups.map(group => ({
    configName: group.configName,
    n: group.n,
    successes: group.successes,
    failures: group.failures,
    proportion: group.proportion
  }));
}

function normalizeBinaryValue(value) {
  if (value === 0 || value === 1) {
    return value;
  }

  if (value === true) {
    return 1;
  }

  if (value === false) {
    return 0;
  }

  return NaN;
}