/**
 * Converts a CSS `hsl(...)` string into `hsla(..., alpha)`.
 * If the input is already `hsla(...)` or not an HSL string, it returns the input as-is.
 */
export function hslToHsla(color: string, alpha: number): string {
  const c = (color || "").trim();
  if (c.startsWith("hsla(")) return c;
  if (!c.startsWith("hsl(")) return c;
  return c.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
}
