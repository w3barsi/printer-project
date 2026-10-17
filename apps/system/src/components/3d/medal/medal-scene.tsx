import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { BackSide } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { nearestOutlineT, pointAtT, polygonBounds } from "@/lib/3d/attachment";
import { toHex, type RgbColor } from "@/lib/3d/color";
import type { Point2, Polygon } from "@/lib/3d/contours";
import type { Lanyard, MedalModelInfo, OffsetLayer } from "@/lib/3d/dxf/design";
import {
  buildMedal,
  fitProfile,
  medalOutline,
  type MedalGeometry,
} from "@/lib/3d/dxf/geometry";
import {
  clampContact,
  levelContacts,
  resolveLanyardContacts,
  type LanyardContacts,
} from "@/lib/3d/dxf/lanyard";

type ContactSide = "left" | "right";
type LanyardDrag = {
  side: ContactSide;
  startPointer: Point2;
  start: LanyardContacts;
  left: Point2;
  right: Point2;
};

/** Hole-centre distance from the model centre that still counts as aligned. */
const CENTER_ALIGN_TOLERANCE_MM = 1;

type MedalSceneProps = {
  profile: Polygon[];
  baseThicknessMm: number;
  baseColor: RgbColor;
  offsets: OffsetLayer[];
  lanyard: Lanyard;
  fitToSize: boolean;
  fitMm: number;
  geometryRef: RefObject<MedalGeometry | null>;
  controlsRef: RefObject<OrbitControls | null>;
  onModelInfo: (info: MedalModelInfo | null) => void;
  onLanyardChange: (lanyard: Lanyard) => void;
};

export function MedalScene({
  profile,
  baseThicknessMm,
  baseColor,
  offsets,
  lanyard,
  fitToSize,
  fitMm,
  geometryRef,
  controlsRef,
  onModelInfo,
  onLanyardChange,
}: MedalSceneProps) {
  const [drag, setDrag] = useState<LanyardDrag | null>(null);
  const [lanyardSelected, setLanyardSelected] = useState(false);
  const gl = useThree((state) => state.gl);

  const finalProfile = useMemo(
    () => (fitToSize ? fitProfile(profile, fitMm) : profile),
    [profile, fitToSize, fitMm],
  );
  const outline = useMemo(
    () => medalOutline(finalProfile, offsets),
    [finalProfile, offsets],
  );
  const baseContacts = useMemo(
    () => resolveLanyardContacts(outline, lanyard),
    [outline, lanyard],
  );

  // Switching the X-axis lock on settles the current contacts level once
  // instead of waiting for the next drag; a locked pair stays level after.
  useEffect(() => {
    if (drag !== null || !lanyard.lockToXAxis) return;

    const leveled = levelContacts(baseContacts);
    if (leveled === baseContacts) return;

    onLanyardChange({ ...lanyard, leftPoint: leveled.left, rightPoint: leveled.right });
  }, [drag, lanyard, baseContacts, onLanyardChange]);

  const activeLanyard = useMemo(() => {
    if (drag === null) return lanyard;
    return { ...lanyard, leftPoint: drag.left, rightPoint: drag.right };
  }, [lanyard, drag]);

  const activeContacts = useMemo(
    () => (drag ? { left: drag.left, right: drag.right } : baseContacts),
    [drag, baseContacts],
  );

  const chord = useMemo((): [Point2, Point2] | null => {
    if (!lanyardSelected || outline.length < 3) return null;
    return [activeContacts.left, activeContacts.right];
  }, [lanyardSelected, outline, activeContacts]);

  const model = useMemo(
    () => buildMedal(finalProfile, baseThicknessMm, offsets, activeLanyard),
    [finalProfile, baseThicknessMm, offsets, activeLanyard],
  );

  useEffect(() => {
    geometryRef.current = model;
    onModelInfo(
      model
        ? {
            width: model.width,
            height: model.height,
            triangles: model.triangles,
            lanyardWidthMm: model.lanyardWidthMm,
          }
        : null,
    );
  }, [geometryRef, model, onModelInfo]);

  // Escape clears the selection; a drag in flight is cancelled with it. Leave
  // Escape alone while typing in a field.
  useEffect(() => {
    if (!lanyardSelected && drag === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select")
      ) {
        return;
      }
      if (drag !== null && controlsRef.current) controlsRef.current.enabled = true;
      setDrag(null);
      setLanyardSelected(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lanyardSelected, drag, controlsRef]);

  if (!model) return null;

  return (
    <>
      {/* Sits behind every hit, so a click that reaches it landed outside the
          tab — on the model, the bed, or empty space. */}
      <mesh
        userData={{ skipFit: true }}
        onClick={(event) => {
          if (event.delta > 3) return;
          setLanyardSelected(false);
        }}
      >
        <sphereGeometry args={[1000, 16, 16]} />
        <meshBasicMaterial side={BackSide} transparent opacity={0} depthWrite={false} />
      </mesh>
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
      {model.lanyard ? (
        <mesh
          geometry={model.lanyard}
          onClick={(event) => {
            // Ignore orbit drags and clicks that landed on a contact handle.
            if (event.delta > 3) return;
            if (event.intersections[0]?.object !== event.object) return;
            // Keep the background click-catcher from also clearing the selection.
            event.stopPropagation();
            setLanyardSelected((selected) => !selected);
          }}
          onPointerOver={(event) => {
            if (drag !== null) return;
            if (event.intersections[0]?.object !== event.object) return;
            gl.domElement.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (drag === null) gl.domElement.style.cursor = "";
          }}
        >
          <meshStandardMaterial color={toHex(baseColor)} roughness={0.6} />
        </mesh>
      ) : null}
      {lanyardSelected && model.lanyardOutlines.length > 0 ? (
        <LanyardEdges
          outlines={model.lanyardOutlines}
          objectOutline={outline}
          chord={chord}
          z={lanyard.thicknessMm + 0.05}
        />
      ) : null}
      <LanyardOverlay
        model={model}
        outline={outline}
        lanyard={lanyard}
        baseContacts={baseContacts}
        drag={drag}
        selected={lanyardSelected}
        onDrag={setDrag}
        controlsRef={controlsRef}
        onCommit={onLanyardChange}
      />
    </>
  );
}

type LanyardOverlayProps = {
  model: MedalGeometry;
  outline: Point2[];
  lanyard: Lanyard;
  baseContacts: LanyardContacts;
  drag: LanyardDrag | null;
  /** Moving the tab only works while it is selected. */
  selected: boolean;
  onDrag: (drag: LanyardDrag | null) => void;
  controlsRef: RefObject<OrbitControls | null>;
  onCommit: (lanyard: Lanyard) => void;
};

/**
 * Drag the contact feet; the model follows live. With the width locked the
 * tab moves as one piece and the feet may leave the outline.
 */
function LanyardOverlay({
  model,
  outline,
  lanyard,
  baseContacts,
  drag,
  selected,
  onDrag,
  controlsRef,
  onCommit,
}: LanyardOverlayProps) {
  const gl = useThree((state) => state.gl);
  const dragging = drag !== null;

  useEffect(() => {
    if (!dragging) return;
    const canvas = gl.domElement;
    const previous = canvas.style.cursor;
    canvas.style.cursor = "grabbing";
    return () => {
      canvas.style.cursor = previous;
    };
  }, [dragging, gl]);

  if (!selected || outline.length < 3) return null;

  const leftPoint = drag ? drag.left : baseContacts.left;
  const rightPoint = drag ? drag.right : baseContacts.right;
  const handleZ = lanyard.thicknessMm + 0.02;
  const handleRadius = Math.max(4, lanyard.heightMm / 2);

  // A level chord puts the hole's centre half-way between the feet, so the
  // mid-point marks its centre line — compare that with the model's centre.
  const bounds = polygonBounds([{ outer: outline, holes: [] }]);
  const modelCenterX = (bounds.minX + bounds.maxX) / 2;
  const holeCenterX = (leftPoint[0] + rightPoint[0]) / 2;
  const alignedToCenter =
    Math.abs(holeCenterX - modelCenterX) <= CENTER_ALIGN_TOLERANCE_MM;
  const feetY = (leftPoint[1] + rightPoint[1]) / 2;
  const centerGuide: [Point2, Point2] = [
    [modelCenterX, Math.min(bounds.minY, feetY - lanyard.heightMm) - 4],
    [modelCenterX, Math.max(bounds.maxY, feetY + lanyard.heightMm) + 4],
  ];

  function pointerPoint(event: ThreeEvent<PointerEvent>): Point2 {
    return [event.point.x, -event.point.z];
  }

  function startDrag(side: ContactSide, event: ThreeEvent<PointerEvent>) {
    // Only the left button drags the tab; other buttons stay camera gestures
    // even when they start on an (invisible) handle.
    if (event.button !== 0) return;
    event.stopPropagation();
    if (controlsRef.current) controlsRef.current.enabled = false;

    const pointer = pointerPoint(event);
    onDrag({
      side,
      startPointer: pointer,
      start: baseContacts,
      left: baseContacts.left,
      right: baseContacts.right,
    });
  }

  function moveDrag(event: ThreeEvent<PointerEvent>) {
    if (!drag) return;
    const pointer = pointerPoint(event);

    if (lanyard.widthLocked) {
      // The tab moves as one piece: translate the pair with the pointer, so
      // the span and the angle never change. The feet may leave the model —
      // the gap fill bridges whatever hangs off it.
      const dx = pointer[0] - drag.startPointer[0];
      const dy = pointer[1] - drag.startPointer[1];
      onDrag({
        ...drag,
        left: [drag.start.left[0] + dx, drag.start.left[1] + dy],
        right: [drag.start.right[0] + dx, drag.start.right[1] + dy],
      });
      return;
    }

    // Unlocked: the grabbed foot snaps along the object outline near the
    // pointer; the other stays put, so the span can change freely.
    const snapped = pointAtT(outline, nearestOutlineT(outline, pointer).t).point;
    const clamped = clampContact(snapped, drag.side === "left" ? drag.right : drag.left);
    onDrag(
      drag.side === "left" ? { ...drag, left: clamped } : { ...drag, right: clamped },
    );
  }

  function finishDrag(commit: boolean) {
    if (controlsRef.current) controlsRef.current.enabled = true;
    if (commit && drag) {
      onCommit({ ...lanyard, leftPoint: drag.left, rightPoint: drag.right });
    }
    onDrag(null);
  }

  function contactHandle(side: ContactSide, point: Point2) {
    return (
      <mesh
        key={side}
        position={[point[0], point[1], handleZ]}
        onPointerDown={(event) => startDrag(side, event)}
        onPointerUp={() => finishDrag(true)}
        onClick={(event) => event.stopPropagation()}
        onPointerOver={() => {
          gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!dragging) gl.domElement.style.cursor = "";
        }}
      >
        <circleGeometry args={[handleRadius, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <>
      {contactHandle("left", leftPoint)}
      {contactHandle("right", rightPoint)}

      {dragging && lanyard.lockToXAxis ? (
        <lineSegments renderOrder={98}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[ringPositions(centerGuide, handleZ + 0.01), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={alignedToCenter ? "#22c55e" : "#94a3b8"}
            depthTest={false}
            depthWrite={false}
          />
        </lineSegments>
      ) : null}

      {dragging ? (
        <mesh
          position={[0, 0, lanyard.thicknessMm]}
          onPointerMove={moveDrag}
          onPointerUp={() => finishDrag(true)}
          onPointerLeave={() => finishDrag(false)}
          onClick={(event) => event.stopPropagation()}
        >
          <planeGeometry args={[model.width * 4, model.height * 4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
}

type LanyardEdgesProps = {
  outlines: Point2[][];
  objectOutline: Point2[];
  chord: [Point2, Point2] | null;
  z: number;
};

/**
 * The selected lanyard's edges drawn over the model: the tab boundary and
 * hole in blue, the contact chord in amber, and the object silhouette in
 * grey. Lines ignore depth so buried edges stay visible while positioning.
 */
function LanyardEdges({ outlines, objectOutline, chord, z }: LanyardEdgesProps) {
  return (
    <>
      <lineLoop renderOrder={99}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[ringPositions(objectOutline, z - 0.03), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#94a3b8" depthTest={false} depthWrite={false} />
      </lineLoop>
      {outlines.map((ring, index) => (
        <lineLoop key={index} renderOrder={100}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[ringPositions(ring, z), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#2563eb" depthTest={false} depthWrite={false} />
        </lineLoop>
      ))}
      {chord ? (
        <lineSegments renderOrder={101}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[ringPositions(chord, z + 0.01), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#f59e0b" depthTest={false} depthWrite={false} />
        </lineSegments>
      ) : null}
    </>
  );
}

function ringPositions(points: Point2[], z: number): Float32Array {
  const positions = new Float32Array(points.length * 3);
  for (let index = 0; index < points.length; index += 1) {
    const [x, y] = points[index];
    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
  }
  return positions;
}
