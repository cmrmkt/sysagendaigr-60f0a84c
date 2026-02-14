export type Hsl = { h: number; s: number; l: number };

const HSL_REGEX = /hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)/i;

export function parseHsl(input: string): Hsl | null {
  const m = input.match(HSL_REGEX);
  if (!m) return null;
  const h = Number(m[1]);
  const s = Number(m[2]);
  const l = Number(m[3]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h, s, l };
}

function hueDistanceDegrees(h1: number, h2: number) {
  const d = Math.abs(h1 - h2) % 360;
  return Math.min(d, 360 - d);
}

/**
 * Distância "perceptual" simples em HSL (aproximação).
 * Retorna 0..~2 (quanto maior, mais diferente).
 */
export function hslDistance(a: Hsl, b: Hsl) {
  const dh = hueDistanceDegrees(a.h, b.h) / 180; // 0..1
  const ds = Math.abs(a.s - b.s) / 100;
  const dl = Math.abs(a.l - b.l) / 100;

  // Peso maior no matiz (hue) para evitar cores "parecidas".
  // Limiar reduzido para permitir mais opções disponíveis
  return Math.sqrt(Math.pow(dh * 1.4, 2) + Math.pow(ds * 0.6, 2) + Math.pow(dl * 0.7, 2));
}

export function isTooSimilarHslString(colorA: string, colorB: string, threshold = 0.42) {
  const a = parseHsl(colorA);
  const b = parseHsl(colorB);
  if (!a || !b) return false; // se não conseguir parsear, não bloqueia
  return hslDistance(a, b) < threshold;
}

export function findSimilarityConflict(
  candidateColor: string,
  usedColors: string[],
  threshold = 0.42
): { conflictingColor: string } | null {
  for (const used of usedColors) {
    if (isTooSimilarHslString(candidateColor, used, threshold)) {
      return { conflictingColor: used };
    }
  }
  return null;
}
