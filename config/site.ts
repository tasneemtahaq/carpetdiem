// ─────────────────────────────────────────────────────────────
//  SITE CONFIGURATION — logo, labels, colours, sizes, lighting
// ─────────────────────────────────────────────────────────────

export const siteConfig = {
  brandName: "CARPET DIEM",

  // ★ LOGO: put your file in /public and change this one path.
  logoPath: "/images/logo.png",

  // Logo on the upper-left concrete wall: width in metres, and its centre.
  logo: { width: 5, x: -9.5, y: 12.3 },

  enterLabel: "ENTER THE GALLERY",
  
    // SHOP — whatsapp: country code + number, digits only, e.g. "923001234567"
  shop: { currency: "PKR", whatsapp: "" },
};

export const palette = {
  ivory: "#EAE4D9",
  limestone: "#D9D0C2",
  chocolate: "#452A1D",
  terracotta: "#986C50",
  bronze: "#927454",
  light: "#F8E7C4",
};

// All distances are in metres. The visitor walks along the -Z axis.
// The glass door is at x = 0, z = 0. The gallery corridor is behind it.
export const layout = {
  eyeHeight: 1.65,
  entranceCamZ: 22, // where the camera starts (desktop). Smaller = building closer
  entranceCamZPortrait: 44, // further back on phones
  buildingCentreX: -3.5, // the camera starts in front of the middle of the facade
  buildingLookY: 8, // height the camera looks at from far away
  maxSpeed: 9, // fastest the camera may travel, metres per second
  corridorHalfWidth: 4,
  corridorHeight: 6.5,
  corridorStartZ: -0.8,
  corridorEndZ: -46,
  portalZs: [-4, -11, -18, -25, -32, -39], // the lit rectangular frames
  galleryStartZ: -1.5, // just inside the door
  galleryEndZ: -38, // standing in front of the main carpet
  nearEndZ: -27,
  mainArtworkY: 3.1,
  zoomEndZ: -44.3, // camera position when the main carpet fills the screen
};

// If the scene looks too bright or too dark, change these numbers.
export const lighting = {
  ambient: 1.9,
  exteriorKey: 2600, // soft daylight on the facade
  goldGlow: 1.0, // how strongly the golden glass glows
  portal: 22,
  mainSpot: 160,
  sun: 4, // daylight through the skylights
};