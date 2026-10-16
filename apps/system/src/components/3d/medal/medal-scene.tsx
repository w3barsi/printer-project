import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState, type RefObject } from "react";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { nearestOutlineT, pointAtT } from "@/lib/3d/attachment";
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
  resolveContacts,
  solveContactForWidth,
  type ContactSides,
} from "@/lib/3d/dxf/lanyard";

type ContactSide = "left" | "right";
type LanyardDrag = { side: ContactSide; tLeft: number; tRight: number };

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
    () => resolveContacts(outline, lanyard),
    [outline, lanyard],
  );

  const activeLanyard = useMemo(() => {
    if (drag === null) return lanyard;
    return { ...lanyard, leftContact: drag.tLeft, rightContact: drag.tRight };
  }, [lanyard, drag]);

  const activeContacts = useMemo(
    () => (drag ? { leftT: drag.tLeft, rightT: drag.tRight } : baseContacts),
    [drag, baseContacts],
  );

  const chord = useMemo((): [Point2, Point2] | null => {
    if (!lanyardSelected || outline.length < 3) return null;
    return [
      pointAtT(outline, activeContacts.leftT).point,
      pointAtT(outline, activeContacts.rightT).point,
    ];
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
      {model.lanyard ? (
        <mesh
          geometry={model.lanyard}
          onClick={(event) => {
            // Ignore orbit drags and clicks that landed on a contact handle.
            if (event.delta > 3) return;
            if (event.intersections[0]?.object !== event.object) return;
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
  baseContacts: ContactSides;
  drag: LanyardDrag | null;
  /** Moving and resizing only works while the tab is selected. */
  selected: boolean;
  onDrag: (drag: LanyardDrag | null) => void;
  controlsRef: RefObject<OrbitControls | null>;
  onCommit: (lanyard: Lanyard) => void;
};

/** Drag either contact foot along the outline; the model follows live. */
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

  const leftT = drag ? drag.tLeft : baseContacts.leftT;
  const rightT = drag ? drag.tRight : baseContacts.rightT;
  const leftPoint = pointAtT(outline, leftT).point;
  const rightPoint = pointAtT(outline, rightT).point;
  const handleZ = lanyard.thicknessMm + 0.02;
  const handleRadius = Math.max(4, lanyard.heightMm / 2);

  function candidateFromEvent(event: ThreeEvent<PointerEvent>): number {
    const point: Point2 = [event.point.x, -event.point.z];
    return nearestOutlineT(outline, point).t;
  }

  function startDrag(side: ContactSide, event: ThreeEvent<PointerEvent>) {
    // Only the left button drags feet; other buttons stay camera gestures even
    // when they start on an (invisible) handle.
    if (event.button !== 0) return;
    event.stopPropagation();
    if (controlsRef.current) controlsRef.current.enabled = false;
    const t = candidateFromEvent(event);
    onDrag(
      side === "left"
        ? { side, tLeft: t, tRight: baseContacts.rightT }
        : { side, tLeft: baseContacts.leftT, tRight: t },
    );
  }

  function moveDrag(event: ThreeEvent<PointerEvent>) {
    if (!drag) return;
    const t = candidateFromEvent(event);

    if (!lanyard.widthLocked) {
      onDrag(
        drag.side === "left"
          ? {
              side: drag.side,
              tLeft: clampContact(t, drag.tRight, outline),
              tRight: drag.tRight,
            }
          : {
              side: drag.side,
              tLeft: drag.tLeft,
              tRight: clampContact(t, drag.tLeft, outline),
            },
      );
      return;
    }

    const width = contactDistance(outline, baseContacts.leftT, baseContacts.rightT);
    if (drag.side === "left") {
      const anchor = pointAtT(outline, t).point;
      const solved = solveContactForWidth(outline, baseContacts.rightT, anchor, width);
      onDrag({ side: drag.side, tLeft: t, tRight: solved ?? drag.tRight });
    } else {
      const anchor = pointAtT(outline, t).point;
      const solved = solveContactForWidth(outline, baseContacts.leftT, anchor, width);
      onDrag({ side: drag.side, tLeft: solved ?? drag.tLeft, tRight: t });
    }
  }

  function finishDrag(commit: boolean) {
    if (controlsRef.current) controlsRef.current.enabled = true;
    if (commit && drag) {
      onCommit({ ...lanyard, leftContact: drag.tLeft, rightContact: drag.tRight });
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

      {dragging ? (
        <mesh
          position={[0, 0, lanyard.thicknessMm]}
          onPointerMove={moveDrag}
          onPointerUp={() => finishDrag(true)}
          onPointerLeave={() => finishDrag(false)}
        >
          <planeGeometry args={[model.width * 4, model.height * 4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
}

function contactDistance(outline: Point2[], aT: number, bT: number): number {
  const a = pointAtT(outline, aT).point;
  const b = pointAtT(outline, bT).point;
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
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
