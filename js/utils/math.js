export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function wrapTo2Pi(angle) {
    const twoPi = 2 * Math.PI;
    let a = angle % twoPi;
    if (a < 0) a += twoPi;
    return a;
}

export function circularAngleDiff(a, b) {
    const twoPi = 2 * Math.PI;

    let diff = Math.abs(a - b);
    if (diff > Math.PI) diff = twoPi - diff;

    return diff; // in [0, π]
}   