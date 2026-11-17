import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

// Small helpers ------------------------------------------------
function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function rand(seed: number) {
  let s = (seed * 9301 + 49297) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function finish(c: HTMLCanvasElement, repeat?: [number, number], isColor = true) {
  const t = new THREE.CanvasTexture(c);
  if (isColor) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 8;
  return t;
}

function speckle(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  count: number, alpha: number, r: () => number
) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

// Brick / paving ------------------------------------------------
export function brickTexture(
  repeat: [number, number],
  base: [number, number, number] = [150, 84, 62]
) {
  const [c, ctx] = makeCanvas(512, 512);
  const r = rand(7);
  ctx.fillStyle = "#6f5547";
  ctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 4; col++) {
      const x = col * 128 + (row % 2 ? 64 : 0);
      const y = row * 64;
      const v = (r() - 0.5) * 38;
      ctx.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.7},${base[2] + v * 0.6})`;
      ctx.fillRect(x + 3, y + 3, 122, 58);
    }
  }
  speckle(ctx, 512, 512, 6000, 0.05, r);
  return finish(c, repeat);
}

// Plaster / stone / concrete ------------------------------------
export function plasterTexture(
  hex: string, repeat: [number, number], seed = 3, grain = 0.035, cracks = 0
) {
  const [c, ctx] = makeCanvas(512, 512);
  const r = rand(seed);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {
    const x = r() * 512, y = r() * 512, rad = 40 + r() * 120;
    const tone = r() > 0.5 ? "255,255,255" : "0,0,0";
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${tone},0.04)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.strokeStyle = "rgba(90,75,60,0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < cracks; i++) {
    let x = r() * 512, y = r() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 12; k++) {
      x += (r() - 0.5) * 70;
      y += (r() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  speckle(ctx, 512, 512, 9000, grain, r);
  return finish(c, repeat);
}

// Woven-fibre bump pattern (gives the carpets their textile surface)
export function weaveTexture(repeat: [number, number]) {
  const [c, ctx] = makeCanvas(64, 64);
  const r = rand(11);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      const v = 110 + r() * 110;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x + ((y / 4) % 2 ? 2 : 0), y, 3, 3);
    }
  }
  return finish(c, repeat, false);
}

// Placeholder carpet design (shown only when a photo is missing) --
export function carpetPlaceholderTexture(
  seed: number, [field, border, accent]: [string, string, string]
) {
  const W = 512, H = 720;
  const [c, ctx] = makeCanvas(W, H);
  const r = rand(seed + 1);
  const diamond = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w, y);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = border; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent; ctx.fillRect(22, 22, W - 44, H - 44);
  ctx.fillStyle = border; ctx.fillRect(34, 34, W - 68, H - 68);
  ctx.fillStyle = field;  ctx.fillRect(58, 58, W - 116, H - 116);
  for (let i = 0; i < 13; i++) {
    diamond(46, 60 + i * 50, 7, 12, field);
    diamond(W - 46, 60 + i * 50, 7, 12, field);
  }
  for (let i = 0; i < 9; i++) {
    diamond(56 + i * 50, 46, 12, 7, field);
    diamond(56 + i * 50, H - 46, 12, 7, field);
  }
  const n = 3 + (seed % 3);
  const fw = W - 116, fh = H - 116;
  for (let iy = 0; iy < n * 2; iy++) {
    for (let ix = 0; ix < n; ix++) {
      diamond(
        58 + (fw * (ix + 0.5)) / n, 58 + (fh * (iy + 0.5)) / (n * 2),
        (fw / n) * 0.3, (fh / (n * 2)) * 0.36,
        (ix + iy) % 2 ? border : accent
      );
    }
  }
  diamond(W / 2, H / 2, 130, 190, border);
  diamond(W / 2, H / 2, 105, 160, accent);
  diamond(W / 2, H / 2, 70, 110, field);
  diamond(W / 2, H / 2, 28, 44, border);
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.06})`;
    ctx.fillRect(0, y, W, 1);
  }
  speckle(ctx, W, H, 14000, 0.05, r);
  return finish(c);
}

// Soft light wash (bright at the top edge, fading out) ---------
export function glowTexture() {
  const [c, ctx] = makeCanvas(8, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,236,200,0.9)");
  g.addColorStop(0.25, "rgba(255,236,200,0.35)");
  g.addColorStop(1, "rgba(255,236,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 128);
  return finish(c);
}

// Hooks --------------------------------------------------------
const IMAGE_ENDINGS = [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".PNG"];

// Loads an image from /public. If the path has no file ending,
// it tries .jpg, .jpeg, .png and .webp in turn.
export function useImageTexture(path: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!path) {
      setTex(null);
      return;
    }
    let alive = true;
    const hasEnding = /\.[a-zA-Z0-9]+$/.test(path);
    const candidates = hasEnding ? [path] : IMAGE_ENDINGS.map((e) => path + e);
    const loader = new THREE.TextureLoader();
    const tryNext = (i: number) => {
      if (!alive || i >= candidates.length) return;
      loader.load(
        candidates[i],
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          if (alive) setTex(t);
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
  return tex;
}

// Carpet photo if one is set (and loads), otherwise the placeholder.
export function useCarpetTexture(
  image: string, seed: number, colors: [string, string, string]
) {
  const loaded = useImageTexture(image);
  const [a, b, c] = colors;
  const placeholder = useMemo(
    () => carpetPlaceholderTexture(seed, [a, b, c]),
    [seed, a, b, c]
  );
  return loaded ?? placeholder;
}