"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { siteConfig, lighting } from "@/config/site";
import { brickTexture, plasterTexture, useImageTexture } from "@/lib/textures";

// Building measurements (metres). The door is centred on x = 0.
const B = {
  left: -16, // left end of the concrete wall
  colLeft: -2.2, // where the curve ends and the columns begin
  colRight: 2.2,
  tallRight: 5.4, // right edge of the tall column
  right: 9, // right end of the building
  top: 17, // height of the concrete
  colTop: 13.5, // height of the three columns
  tallTop: 15.8, // height of the tall column
  doorH: 4.3,
  frontZ: 0.6, // front face of the concrete
};

// The sweeping curve: straight up at the left, then rising to the columns.
function buildCurve() {
  const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.LineCurve3(v(-13.5, 0), v(-13.5, 3)));
  path.add(new THREE.CubicBezierCurve3(v(-13.5, 3), v(-13.5, 6.2), v(-11.5, 6.6), v(-9, 7)));
  path.add(new THREE.CubicBezierCurve3(v(-9, 7), v(-5, 7.7), v(-2.6, 9.5), v(B.colLeft, B.colTop)));
  return path;
}

function curveY(pts: THREE.Vector3[], x: number) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (b.x > a.x && x >= a.x && x <= b.x) {
      return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
    }
  }
  return pts[pts.length - 1].y;
}

// Sage concrete with fine grain, hairline cracks and panel joints.
function concreteTexture(repeat: [number, number]) {
  const t = plasterTexture("#8c9a8e", repeat, 41, 0.05, 6);
  const ctx = (t.image as HTMLCanvasElement).getContext("2d")!;
  ctx.strokeStyle = "rgba(40,50,42,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 510, 510);
  t.needsUpdate = true;
  return t;
}

// Glowing amber glass: brightest near the ground, with soft vertical streaks.
function goldTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 512, 0, 0);
  g.addColorStop(0, "#fff0c2");
  g.addColorStop(0.18, "#e9bf73");
  g.addColorStop(0.6, "#b98c48");
  g.addColorStop(1, "#d9ad63");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,235,190,${Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 256, 0, 4 + Math.random() * 26, 512);
  }
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(90,60,20,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function goldMaterial(base: THREE.Texture, repeat: [number, number]) {
  const map = base.clone();
  map.repeat.set(repeat[0], repeat[1]);
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: "#ffd592",
    emissiveIntensity: lighting.goldGlow,
    roughness: 0.3,
    metalness: 0.25,
  });
}

export default function Entrance({ lowPower }: { lowPower: boolean }) {
  // ── shapes ──
  const geo = useMemo(() => {
    const path = buildCurve();
    const pts = path.getPoints(30);

    const wall = new THREE.Shape();
    wall.moveTo(B.left, 0);
    pts.forEach((p) => wall.lineTo(p.x, p.y));
    wall.lineTo(B.colLeft, B.top);
    wall.lineTo(B.left, B.top);
    wall.closePath();

    const glass = new THREE.Shape();
    glass.moveTo(pts[0].x, pts[0].y);
    pts.forEach((p) => glass.lineTo(p.x, p.y));
    glass.lineTo(B.colLeft, 0);
    glass.closePath();

    return {
      pts,
      wall: new THREE.ExtrudeGeometry(wall, { depth: 1.5, bevelEnabled: false }),
      glass: new THREE.ShapeGeometry(glass),
      lip: new THREE.TubeGeometry(path, 90, 0.11, 8, false),
    };
  }, []);

  // ── materials ──
  const mat = useMemo(() => {
    const gold = goldTexture();
    return {
      concrete: new THREE.MeshStandardMaterial({
        map: concreteTexture([0.12, 0.12]),
        roughness: 0.9,
      }),
      pier: new THREE.MeshStandardMaterial({ map: concreteTexture([0.45, 2]), roughness: 0.9 }),
      goldPanel: goldMaterial(gold, [0.15, 1 / 14]),
      goldColumn: goldMaterial(gold, [2, 1]),
      bronze: new THREE.MeshStandardMaterial({ color: "#8a6a3c", roughness: 0.4, metalness: 0.6 }),
      backing: new THREE.MeshStandardMaterial({ color: "#6b4f2a", roughness: 0.7 }),
      doorGlass: new THREE.MeshStandardMaterial({
        color: "#d5e2da",
        transparent: true,
        opacity: 0.18,
        roughness: 0.05,
        metalness: 0.9,
      }),
      ground: new THREE.MeshStandardMaterial({
        map: brickTexture([60, 70], [150, 150, 144]),
        roughness: 0.92,
      }),
    };
  }, []);

  const keyTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(-3, 6, 0);
    return o;
  }, []);

  // ── logo ──
  const logo = useImageTexture(siteConfig.logoPath);
  const logoImg = logo ? (logo.image as HTMLImageElement) : null;
  const logoW = siteConfig.logo.width;
  const logoH = logoImg ? logoW / (logoImg.width / logoImg.height) : 1;

  // ── glass doors swing open as the visitor approaches ──
  const leftDoor = useRef<THREE.Group>(null);
  const rightDoor = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const z = state.camera.position.z;
    const open = THREE.MathUtils.clamp((10 - z) / 5, 0, 1) * (Math.PI / 2);
    if (leftDoor.current) {
      leftDoor.current.rotation.y = THREE.MathUtils.damp(leftDoor.current.rotation.y, open, 4, dt);
    }
    if (rightDoor.current) {
      rightDoor.current.rotation.y = THREE.MathUtils.damp(rightDoor.current.rotation.y, -open, 4, dt);
    }
  });

  const mullions = [-11.2, -9, -6.8, -4.5];
  const columns = [-1.47, 0, 1.47];
  const colH = B.colTop - B.doorH - 0.12;

  return (
    <group>
      {/* soft daylight on the facade */}
      <primitive object={keyTarget} />
      <spotLight
        target={keyTarget}
        position={[-12, 22, 30]}
        angle={0.8}
        penumbra={0.7}
        intensity={lighting.exteriorKey}
        decay={2}
        color="#fff6e8"
        castShadow={!lowPower}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={5}
        shadow-camera-far={90}
        shadow-bias={-0.0006}
      />

      {/* paved plaza */}
      <mesh material={mat.ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 34]} receiveShadow>
        <planeGeometry args={[120, 70]} />
      </mesh>

      {/* sage concrete wall with the sweeping curve cut out of it */}
      <mesh geometry={geo.wall} material={mat.concrete} position={[0, 0, B.frontZ - 1.5]} castShadow receiveShadow />

      {/* champagne-gold lip following the curve */}
      <mesh geometry={geo.lip} material={mat.bronze} position={[0, 0, B.frontZ - 0.05]} castShadow />

      {/* glowing golden glass under the curve */}
      <mesh geometry={geo.glass} material={mat.goldPanel} position={[0, 0, -0.45]} receiveShadow />
      {mullions.map((x) => {
        const h = curveY(geo.pts, x);
        return (
          <mesh key={x} material={mat.bronze} position={[x, h / 2, -0.38]}>
            <boxGeometry args={[0.1, h, 0.14]} />
          </mesh>
        );
      })}
      <mesh material={mat.bronze} position={[(-13.4 + B.colLeft) / 2, B.doorH, -0.4]}>
        <boxGeometry args={[B.colLeft + 13.4, 0.07, 0.1]} />
      </mesh>

      {/* CARPET DIEM logo, mounted on the upper-left wall */}
      {logo && (
        <group position={[siteConfig.logo.x, siteConfig.logo.y, B.frontZ]}>
          <mesh position={[0.04, -0.05, 0.01]}>
            <planeGeometry args={[logoW, logoH]} />
            <meshBasicMaterial map={logo} color="#000000" transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[logoW, logoH]} />
            <meshStandardMaterial
              map={logo}
              transparent
              alphaTest={0.35}
              roughness={0.35}
              metalness={0.6}
              emissive="#c9a25c"
              emissiveMap={logo}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      )}

      {/* wall behind the columns (hides the gallery from outside) */}
      <mesh material={mat.backing} position={[(B.colLeft + B.tallRight) / 2, (B.colTop + B.doorH) / 2, -0.75]}>
        <boxGeometry args={[B.tallRight - B.colLeft, B.colTop - B.doorH, 0.2]} />
      </mesh>

      {/* three rounded golden columns above the door */}
      {columns.map((x) => (
        <group key={x} position={[x, 0, -0.2]}>
          <mesh material={mat.goldColumn} position={[0, B.doorH + 0.12 + colH / 2, 0]} castShadow>
            <cylinderGeometry args={[0.73, 0.73, colH, 32]} />
          </mesh>
          <mesh material={mat.goldColumn} position={[0, B.colTop, 0]} scale={[1, 0.35, 1]}>
            <sphereGeometry args={[0.73, 32, 12]} />
          </mesh>
        </group>
      ))}

      {/* the tall rounded column */}
      <group position={[(B.colRight + B.tallRight) / 2, 0, -1]}>
        <mesh material={mat.goldColumn} position={[0, B.tallTop / 2, 0]} castShadow>
          <cylinderGeometry args={[1.6, 1.6, B.tallTop, 48]} />
        </mesh>
        <mesh material={mat.goldColumn} position={[0, B.tallTop, 0]} scale={[1, 0.3, 1]}>
          <sphereGeometry args={[1.6, 48, 12]} />
        </mesh>
      </group>

      {/* concrete pier on the right */}
      <mesh material={mat.pier} position={[(B.tallRight + B.right) / 2, B.top / 2, B.frontZ - 0.75]} castShadow receiveShadow>
        <boxGeometry args={[B.right - B.tallRight, B.top, 1.5]} />
      </mesh>

      {/* doorway: bronze jambs and header */}
      <mesh material={mat.bronze} position={[B.colLeft - 0.06, B.doorH / 2, -0.25]}>
        <boxGeometry args={[0.12, B.doorH, 1.1]} />
      </mesh>
      <mesh material={mat.bronze} position={[B.colRight + 0.06, B.doorH / 2, -0.25]}>
        <boxGeometry args={[0.12, B.doorH, 1.1]} />
      </mesh>
      <mesh material={mat.bronze} position={[0, B.doorH + 0.06, -0.25]}>
        <boxGeometry args={[B.colRight - B.colLeft + 0.24, 0.12, 1.1]} />
      </mesh>

      {/* glass doors, hinged at the jambs */}
      <group ref={leftDoor} position={[B.colLeft, 0, 0]}>
        <mesh material={mat.doorGlass} position={[1.07, B.doorH / 2 - 0.05, 0]}>
          <boxGeometry args={[2.14, B.doorH - 0.1, 0.04]} />
        </mesh>
        <mesh material={mat.bronze} position={[1.95, 1.3, 0.05]}>
          <boxGeometry args={[0.05, 1.2, 0.05]} />
        </mesh>
      </group>
      <group ref={rightDoor} position={[B.colRight, 0, 0]}>
        <mesh material={mat.doorGlass} position={[-1.07, B.doorH / 2 - 0.05, 0]}>
          <boxGeometry args={[2.14, B.doorH - 0.1, 0.04]} />
        </mesh>
        <mesh material={mat.bronze} position={[-1.95, 1.3, 0.05]}>
          <boxGeometry args={[0.05, 1.2, 0.05]} />
        </mesh>
      </group>

      {/* warm light spilling out of the doorway */}
      <pointLight position={[0, 3.2, 0.8]} intensity={25} distance={9} decay={2} color="#ffd9a0" />
    </group>
  );
}