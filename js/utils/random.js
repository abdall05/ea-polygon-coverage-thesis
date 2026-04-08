export function createGenerator(seed) {
    let currentSeed = seed;  

    return {
        random() {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        }
    };
}