"use client";

import { useScrollNav } from "@/lib/useScrollNav";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { siteConfig } from "@/config/site";
import type { Artwork } from "@/config/artworks";
import { modelPaths } from "@/components/artwork/FittedModel";
import "./viewer.css";

// ───── fixed settings ─────
const STAGE = "#e6dfd2"; // warm ivory stage
const MODEL_SIZE = 3.0; // the carpet's longest side, in scene units
const SPARK_COUNT = 450;
const MAIN_END = 0.86; // the first 86% of the page is the four slides; the rest is the finale
const SLIDE_RANGES: [number, number][] = [
  [-0.1, 0.12],
  [0.28, 0.4],
  [0.56, 0.68],
  [0.84, 1.05],
];
const NAV_TARGETS = [0, 0.34, 0.62, 0.94];
const IMAGE_ENDINGS = [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".PNG"];

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The slow wave background in the site's light theme:
// ivory and limestone at the top, warmer sand and bronze at the bottom.
const FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uScroll;

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    float aspect = uResolution.x / uResolution.y;
    float time = uTime * 0.08;
    float scroll = uScroll;

    float angle1 = 0.6;
    float angle2 = -0.7;
    float angle3 = 1.2;
    float freq1 = 2.4;
    float freq2 = 3.2;
    float freq3 = 4.0;

    vec2 warpedUv = uv;
    float scrollDeform = scroll * 5.0;
    warpedUv.x += sin(uv.y * 2.5 + time * 0.2 + scrollDeform) * 0.35;
    warpedUv.y += cos(uv.x * 2.5 - time * 0.15 - scrollDeform * 0.8) * 0.35;
    warpedUv.x += sin(uv.y * 1.2 - time * 0.1 - scrollDeform * 1.5) * 0.25;
    warpedUv.y += cos(uv.x * 1.2 + time * 0.18 + scrollDeform * 1.2) * 0.25;

    vec2 scrollDrift = vec2(scroll * 0.04, -scroll * 0.02);
    vec2 mouseShift = vec2(uMouse.x * aspect * 0.05, uMouse.y * 0.05);
    warpedUv += scrollDrift + mouseShift;

    vec2 dir1 = vec2(cos(angle1), sin(angle1));
    vec2 dir2 = vec2(cos(angle2), sin(angle2));
    vec2 dir3 = vec2(cos(angle3), sin(angle3));

    float w1 = sin(dot(warpedUv, dir1) * freq1 + time * 1.0);
    float w2 = cos(dot(warpedUv, dir2) * freq2 - time * 1.4 + w1 * 0.4);
    float w3 = sin(dot(warpedUv, dir3) * freq3 + time * 1.8 + w2 * 0.5);
    float waveField = w1 * 0.50 + w2 * 0.35 + w3 * 0.15;

    float wideSheen = pow(max(0.0, 1.0 - abs(waveField - 0.1)), 2.5);
    float crispSpecular = pow(max(0.0, 1.0 - abs(waveField - 0.15)), 8.0);
    float crest = wideSheen * 0.5 + crispSpecular * 0.9;

    // top of the page: warm ivory (#EAE4D9) and limestone (#D9D0C2)
    vec3 base0  = vec3(0.918, 0.894, 0.851);
    vec3 wave0  = vec3(0.851, 0.816, 0.761);
    vec3 deep0  = vec3(0.800, 0.745, 0.660);
    vec3 shine0 = vec3(1.000, 0.965, 0.890);

    // bottom of the page: sand with a touch of bronze, gold-cream shine (#F8E7C4)
    vec3 base1  = vec3(0.851, 0.816, 0.761);
    vec3 wave1  = vec3(0.790, 0.740, 0.665);
    vec3 deep1  = vec3(0.700, 0.615, 0.500);
    vec3 shine1 = vec3(0.973, 0.906, 0.769);

    float t = smoothstep(0.0, 1.0, scroll);
    vec3 base  = mix(base0, base1, t);
    vec3 wave  = mix(wave0, wave1, t);
    vec3 deep  = mix(deep0, deep1, t);
    vec3 shine = mix(shine0, shine1, t);

    vec3 color = base;
    color = mix(color, wave, smoothstep(-0.6, 0.2, waveField) * 0.85);
    color = mix(color, deep, smoothstep(0.0, 0.8, waveField) * 0.5);
    color = mix(color, shine, clamp(crest * 0.75, 0.0, 1.0));

    float vignette = 1.0 - dot(uv, uv) * 0.07;
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Title that animates in letter by letter.
function SplitTitle({ text }: { text: string }) {
  const words = text.split(" ");
  const offsets = words.map((_, i) => words.slice(0, i).join("").length);
  return (
    <h2 className="slide-title">
      {words.map((word, w) => (
        <span className="word" key={w}>
          {word.split("").map((ch, i) => (
            <span
              className="char"
              key={i}
              style={{ transitionDelay: `${(offsets[w] + i) * 0.035}s` }}
            >
              {ch}
            </span>
          ))}
        </span>
      ))}
    </h2>
  );
}

type Props = { artwork: Artwork; onBack: () => void; onShop: () => void; startAtEnd?: boolean };

export default function CarpetViewer({ artwork, onBack, onShop, startAtEnd = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onShopRef = useRef(onShop);
  const shopFired = useRef(false);
  useEffect(() => {
    onShopRef.current = onShop;
  }, [onShop]);
    // scroll up past the top (or press ↑) to go back to the gallery
  useScrollNav(rootRef, { onPullTop: onBack });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const clock = new THREE.Clock();
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    let disposed = false;
    let raf = 0;
    let smoothRaw = 0; // smoothed position on the whole page, 0..1
    let snapCamera = false;
    let currentScroll = 0; // progress through the four slides, 0..1
    let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    let cursorX = sizes.width / 2, cursorY = sizes.height / 2;
    let outerX = cursorX, outerY = cursorY;
    let modelPivot: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;

    // ── scene, camera ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(STAGE);
    scene.fog = new THREE.FogExp2(STAGE, 0.01);

    const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(0, 0.2, 3.0);
    scene.add(camera);

    // ── background wave (attached to the camera so it always fills the view) ──
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
    };
    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms,
        depthWrite: false,
        depthTest: false,
      })
    );
    bgMesh.position.set(0, 0, -8);
    bgMesh.renderOrder = -10;
    camera.add(bgMesh);

    // ── renderer ──
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // ── lighting ──
    scene.add(new THREE.AmbientLight("#fff6ea", 1.0));

    const keyLight = new THREE.SpotLight("#fff1dc", 170);
    keyLight.position.set(4, 6, 3);
    keyLight.angle = Math.PI / 4;
    keyLight.penumbra = 0.9;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#f8e7c4", 2.5);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight("#fff3e6", 1.2);
    fillLight.position.set(-2, -4, 2);
    scene.add(fillLight);

    // ── gold dust: 60% gold, 40% warm brown ──
    const sparkCanvas = document.createElement("canvas");
    sparkCanvas.width = 16;
    sparkCanvas.height = 16;
    const sctx = sparkCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.25, "rgba(255, 255, 255, 0.85)");
    grad.addColorStop(0.6, "rgba(255, 255, 255, 0.3)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 16, 16);

    const positions = new Float32Array(SPARK_COUNT * 3);
    const colors = new Float32Array(SPARK_COUNT * 3);
    const sparkData: {
      speedX: number; speedY: number; speedZ: number;
      swaySpeed: number; swayRadius: number; phase: number;
    }[] = [];
    const gold = new THREE.Color("#b08d57");
    const brown = new THREE.Color("#7a5638");
    for (let i = 0; i < SPARK_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5.0 - 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
      const col = Math.random() < 0.6 ? gold : brown;
      const jitter = 0.85 + Math.random() * 0.15;
      colors[i * 3] = col.r * jitter;
      colors[i * 3 + 1] = col.g * jitter;
      colors[i * 3 + 2] = col.b * jitter;
      sparkData.push({
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: 0.15 + Math.random() * 0.3,
        speedZ: (Math.random() - 0.5) * 0.4,
        swaySpeed: 0.5 + Math.random() * 1.5,
        swayRadius: 0.05 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
      });
    }
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    sparkGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const sparks = new THREE.Points(
      sparkGeometry,
      new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        map: new THREE.CanvasTexture(sparkCanvas),
      })
    );
    scene.add(sparks);

    // ── the carpet: stand it upright, scale it, centre it on a pivot ──
    const placeModel = (obj: THREE.Object3D) => {
      if (disposed) return;
      const pivot = new THREE.Group();
      scene.add(pivot);
      pivot.add(obj);

      const first = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
      if (first.y <= first.x && first.y <= first.z) obj.rotation.x = Math.PI / 2; // was lying flat
      else if (first.x <= first.y && first.x <= first.z) obj.rotation.y = -Math.PI / 2; // was sideways
      obj.updateMatrixWorld(true);

      const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      obj.scale.multiplyScalar(MODEL_SIZE / (maxDim > 0.0001 ? maxDim : 1));
      obj.updateMatrixWorld(true);

      const centre = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      obj.position.sub(centre);
      pivot.position.y = -0.4;
      modelPivot = pivot;
    };

    // used when there is no .glb: a carpet slab showing the artwork's photo
    const buildSlab = () => {
      const [w, h] = artwork.size;
      const face = new THREE.MeshStandardMaterial({ color: "#b8a58a", roughness: 1 });
      const edge = new THREE.MeshStandardMaterial({ color: "#8f7d63", roughness: 1 });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), [edge, edge, edge, edge, face, face]);
      slab.castShadow = true;
      placeModel(slab);
      if (!artwork.image) return;
      const hasEnding = /\.[a-zA-Z0-9]+$/.test(artwork.image);
      const candidates = hasEnding ? [artwork.image] : IMAGE_ENDINGS.map((e) => artwork.image + e);
      const texLoader = new THREE.TextureLoader();
      const tryImage = (i: number) => {
        if (disposed || i >= candidates.length) return;
        texLoader.load(
          candidates[i],
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 16;
            face.map = t;
            face.color.set("#ffffff");
            face.needsUpdate = true;
          },
          undefined,
          () => tryImage(i + 1)
        );
      };
      tryImage(0);
    };

    if (artwork.modelPath) {
      const paths = modelPaths(artwork.modelPath);
      const gltfLoader = new GLTFLoader();
      const tryModel = (i: number) => {
        if (disposed) return;
        if (i >= paths.length) {
          console.warn("Carpet model not found. Looked in:", paths);
          buildSlab();
          return;
        }
        gltfLoader.load(
          paths[i],
          (gltf) => {
            gltf.scene.traverse((child) => {
              const mesh = child as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m) => {
                const std = m as THREE.MeshStandardMaterial;
                if (std.map) std.map.anisotropy = 16;
              });
            });
            if (gltf.animations.length > 0) {
              mixer = new THREE.AnimationMixer(gltf.scene);
              gltf.animations.forEach((clip) => mixer!.clipAction(clip).play());
            }
            placeModel(gltf.scene);
          },
          undefined,
          () => tryModel(i + 1)
        );
      };
      tryModel(0);
    } else {
      buildSlab();
    }

    // ── page elements updated every frame ──
    const cursorInner = root.querySelector<HTMLElement>(".cursor-inner");
    const cursorOuter = root.querySelector<HTMLElement>(".cursor-outer");
    const slides = [1, 2, 3, 4].map((n) => root.querySelector<HTMLElement>(`#lv-slide-${n}`));
    const slide2Img = root.querySelector<HTMLElement>("#lv-slide-2-img");
    const fills = [1, 2, 3, 4].map((n) => root.querySelector<HTMLElement>(`#lv-dash-fill-${n}`));
    const dots = Array.from(root.querySelectorAll<HTMLElement>(".grid-dot"));
    const navLinks = Array.from(root.querySelectorAll<HTMLElement>(".nav-link"));
    const barThumb = root.querySelector<HTMLElement>(".lv-bar-thumb");
    const fadeEl = root.querySelector<HTMLElement>(".lv-fade");
    const finaleHint = root.querySelector<HTMLElement>(".lv-finale-hint");

    const maxScroll = () => root.scrollHeight - root.clientHeight;
    
    // coming back up from the shop: start just before the finale
    if (startAtEnd) {
      smoothRaw = MAIN_END - 0.03;
      root.scrollTop = smoothRaw * maxScroll();
      snapCamera = true;
    }

    // ── events ──
    const onMouseMove = (e: MouseEvent) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      if (cursorInner) {
        cursorInner.style.left = `${cursorX}px`;
        cursorInner.style.top = `${cursorY}px`;
      }
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      uniforms.uResolution.value.set(sizes.width, sizes.height);
    };
    const navHandlers = navLinks.map((_, i) => () => {
      root.scrollTo({ top: maxScroll() * NAV_TARGETS[i] * MAIN_END, behavior: "smooth" });
    });
    navLinks.forEach((link, i) => link.addEventListener("click", navHandlers[i]));
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    const lookTarget = new THREE.Vector3();
    const camTarget = new THREE.Vector3();

    // ── animation loop ──
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);

      // where we are on the page (smoothed)
      const max = maxScroll();
      const targetRaw = max > 0 ? root.scrollTop / max : 0;
      smoothRaw += (targetRaw - smoothRaw) * 0.025;

      // first part of the page: the four slides. Last part: the finale.
      const targetScroll = Math.min(1, targetRaw / MAIN_END);
      currentScroll = Math.min(1, smoothRaw / MAIN_END);
      const finale = clamp01((smoothRaw - MAIN_END) / (1 - MAIN_END));
      const finaleEase = finale * finale * (3 - 2 * finale);

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      outerX += (cursorX - outerX) * 0.2;
      outerY += (cursorY - outerY) * 0.2;
      if (cursorOuter) {
        cursorOuter.style.left = `${outerX}px`;
        cursorOuter.style.top = `${outerY}px`;
      }

      // slight tilt from the mouse; in the finale the carpet makes one
      // more full turn on its own and grows bigger
      if (modelPivot) {
        modelPivot.rotation.y = mouseX * 0.25 + finaleEase * Math.PI * 2;
        modelPivot.rotation.x = mouseY * 0.15 * (1 - finaleEase);
        modelPivot.scale.setScalar(1 + finaleEase * 0.45);
      }

      // dust rises, and swirls faster while scrolling
      const pos = sparkGeometry.attributes.position.array as Float32Array;
      const time = clock.getElapsedTime();
      const velocity = Math.abs(targetRaw - smoothRaw);
      const speedMultiplier = 1 + velocity * 9;
      const turbulence = velocity * 0.8;
      for (let i = 0; i < SPARK_COUNT; i++) {
        const idx = i * 3;
        const d = sparkData[i];
        pos[idx] += d.speedX * dt * speedMultiplier;
        pos[idx + 1] += d.speedY * dt * speedMultiplier;
        pos[idx + 2] += d.speedZ * dt * speedMultiplier;
        const sway = d.swayRadius * (1 + turbulence * 4);
        pos[idx] += Math.sin(time * d.swaySpeed + d.phase) * sway * dt;
        pos[idx + 2] += Math.cos(time * d.swaySpeed + d.phase) * sway * dt;
        if (pos[idx + 1] > 3 || Math.abs(pos[idx]) > 3.5 || Math.abs(pos[idx + 2]) > 3.5) {
          pos[idx + 1] = -2.5;
          pos[idx] = (Math.random() - 0.5) * 3;
          pos[idx + 2] = (Math.random() - 0.5) * 3;
        }
      }
      sparkGeometry.attributes.position.needsUpdate = true;

      // the camera orbits the carpet through a full 360° as you scroll
      const phi = currentScroll * Math.PI * 2;
      const y = 0.35 + Math.sin(currentScroll * Math.PI) * 0.8;
      const radius = 4.2 - Math.sin(currentScroll * Math.PI) * 0.6;
      const progress = Math.min(1, currentScroll / 0.28);
      const easeFactor = (Math.cos(progress * Math.PI) + 1) * 0.5;
      lookTarget.set(-0.9 * easeFactor, -0.15, 0);
      camTarget.set(radius * Math.sin(phi), y, radius * Math.cos(phi));
            if (snapCamera) {
        camera.position.copy(camTarget);
        snapCamera = false;
      } else {
        camera.position.lerp(camTarget, 0.025);
      }
      camera.lookAt(lookTarget);

      uniforms.uTime.value = time;
      uniforms.uMouse.value.set(mouseX, -mouseY);
      uniforms.uScroll.value = currentScroll;

      // slides and progress dashes (the last slide leaves as the finale starts)
      fills.forEach((fill, i) => {
        if (!fill) return;
        const p = clamp01((currentScroll - i * 0.25) / 0.25);
        fill.style.height = `${p * 100}%`;
      });
      slides.forEach((slide, i) => {
        if (!slide) return;
        const inRange = currentScroll >= SLIDE_RANGES[i][0] && currentScroll <= SLIDE_RANGES[i][1];
        const active = inRange && finale < 0.08;
        slide.classList.toggle("active", active);
        if (i === 1 && slide2Img) slide2Img.classList.toggle("active", active);
      });

      // drifting grid dots
      dots.forEach((dot, i) => {
        const startY = ((i * 17) % 80) + 10;
        let speed = 90 + ((i * 55) % 180);
        if (i % 2 === 0) speed = -speed;
        const top = (((startY + currentScroll * speed) % 100) + 100) % 100;
        dot.style.top = `${top}%`;
      });

      // scroll bar, finale hint, and the fade into the shop
      if (barThumb) barThumb.style.top = `${clamp01(targetRaw) * 100}%`;
      if (finaleHint) {
        finaleHint.style.opacity = currentScroll > 0.97 && finale < 0.45 ? "1" : "0";
      }
      if (fadeEl) fadeEl.style.opacity = String(clamp01((finale - 0.55) / 0.4));

      // the finale is finished: open the shop
      if (!shopFired.current && finale > 0.97) {
        shopFired.current = true;
        onShopRef.current();
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── clean up when leaving the view ──
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      navLinks.forEach((link, i) => link.removeEventListener("click", navHandlers[i]));
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        mats.forEach((m) => m.dispose());
      });
      renderer.dispose();
    };
    }, [artwork, startAtEnd]);

  // dragging or tapping the scroll bar
  const dragBar = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    root.scrollTop = f * (root.scrollHeight - root.clientHeight);
  };

  return (
    <div className="lv fade-in" ref={rootRef} style={{ position: "fixed", inset: 0, overflowY: "auto" }}>
      <div className="cursor-inner" />
      <div className="cursor-outer" />

      <div className="cinematic-container">
        <div className="main-header">
          <div className="brand">{siteConfig.brandName}</div>
          <nav className="header-nav">
            <button className="nav-link">Story</button>
            <span className="nav-dot" />
            <button className="nav-link">Dimensions</button>
            <span className="nav-dot" />
            <button className="nav-link">Material</button>
            <span className="nav-dot" />
            <button className="nav-link">Craft</button>
          </nav>
          <div className="header-actions" style={{ display: "flex", gap: 10 }}>
            <button className="contact-btn" onClick={onBack}>
              Back to gallery <span className="btn-circle" />
            </button>
            <button className="contact-btn" onClick={onShop}>
              Shop <span className="btn-circle" />
            </button>
          </div>
        </div>

        <div className="slide" id="lv-slide-1">
          <SplitTitle text={artwork.title} />
          <div className="desc-row">
            <p className="slide-desc col-1">{artwork.description}</p>
            <p className="slide-desc col-2">{artwork.collection}</p>
          </div>
        </div>

        <div className="slide" id="lv-slide-2">
          <SplitTitle text="Dimensions" />
          <p className="slide-desc">{artwork.dimensions}</p>
        </div>

        <div className="slide" id="lv-slide-3">
          <SplitTitle text="Material" />
          <p className="slide-desc">{artwork.material}</p>
        </div>

        <div className="slide" id="lv-slide-4">
          <SplitTitle text="Craft" />
          <p className="slide-desc">{artwork.craftsmanship}</p>
        </div>
      </div>

      <div className="slide-image-mask" id="lv-slide-2-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={siteConfig.logoPath} alt={siteConfig.brandName} />
      </div>

      <div className="grid-horizontal-line" />
      <div className="grid-lines">
        {[0, 1, 2, 3].map((i) => (
          <div className="grid-line" key={i}>
            <div className="grid-dot top" />
            <div className="grid-dot bottom" />
          </div>
        ))}
        <div className="grid-line story-progress-container">
          <div className="grid-dot top" />
          <div className="grid-dot bottom" />
          <div className="story-dashes">
            {[1, 2, 3, 4].map((n) => (
              <div className="story-dash" key={n}>
                <div className="story-dash-fill" id={`lv-dash-fill-${n}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <canvas className="lv-canvas" ref={canvasRef} />

      {/* scroll bar for this page */}
      <div
        className="lv-bar"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragBar(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1 || e.pointerType === "touch") dragBar(e);
        }}
      >
        <div className="lv-bar-thumb" />
      </div>

      {/* shown at the end of the slides */}
      <p className="lv-finale-hint">Keep scrolling to enter the shop</p>

      {/* ivory fade that blends into the shop page */}
      <div className="lv-fade" />

      {/* page length: about 900vh of slides plus the finale */}
      <div className="lv-spacer" style={{ height: "1050vh" }} />
    </div>
  );
}