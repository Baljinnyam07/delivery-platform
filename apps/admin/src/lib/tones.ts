/**
 * Neon tones for people and categories on the dark theme: a translucent fill,
 * a light text tint and the solid hue for glows.
 */
export type Tone = { bg: string; fg: string; solid: string };

export const TONES: Tone[] = [
  { solid: "#00E5FF", bg: "#00E5FF24", fg: "#8AF4FF" }, // cyan
  { solid: "#FF2BD6", bg: "#FF2BD624", fg: "#FF9BEB" }, // magenta
  { solid: "#FFE600", bg: "#FFE60022", fg: "#FFF27A" }, // yellow
  { solid: "#39FF88", bg: "#39FF8822", fg: "#93FFBE" }, // green
  { solid: "#B026FF", bg: "#B026FF2A", fg: "#D69BFF" }, // violet
  { solid: "#FF8A00", bg: "#FF8A0026", fg: "#FFC27A" }, // orange
  { solid: "#3D7BFF", bg: "#3D7BFF2E", fg: "#A6C2FF" }, // blue
  { solid: "#FF2E63", bg: "#FF2E6326", fg: "#FF8BA7" }, // red
];

/** Stable tone for an id or name: the same courier always gets the same color. */
export function toneFor(key: string): Tone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

/** Translucent tint of any hex color, e.g. tint("#00E5FF", 14). */
export function tint(hex: string, percent: number) {
  return `color-mix(in oklch, ${hex} ${percent}%, transparent)`;
}

/** Neon glow box-shadow in a hue. */
export function glow(hex: string, strength = 1) {
  return `0 0 ${8 * strength}px ${tint(hex, 55)}, 0 0 ${20 * strength}px ${tint(hex, 25)}`;
}
