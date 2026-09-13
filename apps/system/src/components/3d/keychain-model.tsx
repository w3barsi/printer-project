import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { DoubleSide } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  ATTACHMENT_WALL_MM,
  isPlacementValid,
  nearestOutlineT,
  type Attachment,
} from "@/lib/3d/attachment";
import { toHex, type RgbColor } from "@/lib/3d/color";
import type { Point2 } from "@/lib/3d/contours";
import type { BaseSettings, KeychainModelInfo, PaletteSwatch } from "@/lib/3d/design";
import { buildKeychain, type KeychainGeometry } from "@/lib/3d/geometry";
import type { QuantizedImage } from "@/lib/3d/quantize";

type KeychainSceneProps = {
  quantized: QuantizedImage;
  base: BaseSettings;
  baseColor: RgbColor;
  thicknesses: number[];
  palette: PaletteSwatch[];
  attachment: Attachment | null;
  geometryRef: RefObject<KeychainGeometry | null>;
  controlsRef: RefObject<OrbitControls | null>;
  onModelInfo: (info: KeychainModelInfo | null) => void;
  onAttachmentChange: (attachment: Attachment) => void;
};

export function KeychainScene({
  quantized,
  base,
  baseColor,
  thicknesses,
  palette,
  attachment,
  geometryRef,
  controlsRef,
  onModelInfo,
  onAttachmentChange,
}: KeychainSceneProps) {
  const thicknessKey = thicknesses.join(",");
  const model = useMemo(() => {
    const values = thicknessKey.length > 0 ? thicknessKey.split(",").map(Number) : [];
    return buildKeychain(quantized, base, values, attachment);
  }, [quantized, base, thicknessKey, attachment]);

  useEffect(() => {
    geometryRef.current = model;
    onModelInfo(
      model
        ? {
            width: model.width,
            height: model.height,
            triangles: model.triangles,
            specksMerged: model.specksMerged,
            thinColorIndexes: model.thinColorIndexes,
          }
        : null,
    );
  }, [geometryRef, model, onModelInfo]);

  if (!model) return null;

  return (
    <>
      <KeychainModel model={model} palette={palette} baseColor={baseColor} />
      {attachment && model.attachment ? (
        <AttachmentOverlay
          model={model}
          attachment={attachment}
          controlsRef={controlsRef}
          onAttachmentChange={onAttachmentChange}
        />
      ) : null}
    </>
  );
}

function KeychainModel({
  model,
  palette,
  baseColor,
}: {
  model: KeychainGeometry;
  palette: PaletteSwatch[];
  baseColor: RgbColor;
}) {
  return (
    <>
      <mesh geometry={model.base}>
        <meshStandardMaterial color={toHex(baseColor)} roughness={0.6} />
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

type DragState = {
  position: Point2;
  perimeterT: number | null;
  valid: boolean;
};

function AttachmentOverlay({
  model,
  attachment,
  controlsRef,
  onAttachmentChange,
}: {
  model: KeychainGeometry;
  attachment: Attachment;
  controlsRef: RefObject<OrbitControls | null>;
  onAttachmentChange: (attachment: Attachment) => void;
}) {
  const gl = useThree((state) => state.gl);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    if (!drag) return;
    const canvas = gl.domElement;
    const previous = canvas.style.cursor;
    canvas.style.cursor = "grabbing";
    return () => {
      canvas.style.cursor = previous;
    };
  }, [drag, gl]);

  const resolved = model.attachment;
  if (!resolved) return null;

  const innerRadius = attachment.sizeMm / 2;
  const anchor: Point2 = resolved.kind === "hook" ? resolved.point : resolved.center;
  const grabRadius = Math.max(
    resolved.kind === "hook" ? resolved.outerRadiusMm : innerRadius,
    innerRadius + 1,
  );

  function candidateFromEvent(event: ThreeEvent<PointerEvent>): DragState {
    const point: Point2 = [event.point.x, -event.point.z];
    if (attachment.type === "hook") {
      const nearest = nearestOutlineT(model.baseOutline, point);
      return { position: nearest.point, perimeterT: nearest.t, valid: true };
    }
    return {
      position: point,
      perimeterT: null,
      valid: isPlacementValid(model.baseOutline, point, innerRadius),
    };
  }

  function startDrag(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    if (controlsRef.current) controlsRef.current.enabled = false;
    setDrag(candidateFromEvent(event));
  }

  function finishDrag(commit: boolean) {
    if (controlsRef.current) controlsRef.current.enabled = true;
    if (commit && drag?.valid) {
      onAttachmentChange(
        attachment.type === "hook"
          ? { ...attachment, perimeterT: drag.perimeterT }
          : { ...attachment, position: drag.position },
      );
    }
    setDrag(null);
  }

  return (
    <>
      <mesh
        position={[anchor[0], anchor[1], model.baseThickness + 0.02]}
        onPointerDown={startDrag}
        onPointerUp={() => finishDrag(true)}
        onPointerOver={() => {
          gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!drag) gl.domElement.style.cursor = "";
        }}
      >
        <circleGeometry args={[grabRadius, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {drag ? (
        <>
          <mesh
            position={[0, 0, model.baseThickness]}
            onPointerMove={(event) => setDrag(candidateFromEvent(event))}
            onPointerUp={() => finishDrag(true)}
            onPointerLeave={() => finishDrag(false)}
          >
            <planeGeometry args={[model.width * 4, model.height * 4]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh
            position={[drag.position[0], drag.position[1], model.baseThickness + 0.05]}
          >
            <ringGeometry
              args={[
                innerRadius,
                innerRadius + (resolved.kind === "hook" ? ATTACHMENT_WALL_MM : 0.6),
                48,
              ]}
            />
            <meshBasicMaterial
              color={drag.valid ? "#22c55e" : "#ef4444"}
              transparent
              opacity={0.6}
              depthTest={false}
              side={DoubleSide}
            />
          </mesh>
        </>
      ) : null}
    </>
  );
}
