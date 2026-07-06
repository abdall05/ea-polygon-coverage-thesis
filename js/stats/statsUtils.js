// js/stats/statsUtils.js

export function clamp01(value) {
  if (!Number.isFinite(value)) return NaN;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function mean(values) {
  const finiteValues = (values || []).filter(Number.isFinite);

  if (finiteValues.length === 0) return NaN;

  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

export function varianceSample(values) {
  const finiteValues = (values || []).filter(Number.isFinite);

  if (finiteValues.length < 2) return 0;

  const m = mean(finiteValues);

  return (
    finiteValues.reduce((sum, value) => sum + (value - m) ** 2, 0) /
    (finiteValues.length - 1)
  );
}

export function quantileSorted(sorted, p) {
  if (!Array.isArray(sorted) || sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];

  const position = (sorted.length - 1) * p;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = position - lowerIndex;

  return (
    sorted[lowerIndex] * (1 - weight) +
    sorted[upperIndex] * weight
  );
}

export function summarize(values) {
  const finiteValues = (values || []).filter(Number.isFinite);

  if (finiteValues.length === 0) {
    return {
      count: 0,
      mean: NaN,
      median: NaN,
      sd: NaN,
      min: NaN,
      q1: NaN,
      q3: NaN,
      max: NaN
    };
  }

  const sorted = [...finiteValues].sort((a, b) => a - b);

  return {
    count: finiteValues.length,
    mean: mean(finiteValues),
    median: quantileSorted(sorted, 0.5),
    sd: Math.sqrt(varianceSample(finiteValues)),
    min: sorted[0],
    q1: quantileSorted(sorted, 0.25),
    q3: quantileSorted(sorted, 0.75),
    max: sorted[sorted.length - 1]
  };
}

export function chiSquareCDF(x, k) {
  if (!Number.isFinite(x) || !Number.isFinite(k) || x < 0 || k <= 0) {
    return NaN;
  }

  return regularizedGammaP(k / 2, x / 2);
}

function regularizedGammaP(a, x) {
  if (!Number.isFinite(a) || !Number.isFinite(x) || x < 0 || a <= 0) {
    return NaN;
  }

  if (x === 0) {
    return 0;
  }

  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let delta = sum;

    for (let n = 1; n <= 1000; n++) {
      ap += 1;
      delta *= x / ap;
      sum += delta;

      if (Math.abs(delta) < Math.abs(sum) * 1e-14) {
        break;
      }
    }

    const logGammaA = logGamma(a);

    return clamp01(
      sum * Math.exp(-x + a * Math.log(x) - logGammaA)
    );
  }

  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;

  for (let n = 1; n <= 1000; n++) {
    const an = -n * (n - a);

    b += 2;

    d = an * d + b;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }

    c = b + an / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }

    d = 1 / d;

    const delta = c * d;
    h *= delta;

    if (Math.abs(delta - 1) < 1e-14) {
      break;
    }
  }

  const logGammaA = logGamma(a);

  const q =
    Math.exp(-x + a * Math.log(x) - logGammaA) *
    h;

  return clamp01(1 - q);
}

function logGamma(z) {
  const coefficients = [
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
    return (
      Math.log(Math.PI) -
      Math.log(Math.sin(Math.PI * z)) -
      logGamma(1 - z)
    );
  }

  z -= 1;

  let x = coefficients[0];

  for (let i = 1; i < coefficients.length; i++) {
    x += coefficients[i] / (z + i);
  }

  const t = z + 7.5;

  return (
    0.5 * Math.log(2 * Math.PI) +
    (z + 0.5) * Math.log(t) -
    t +
    Math.log(x)
  );
}