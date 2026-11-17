"use client";

import { useState } from "react";
import { allArtworks, mainArtwork } from "@/config/artworks";
import GalleryScene from "@/components/GalleryScene";
import CarpetViewer from "@/components/viewer/CarpetViewer";
import Shop from "@/components/shop/Shop";

export default function Experience() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [returnZ, setReturnZ] = useState<number | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  // true when coming back up from the shop: the revolving page starts near its end
  const [viewerAtEnd, setViewerAtEnd] = useState(false);
  // picture of the zoomed-in carpet that zooms away (null = not showing)
  const [curtain, setCurtain] = useState<string | null>(null);
  const artwork = allArtworks.find((a) => a.id === openId);

  let view;
  if (shopOpen) {
    view = (
      <Shop
        onBack={() => {
          setShopOpen(false);
          setOpenId(null);
        }}
        onPullUp={() => {
          // scrolled up past the top of the shop: back to the revolving page
          setOpenId((id) => id ?? mainArtwork.id);
          setViewerAtEnd(true);
          setShopOpen(false);
        }}
        onView360={(id) => {
          setOpenId(id);
          setViewerAtEnd(false);
          setShopOpen(false);
        }}
      />
    );
  } else if (artwork) {
    view = (
      <CarpetViewer
        key={artwork.id}
        artwork={artwork}
        startAtEnd={viewerAtEnd}
        onBack={() => setOpenId(null)}
        onShop={() => setShopOpen(true)}
      />
    );
  } else {
    view = (
      <GalleryScene
        startZ={returnZ}
        onShop={() => setShopOpen(true)}
        onOpenArtwork={(id, z, snapshot) => {
          setReturnZ(z);
          setOpenId(id);
          setViewerAtEnd(false);
          if (snapshot !== undefined) setCurtain(snapshot);
        }}
      />
    );
  }

  return (
    <main className="stage-root">
      {view}

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