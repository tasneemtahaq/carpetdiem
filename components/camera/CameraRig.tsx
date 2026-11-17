"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { layout } from "@/config/site";

type Props = {
  targetZ: { current: number }; // where scrolling says we should be
  farZ: number; // the very start: the frosted door fully closed
  // called every frame with how far the frosted door is open (0 = closed, 1 = open)
  onDoor: (open: number) => void;
  // called once when the camera has zoomed fully into the main carpet;
  // "snapshot" is a picture of that final view (used for the zoom transition)
  onReachEnd: (snapshot: string) => void;
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const { lerp, damp, clamp } = THREE.MathUtils;

export default function CameraRig({ targetZ, farZ, onDoor, onReachEnd }: Props) {
  const z = useRef<number | null>(null);
  const fired = useRef(false);
  const armed = useRef(false); // true once the camera has been away from the main carpet
  const lookX = useRef(0);
  const look = useRef<THREE.Vector3 | null>(null);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const cam = state.camera as THREE.PerspectiveCamera;

    // first frame: start where the scroll position says
    if (z.current === null) z.current = targetZ.current;
    if (look.current === null) look.current = new THREE.Vector3();

    // wider lens on portrait phones
    const fov = state.size.width < state.size.height ? 68 : 50;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    // follow the scroll smoothly, never faster than walking pace allows
    const next = damp(z.current, targetZ.current, 2.6, dt);
    const maxStep = layout.maxSpeed * dt;
    z.current += clamp(next - z.current, -maxStep, maxStep);
    const zNow = z.current;

    // first stretch of scrolling: the frosted door slides away
    const open = smooth(clamp((farZ - zNow) / (farZ - layout.galleryStartZ), 0, 1));
    onDoor(open);

    // after the door: walk the corridor. The camera eases in slightly as the door opens.
    const camZ = Math.min(zNow, layout.galleryStartZ) + (1 - open) * 0.6;

    // 0 while walking the corridor, 1 when zoomed right into the main carpet
    const zoom = smooth(
      clamp((layout.galleryEndZ - zNow) / (layout.galleryEndZ - layout.zoomEndZ), 0, 1)
    );

    const bob = Math.sin(camZ * 1.9) * 0.02 * (1 - zoom) * open;
    lookX.current = damp(lookX.current, state.pointer.x * 0.6 * (1 - zoom), 3, dt);
    const y = lerp(layout.eyeHeight, layout.mainArtworkY, zoom);
    const lookY = lerp(2.7, layout.mainArtworkY, zoom);

    cam.position.set(0, y + bob, camZ);
    look.current.set(lookX.current, lookY, camZ - 10);
    cam.lookAt(look.current);

    // the carpet now fills the screen while moving forward: take a picture and hand over
    if (zNow > layout.zoomEndZ + 1.5) armed.current = true;
    if (armed.current && !fired.current && zNow <= layout.zoomEndZ + 0.9) {
      fired.current = true;
      let snapshot = "";
      try {
        state.gl.clear();
        state.gl.render(state.scene, state.camera);
        snapshot = state.gl.domElement.toDataURL("image/jpeg", 0.85);
      } catch {
        snapshot = "";
      }
      onReachEnd(snapshot);
    }
  });

  return null;
}