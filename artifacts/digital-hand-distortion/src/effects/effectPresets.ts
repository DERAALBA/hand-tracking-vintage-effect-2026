export type EffectPreset = {
  name: string;
  wave: number;
  liquid: number;
  chroma: number;
  tear: number;
  pixel: number;
  scan: number;
  tint: [number, number, number];
  mode?: 'standard' | 'crt';
  crtStrength?: number;
};

export const EFFECT_PRESETS: EffectPreset[] = [
  // 1. VINTAGE TV
  {
    name: 'VINTAGE TV',
    wave: 0.008,
    liquid: 0.006,
    chroma: 0.008,
    tear: 0.014,
    pixel: 0.004,
    scan: 0.2,
    tint: [1.04, 0.93, 0.72],
    mode: 'crt',
    crtStrength: 0.96,
  },

  // 2. BLUE VINTAGE
  {
    name: 'BLUE VINTAGE',
    wave: 0.010,
    liquid: 0.008,
    chroma: 0.014,
    tear: 0.018,
    pixel: 0.005,
    scan: 0.18,
    tint: [0.72, 0.88, 1.08],
    mode: 'crt',
    crtStrength: 0.90,
  },

  // 3. DIGITAL GLITCH
  {
    name: 'DIGITAL GLITCH',
    wave: 0.012,
    liquid: 0.010,
    chroma: 0.030,
    tear: 0.055,
    pixel: 0.035,
    scan: 0.08,
    tint: [0.85, 1.0, 1.08],
    mode: 'standard',
  },
];
