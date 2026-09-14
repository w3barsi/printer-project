import JSZip from "jszip";
import type { BufferGeometry } from "three";

import { toHex, type RgbColor } from "../color";
import type { PaletteSwatch } from "../design";
import type { KeychainGeometry } from "../geometry";

type Part = {
  name: string;
  geometry: BufferGeometry;
  color: RgbColor;
};

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

export async function build3mfBlob(
  geometry: KeychainGeometry,
  palette: PaletteSwatch[],
  baseColor: RgbColor,
): Promise<Blob> {
  const parts: Part[] = [
    ...(hasTriangles(geometry.base)
      ? [{ name: "Base", geometry: geometry.base, color: baseColor }]
      : []),
    ...geometry.parts
      .filter((part) => hasTriangles(part.geometry))
      .map((part) => ({
        name: `Color ${part.colorIndex + 1}`,
        geometry: part.geometry,
        color: palette[part.colorIndex] ?? baseColor,
      })),
  ];

  const resources = [
    `    <m:colorgroup id="1">`,
    ...parts.map((part) => `      <m:color color="${toHex(part.color)}FF"/>`),
    `    </m:colorgroup>`,
    ...parts.map((part, index) => meshXml(index + 2, index, part)),
  ].join("\n");

  const build = parts.map((_, index) => `    <item objectid="${index + 2}"/>`).join("\n");

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">Keychain</metadata>
  <resources>
${resources}
  </resources>
  <build>
${build}
  </build>
</model>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("3D/3dmodel.model", model);

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

function meshXml(objectId: number, colorIndex: number, part: Part): string {
  const position = part.geometry.getAttribute("position");
  const index = part.geometry.getIndex();
  const vertices: string[] = [];
  const triangles: string[] = [];

  for (let vertex = 0; vertex < position.count; vertex += 1) {
    vertices.push(
      `        <vertex x="${format(position.getX(vertex))}" y="${format(position.getY(vertex))}" z="${format(position.getZ(vertex))}"/>`,
    );
  }

  if (index) {
    for (let triangle = 0; triangle < index.count; triangle += 3) {
      triangles.push(
        `        <triangle v1="${index.getX(triangle)}" v2="${index.getX(triangle + 1)}" v3="${index.getX(triangle + 2)}"/>`,
      );
    }
  } else {
    for (let vertex = 0; vertex < position.count; vertex += 3) {
      triangles.push(
        `        <triangle v1="${vertex}" v2="${vertex + 1}" v3="${vertex + 2}"/>`,
      );
    }
  }

  return `    <object id="${objectId}" type="model" name="${escapeXml(part.name)}" pid="1" pindex="${colorIndex}">
      <mesh>
        <vertices>
${vertices.join("\n")}
        </vertices>
        <triangles>
${triangles.join("\n")}
        </triangles>
      </mesh>
    </object>`;
}

function format(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, "") || "0";
}

function hasTriangles(geometry: BufferGeometry): boolean {
  const index = geometry.getIndex();
  if (index) return index.count > 0;
  return (geometry.getAttribute("position")?.count ?? 0) > 0;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
