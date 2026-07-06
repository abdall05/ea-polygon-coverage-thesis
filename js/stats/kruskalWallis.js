// js/stats/kruskalWallis.js
import { clamp01, chiSquareCDF } from './statsUtils.js';

export function kruskalWallis(samples) {
  if (!Array.isArray(samples) || samples.length < 2) {
    throw new Error('Kruskal–Wallis: need at least 2 groups.');
  }

  const groups = samples.map((arr, index) => ({
    index,
    values: (arr || []).filter(Number.isFinite)
  }));

  const nonEmptyGroups = groups.filter(group => group.values.length > 0);

  if (nonEmptyGroups.length < 2) {
    throw new Error('Kruskal–Wallis: need at least 2 non-empty groups.');
  }

  const k = nonEmptyGroups.length;

  const combined = [];

  for (const group of nonEmptyGroups) {
    for (const value of group.values) {
      combined.push({
        value,
        groupIndex: group.index,
        rank: 0
      });
    }
  }

  const nTotal = combined.length;

  if (nTotal < 2) {
    throw new Error('Kruskal–Wallis: total sample size must be >= 2.');
  }

  combined.sort((a, b) => a.value - b.value);

  const tieCounts = [];
  let i = 0;

  while (i < nTotal) {
    let j = i + 1;

    while (j < nTotal && combined[j].value === combined[i].value) {
      j++;
    }

    const tieCount = j - i;
    const startRank = i + 1;
    const endRank = j;
    const averageRank = (startRank + endRank) / 2;

    for (let r = i; r < j; r++) {
      combined[r].rank = averageRank;
    }

    if (tieCount > 1) {
      tieCounts.push(tieCount);
    }

    i = j;
  }

  const rankSums = new Map();
  const counts = new Map();

  for (const observation of combined) {
    const groupIndex = observation.groupIndex;

    rankSums.set(
      groupIndex,
      (rankSums.get(groupIndex) || 0) + observation.rank
    );

    counts.set(
      groupIndex,
      (counts.get(groupIndex) || 0) + 1
    );
  }

  let sumTerm = 0;

  for (const [groupIndex, rankSum] of rankSums.entries()) {
    const groupCount = counts.get(groupIndex) || 0;

    if (groupCount > 0) {
      sumTerm += (rankSum * rankSum) / groupCount;
    }
  }

  const Hraw =
    (12 / (nTotal * (nTotal + 1))) * sumTerm -
    3 * (nTotal + 1);

  // H is a test statistic, so it is only lower-bounded by 0.
  // Do NOT clamp it to [0, 1].
  const H = Math.max(0, Hraw);

  const df = k - 1;
  const tiesPresent = tieCounts.length > 0;

  let Hcorr = H;

  if (tiesPresent) {
    const denominator = nTotal ** 3 - nTotal;

    const tieCorrectionSum = tieCounts.reduce(
      (acc, tieCount) => acc + (tieCount ** 3 - tieCount),
      0
    );

    const correctionFactor = 1 - tieCorrectionSum / denominator;

    if (!Number.isFinite(correctionFactor) || correctionFactor <= 0) {
      return {
        k,
        nTotal,
        H: 0,
        Hcorr: 0,
        df,
        p: 1,
        method: 'asymptotic',
        tiesPresent: true
      };
    }

    // Corrected H is also a test statistic, not a probability.
    Hcorr = Math.max(0, H / correctionFactor);
  }

  const p = clamp01(1 - chiSquareCDF(Hcorr, df));

  return {
    k,
    nTotal,
    H,
    Hcorr,
    df,
    p,
    method: 'asymptotic',
    tiesPresent
  };
}
