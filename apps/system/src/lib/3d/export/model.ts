import type { BufferGeometry } from "three";

import type { RgbColor } from "../color";

export type ExtrudedPart = {
  name: string;
  geometry: BufferGeometry;
  color: RgbColor;
};

/** The shared shape every 3D export consumes: one colored part per mesh. */
export type ExtrudedModel = {
  title: string;
  parts: ExtrudedPart[];
};

export function hasTriangles(geometry: BufferGeometry): boolean {
  const index = geometry.getIndex();
  if (index) return index.count > 0;
  return (geometry.getAttribute("position")?.count ?? 0) > 0;
}
