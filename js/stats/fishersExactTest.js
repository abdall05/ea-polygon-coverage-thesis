// js/stats/fisherExact.js
import { clamp01 } from './statsUtils.js';

export function fishersExactTest(table) {
  if (
    !Array.isArray(table) ||
    table.length !== 2 ||
    table.some(row => !Array.isArray(row) || row.length !== 2)
  ) {
    throw new Error(
      "Fisher's exact test expects a 2x2 table: [[a, b], [c, d]]."
    );
  }

  const [[a, b], [c, d]] = table.map(row =>
    row.map(toNonNegativeInteger)
  );

  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const n = row1 + row2;

  if (n === 0) {
    throw new Error("Fisher's exact test requires at least one observation.");
  }

  const minA = Math.max(0, col1 - row2);
  const maxA = Math.min(row1, col1);

  const observedLogP = logHypergeometric2x2(
    a,
    row1,
    row2,
    col1,
    n
  );

  let pTwoSided = 0;

  for (let x = minA; x <= maxA; x++) {
    const logP = logHypergeometric2x2(
      x,
      row1,
      row2,
      col1,
      n
    );

    if (logP <= observedLogP + 1e-12) {
      pTwoSided += Math.exp(logP);
    }
  }

  const oddsRatio = computeOddsRatio(a, b, c, d);

  return {
    test: "Fisher's exact test",
    oddsRatio,
    p: clamp01(pTwoSided),
    method: 'exact'
  };
}

function computeOddsRatio(a, b, c, d) {
  const numerator = a * d;
  const denominator = b * c;

  if (denominator === 0) {
    if (numerator === 0) return NaN;
    return Infinity;
  }

  return numerator / denominator;
}

function toNonNegativeInteger(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`Invalid contingency count: ${value}`);
  }

  return number;
}

function logHypergeometric2x2(x, row1, row2, col1, n) {
  return (
    logChoose(row1, x) +
    logChoose(row2, col1 - x) -
    logChoose(n, col1)
  );
}

function logChoose(n, k) {
  if (k < 0 || k > n) {
    return -Infinity;
  }

  return (
    logFactorial(n) -
    logFactorial(k) -
    logFactorial(n - k)
  );
}

const LOG_FACTORIAL_CACHE = [0];

function logFactorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    return NaN;
  }

  for (let i = LOG_FACTORIAL_CACHE.length; i <= n; i++) {
    LOG_FACTORIAL_CACHE[i] =
      LOG_FACTORIAL_CACHE[i - 1] + Math.log(i);
  }

  return LOG_FACTORIAL_CACHE[n];
}