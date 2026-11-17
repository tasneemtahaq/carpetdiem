"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { allArtworks, type Artwork } from "@/config/artworks";
import { useCarpetTexture, weaveTexture } from "@/lib/textures";
import FittedModel from "@/components/artwork/FittedModel";

const FRAME_PRESETS = {
  wood: { roughness: 0.62, metalness: 0.05 },
  bronze: { roughness: 0.45, metalness: 0.4 },
  metal: { roughness: 0.35, metalness: 0.5 },
};

type Props = { artwork: Artwork; onSelect?: (artwork: Artwork) => void };

export default function FramedCarpet({ artwork, onSelect }: Props) {
  const [w, h] = artwork.size;
  const t = artwork.frameThickness;
  const depth = 0.09;
  const seed = allArtworks.findIndex((a) => a.id === artwork.id);
  const map = useCarpetTexture(artwork.image, seed, artwork.placeholderColors);
  const bump = useMemo(() => weaveTexture([w * 38, h * 38]), [w, h]);
  const [hover, setHover] = useState(false);
  const preset = FRAME_PRESETS[artwork.frameMaterial];
  const rotation = artwork.rotation.map((d) => THREE.MathUtils.degToRad(d)) as [
    number, number, number
  ];

  const bars: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, h / 2 + t / 2, 0], size: [w + t * 2, t, depth] },
    { pos: [0, -h / 2 - t / 2, 0], size: [w + t * 2, t, depth] },
    { pos: [-w / 2 - t / 2, 0, 0], size: [t, h, depth] },
    { pos: [w / 2 + t / 2, 0, 0], size: [t, h, depth] },
  ];

  // the flat carpet (photo or placeholder)
  const carpet = (
    <mesh position={[0, 0, 0.012]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={map}
        bumpMap={bump}
        bumpScale={0.8}
        roughness={1}
        emissive="#ffffff"
        emissiveMap={map}
        emissiveIntensity={hover ? 0.3 : 0.16}
      />
    </mesh>
  );

  return (
    <group
      position={artwork.position}
      rotation={rotation}
      scale={artwork.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(artwork);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* backing board */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[w + t * 2, h + t * 2, 0.03]} />
        <meshStandardMaterial color="#2a1c14" roughness={0.9} />
      </mesh>

      {/* frame */}
      {bars.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={artwork.frameColor} {...preset} />
        </mesh>
      ))}

      {/* the 3D model if there is one (the flat carpet shows until it loads,
          or if the model file is missing) */}
      {artwork.modelPath ? (
        <group position={[0, 0, 0.03]}>
          <FittedModel
            path={artwork.modelPath}
            width={w}
            height={h}
            fallback={<group position={[0, 0, -0.03]}>{carpet}</group>}
          />
        </group>
      ) : (
        carpet
      )}
    </group>
  );
}