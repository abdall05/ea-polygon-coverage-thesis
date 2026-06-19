// js/stats/kruskalWallis.js

/**
 * Kruskal–Wallis H test for k independent samples.
 *
 * samples: Array of arrays, e.g. [[x1...], [x2...], ...]
 *          Each inner array = one group (config).
 *
 * - Filters out non-finite values.
 * - Uses mid-ranks and tie correction.
 * - Approximates p-value with chi-square CDF (df = k - 1).
 *
 * Returns:
 * {
 *   k,                // number of groups
 *   nTotal,           // total N
 *   H,                // raw H statistic
 *   Hcorr,            // tie-corrected H
 *   df,               // degrees of freedom = k - 1
 *   p                 // p-value (right-tail, Hcorr)
 * }
 */
export function kruskalWallis(samples) {
    if (!Array.isArray(samples) || samples.length < 2) {
        throw new Error('Kruskal–Wallis: need at least 2 groups.');
    }

    // 1) Clean and check groups
    const groups = samples.map((arr, idx) => {
        const vals = (arr || []).filter(Number.isFinite);
        return { index: idx, values: vals };
    });

    const nonEmpty = groups.filter(g => g.values.length > 0);
    if (nonEmpty.length < 2) {
        throw new Error('Kruskal–Wallis: need at least 2 non-empty groups.');
    }

    const k = nonEmpty.length;

    // 2) Combine and label
    const combined = [];
    for (const g of nonEmpty) {
        for (const v of g.values) {
            combined.push({ value: v, groupIndex: g.index, rank: 0 });
        }
    }

    const nTotal = combined.length;
    if (nTotal < 2) {
        throw new Error('Kruskal–Wallis: total sample size must be >= 2.');
    }

    // 3) Sort by value
    combined.sort((a, b) => a.value - b.value);

    // 4) Assign mid-ranks and track tie counts
    let tieCounts = [];
    let i = 0;
    while (i < nTotal) {
        let j = i + 1;
        while (j < nTotal && combined[j].value === combined[i].value) {
            j++;
        }
        const t = j - i;               // size of tie block
        const startRank = i + 1;       // ranks start at 1
        const endRank = j;
        const avgRank = (startRank + endRank) / 2;
        for (let r = i; r < j; r++) {
            combined[r].rank = avgRank;
        }
        if (t > 1) tieCounts.push(t);
        i = j;
    }

    // 5) Sum of ranks per group
    const rankSums = new Map();
    const counts = new Map();
    for (const obs of combined) {
        const gi = obs.groupIndex;
        rankSums.set(gi, (rankSums.get(gi) || 0) + obs.rank);
        counts.set(gi, (counts.get(gi) || 0) + 1);
    }

    // 6) Compute H statistic:
    // H = (12 / (N * (N + 1))) * sum_j (R_j^2 / n_j) - 3 * (N + 1)
    let sumTerm = 0;
    for (const [gi, Rj] of rankSums.entries()) {
        const nj = counts.get(gi) || 0;
        if (nj > 0) {
            sumTerm += (Rj * Rj) / nj;
        }
    }

    const H = (12 / (nTotal * (nTotal + 1))) * sumTerm - 3 * (nTotal + 1);

    // 7) Tie correction factor:
    // C = 1 - sum_t (t^3 - t) / (N^3 - N)
    let Hcorr = H;
    if (tieCounts.length > 0) {
        const denom = nTotal ** 3 - nTotal;
        let tieSum = 0;
        for (const t of tieCounts) {
            tieSum += (t ** 3 - t);
        }
        const C = 1 - tieSum / denom;
        if (C > 0) {
            Hcorr = H / C;
        }
    }

    const df = k - 1;

    // 8) p-value using chi-square(df) distribution
    const p = 1 - chiSquareCDF(Hcorr, df);

    return {
        k,
        nTotal,
        H,
        Hcorr,
        df,
        p
    };
}

/**
 * Chi-square CDF using regularized gamma function:
 * CDF(x; k) = P(k/2, x/2)
 */
function chiSquareCDF(x, k) {
    if (!Number.isFinite(x) || !Number.isFinite(k) || x < 0 || k <= 0) return NaN;
    return regularizedGammaP(k / 2, x / 2);
}

/**
 * Regularized lower incomplete gamma P(a, x) = gamma(a, x) / Gamma(a)
 * Implementation based on series expansion (x < a+1) and
 * continued fraction (x >= a+1), similar in spirit to Numerical Recipes.
 */
function regularizedGammaP(a, x) {
    if (x < 0 || a <= 0) return NaN;

    if (x === 0) return 0;

    if (x < a + 1) {
        // Series representation
        let ap = a;
        let sum = 1 / a;
        let del = sum;
        for (let n = 1; n <= 1000; n++) {
            ap += 1;
            del *= x / ap;
            sum += del;
            if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
        }
        const lg = logGamma(a);
        const result = sum * Math.exp(-x + a * Math.log(x) - lg);
        return clamp01(result);
    } else {
        // Continued fraction representation of Q(a,x), then P = 1 - Q
        let b0 = 1;
        let b1 = x + 1 - a;
        let fac = 1 / b1;
        let c1 = 1 / 1e-30;
        let d1 = 1 / b1;
        let h = d1;

        for (let n = 1; n <= 1000; n++) {
            const an = -n * (n - a);
            b1 += 2;
            d1 = an * d1 + b1;
            if (Math.abs(d1) < 1e-30) d1 = 1e-30;
            c1 = b1 + an / c1;
            if (Math.abs(c1) < 1e-30) c1 = 1e-30;
            d1 = 1 / d1;
            const delta = c1 * d1;
            h *= delta;
            if (Math.abs(delta - 1) < 1e-14) break;
        }

        const lg = logGamma(a);
        const Q = Math.exp(-x + a * Math.log(x) - lg) * h;
        const P = 1 - Q;
        return clamp01(P);
    }
}

/**
 * logGamma via Lanczos approximation.
 */
function logGamma(z) {
    const x = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];

    if (z < 0.5) {
        // Reflection formula
        return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    }

    z -= 1;
    let a = x[0];
    const t = z + 7.5;
    for (let i = 1; i < x.length; i++) {
        a += x[i] / (z + i);
    }

    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

function clamp01(v) {
    if (!Number.isFinite(v)) return NaN;
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}