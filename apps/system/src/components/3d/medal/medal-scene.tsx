import { useEffect, useMemo, type RefObject } from "react";

import { toHex, type RgbColor } from "@/lib/3d/color";
import type { Polygon } from "@/lib/3d/contours";
import type { MedalModelInfo, OffsetLayer } from "@/lib/3d/dxf/design";
import { buildMedal, fitProfile, type MedalGeometry } from "@/lib/3d/dxf/geometry";

type MedalSceneProps = {
  profile: Polygon[];
  baseThicknessMm: number;
  baseColor: RgbColor;
  offsets: OffsetLayer[];
  fitToSize: boolean;
  fitMm: number;
  geometryRef: RefObject<MedalGeometry | null>;
  onModelInfo: (info: MedalModelInfo | null) => void;
};

export function MedalScene({
  profile,
  baseThicknessMm,
  baseColor,
  offsets,
  fitToSize,
  fitMm,
  geometryRef,
  onModelInfo,
}: MedalSceneProps) {
  const model = useMemo(() => {
    const finalProfile = fitToSize ? fitProfile(profile, fitMm) : profile;
    return buildMedal(finalProfile, baseThicknessMm, offsets);
  }, [profile, baseThicknessMm, offsets, fitToSize, fitMm]);

  useEffect(() => {
    geometryRef.current = model;
    onModelInfo(
      model
        ? {
            width: model.width,
            height: model.height,
            triangles: model.triangles,
          }
        : null,
    );
  }, [geometryRef, model, onModelInfo]);

  if (!model) return null;

  return (
    <>
      <mesh geometry={model.base}>
        <meshStandardMaterial color={toHex(baseColor)} roughness={0.6} />
      </mesh>
      {model.parts.map((part) => {
        const offset = offsets[part.offsetIndex];
        if (!offset) return null;
        return (
          <mesh key={offset.id} geometry={part.geometry}>
            <meshStandardMaterial color={toHex(offset.color)} roughness={0.5} />
          </mesh>
        );
      })}
    </>
  );
}
