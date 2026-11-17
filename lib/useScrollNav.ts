"use client";

import { useEffect, useRef, type RefObject } from "react";

type Options = {
  // called when the visitor keeps scrolling UP while already at the top
  onPullTop?: () => void;
  // the pull is ignored this long after the page opens (milliseconds)
  armDelay?: number;
};

// Adds to a scrollable page:
//  - arrow keys / Page Up / Page Down to scroll it
//  - "pull past the top" (wheel, swipe or the up key) to go to the previous page
export function useScrollNav(
  ref: RefObject<HTMLElement | null>,
  { onPullTop, armDelay = 900 }: Options
) {
  const callback = useRef(onPullTop);
  useEffect(() => {
    callback.current = onPullTop;
  }, [onPullTop]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const openedAt = performance.now();
    let pull = 0;
    let fired = false;
    let lastY = 0;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const atTop = () => el.scrollTop <= 2;

    const pullUp = (amount: number) => {
      if (fired || !callback.current) return;
      if (performance.now() - openedAt < armDelay) return;
      pull += amount;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        pull = 0;
      }, 450);
      if (pull > 220) {
        fired = true;
        callback.current();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && atTop()) pullUp(-e.deltaY);
      else if (e.deltaY > 0) pull = 0;
    };
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const d = y - lastY; // positive = finger moving down = scrolling up
      lastY = y;
      if (d > 0 && atTop()) pullUp(d * 2);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = el.clientHeight * 0.4;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        el.scrollBy({ top: e.key === "ArrowDown" ? step : el.clientHeight, behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        if (atTop()) pullUp(260);
        else el.scrollBy({ top: -(e.key === "ArrowUp" ? step : el.clientHeight), behavior: "smooth" });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(resetTimer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [ref, armDelay]);
}