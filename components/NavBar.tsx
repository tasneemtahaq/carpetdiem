"use client";

import { siteConfig } from "@/config/site";

type NavLink = { label: string; onClick: () => void };

type Props = {
  links: NavLink[];
  onLogoClick: () => void;
  dark?: boolean; // dark text for light backgrounds
};

export default function NavBar({ links, onLogoClick, dark = true }: Props) {
  return (
    <nav className={dark ? "nav nav-dark" : "nav"}>
      <button className="nav-logo" onClick={onLogoClick} aria-label={siteConfig.brandName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={siteConfig.logoPath} alt={siteConfig.brandName} />
      </button>
      <div className="nav-links">
        {links.map((link) => (
          <button key={link.label} onClick={link.onClick}>
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
}