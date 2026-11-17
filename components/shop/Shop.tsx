"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollNav } from "@/lib/useScrollNav";
import { siteConfig } from "@/config/site";
import { allArtworks, type Artwork } from "@/config/artworks";
import "./shop.css";

const ENDINGS = [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".PNG"];
const CART_KEY = "carpet-diem-cart";

type Cart = Record<string, number>; // artwork id -> quantity

function formatPrice(price?: number) {
  if (!price) return "Price on request";
  return `${siteConfig.shop.currency} ${price.toLocaleString()}`;
}

// Shows the carpet photo. Tries .jpg, .png etc. if the path has no ending,
// and falls back to the logo if there is no photo.
function ProductImage({ artwork }: { artwork: Artwork }) {
  const hasEnding = /\.[a-zA-Z0-9]+$/.test(artwork.image);
  const candidates = !artwork.image
    ? []
    : hasEnding
      ? [artwork.image]
      : ENDINGS.map((e) => artwork.image + e);
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div className="shop-noimg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={siteConfig.logoPath} alt="" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="shop-img"
      src={candidates[index]}
      alt={artwork.title}
      onError={() => setIndex((n) => n + 1)}
    />
  );
}

type Props = {
  onBack: () => void; // back to the gallery
  onPullUp: () => void; // scrolled up past the top: back to the revolving page
  onView360: (id: string) => void; // open the rotating view for one carpet
};

export default function Shop({ onBack, onPullUp, onView360 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollNav(rootRef, { onPullTop: onPullUp });
  // the cart starts from whatever was saved on the last visit
  const [cart, setCart] = useState<Cart>(() => {
    try {
      const saved = window.localStorage.getItem(CART_KEY);
      return saved ? (JSON.parse(saved) as Cart) : {};
    } catch {
      return {};
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  // save the cart every time it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage not available */
    }
  }, [cart]);

  const change = (id: string, delta: number) =>
    setCart((c) => {
      const qty = (c[id] ?? 0) + delta;
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const items = allArtworks.filter((a) => cart[a.id]);
  const count = items.reduce((n, a) => n + cart[a.id], 0);
  const total = items.reduce((sum, a) => sum + (a.price ?? 0) * cart[a.id], 0);
  const hasUnpriced = items.some((a) => !a.price);

  // the order message sent on WhatsApp
  const orderText = [
    `Hello ${siteConfig.brandName}, I would like to order:`,
    ...items.map((a) => `• ${a.title} × ${cart[a.id]} — ${formatPrice(a.price)}`),
    total > 0 ? `Total: ${siteConfig.shop.currency} ${total.toLocaleString()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const whatsapp = siteConfig.shop.whatsapp;
  const orderLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(orderText)}`
    : "";

  return (
    <div ref={rootRef} className="shop fade-in" style={{ position: "fixed", inset: 0, overflowY: "auto" }}>
      <header className="shop-header">
        <button className="shop-link" onClick={onBack}>
          ← Gallery
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="shop-logo" src={siteConfig.logoPath} alt={siteConfig.brandName} />
        <button className="shop-link" onClick={() => setCartOpen(true)}>
          Cart ({count})
        </button>
      </header>

      <section className="shop-intro">
        <p className="shop-eyebrow">The Collection</p>
        <h1>Bring the gallery home</h1>
      </section>

      <section className="shop-grid">
        {allArtworks.map((a) => (
          <article className="shop-card" key={a.id}>
            <button className="shop-frame" onClick={() => onView360(a.id)} aria-label={`View ${a.title} in 360°`}>
              <ProductImage artwork={a} />
            </button>
            <p className="shop-eyebrow">{a.collection}</p>
            <h2>{a.title}</h2>
            <p className="shop-meta">{a.dimensions}</p>
            <p className="shop-price">{formatPrice(a.price)}</p>
            <div className="shop-actions">
              <button
                className="shop-btn"
                onClick={() => {
                  change(a.id, 1);
                  setCartOpen(true);
                }}
              >
                Add to cart
              </button>
              <button className="shop-link" onClick={() => onView360(a.id)}>
                View in 360°
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* cart panel */}
      {cartOpen && <div className="shop-shade" onClick={() => setCartOpen(false)} />}
      <aside className={cartOpen ? "shop-cart shop-cart-open" : "shop-cart"}>
        <div className="shop-cart-head">
          <h2>Your cart</h2>
          <button className="shop-link" onClick={() => setCartOpen(false)}>
            Close
          </button>
        </div>

        {items.length === 0 ? (
          <p className="shop-meta">Your cart is empty.</p>
        ) : (
          <>
            <ul className="shop-lines">
              {items.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{a.title}</strong>
                    <span className="shop-meta">{formatPrice(a.price)}</span>
                  </div>
                  <div className="shop-qty">
                    <button onClick={() => change(a.id, -1)} aria-label="Remove one">−</button>
                    <span>{cart[a.id]}</span>
                    <button onClick={() => change(a.id, 1)} aria-label="Add one">+</button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="shop-total">
              <span>Total</span>
              <strong>
                {total > 0 ? `${siteConfig.shop.currency} ${total.toLocaleString()}` : "On request"}
              </strong>
            </div>
            {hasUnpriced && total > 0 && (
              <p className="shop-meta">Items priced on request are not included in the total.</p>
            )}

            {orderLink ? (
              <a className="shop-btn shop-order" href={orderLink} target="_blank" rel="noreferrer">
                Order on WhatsApp
              </a>
            ) : (
              <p className="shop-meta">
                Ordering is not set up yet. Add your WhatsApp number in config/site.ts.
              </p>
            )}
          </>
        )}
      </aside>
    </div>
  );
}