"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { layout, lighting, palette } from "@/config/site";
import { mainArtwork, type Artwork } from "@/config/artworks";
import Corridor from "@/components/architecture/Corridor";
import CameraRig from "@/components/camera/CameraRig";
import { FrostedDoor } from "@/components/FrostedDoor";
import { journey, zFromJourney, FAR_Z, SPLIT } from "@/lib/journey";

type Props = {
  // open the revolving page for one carpet ("snapshot" = picture for the zoom transition)
  onOpenArtwork: (id: string, snapshot?: string) => void;
};

export default function GalleryScene({ onOpenArtwork }: Props) {
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [lowPower] = useState(
    () => window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches
  );
  const doorRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  // where the camera should be, read from the one shared scroll position
  const targetZ = useMemo(
    () => ({
      get current() {
        return zFromJourney(journey.target);
      },
    }),
    []
  );

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
          onMainClick={() => {
            journey.target = SPLIT;
          }}
        />
        <CameraRig
          targetZ={targetZ}
          farZ={FAR_Z}
          onDoor={(open) => {
            const door = doorRef.current;
            if (door) {
              door.style.transform = `translateX(${-open * 108}%)`;
              door.style.visibility = open > 0.999 ? "hidden" : "visible";
            }
            if (hintRef.current) hintRef.current.style.opacity = open > 0.95 ? "1" : "0";
          }}
          onReachEnd={(snapshot) => onOpenArtwork(mainArtwork.id, snapshot)}
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

      <div className="ui">
        <p className="hint" ref={hintRef} style={{ opacity: 0 }}>
          Scroll or swipe to walk
        </p>

        {selected && (
          <div className="caption">
            <button className="caption-close" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">{selected.collection}</p>
            <h2>{selected.title}</h2>
            <p className="body">{selected.description}</p>
            <button className="text-link" onClick={() => onOpenArtwork(selected.id)}>
              View in 360°
            </button>
          </div>
        )}
      </div>
    </div>
  );
}