"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { layout, lighting, palette } from "@/config/site";
import { mainArtwork, type Artwork } from "@/config/artworks";
import Corridor from "@/components/architecture/Corridor";
import CameraRig from "@/components/camera/CameraRig";
import NavBar from "@/components/NavBar";
import { FrostedDoor } from "@/components/FrostedDoor";

type Props = {
  startZ: number | null; // null = start at the frosted door
  onOpenArtwork: (id: string, returnZ: number, snapshot?: string) => void;
  onShop: () => void;
};

// How much scrolling it takes to slide the frosted door open
const DOOR_SPAN = 6;
const FAR_Z = layout.galleryStartZ + DOOR_SPAN; // door fully closed
const END_Z = layout.zoomEndZ; // zoomed right into the main carpet
const RANGE = FAR_Z - END_Z;
const toProgress = (z: number) => (FAR_Z - z) / RANGE;

export default function GalleryScene({ startZ, onOpenArtwork, onShop }: Props) {
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(() => toProgress(startZ ?? FAR_Z));
  const [lowPower] = useState(
    () => window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches
  );
  const targetZ = useRef(startZ ?? FAR_Z);
  const doorRef = useRef<HTMLDivElement>(null);

  // set where the camera should travel to (also moves the scroll bar)
  const goTo = (z: number) => {
    const clamped = THREE.MathUtils.clamp(z, END_Z, FAR_Z);
    targetZ.current = clamped;
    setProgress(toProgress(clamped));
  };

  // scrolling drives everything: mouse wheel, touch swipe, arrow keys
  useEffect(() => {
    const move = (d: number) => {
      const z = THREE.MathUtils.clamp(targetZ.current - d, END_Z, FAR_Z);
      targetZ.current = z;
      setProgress(toProgress(z));
    };
    const onBar = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.(".walkbar");
    let lastY = 0;
    const onWheel = (e: WheelEvent) => move(e.deltaY * 0.012);
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (onBar(e)) return;
      const y = e.touches[0].clientY;
      move((lastY - y) * 0.05);
      lastY = y;
    };
        const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "w") move(2);
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "s") move(-2);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      document.body.style.cursor = "auto";
    };
  }, []);

  const jump = (z: number) => {
    setSelected(null);
    goTo(z);
  };

  // scroll bar dragging
  const dragBar = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const f = THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height, 0, 1);
    goTo(FAR_Z - f * RANGE);
  };

  const zNow = FAR_Z - progress * RANGE;
  const doorClosed = zNow > layout.galleryStartZ + 0.3; // still at the frosted door?
  const atEnd = zNow < layout.galleryEndZ + 4; // close to the main carpet?

  return (
    <div className="scene fade-in" style={{ position: "fixed", inset: 0 }}>
      <Canvas
        shadows={!lowPower}
        dpr={[1, 1.5]}
        camera={{ fov: 50, near: 0.1, far: 220, position: [0, layout.eyeHeight, layout.galleryStartZ] }}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={[palette.ivory]} />
        <fog attach="fog" args={[palette.ivory, 45, 150]} />
        <hemisphereLight args={["#fff4e0", "#6b6a60", lighting.ambient]} />

        <Corridor
          lowPower={lowPower}
          onSelect={(a) => {
            if (targetZ.current < layout.galleryStartZ) setSelected(a);
          }}
          onMainClick={() => jump(END_Z)}
        />
                <CameraRig
          targetZ={targetZ}
          farZ={FAR_Z}
          onDoor={(open) => {
            const door = doorRef.current;
            if (!door) return;
            door.style.transform = `translateX(${-open * 108}%)`;
            door.style.visibility = open > 0.999 ? "hidden" : "visible";
          }}
          onReachEnd={(snapshot) => {
            setLeaving(true);
            onOpenArtwork(mainArtwork.id, layout.galleryEndZ, snapshot);
          }}
        />

        {/* CINEMATIC EFFECTS — delete this block (and the two imports
            at the top that mention "postprocessing") if it is slow */}
        {!lowPower && (
          <EffectComposer>
            <Bloom mipmapBlur luminanceThreshold={0.9} intensity={0.4} />
            <Vignette eskil={false} offset={0.2} darkness={0.7} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>

      {/* THE ENTRANCE — a frosted glass door over the gallery */}
      <FrostedDoor
        doorRef={doorRef}
        title="Carpet Diem"
        eyebrow="Seize your space"
        description="An immersive gallery of handmade carpet art."
        hint="Scroll to enter"
      />

      {/* ───── interface on top ───── */}
      {!leaving && (
        <div className="ui">
          <NavBar
            onLogoClick={() => jump(FAR_Z)}
            links={[
              { label: "Entrance", onClick: () => jump(FAR_Z) },
              { label: "Gallery", onClick: () => jump(layout.galleryStartZ) },
              { label: "Main Artwork", onClick: () => jump(layout.galleryEndZ) },
              { label: "Shop", onClick: onShop },
            ]}
          />

          {/* SCROLL BAR — from the door all the way into the main carpet */}
          <div
            className="walkbar"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragBar(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1 || e.pointerType === "touch") dragBar(e);
            }}
          >
            <div className="walkbar-thumb" style={{ top: `${progress * 100}%` }} />
          </div>

          {!doorClosed && !selected && (
            <p className="hint">{atEnd ? "Keep scrolling" : "Scroll or swipe to walk"}</p>
          )}

          {selected && (
            <div className="caption">
              <button className="caption-close" onClick={() => setSelected(null)} aria-label="Close">
                ×
              </button>
              <p className="eyebrow">{selected.collection}</p>
              <h2>{selected.title}</h2>
              <p className="body">{selected.description}</p>
              <button
                className="text-link"
                onClick={() => onOpenArtwork(selected.id, targetZ.current)}
              >
                View in 360°
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}