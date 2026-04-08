// geometry.config.js
export const GEOMETRY_CONFIG = {

  WORLD_MIN: 0,
  WORLD_MAX: 1,


  // Center margin: keeps center away from edges
  INIT_CENTER_MARGIN : 0.05, // 5% margin on each side (10% total)
  // Angle jitter: how much vertices deviate from regular polygon
  // 0 = perfect regular polygon
  // 0.9 = use 90% of maximum safe jitter (recommended)
  // 1.0 = use maximum possible jitter (risky, angles might cross)
  ANGLE_JITTER_FACTOR: 0.9,

  // Note: No RADIUS_SAFETY needed because we use Math.random() * maxR
  // which allows points exactly on the boundary
};