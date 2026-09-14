import {
  Canvas,
  extend,
  useFrame,
  useThree,
  type ThreeElement,
} from "@react-three/fiber";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Box3, MathUtils, Sphere, Vector3, type PerspectiveCamera } from "three";
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

type ViewportProps = {
  children: ReactNode;
  className?: string;
  /** Change to refit the camera on the current scene. */
  fitKey?: string | number;
  /** External ref to the orbit controls, e.g. to disable them while dragging. */
  controlsRef?: RefObject<OrbitControls | null>;
};

export function Viewport({
  children,
  className,
  fitKey,
  controlsRef: externalControlsRef,
}: ViewportProps) {
  const internalControlsRef = useRef<OrbitControls>(null);
  const controlsRef = externalControlsRef ?? internalControlsRef;

  return (
    <div className={className}>
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
          <group rotation={[-Math.PI / 2, 0, 0]}>{children}</group>
          <Controls controlsRef={controlsRef} />
          <FitToView controlsRef={controlsRef} fitKey={fitKey} />
        </Canvas>
      </ClientOnly>
    </div>
  );
}

function Controls({ controlsRef }: { controlsRef: RefObject<OrbitControls | null> }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return (
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={false}
      enableDamping
    />
  );
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
    const box = new Box3().setFromObject(scene);
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
