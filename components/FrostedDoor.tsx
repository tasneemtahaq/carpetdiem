"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type HeadingArt = {
  mask: string;
  overlay: string;
  // top of the heading (px from the top), so the handle stays clear of it
  headingTop: number;
  // middle and bottom of the name, so the tagline can sit centred right below it
  nameCenter: number;
  nameBottom: number;
};

// A picture used as a cut-out shape
type Shape = { source: CanvasImageSource; aspect: number };

// ★ The files used. For each, the first location that exists is used.
const EMBLEM_SOURCES = ["/images/emblem.png", "/emblem.png"];
// Empty list = the name is typed in the page font (Bodoni Moda) instead of using a picture
const WORDMARK_SOURCES: string[] = [];
// Thickness of the letters: 400 (lightest) to 700 (boldest)
const HEADING_WEIGHT = 500;
// Space between the letters, as a share of the letter size
const HEADING_SPACING = 0.16;
// Where "DIEM" begins in the lettering picture (0 = left edge, 1 = right edge)
const WORDMARK_SPLIT = 0.6;

// Emblem height compared with the height of the letters
const EMBLEM_SCALE = 1.5;
// Space between the emblem and the name (as a share of the letter height). Smaller = closer.
const EMBLEM_GAP = 0.25;

// ★ Colour of the solid letters past the glass ("DIEM")
const SOLID_COLOR = "#f5efe4";
// Soft dark edge behind the solid letters, so off-white stays readable on the bright gallery
const SOLID_SHADOW = "rgba(69,42,29,0.6)";

// ----- Readability settings (all as a share of the letter height) -----
// Darkens the 3D scene seen THROUGH the cut-outs, so they read as clear shapes
const INNER_TINT = 0.28; // 0 = no tint, 1 = black
// Cut-glass look: a shadow falls into each cut-out from its top edge,
// and a faint light catches its bottom edge
const BEVEL_SHADOW_COLOR = "rgba(0,0,0,0.7)";
const BEVEL_SHADOW_BLUR = 0.1;
const BEVEL_SHADOW_DEPTH = 0.05;
const BEVEL_LIGHT_COLOR = "rgba(255,255,255,0.45)";
const BEVEL_LIGHT_BLUR = 0.04;
const BEVEL_LIGHT_DEPTH = 0.017;
// Soft dark shadow on the glass just OUTSIDE the cut-outs, so they look carved in
const EDGE_SHADOW_BLUR = 0.07;
const EDGE_SHADOW_COLOR = "rgba(0,0,0,0.35)";

function makeCanvas(width: number, height: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.scale(dpr, dpr);
  return { canvas, ctx };
}

// Loads a picture, trying each location in turn. Gives null if none exists.
function loadShape(sources: string[]): Promise<Shape | null> {
  return new Promise((resolve) => {
    const tryNext = (i: number) => {
      if (i >= sources.length) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => resolve({ source: img, aspect: img.width / img.height });
      img.onerror = () => tryNext(i + 1);
      img.src = sources[i];
    };
    tryNext(0);
  });
}

// Used only if wordmark.png is missing: the name typed in the page's own font
function typedWordmark(line: string, family: string): { shape: Shape; split: number } | null {
  const probe = makeCanvas(1, 1, 1).ctx;
  if (!probe) return null;
  const font = `${HEADING_WEIGHT} 200px ${family}`;
  const spacing = `${200 * HEADING_SPACING}px`;
  probe.font = font;
  probe.letterSpacing = spacing;
  const width = probe.measureText(line).width;
  const cap = probe.measureText("M").actualBoundingBoxAscent || 144;
  const firstWord = line.split(" ")[0] + " ";
  const split = probe.measureText(firstWord).width / width;
  const { canvas, ctx } = makeCanvas(width, cap, 1);
  if (!ctx) return null;
    ctx.font = font;
  ctx.letterSpacing = spacing;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  ctx.fillText(line, 0, cap);
  return { shape: { source: canvas, aspect: width / cap }, split };
}

// Draws the heading into two images:
//  - a MASK for the frosted glass: solid, with the emblem and "CARPET"
//    cut out, so the sharp 3D scene shows through them
//  - an OVERLAY: the solid "DIEM" past the glass,
//    plus the layers that make the cut-outs easy to read
function renderHeading({
  width,
  height,
  panelWidth,
  portrait,
  word,
  split,
  emblem,
}: {
  width: number; // the whole door
  height: number;
  panelWidth: number; // the real width of the glass, measured from the page
  portrait: boolean;
  word: Shape; // the CARPET DIEM lettering
  split: number; // where DIEM begins in the lettering
  emblem: Shape | null;
}): HeadingArt | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // ----- Work out the letter height -----
  const emblemUnit = emblem ? EMBLEM_SCALE * emblem.aspect + EMBLEM_GAP : 0;
  const leftMargin = panelWidth * (portrait ? 0.08 : 0.06);
  const limits = portrait
    ? [(panelWidth - leftMargin * 2) / (word.aspect + emblemUnit), height * 0.08]
    : [
        (panelWidth - leftMargin) / (word.aspect * split + emblemUnit),
        height * 0.12,
        ((width - panelWidth) * 0.94) / (word.aspect * (1 - split)),
      ];
  const H = Math.min(...limits);

  // ----- Place the emblem and the name -----
  const wordW = H * word.aspect;
  const emblemH = emblem ? H * EMBLEM_SCALE : 0;
  const emblemW = emblem ? emblemH * emblem.aspect : 0;
  const emblemSpace = emblem ? emblemW + H * EMBLEM_GAP : 0;

  // Landscape: "CARPET" ends exactly at the glass edge, where "DIEM" begins.
  // Portrait (a phone): the whole name sits on the glass.
  const wordX = portrait ? leftMargin + emblemSpace : panelWidth - wordW * split;
  const emblemX = wordX - emblemSpace;
  const headingTop = (height - H) / 2;
  const wordY = headingTop;
  const emblemY = headingTop + H / 2 - emblemH / 2;

  // Draws a picture's shape in whatever colour is currently set
  const stamp = (
    ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, w: number, h: number
  ) => {
    const tinted = makeCanvas(w, h, dpr);
    if (!tinted.ctx) return;
    tinted.ctx.drawImage(shape.source, 0, 0, w, h);
    tinted.ctx.globalCompositeOperation = "source-in";
    tinted.ctx.fillStyle = ctx.fillStyle;
    tinted.ctx.fillRect(0, 0, w, h);
    ctx.drawImage(tinted.canvas, x, y, w, h);
  };

  // Draws everything that is cut out of the glass: the emblem and the name.
  // (The glass canvases are only as wide as the glass, so "DIEM" falls outside them.)
  const fillHollow = (ctx: CanvasRenderingContext2D) => {
    stamp(ctx, word, wordX, wordY, wordW, H);
    if (emblem) stamp(ctx, emblem, emblemX, emblemY, emblemW, emblemH);
  };

  // ----- 1. The mask for the glass -----
  const glass = makeCanvas(panelWidth, height, dpr);
  if (!glass.ctx) return null;
  glass.ctx.fillStyle = "#000";
  glass.ctx.fillRect(0, 0, panelWidth, height);
  glass.ctx.globalCompositeOperation = "destination-out";
  fillHollow(glass.ctx);

  // ----- 2. A soft shadow on the glass, just OUTSIDE the cut-outs -----
  const edge = makeCanvas(panelWidth, height, dpr);
  if (!edge.ctx) return null;
  edge.ctx.fillStyle = "#000";
  edge.ctx.shadowColor = EDGE_SHADOW_COLOR;
  edge.ctx.shadowBlur = H * EDGE_SHADOW_BLUR * dpr;
  edge.ctx.shadowOffsetY = H * 0.014 * dpr;
  fillHollow(edge.ctx);
  // Remove the shapes themselves, leaving only the shadow around them
  edge.ctx.shadowColor = "transparent";
  edge.ctx.globalCompositeOperation = "destination-out";
  fillHollow(edge.ctx);

  // ----- 3. Inside the cut-outs: dark tint + cut-glass bevel -----
  // A "frame": solid everywhere EXCEPT the cut-outs. Casting a shadow from it
  // makes the shadow fall INTO the cut-outs from their edges.
  const frame = makeCanvas(panelWidth, height, dpr);
  if (!frame.ctx) return null;
  frame.ctx.fillStyle = "#000";
  frame.ctx.fillRect(0, 0, panelWidth, height);
  frame.ctx.globalCompositeOperation = "destination-out";
  fillHollow(frame.ctx);

  const inner = makeCanvas(panelWidth, height, dpr);
  if (!inner.ctx) return null;

  // A. Darken the scene a little, so busy colours don't swallow the shapes
  inner.ctx.fillStyle = `rgba(0,0,0,${INNER_TINT})`;
  fillHollow(inner.ctx);

  // B. Shadow falling in from the TOP edge of each cut-out
  inner.ctx.save();
  inner.ctx.shadowColor = BEVEL_SHADOW_COLOR;
  inner.ctx.shadowBlur = H * BEVEL_SHADOW_BLUR * dpr;
  inner.ctx.shadowOffsetY = H * BEVEL_SHADOW_DEPTH * dpr;
  inner.ctx.drawImage(frame.canvas, 0, 0, panelWidth, height);
  inner.ctx.restore();

  // C. Faint light catching the BOTTOM edge of each cut-out
  inner.ctx.save();
  inner.ctx.shadowColor = BEVEL_LIGHT_COLOR;
  inner.ctx.shadowBlur = H * BEVEL_LIGHT_BLUR * dpr;
  inner.ctx.shadowOffsetY = -H * BEVEL_LIGHT_DEPTH * dpr;
  inner.ctx.globalCompositeOperation = "lighter";
  inner.ctx.drawImage(frame.canvas, 0, 0, panelWidth, height);
  inner.ctx.restore();

  // D. Keep everything only inside the cut-out shapes
  inner.ctx.globalCompositeOperation = "destination-in";
  inner.ctx.fillStyle = "#fff";
  fillHollow(inner.ctx);

  // ----- 4. The overlay: solid "DIEM" + all the cut-out layers -----
  const overlay = makeCanvas(width, height, dpr);
  if (!overlay.ctx) return null;

  if (!portrait) {
    // The complete name is drawn so the letters keep their exact spacing,
    // but only the part past the glass edge is shown
    overlay.ctx.save();
    overlay.ctx.beginPath();
    overlay.ctx.rect(panelWidth, 0, width - panelWidth, height);
    overlay.ctx.clip();
    overlay.ctx.fillStyle = SOLID_COLOR;
    overlay.ctx.shadowColor = SOLID_SHADOW;
    overlay.ctx.shadowBlur = H * 0.1 * dpr;
    overlay.ctx.shadowOffsetY = H * 0.02 * dpr;
    stamp(overlay.ctx, word, wordX, wordY, wordW, H);
    overlay.ctx.restore();
  }

  overlay.ctx.drawImage(edge.canvas, 0, 0, panelWidth, height);
  overlay.ctx.drawImage(inner.canvas, 0, 0, panelWidth, height);

  return {
    mask: glass.canvas.toDataURL("image/png"),
    overlay: overlay.canvas.toDataURL("image/png"),
    headingTop: Math.min(headingTop, emblem ? emblemY : headingTop),
    nameCenter: wordX + wordW / 2,
    nameBottom: headingTop + H,
  };
}

export function FrostedDoor({
  doorRef,
  title,
  eyebrow,
  description,
  hint,
}: {
  doorRef: RefObject<HTMLDivElement | null>;
  title: string;
  eyebrow: string;
  description: string;
  hint: string;
}) {
  const fontRef = useRef<HTMLSpanElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);

  const [art, setArt] = useState<HeadingArt | null>(null);
  // The glass stays hidden until the first drawing attempt, so it never flashes without its cut-outs
  const [tried, setTried] = useState(false);

  const line = title.toUpperCase();

  useEffect(() => {
    const door = doorRef.current;
    const glass = glassRef.current;
    const fontSource = fontRef.current;
    if (!door || !glass || !fontSource) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let emblem: Shape | null = null;
    let word: Shape | null = null;
    let split = WORDMARK_SPLIT;
    let loaded = false;

    const build = async () => {
      if (!loaded) {
        emblem = await loadShape(EMBLEM_SOURCES);
        word = await loadShape(WORDMARK_SOURCES);
        if (!word) {
          // wordmark.png is missing: fall back to the name typed in the page font
          const family = getComputedStyle(fontSource).fontFamily;
          try {
            await document.fonts.load(`${HEADING_WEIGHT} 100px ${family}`);
            await document.fonts.ready;
          } catch {
            // Use whatever font is available
          }
          const typed = typedWordmark(line, family);
          if (typed) {
            word = typed.shape;
            split = typed.split;
          }
        }
        loaded = true;
      }
      if (cancelled || !word) return;

      const width = door.offsetWidth;
      const height = door.offsetHeight;
      // The width of the glass as it really is on the page
      const panelWidth = glass.offsetWidth;
      if (width < 200 || height < 200 || panelWidth < 100) return;

      const result = renderHeading({
        width,
        height,
        panelWidth,
        portrait: window.matchMedia("(orientation: portrait)").matches,
        word,
        split,
        emblem,
      });

      if (!cancelled) {
        setArt(result);
        setTried(true);
      }
    };

    void build();

    // Redraw when the window changes size
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void build(), 150);
    });
    observer.observe(door);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [doorRef, line]);

  // The handle sits in the empty space ABOVE the heading and shrinks on short screens
  const handleStyle = art
    ? {
        top: art.headingTop / 2,
        height: Math.max(40, Math.min(112, art.headingTop * 0.55)),
      }
    : { top: "14%", height: 112 };

  // The tagline sits below the name, centred under the whole of "CARPET DIEM"
  const eyebrowStyle = art
    ? {
        top: art.nameBottom + 22,
        left: art.nameCenter,
        transform: "translateX(-50%)",
        whiteSpace: "nowrap" as const,
        fontFamily: "var(--font-serif), serif",
        fontWeight: 500,
        fontSize: "0.85rem",
      }
    : { top: "60%" };

  return (
    <div ref={doorRef} className="fd-door">
      {/* Used only for the fallback lettering, if wordmark.png is missing */}
      <span ref={fontRef} aria-hidden className="fd-font">
        {title}
      </span>

      {/* The frosted glass, with the emblem and "CARPET" cut out of it */}
      <div
        ref={glassRef}
        aria-hidden
        className="fd-glass"
        style={{
          opacity: tried ? 1 : 0,
          ...(art
            ? {
                WebkitMaskImage: `url("${art.mask}")`,
                maskImage: `url("${art.mask}")`,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }
            : {}),
        }}
      />

      {/* A door handle on the edge of the glass, above the heading */}
      <div aria-hidden className="fd-handle" style={handleStyle} />

      {/* The solid "DIEM" past the glass, and the layers that make the cut-outs readable */}
      {art && (
        <div
          aria-hidden
          className="fd-overlay"
          style={{ backgroundImage: `url("${art.overlay}")` }}
        />
      )}

      {/* The tagline, centred below "CARPET DIEM" */}
      <p className="fd-eyebrow" style={eyebrowStyle}>
        {eyebrow}
      </p>

      {/* The description and the hint */}
      <div className="fd-text">
        <p className="fd-description">{description}</p>
        <p className="fd-hint">{hint}</p>
      </div>
    </div>
  );
}