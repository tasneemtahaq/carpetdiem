"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site";

type NavLink = { label: string; onClick: () => void };

type Props = {
  links: NavLink[];
  onLogoClick: () => void;
  dark?: boolean; // dark text for light backgrounds
};

// The logo file. The first one that exists is used.
const LOGO_SOURCES = Array.from(
  new Set([siteConfig.logoPath, "/image/logo.png", "/images/logo.png", "/logo.png"])
);

export default function NavBar({ links, onLogoClick, dark = true }: Props) {
  const [logoIndex, setLogoIndex] = useState(0);
  const logoSrc = LOGO_SOURCES[logoIndex];
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // close the menu when tapping outside it, or pressing Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <nav ref={navRef} className={dark ? "nav nav-dark" : "nav"}>
      <button className="nav-logo" onClick={onLogoClick} aria-label={siteConfig.brandName}>
        {logoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={siteConfig.brandName}
            onError={() => setLogoIndex((i) => i + 1)}
          />
        )}
      </button>

      {/* the three-line menu button */}
      <button
        className={open ? "nav-burger is-open" : "nav-burger"}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      {/* the options, shown when the menu is open */}
      <div className={open ? "nav-menu is-open" : "nav-menu"}>
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => {
              setOpen(false);
              link.onClick();
            }}
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
}