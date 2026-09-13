import { useMemo } from "react";

import { toHex } from "@/lib/3d/color";
import { DEFAULT_BASE_COLOR, type PaletteSwatch } from "@/lib/3d/design";
import { buildKeychain, type KeychainGeometry } from "@/lib/3d/geometry";
import type { QuantizedImage } from "@/lib/3d/quantize";

type KeychainSceneProps = {
  quantized: QuantizedImage;
  palette: PaletteSwatch[];
};

export function KeychainScene({ quantized, palette }: KeychainSceneProps) {
  const model = useMemo(() => buildKeychain(quantized), [quantized]);
  if (!model) return null;

  return <KeychainModel model={model} palette={palette} />;
}

function KeychainModel({
  model,
  palette,
}: {
  model: KeychainGeometry;
  palette: PaletteSwatch[];
}) {
  return (
    <>
      <mesh geometry={model.base}>
        <meshStandardMaterial color={toHex(DEFAULT_BASE_COLOR)} roughness={0.6} />
      </mesh>
      {model.parts.map((part) => {
        const swatch = palette[part.colorIndex];
        if (!swatch) return null;
        return (
          <mesh key={part.colorIndex} geometry={part.geometry}>
            <meshStandardMaterial color={toHex(swatch)} roughness={0.5} />
          </mesh>
        );
      })}
    </>
  );
}
