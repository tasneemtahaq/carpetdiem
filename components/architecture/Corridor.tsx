"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { layout, lighting, palette } from "@/config/site";
import { sideArtworks, mainArtwork, type Artwork } from "@/config/artworks";
import { glowTexture, plasterTexture } from "@/lib/textures";
import FramedCarpet from "@/components/artwork/FramedCarpet";

type Props = {
  lowPower: boolean;
  onSelect: (artwork: Artwork) => void;
  onMainClick: () => void;
};

const SKY_HALF_WIDTH = 2.2; // half the width of each skylight opening
const WELL_HEIGHT = 1.4; // depth of the skylight shaft above the ceiling

export default function Corridor({ lowPower, onSelect, onMainClick }: Props) {
  const W = layout.corridorHalfWidth;
  const H = layout.corridorHeight;
  const START = layout.corridorStartZ;
  const END = layout.corridorEndZ;
  const length = START - END;
  const midZ = (START + END) / 2;

  const wall = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: plasterTexture(palette.ivory, [10, 2], 21),
        roughness: 0.95,
      }),
    []
  );
  const floor = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: plasterTexture(palette.limestone, [3, 16], 22, 0.05, 14),
        roughness: 0.85,
      }),
    []
  );
  const led = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#fff1d0", toneMapped: false }),
    []
  );
  const glow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glowTexture(),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, layout.mainArtworkY, END);
    return o;
  }, [END]);
  const sunTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, -4.5);
    return o;
  }, []);

  // One skylight between each pair of portals, and the solid roof between them.
  const { openings, slabs } = useMemo(() => {
    const p = layout.portalZs;
    const openings = p.slice(0, -1).map((z, i) => ({
      z: (z + p[i + 1]) / 2,
      len: Math.abs(p[i + 1] - z) - 2.4,
    }));
    const slabs: { z: number; len: number }[] = [];
    let cursor = START;
    openings.forEach((o) => {
      const front = o.z + o.len / 2;
      slabs.push({ z: (cursor + front) / 2, len: cursor - front });
      cursor = o.z - o.len / 2;
    });
    slabs.push({ z: (cursor + END) / 2, len: cursor - END });
    return { openings, slabs };
  }, [START, END]);

  return (
    <group>
      {/* floor */}
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, midZ]} receiveShadow>
        <planeGeometry args={[W * 2, length]} />
      </mesh>

      {/* walls and end wall */}
      <mesh material={wall} position={[-W - 0.15, H / 2, midZ]} castShadow receiveShadow>
        <boxGeometry args={[0.3, H, length]} />
      </mesh>
      <mesh material={wall} position={[W + 0.15, H / 2, midZ]} castShadow receiveShadow>
        <boxGeometry args={[0.3, H, length]} />
      </mesh>
      <mesh material={wall} position={[0, H / 2, END - 0.15]} castShadow receiveShadow>
        <boxGeometry args={[W * 2 + 0.6, H, 0.3]} />
      </mesh>

      {/* ceiling: two side strips plus solid slabs between the skylights */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          material={wall}
          position={[s * (SKY_HALF_WIDTH + (W - SKY_HALF_WIDTH) / 2 + 0.15), H + 0.15, midZ]}
          castShadow
        >
          <boxGeometry args={[W - SKY_HALF_WIDTH + 0.3, 0.3, length]} />
        </mesh>
      ))}
      {slabs.map((s) => (
        <mesh key={s.z} material={wall} position={[0, H + 0.15, s.z]} castShadow>
          <boxGeometry args={[SKY_HALF_WIDTH * 2, 0.3, s.len]} />
        </mesh>
      ))}

      {/* skylight shafts */}
      {openings.map((o) => (
        <group key={o.z} position={[0, H + WELL_HEIGHT / 2, o.z]}>
          <mesh material={wall} position={[-SKY_HALF_WIDTH - 0.1, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, WELL_HEIGHT, o.len + 0.4]} />
          </mesh>
          <mesh material={wall} position={[SKY_HALF_WIDTH + 0.1, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, WELL_HEIGHT, o.len + 0.4]} />
          </mesh>
          <mesh material={wall} position={[0, 0, o.len / 2 + 0.1]} castShadow receiveShadow>
            <boxGeometry args={[SKY_HALF_WIDTH * 2, WELL_HEIGHT, 0.2]} />
          </mesh>
          <mesh material={wall} position={[0, 0, -o.len / 2 - 0.1]} castShadow receiveShadow>
            <boxGeometry args={[SKY_HALF_WIDTH * 2, WELL_HEIGHT, 0.2]} />
          </mesh>
        </group>
      ))}

      {/* the sky seen through the skylights */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H + WELL_HEIGHT + 0.3, midZ]}>
        <planeGeometry args={[W * 2 + 2, length + 2]} />
        <meshBasicMaterial color="#6f86b8" fog={false} toneMapped={false} />
      </mesh>

      {/* sunlight through the skylights (desktop only) */}
      {!lowPower && (
        <>
          <primitive object={sunTarget} />
          <directionalLight
            target={sunTarget}
            position={[6, 34, 0.5]}
            intensity={lighting.sun}
            color="#fff3dc"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-44}
            shadow-camera-right={44}
            shadow-camera-top={44}
            shadow-camera-bottom={-44}
            shadow-camera-near={1}
            shadow-camera-far={60}
            shadow-bias={-0.0005}
            shadow-normalBias={0.05}
          />
        </>
      )}

      {/* repeated rectangular portals with recessed LED lines */}
      {layout.portalZs.map((z, i) => (
        <group key={z} position={[0, 0, z]}>
          <mesh material={wall} position={[-(W - 0.225), H / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.45, H, 0.8]} />
          </mesh>
          <mesh material={wall} position={[W - 0.225, H / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.45, H, 0.8]} />
          </mesh>
          <mesh material={wall} position={[0, H - 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[W * 2, 0.5, 0.8]} />
          </mesh>

          {/* LED strips on the inner edge of the frame */}
          <mesh material={led} position={[-(W - 0.47), (H - 0.5) / 2, 0.3]}>
            <boxGeometry args={[0.04, H - 0.5, 0.04]} />
          </mesh>
          <mesh material={led} position={[W - 0.47, (H - 0.5) / 2, 0.3]}>
            <boxGeometry args={[0.04, H - 0.5, 0.04]} />
          </mesh>
          <mesh material={led} position={[0, H - 0.52, 0.3]}>
            <boxGeometry args={[W * 2 - 0.9, 0.04, 0.04]} />
          </mesh>

          {/* soft light washing over the floor and both walls */}
          <mesh material={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.6]}>
            <planeGeometry args={[W * 2 - 0.9, 2.6]} />
          </mesh>
          <group position={[-(W - 0.012), H / 2 - 0.25, 1.2]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={glow} rotation={[0, 0, -Math.PI / 2]}>
              <planeGeometry args={[H - 0.5, 1.6]} />
            </mesh>
          </group>
          <group position={[W - 0.012, H / 2 - 0.25, 1.2]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh material={glow} rotation={[0, 0, Math.PI / 2]}>
              <planeGeometry args={[H - 0.5, 1.6]} />
            </mesh>
          </group>

          {/* real light (every second portal on phones) */}
          {(!lowPower || i % 2 === 0) && (
            <pointLight
              position={[0, H - 1, 0.7]}
              intensity={lighting.portal}
              distance={12}
              decay={2}
              color={palette.light}
            />
          )}
        </group>
      ))}

      {/* four carpets on each side */}
      {sideArtworks.map((a) => (
        <FramedCarpet key={a.id} artwork={a} onSelect={onSelect} />
      ))}

      {/* main artwork: raised limestone panel, spotlight, large frame */}
      <mesh position={[0, layout.mainArtworkY, END + 0.07]}>
        <boxGeometry args={[4.7, 5.9, 0.14]} />
        <meshStandardMaterial color={palette.limestone} roughness={0.9} />
      </mesh>
      <primitive object={spotTarget} />
      <spotLight
        target={spotTarget}
        position={[0, H - 0.4, END + 7]}
        angle={0.42}
        penumbra={0.8}
        intensity={lighting.mainSpot}
        distance={16}
        decay={2}
        color={palette.light}
      />
      <FramedCarpet artwork={mainArtwork} onSelect={onMainClick} />
    </group>
  );
}