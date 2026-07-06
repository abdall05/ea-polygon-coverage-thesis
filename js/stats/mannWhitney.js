// js/stats/mannWhitney.js
import { clamp01 } from './statsUtils.js';

export function mannWhitneyUTest(sample1, sample2) {
  const x = (sample1 || []).filter(Number.isFinite);
  const y = (sample2 || []).filter(Number.isFinite);

  const n1 = x.length;
  const n2 = y.length;

  if (n1 === 0 || n2 === 0) {
    throw new Error('Mann–Whitney U: both samples must have at least 1 finite value.');
  }

  const N = n1 + n2;

  const combined = [];
  for (let i = 0; i < n1; i++) {
    combined.push({ value: x[i], group: 1, rank: 0 });
  }
  for (let i = 0; i < n2; i++) {
    combined.push({ value: y[i], group: 2, rank: 0 });
  }

  combined.sort((a, b) => a.value - b.value);

  const tieCounts = [];
  let idx = 0;

  while (idx < N) {
    let j = idx + 1;
    while (j < N && combined[j].value === combined[idx].value) {
      j++;
    }

    const startRank = idx + 1;
    const endRank = j;
    const averageRank = (startRank + endRank) / 2;

    for (let k = idx; k < j; k++) {
      combined[k].rank = averageRank;
    }

    const tieCount = j - idx;
    if (tieCount > 1) tieCounts.push(tieCount);

    idx = j;
  }

  let rankSum1 = 0;
  let rankSum2 = 0;

  for (const observation of combined) {
    if (observation.group === 1) rankSum1 += observation.rank;
    else rankSum2 += observation.rank;
  }

  const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - rankSum1;
  const U2 = n1 * n2 + (n2 * (n2 + 1)) / 2 - rankSum2;
  const U = Math.min(U1, U2);

  const meanU = (n1 * n2) / 2;

  let sdU;
  if (tieCounts.length === 0) {
    sdU = Math.sqrt((n1 * n2 * (N + 1)) / 12);
  } else {
    const tieCorrectionSum = tieCounts.reduce((acc, t) => acc + (t ** 3 - t), 0);
    const varianceFactor = ((N ** 3 - N) - tieCorrectionSum) / 12;
    sdU = Math.sqrt((n1 * n2 * varianceFactor) / (N * (N - 1)));
  }

  // Directional common-language effect for sample1 vs sample2:
  // probability that a random value from sample1 exceeds a random value from sample2,
  // with ties contributing 0.5 through the rank-based formulation.
  const clEffect =
    n1 > 0 && n2 > 0
      ? U2 / (n1 * n2)
      : NaN;

  if (!Number.isFinite(sdU) || sdU === 0) {
    return {
      n1,
      n2,
      U1,
      U2,
      U,
      z: 0,
      p: 1,
      meanU,
      sdU,
      clEffect,
      method: 'asymptotic',
      continuityCorrection: true,
      tiesPresent: tieCounts.length > 0
    };
  }


  const differenceFromMean = U - meanU;
  const continuityCorrection =
    differenceFromMean > 0 ? -0.5 : differenceFromMean < 0 ? 0.5 : 0;

  const z = (differenceFromMean + continuityCorrection) / sdU;
  const p = clamp01(2 * (1 - normalCDF(Math.abs(z))));

  return {
    n1,
    n2,
    U1,
    U2,
    U,
    z,
    p,
    meanU,
    sdU,
    clEffect,
    method: 'asymptotic',
    continuityCorrection: true,
    tiesPresent: tieCounts.length > 0
  };
}

function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const absoluteX = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absoluteX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absoluteX * absoluteX));

  return sign * y;
}