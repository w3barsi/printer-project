import { Button } from "@dg/ui-coss/components/button";
import {
  Canvas,
  extend,
  useFrame,
  useThree,
  type ThreeElement,
} from "@react-three/fiber";
import { ClientOnly } from "@tanstack/react-router";
import { Grid3x3Icon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Box3,
  MathUtils,
  MOUSE,
  Sphere,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// @react-three/fiber 9.7 constructs a THREE.Clock, which three r183+ deprecates
// in favour of THREE.Timer. Filter that one upstream warning until fiber migrates.
const CLOCK_DEPRECATION =
  "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";

const warnFilterState = globalThis as typeof globalThis & {
  __dgClockWarningFiltered?: boolean;
};

if (typeof window !== "undefined" && !warnFilterState.__dgClockWarningFiltered) {
  warnFilterState.__dgClockWarningFiltered = true;
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (args[0] === CLOCK_DEPRECATION) return;
    originalWarn(...args);
  };
}

declare module "@react-three/fiber" {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof OrbitControls>;
  }
}

extend({ OrbitControls });

const VIEW_DIRECTION = new Vector3(0.55, 0.9, 0.75).normalize();

const GRID_EXTENT_MM = 400;
const GRID_HALF_MM = GRID_EXTENT_MM / 2;
// Static bed axes, drawn just above the grid lines (red X, green Z).
const X_AXIS_POSITIONS = new Float32Array([
  -GRID_HALF_MM,
  0.02,
  0,
  GRID_HALF_MM,
  0.02,
  0,
]);
const Z_AXIS_POSITIONS = new Float32Array([
  0,
  0.02,
  -GRID_HALF_MM,
  0,
  0.02,
  GRID_HALF_MM,
]);

/** Fusion-style bed grid: 5 mm cells with 25 mm majors and coloured axes. */
function GroundGrid() {
  return (
    <group userData={{ skipFit: true }}>
      <gridHelper args={[GRID_EXTENT_MM, GRID_EXTENT_MM / 5, "#e2e8f0", "#e2e8f0"]} />
      <gridHelper
        args={[GRID_EXTENT_MM, GRID_EXTENT_MM / 25, "#cbd5e1", "#cbd5e1"]}
        position={[0, 0.01, 0]}
      />
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[X_AXIS_POSITIONS, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ef4444" transparent opacity={0.55} />
      </lineSegments>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[Z_AXIS_POSITIONS, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

type ViewportProps = {
  children: ReactNode;
  className?: string;
  /** Change to refit the camera on the current scene. */
  fitKey?: string | number;
  /** External ref to the orbit controls, e.g. to disable them while dragging. */
  controlsRef?: RefObject<OrbitControls | null>;
  /** CSS color painted behind the transparent canvas. */
  background?: string;
};

export function Viewport({
  children,
  className,
  fitKey,
  background,
  controlsRef: externalControlsRef,
}: ViewportProps) {
  const internalControlsRef = useRef<OrbitControls>(null);
  const controlsRef = externalControlsRef ?? internalControlsRef;
  const [showGrid, setShowGrid] = useState(true);

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ backgroundColor: background }}
    >
      <ClientOnly
        fallback={
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Loading preview…
          </div>
        }
      >
        <Canvas
          camera={{ position: [70, 90, 110], fov: 35, near: 0.1, far: 5000 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.65} />
          <directionalLight position={[40, 80, 50]} intensity={1.5} />
          <directionalLight position={[-50, -30, -40]} intensity={0.35} />
          {showGrid ? <GroundGrid /> : null}
          <group rotation={[-Math.PI / 2, 0, 0]}>{children}</group>
          <Controls controlsRef={controlsRef} />
          <FitToView controlsRef={controlsRef} fitKey={fitKey} />
        </Canvas>
      </ClientOnly>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-lg border bg-card/85 p-1 shadow-sm backdrop-blur-sm">
        <Button
          type="button"
          variant={showGrid ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label="Toggle grid"
          aria-pressed={showGrid}
          title="Grid"
          onClick={() => setShowGrid((current) => !current)}
        >
          <Grid3x3Icon />
        </Button>
      </div>
    </div>
  );
}

function Controls({ controlsRef }: { controlsRef: RefObject<OrbitControls | null> }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  useFrame(() => {
    controlsRef.current?.update();
  });

  useEffect(() => {
    const canvas = gl.domElement;
    // Chrome and Firefox start autoscroll on middle mousedown, which fights
    // the middle-drag pan.
    const blockMiddleAutoScroll = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault();
    };
    canvas.addEventListener("mousedown", blockMiddleAutoScroll);
    return () => canvas.removeEventListener("mousedown", blockMiddleAutoScroll);
  }, [gl]);

  return (
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE }}
      enableDamping
    />
  );
}

/** Bounds of the model for fitting; helpers like the bed grid opt out via userData. */
function expandFitBox(object: Object3D, box: Box3): void {
  if (object.userData.skipFit) return;
  if ((object as { geometry?: unknown }).geometry !== undefined) {
    box.expandByObject(object);
  }
  for (const child of object.children) expandFitBox(child, box);
}

function FitToView({
  controlsRef,
  fitKey,
}: {
  controlsRef: RefObject<OrbitControls | null>;
  fitKey?: string | number;
}) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const hasFramed = useRef(false);

  useEffect(() => {
    const box = new Box3();
    expandFitBox(scene, box);
    if (box.isEmpty()) return;

    const sphere = box.getBoundingSphere(new Sphere());
    const perspective = camera as PerspectiveCamera;
    const fov = MathUtils.degToRad(perspective.fov);
    const distance = (sphere.radius / Math.sin(fov / 2)) * 1.25;

    const controls = controlsRef.current;
    const direction = new Vector3();
    if (hasFramed.current && controls) {
      direction.subVectors(camera.position, controls.target);
      if (direction.lengthSq() === 0) direction.copy(VIEW_DIRECTION);
      else direction.normalize();
    } else {
      direction.copy(VIEW_DIRECTION);
    }

    camera.position.copy(sphere.center).addScaledVector(direction, distance);
    perspective.near = Math.max(distance / 100, 0.1);
    perspective.far = distance * 50;
    perspective.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(sphere.center);
      controls.update();
    }
    hasFramed.current = true;
  }, [camera, scene, controlsRef, fitKey]);

  return null;
}
