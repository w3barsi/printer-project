import { Group, Mesh } from "three";
import { STLExporter } from "three/addons/exporters/STLExporter.js";

import { hasTriangles, type ExtrudedModel } from "./model";

export function buildStlBlob(model: ExtrudedModel): Blob {
  const group = new Group();
  for (const part of model.parts) {
    if (hasTriangles(part.geometry)) group.add(new Mesh(part.geometry));
  }

  const data = new STLExporter().parse(group, { binary: true });
  return new Blob([data], { type: "model/stl" });
}
