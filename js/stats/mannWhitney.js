// js/stats/mannWhitney.js

/**
 * Mann–Whitney U test (a.k.a. Wilcoxon rank-sum) for two independent samples.
 *
 * - Handles ties using mid-ranks and tie-corrected variance.
 * - Uses normal approximation with continuity correction for p-value (two-sided).
 * - Filters out non-finite values (NaN, Infinity).
 *
 * Returns:
 * {
 *   n1, n2,
 *   U1, U2, U,        // U1 for sample1, U2 for sample2, U = min(U1, U2)
 *   z,                // z-statistic (two-sided, with continuity correction)
 *   p,                // two-sided p-value
 *   meanU, sdU        // for debugging / validation
 * }
 */
export function mannWhitneyUTest(sample1, sample2) {
    const x = (sample1 || []).filter(Number.isFinite);
    const y = (sample2 || []).filter(Number.isFinite);

    const n1 = x.length;
    const n2 = y.length;

    if (n1 === 0 || n2 === 0) {
        throw new Error('Mann–Whitney U: both samples must have at least 1 finite value.');
    }

    const N = n1 + n2;

    // 1) Combine samples and assign group labels
    const combined = [];
    for (let i = 0; i < n1; i++) {
        combined.push({ value: x[i], group: 'x', rank: 0 });
    }
    for (let i = 0; i < n2; i++) {
        combined.push({ value: y[i], group: 'y', rank: 0 });
    }

    // 2) Sort by value
    combined.sort((a, b) => a.value - b.value);

    // 3) Assign mid-ranks (fractional ranks) to handle ties
    //    Ranks start at 1.
    let idx = 0;
    while (idx < N) {
        let j = idx + 1;
        while (j < N && combined[j].value === combined[idx].value) {
            j++;
        }
        const startRank = idx + 1;
        const endRank = j;
        const avgRank = (startRank + endRank) / 2;
        for (let k = idx; k < j; k++) {
            combined[k].rank = avgRank;
        }
        idx = j;
    }

    // 4) Sum of ranks for each group
    let R1 = 0;
    let R2 = 0;
    for (const obs of combined) {
        if (obs.group === 'x') R1 += obs.rank;
        else R2 += obs.rank;
    }

    // 5) Compute U statistics (standard formulas)
    //    See e.g. Wikipedia / Statstutor:
    //    U1 = n1*n2 + n1*(n1+1)/2 - R1
    //    U2 = n1*n2 + n2*(n2+1)/2 - R2
    const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - R1;
    const U2 = n1 * n2 + (n2 * (n2 + 1)) / 2 - R2;
    const U = Math.min(U1, U2);

    // 6) Mean of U under H0
    const meanU = (n1 * n2) / 2;

    // 7) Tie-corrected standard deviation of U
    //
    // Without ties:
    //   sd^2 = n1 * n2 * (N + 1) / 12
    //
    // With ties (Statstutor / standard formula):
    //   sd^2 = [n1*n2 / (N*(N-1))] * ( (N^3 - N)/12 - sum_j (t_j^3 - t_j) / 12 )
    //
    // where t_j is the number of tied observations in tie group j.
    const tieCounts = [];
    idx = 0;
    while (idx < N) {
        let j = idx + 1;
        while (j < N && combined[j].value === combined[idx].value) {
            j++;
        }
        const t = j - idx;
        if (t > 1) tieCounts.push(t);
        idx = j;
    }

    let sdU;
    if (tieCounts.length === 0) {
        // No ties
        sdU = Math.sqrt(n1 * n2 * (N + 1) / 12);
    } else {
        // Tie correction
        const sumT = tieCounts.reduce((acc, t) => acc + (t ** 3 - t), 0);
        const inner = (N ** 3 - N - sumT) / 12;
        sdU = Math.sqrt((n1 * n2 / (N * (N - 1))) * inner);
    }

    if (!Number.isFinite(sdU) || sdU === 0) {
        return {
            n1,
            n2,
            U1,
            U2,
            U,
            z: NaN,
            p: NaN,
            meanU,
            sdU
        };
    }

    // 8) Normal approximation with continuity correction, two-sided
    //    z = (|U - meanU| - 0.5) / sdU
    const z = (Math.abs(U - meanU) - 0.5) / sdU;

    // two-sided p-value
    const p = 2 * (1 - normalCDF(Math.abs(z)));

    return {
        n1,
        n2,
        U1,
        U2,
        U,
        z,
        p,
        meanU,
        sdU
    };
}

// Standard normal CDF using erf approximation
function normalCDF(x) {
    return 0.5 * (1 + erf(x / Math.SQRT2));
}

// Abramowitz & Stegun-style approximation for erf
function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * ax);
    const y =
        1 -
        (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
            t *
            Math.exp(-ax * ax));

    return sign * y;
}