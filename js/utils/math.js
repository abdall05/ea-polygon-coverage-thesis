export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function randomInRange(min, max, rng = Math) {
  return min + rng.random() * (max - min);
}

export function gaussianRandom(mean, stdDev, rng = Math) {
  let u1 = 0;
  let u2 = 0;

  while (u1 === 0) u1 = rng.random();
  while (u2 === 0) u2 = rng.random();

  const z0 =
    Math.sqrt(-2 * Math.log(u1)) *
    Math.cos(2 * Math.PI * u2);

  return mean + z0 * stdDev;
}

export function cauchyRandom(location, scale, rng = Math) {
  let u = 0;

  while (u === 0 || u === 1) {
    u = rng.random();
  }

  return location + scale * Math.tan(Math.PI * (u - 0.5));
}

export function wrapTo2Pi(angle) {
  const twoPi = 2 * Math.PI;
  let a = angle % twoPi;

  if (a < 0) a += twoPi;

  return a;
}

export function circularAngleDiff(a, b) {
  const twoPi = 2 * Math.PI;
  let diff = Math.abs(wrapTo2Pi(a) - wrapTo2Pi(b));

  if (diff > Math.PI) diff = twoPi - diff;

  return diff; // Returns value in [0, π]
}