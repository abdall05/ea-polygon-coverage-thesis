export function mean(values) {
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}

export function quantileSorted(sorted, p) {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];

  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);

  if (lo === hi) return sorted[lo];

  const t = pos - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

export function varianceSample(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, x) => sum + (x - m) ** 2, 0) / (values.length - 1);
}

export function summarize(values) {
  if (values.length === 0) {
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

  const sorted = [...values].sort((a, b) => a - b);

  return {
    count: values.length,
    mean: mean(values),
    median: quantileSorted(sorted, 0.5),
    sd: Math.sqrt(varianceSample(values)),
    min: sorted[0],
    q1: quantileSorted(sorted, 0.25),
    q3: quantileSorted(sorted, 0.75),
    max: sorted[sorted.length - 1]
  };
}