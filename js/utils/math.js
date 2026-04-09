export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function wrapTo2Pi(angle) {
    const twoPi = 2 * Math.PI;
    let a = angle % twoPi;
    if (a < 0) a += twoPi;
    return a;
}