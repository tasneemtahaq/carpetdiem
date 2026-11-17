"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// All the places the model might be. The first one that exists is used.
export function modelPaths(path: string) {
  return Array.from(
    new Set([
      path,
      path.replace("/model/", "/models/"),
      path.replace("/models/", "/model/"),
      "/model/image.glb",
      "/models/image.glb",
      "/images/image.glb",
      "/images/img.glb",
      "/model/img.glb",
      "/models/img.glb",
      "/image.glb",
      "/img.glb",
    ])
  );
}

// Loads the model without ever crashing the page. Returns null until it is
// ready, and stays null if the file cannot be found anywhere.
export function useModel(path: string) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    const paths = modelPaths(path);
    const loader = new GLTFLoader();
    const tryNext = (i: number) => {
      if (!alive) return;
      if (i >= paths.length) {
        console.warn("Carpet model not found. Looked in:", paths);
        return;
      }
      loader.load(
        paths[i],
        (gltf) => {
          if (alive) setScene(gltf.scene);
        },
        undefined,
        () => tryNext(i + 1)
      );
    };
    tryNext(0);
    return () => {
      alive = false;
    };
  }, [path]);
  return scene;
}

type Props = {
  path: string;
  width: number;
  height: number;
  fallback?: ReactNode; // shown while loading, or if the model is missing
};

export default function FittedModel({ path, width, height, fallback = null }: Props) {
  const scene = useModel(path);

  const fit = useMemo(() => {
    if (!scene) return null;
    const object = scene.clone(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Turn the thinnest side (the carpet's thickness) towards the viewer.
    let rotation: [number, number, number] = [0, 0, 0];
    let w = size.x;
    let h = size.y;
    if (size.y <= size.x && size.y <= size.z) {
      rotation = [Math.PI / 2, 0, 0]; // model was lying flat
      h = size.z;
    } else if (size.x <= size.y && size.x <= size.z) {
      rotation = [0, -Math.PI / 2, 0]; // model was facing sideways
      w = size.z;
    }
    const scale = Math.min(width / w, height / h);
    return { object, rotation, scale, offset: center.multiplyScalar(-1) };
  }, [scene, width, height]);

  if (!fit) return <>{fallback}</>;

  return (
    <group scale={fit.scale}>
      <group rotation={fit.rotation}>
        <primitive object={fit.object} position={fit.offset} />
      </group>
    </group>
  );
}