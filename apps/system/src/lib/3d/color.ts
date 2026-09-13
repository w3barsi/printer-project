export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function toHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function fromHex(hex: string): RgbColor {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}
