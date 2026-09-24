export type HSV = { h: number; s: number; v: number };
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function hsvToHex({ h, s, v }: HSV): string {
  const hue = ((h % 360) + 360) % 360 / 60;
  const c = clamp(v) * clamp(s);
  const x = c * (1 - Math.abs(hue % 2 - 1));
  const m = clamp(v) - c;
  const rgb = hue < 1 ? [c, x, 0] : hue < 2 ? [x, c, 0] : hue < 3 ? [0, c, x]
    : hue < 4 ? [0, x, c] : hue < 5 ? [x, 0, c] : [c, 0, x];
  return '#' + rgb.map((n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function hexToHsv(hex: string): HSV {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return { h: 0, s: 0, v: 1 };
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const h = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6
    : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

export function wheelPosition(x: number, y: number, size: number): Pick<HSV, 'h' | 's'> {
  const dx = x - size / 2, dy = y - size / 2;
  return { h: (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, s: clamp(Math.hypot(dx, dy) / (size / 2)) };
}

// Keep text readable when a custom circle color is very light or very dark.
export function colorText(hex: string): string {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#171717' : '#FFFFFF';
}
