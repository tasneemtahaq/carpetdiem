// ─────────────────────────────────────────────────────────────
//  ARTWORK DATA — edit everything about the carpets here.
//
//  image:   path inside /public. The file ending (.jpg, .png...) is
//           optional: "/images/img1" finds img1.jpg, img1.png, etc.
//  size:    [width, height] of the carpet in metres
//  position:[x, y, z]  (left wall x is negative, right wall positive)
//  rotation:[x, y, z] in DEGREES. Left wall flat = 90, right wall flat = -90.
//  frameMaterial: "wood" | "bronze" | "metal"
//  modelPath: optional 3D model (.glb) used instead of the image
// ─────────────────────────────────────────────────────────────

export type FrameMaterial = "wood" | "bronze" | "metal";

export type Artwork = {
  id: string;
  image: string;
  title: string;
  collection: string;
  description: string;
  dimensions: string;
  material: string;
  craftsmanship: string;
  frameColor: string;
  frameMaterial: FrameMaterial;
  frameThickness: number;
  size: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  placeholderColors: [string, string, string]; // used only if the image is missing
  modelPath?: string;
  price?: number;
};

const PLACEHOLDER_TEXT =
  "Placeholder description. Replace this with the story of the piece.";

export const sideArtworks: Artwork[] = [
  // ───────── LEFT WALL (front to back) ─────────
  {
    id: "left-1", image: "/images/img1", title: "Artwork 01", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#4a3222", frameMaterial: "wood", frameThickness: 0.07,
    size: [1.9, 2.7], position: [-3.9, 2.5, -7.5], rotation: [0, 90, 0], scale: 1,
    placeholderColors: ["#7a2e22", "#2c1b14", "#c9a56a"],
  },
  {
    id: "left-2", image: "/images/img2", title: "Artwork 02", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#6b5236", frameMaterial: "bronze", frameThickness: 0.06,
    size: [1.9, 2.7], position: [-3.9, 2.5, -14.5], rotation: [0, 90, 0], scale: 1,
    placeholderColors: ["#d8c9ab", "#5b4634", "#986c50"],
  },
  {
    id: "left-3", image: "/images/img3", title: "Artwork 03", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#3a2a20", frameMaterial: "wood", frameThickness: 0.07,
    size: [1.9, 2.7], position: [-3.9, 2.5, -21.5], rotation: [0, 90, 0], scale: 1,
    placeholderColors: ["#27384a", "#c2ae8c", "#8c5a3c"],
  },
  {
    id: "left-4", image: "/images/img4", title: "Artwork 04", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#7d7468", frameMaterial: "metal", frameThickness: 0.05,
    size: [1.9, 2.7], position: [-3.9, 2.5, -28.5], rotation: [0, 90, 0], scale: 1,
    placeholderColors: ["#8a6a45", "#3b2a1e", "#e0d2b4"],
  },

  // ───────── RIGHT WALL (front to back) ─────────
  {
    id: "right-1", image: "/images/img5", title: "Artwork 05", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#6b5236", frameMaterial: "bronze", frameThickness: 0.06,
    size: [1.9, 2.7], position: [3.9, 2.5, -7.5], rotation: [0, -90, 0], scale: 1,
    placeholderColors: ["#3f4a36", "#d6c6a4", "#986c50"],
  },
  {
    id: "right-2", image: "/images/img6", title: "Artwork 06", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#4a3222", frameMaterial: "wood", frameThickness: 0.07,
    size: [1.9, 2.7], position: [3.9, 2.5, -14.5], rotation: [0, -90, 0], scale: 1,
    placeholderColors: ["#9a5a3a", "#2a1a12", "#e2cfa6"],
  },
  {
    id: "right-3", image: "/images/img7", title: "Artwork 07", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#7d7468", frameMaterial: "metal", frameThickness: 0.05,
    size: [1.9, 2.7], position: [3.9, 2.5, -21.5], rotation: [0, -90, 0], scale: 1,
    placeholderColors: ["#cdb892", "#6e3b2a", "#34261c"],
  },
  {
    id: "right-4", image: "/images/img8", title: "Artwork 08", collection: "Collection Name",
    description: PLACEHOLDER_TEXT, dimensions: "190 × 270 cm",
    material: "Material", craftsmanship: "Craftsmanship details",
    frameColor: "#3a2a20", frameMaterial: "wood", frameThickness: 0.07,
    size: [1.9, 2.7], position: [3.9, 2.5, -28.5], rotation: [0, -90, 0], scale: 1,
    placeholderColors: ["#5a2a2a", "#c9b48c", "#1f1611"],
  },
];

// ───────── THE MAIN ARTWORK at the end of the corridor ─────────
export const mainArtwork: Artwork = {
  id: "main", image: "", title: "The Main Artwork", collection: "Signature Collection",
  description: PLACEHOLDER_TEXT, dimensions: "340 × 460 cm",
  material: "Material", craftsmanship: "Craftsmanship details",
  frameColor: "#927454", frameMaterial: "bronze", frameThickness: 0.1,
  size: [3.4, 4.6], position: [0, 3.1, -45.78], rotation: [0, 0, 0], scale: 1,
  placeholderColors: ["#6e2a1f", "#22150f", "#d1ad6e"],

  // ★ the 3D model of the centre carpet (file: public/model/image.glb)
  modelPath: "/model/image.glb",
};

export const allArtworks: Artwork[] = [...sideArtworks, mainArtwork];