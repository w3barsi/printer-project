import { Group, Mesh } from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";

import type { KeychainGeometry } from "../geometry";

export function buildStlBlob(geometry: KeychainGeometry): Blob {
  const group = new Group();
  group.add(new Mesh(geometry.base));
  for (const part of geometry.parts) {
    group.add(new Mesh(part.geometry));
  }

  const data = new STLExporter().parse(group, { binary: true });
  return new Blob([data], { type: "model/stl" });
}
