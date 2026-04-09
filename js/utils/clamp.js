export const clamp = (v, lo, hi, counter) => {
    const clamped = Math.min(Math.max(v, lo), hi);
    if (counter && clamped !== v) counter.changed++;
    return clamped;
};