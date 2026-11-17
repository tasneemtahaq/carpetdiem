"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { allArtworks, mainArtwork } from "@/config/artworks";
import { layout } from "@/config/site";
import GalleryScene from "@/components/GalleryScene";
import CarpetViewer from "@/components/viewer/CarpetViewer";
import Shop from "@/components/shop/Shop";
import NavBar from "@/components/NavBar";
import {
  journey,
  SPLIT,
  MAIN_END,
  FAR_Z,
  END_Z,
  journeyFromZ,
  journeyFromTurn,
} from "@/lib/journey";

// ───── scrolling speed ─────
const GALLERY_SPEED = (0.012 * SPLIT) / (FAR_Z - END_Z); // per bit of mouse wheel, in the gallery
const TURN_SPEED = 0.0003 * (1 - SPLIT); // per bit of mouse wheel, while the carpet turns
// if the zoom handover hasn't happened this long after reaching the main carpet,
// open the revolving page anyway (milliseconds)
const HANDOVER_WAIT = 1500;const KEY_STEP = 160; // one arrow-key press, in mouse-wheel units
const TOUCH_SPEED = 4; // finger swipe speed on phones and tablets

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function Experience() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  // picture of the zoomed-in carpet that zooms away (null = not showing)
  const [curtain, setCurtain] = useState<string | null>(null);
  const artwork = allArtworks.find((a) => a.id === openId);

  const thumbRef = useRef<HTMLDivElement>(null);
  // the page being shown, readable from the scroll handlers
  const mode = useRef<{ openId: string | null; shopOpen: boolean }>({ openId: null, shopOpen: false });
  // where to return in the gallery after viewing a side carpet
  const sideReturn = useRef(0);

  useEffect(() => {
    mode.current = { openId, shopOpen };
  }, [openId, shopOpen]);

  // leave the revolving page and go back to the gallery
  const leaveTurn = useCallback((exactTarget?: number) => {
    const id = mode.current.openId;
    if (exactTarget !== undefined) journey.target = exactTarget;
    else if (id && id !== mainArtwork.id) journey.target = sideReturn.current;
    // step back a little from the main carpet, so the zoom doesn't fire again straight away
    else journey.target = Math.min(journey.target, journeyFromZ(END_Z + 2));
    mode.current = { ...mode.current, openId: null };
    setOpenId(null);
  }, []);

  // jump to a point of the journey (nav links and the scroll bar)
  const jumpTo = useCallback(
    (j: number) => {
      const target = clamp01(j);
      if (mode.current.openId && target < SPLIT) leaveTurn(target);
      else journey.target = target;
    },
    [leaveTurn]
  );

  // ONE scroll for the whole visit: mouse wheel, touch swipe, arrow keys
  useEffect(() => {
    const move = (d: number) => {
      if (mode.current.shopOpen) return; // the shop scrolls on its own
      const inTurn = !!mode.current.openId;
      const speed = journey.target < SPLIT ? GALLERY_SPEED : TURN_SPEED;
      // in the gallery the scroll stops at the main carpet until the zoom hands over
      const max = inTurn ? 1 : SPLIT + 0.1;
      journey.target = Math.min(max, clamp01(journey.target + d * speed));
      if (inTurn && journey.target < SPLIT) leaveTurn();
    };

    const onControls = (e: Event) =>
      !!(e.target as HTMLElement | null)?.closest?.(".walkbar, .nav, .caption");
    let lastY = 0;
    const onWheel = (e: WheelEvent) => move(e.deltaY);
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (onControls(e)) return;
      const y = e.touches[0].clientY;
      move((lastY - y) * TOUCH_SPEED);
      lastY = y;
    };
    const onKey = (e: KeyboardEvent) => {
      if (mode.current.shopOpen) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "w") {
        e.preventDefault();
        move(KEY_STEP);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "s") {
        e.preventDefault();
        move(-KEY_STEP);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);

    // keep the scroll bar in step with the journey, and make sure the
    // revolving carpet always follows the zoom into the main carpet
    let raf = 0;
    let atCarpetSince = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (thumbRef.current) thumbRef.current.style.top = `${journey.target * 100}%`;

      const inGallery = !mode.current.openId && !mode.current.shopOpen;
      if (inGallery && journey.target >= SPLIT) {
        if (!atCarpetSince) atCarpetSince = performance.now();
        if (performance.now() - atCarpetSince > HANDOVER_WAIT) {
          atCarpetSince = 0;
          mode.current = { ...mode.current, openId: mainArtwork.id };
          setOpenId(mainArtwork.id);
        }
      } else {
        atCarpetSince = 0;
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [leaveTurn]);

  // dragging or tapping the scroll bar
  const dragBar = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    jumpTo((e.clientY - rect.top) / rect.height);
  };

  let view;
  if (shopOpen) {
    view = (
      <Shop
        onBack={() => {
          journey.target = journeyFromZ(layout.galleryStartZ);
          setOpenId(null);
          setShopOpen(false);
        }}
        onPullUp={() => {
          // scrolled up past the top of the shop: back to the end of the carpet's turn
          journey.target = journeyFromTurn(MAIN_END - 0.03);
          setOpenId((id) => id ?? mainArtwork.id);
          setShopOpen(false);
        }}
        onView360={(id) => {
          if (id !== mainArtwork.id) sideReturn.current = journeyFromZ(layout.galleryStartZ);
          journey.target = SPLIT;
          setOpenId(id);
          setShopOpen(false);
        }}
      />
    );
  } else if (artwork) {
    view = <CarpetViewer key={artwork.id} artwork={artwork} onShop={() => setShopOpen(true)} />;
  } else {
    view = (
      <GalleryScene
        onOpenArtwork={(id, snapshot) => {
          if (id === mainArtwork.id) {
            // reached the main carpet: carry straight on into its turn
            journey.target = Math.max(journey.target, SPLIT);
          } else {
            // a side carpet: remember where we were in the corridor
            sideReturn.current = journey.target;
            journey.target = SPLIT;
          }
          setOpenId(id);
          if (snapshot !== undefined) setCurtain(snapshot);
        }}
      />
    );
  }

  return (
    <main className="stage-root">
      {view}

      {/* ONE nav bar and ONE scroll bar for the whole journey */}
      {!shopOpen && (
        <div className="ui journey-ui">
          <NavBar
            onLogoClick={() => jumpTo(0)}
            links={[
              { label: "Entrance", onClick: () => jumpTo(0) },
              { label: "Gallery", onClick: () => jumpTo(journeyFromZ(layout.galleryStartZ)) },
              { label: "Main Artwork", onClick: () => jumpTo(journeyFromZ(layout.galleryEndZ)) },
              { label: "360°", onClick: () => jumpTo(journeyFromTurn(0.02)) },
              { label: "Shop", onClick: () => setShopOpen(true) },
            ]}
          />

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
            <div className="walkbar-thumb" ref={thumbRef} />
          </div>
        </div>
      )}

      {curtain !== null && (
        <div
          className="curtain"
          style={curtain ? { backgroundImage: `url(${curtain})` } : undefined}
          onAnimationEnd={() => setCurtain(null)}
        />
      )}
    </main>
  );
}