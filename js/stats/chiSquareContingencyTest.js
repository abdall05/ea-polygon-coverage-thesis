// js/stats/chiSquareContingencyTest.js
import { clamp01, chiSquareCDF } from './statsUtils.js';

export function chiSquareContingencyTest(table) {
  if (!Array.isArray(table) || table.length < 2) {
    throw new Error(
      'chiSquareContingencyTest expects a 2D contingency table with at least 2 rows.'
    );
  }

  const normalized = table.map(row => {
    if (!Array.isArray(row) || row.length < 2) {
      throw new Error(
        'Each row in the contingency table must have at least 2 columns.'
      );
    }

    return row.map(toNonNegativeNumber);
  });

  const rows = normalized.length;
  const cols = normalized[0].length;

  if (!normalized.every(row => row.length === cols)) {
    throw new Error('All contingency table rows must have the same length.');
  }

  const rowSums = normalized.map(row =>
    row.reduce((sum, value) => sum + value, 0)
  );

  const colSums = Array.from({ length: cols }, (_, colIndex) =>
    normalized.reduce((sum, row) => sum + row[colIndex], 0)
  );

  const total = rowSums.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    throw new Error('Contingency table must contain at least one observation.');
  }

  if (rowSums.some(sum => sum <= 0)) {
    throw new Error('Each row in the contingency table must have a positive total.');
  }

  let chi2 = 0;

  const expected = normalized.map((row, rowIndex) =>
    row.map((observed, colIndex) => {
      const expectedValue =
        (rowSums[rowIndex] * colSums[colIndex]) / total;

      if (expectedValue > 0) {
        const diff = observed - expectedValue;
        chi2 += (diff * diff) / expectedValue;
      }

      return expectedValue;
    })
  );

  const df = (rows - 1) * (cols - 1);

  if (df <= 0) {
    return {
      test: 'Chi-square test of independence',
      chi2: 0,
      df,
      p: 1,
      expected,
      method: 'asymptotic'
    };
  }

  const p = clamp01(1 - chiSquareCDF(chi2, df));

  return {
    test: 'Chi-square test of independence',
    chi2,
    df,
    p,
    expected,
    method: 'asymptotic'
  };
}

function toNonNegativeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`Invalid contingency count: ${value}`);
  }

  return number;
}