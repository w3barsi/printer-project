import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@convex/_generated/api";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

export const Route = createFileRoute("/(main)/three")({
  component: RouteComponent,
  loader: () => ({
    crumb: [{ value: "3D Viewer", href: "/three", type: "static" }],
  }),
  head: () => ({
    meta: [{ title: "3D Viewer | DG" }],
  }),
});

function RouteComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"fbx" | "obj" | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const name = selectedFile.name.toLowerCase();
      if (name.endsWith(".fbx")) {
        setFileType("fbx");
        setFile(selectedFile);
        const url = URL.createObjectURL(selectedFile);
        setModelUrl(url);
      } else if (name.endsWith(".obj")) {
        setFileType("obj");
        setFile(selectedFile);
        const url = URL.createObjectURL(selectedFile);
        setModelUrl(url);
      } else {
        alert("Please select a valid .fbx or .obj file");
      }
    }
  };

  const clearModel = () => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    setFile(null);
    setModelUrl(null);
    setFileType(null);
  };

  const mutate = useMutation(api.admin.users.setEveryoneToAdmin);

  return (
    <Container className="flex h-full flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">3D Viewer</h1>
      <Button onClick={() => mutate()}>Set All to admin</Button>
      <div className="flex gap-2">
        <Input
          type="file"
          accept=".fbx,.obj"
          onChange={handleFileChange}
          className="max-w-xs"
        />
        {file && (
          <Button variant="outline" onClick={clearModel}>
            Clear
          </Button>
        )}
      </div>
      {modelUrl && (
        <div className="h-full w-full rounded border">
          <Canvas camera={{ position: [0, 0, 5] }} style={{ background: "white" }}>
            <Suspense fallback={<Html center>Loading...</Html>}>
              <Model url={modelUrl} fileType={fileType} />
            </Suspense>
            <OrbitControls />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
          </Canvas>
        </div>
      )}
    </Container>
  );
}

function Model({ url, fileType }: { url: string; fileType: "fbx" | "obj" | null }) {
  const model = useLoader(fileType === "fbx" ? FBXLoader : OBJLoader, url);

  // Center and scale the model
  const groupRef = useRef<THREE.Group>(null);
  if (groupRef.current) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    model.position.sub(center);
    model.scale.setScalar(scale);
  }

  return <primitive ref={groupRef} object={model} />;
}
