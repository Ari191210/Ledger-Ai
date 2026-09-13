export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * A trig-derived coordinate, rounded to hundredths of a pixel.
 *
 * Math.cos and Math.sin are not bit-identical between Node and the browser: the
 * last couple of digits differ (21.504065309377886 on one, ...893 on the
 * other). Anything positioned with them in a server-rendered component then
 * hydrates against HTML that does not match, and React refuses to patch it.
 * Rounding to 0.01px removes the disagreement and nothing a screen can draw.
 */
export function px(n: number): number {
  return Math.round(n * 100) / 100;
}
