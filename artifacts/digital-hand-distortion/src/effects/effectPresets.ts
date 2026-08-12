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
  // The existing first effect now directly renders the vintage color-TV treatment.
  { name: 'RGB SPLIT', wave: .008, liquid: .006, chroma: .008, tear: .014, pixel: .004, scan: .2, tint: [1.04, .93, .72], mode: 'crt', crtStrength: .96 },
  { name: 'LIQUID GLASS', wave: .014, liquid: .032, chroma: .004, tear: .004, pixel: 0, scan: .01, tint: [.98, 1, 1] },
  { name: 'CHROMATIC ABERRATION', wave: .004, liquid: .006, chroma: .03, tear: .006, pixel: 0, scan: .02, tint: [1, .97, 1.03] },
  { name: 'DIGITAL GLITCH', wave: .01, liquid: .009, chroma: .018, tear: .05, pixel: .025, scan: .05, tint: [1, 1, 1] },
  { name: 'VHS DISTORTION', wave: .018, liquid: .004, chroma: .01, tear: .026, pixel: .008, scan: .11, tint: [1.02, .98, .93] },
  { name: 'WAVE DISTORTION', wave: .042, liquid: .01, chroma: .005, tear: .004, pixel: 0, scan: .025, tint: [.98, 1.02, 1] },
  { name: 'PIXEL DISPLACEMENT', wave: .006, liquid: .008, chroma: .012, tear: .018, pixel: .065, scan: .015, tint: [1, 1, 1] },
  { name: 'RGB LIQUID', wave: .018, liquid: .028, chroma: .024, tear: .008, pixel: .012, scan: .025, tint: [1.01, .99, 1.02] },
  { name: 'STRONG CHROMATIC', wave: .008, liquid: .01, chroma: .058, tear: .012, pixel: 0, scan: .018, tint: [1, .97, 1.05] },
  { name: 'DIGITAL LENS MIX', wave: .024, liquid: .022, chroma: .019, tear: .022, pixel: .018, scan: .07, tint: [1.02, 1, .98] },
];
