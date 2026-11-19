/**
 * Livery atlas: one canvas texture holding every decal plus a small colour palette.
 * Body panels sample it through planar UV projections defined here, so drawing and
 * UV mapping share one source of truth (vehicle metres → atlas fraction).
 */
import * as THREE from "three";
import { L, XR } from "./spec";
import { smoothstep } from "./surface";

export const BRAND = {
  teal: "#0F766E",
  tealDeep: "#0B4F4A",
  gold: "#D9A441",
  paint: "#FFFFFF",
} as const;

/**
 * Optional vehicle identification. Leave null until the operator supplies real values;
 * nothing is rendered for a null field (no invented numbers or insignia).
 */
export const LIVERY_CONFIG: { unitNumber: string | null } = { unitNumber: null };

type Region = { fx0: number; fy0: number; fw: number; fh: number };

// Side regions span the full vehicle length; heights in metres follow from the aspect.
const SIDE_Y0 = 0.35;
const SIDE_FH = 0.33;
const SIDE_Y1 = SIDE_Y0 + SIDE_FH * L; // ≈ 2.76 m
const SIDE_R: Region = { fx0: 0, fy0: 0, fw: 1, fh: SIDE_FH };
const SIDE_L: Region = { fx0: 0, fy0: SIDE_FH, fw: 1, fh: SIDE_FH };

const ZSPAN: [number, number] = [-1.05, 1.05];
// Lamp internals strip between the side regions and the rear region.
const LAMP_Y0 = 0.665;
const LAMP_H = 0.05;
const LAMP_RECTS = {
  head: { fx0: 0.0, fw: 0.0915 }, // aspect ≈ lens 0.33 m × 0.18 m
  tail: { fx0: 0.1, fw: 0.0195 }, // aspect ≈ 0.13 m × 0.33 m
  fog: { fx0: 0.13, fw: 0.05 },
} as const;
export type LampArt = keyof typeof LAMP_RECTS;
const REAR: Region = { fx0: 0, fy0: 0.72, fw: 0.5, fh: 0.27 };
const REAR_Y0 = 0.7;
const REAR_Y1 = REAR_Y0 + ((ZSPAN[1] - ZSPAN[0]) * REAR.fh) / REAR.fw;
const FRONT: Region = { fx0: 0.5, fy0: 0.72, fw: 0.48, fh: 0.2 };
const FRONT_Y0 = 1.95;
const FRONT_Y1 = FRONT_Y0 + ((ZSPAN[1] - ZSPAN[0]) * FRONT.fh) / FRONT.fw;

const PALETTE_KEYS = ["white", "black", "grey", "dark"] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];
const PALETTE_HEX: Record<PaletteKey, string> = {
  white: "#ffffff",
  black: "#0b0d0e",
  grey: "#a9b1b6",
  dark: "#2a2e31",
};
const paletteRect = (k: PaletteKey) => {
  const i = PALETTE_KEYS.indexOf(k);
  return { fx: 0.52 + i * 0.06, fy: 0.935, fw: 0.05, fh: 0.05 };
};

/** Texture V is flipped (canvas top = v 1). */
const toUV = (fx: number, fy: number): [number, number] => [fx, 1 - fy];

export const UV = {
  palette(k: PaletteKey): [number, number] {
    const r = paletteRect(k);
    return toUV(r.fx + r.fw / 2, r.fy + r.fh / 2);
  },
  side(x: number, y: number, s: number): [number, number] {
    const r = s > 0 ? SIDE_R : SIDE_L;
    const u = (x - XR) / L;
    const fx = s > 0 ? u : 1 - u;
    const fy = r.fy0 + r.fh * ((SIDE_Y1 - y) / (SIDE_Y1 - SIDE_Y0));
    return toUV(fx, Math.min(r.fy0 + r.fh, Math.max(r.fy0, fy)));
  },
  rear(z: number, y: number): [number, number] {
    const fx = REAR.fx0 + REAR.fw * ((z - ZSPAN[0]) / (ZSPAN[1] - ZSPAN[0]));
    const fy = REAR.fy0 + REAR.fh * ((REAR_Y1 - y) / (REAR_Y1 - REAR_Y0));
    return toUV(fx, Math.min(REAR.fy0 + REAR.fh, Math.max(REAR.fy0, fy)));
  },
  /** (u, v) in 0‥1 within a lamp artwork (v = 0 at the bottom). */
  lamp(kind: LampArt, u: number, v: number): [number, number] {
    const r = LAMP_RECTS[kind];
    const fx = r.fx0 + r.fw * Math.min(1, Math.max(0, u));
    const fy = LAMP_Y0 + LAMP_H * (1 - Math.min(1, Math.max(0, v)));
    return toUV(fx, fy);
  },
  front(z: number, y: number): [number, number] {
    // seen from the front, screen-right is −Z
    const fx = FRONT.fx0 + FRONT.fw * ((ZSPAN[1] - z) / (ZSPAN[1] - ZSPAN[0]));
    const fy = FRONT.fy0 + FRONT.fh * ((FRONT_Y1 - y) / (FRONT_Y1 - FRONT_Y0));
    return toUV(fx, Math.min(FRONT.fy0 + FRONT.fh, Math.max(FRONT.fy0, fy)));
  },
};

// ---------------------------------------------------------------------------
// Drawing

type Mapper = { X: (m: number) => number; Y: (m: number) => number; ppm: number };

/** Livery stripe centre line along the side: level, lifting over the front wheel, sweeping up to the rear. */
const stripeCentre = (x: number) =>
  0.8 + 0.42 * smoothstep(-0.6, -3.35, x) + 0.3 * smoothstep(1.6, 2.75, x);
const stripeTaper = (x: number) => smoothstep(2.78, 1.95, x);

function band(ctx: CanvasRenderingContext2D, m: Mapper, offset: number, thick: number, colour: string) {
  const xs: number[] = [];
  for (let x = XR - 0.05; x <= 2.8; x += 0.02) xs.push(x);
  ctx.beginPath();
  xs.forEach((x, i) => {
    const y = stripeCentre(x) + offset + (thick * stripeTaper(x)) / 2;
    if (i === 0) ctx.moveTo(m.X(x), m.Y(y));
    else ctx.lineTo(m.X(x), m.Y(y));
  });
  for (let i = xs.length - 1; i >= 0; i--) {
    const x = xs[i];
    const y = stripeCentre(x) + offset - (thick * stripeTaper(x)) / 2;
    ctx.lineTo(m.X(x), m.Y(y));
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

function logo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, hPx: number) {
  const w = hPx * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, cx - w / 2, cy - hPx / 2, w, hPx);
}

function drawSide(ctx: CanvasRenderingContext2D, img: HTMLImageElement, r: Region, s: number, S: number) {
  const ppm = (r.fw * S) / L;
  const m: Mapper = {
    ppm,
    X: (x) => {
      const u = (x - XR) / L;
      return (r.fx0 + r.fw * (s > 0 ? u : 1 - u)) * S;
    },
    Y: (y) => (r.fy0 + r.fh * ((SIDE_Y1 - y) / (SIDE_Y1 - SIDE_Y0))) * S,
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.fx0 * S, r.fy0 * S, r.fw * S, r.fh * S);
  ctx.clip();
  band(ctx, m, 0, 0.15, BRAND.teal);
  band(ctx, m, 0.118, 0.032, BRAND.gold);
  // Company logo on the high-roof panel above the patient windows.
  // Kept behind the parked position of the open sliding door so it is never covered.
  logo(ctx, img, m.X(-1.78), m.Y(2.27), 0.46 * ppm);
  if (LIVERY_CONFIG.unitNumber) {
    ctx.fillStyle = BRAND.tealDeep;
    ctx.font = `600 ${0.09 * ppm}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(LIVERY_CONFIG.unitNumber, m.X(-2.9), m.Y(2.2));
  }
  ctx.restore();
}

function drawRear(ctx: CanvasRenderingContext2D, img: HTMLImageElement, S: number) {
  const r = REAR;
  const ppm = (r.fw * S) / (ZSPAN[1] - ZSPAN[0]);
  const X = (z: number) => (r.fx0 + r.fw * ((z - ZSPAN[0]) / (ZSPAN[1] - ZSPAN[0]))) * S;
  const Y = (y: number) => (r.fy0 + r.fh * ((REAR_Y1 - y) / (REAR_Y1 - REAR_Y0))) * S;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.fx0 * S, r.fy0 * S, r.fw * S, r.fh * S);
  ctx.clip();
  // continue the side stripe heights across the rear (side stripe ends ≈1.22 m)
  const c = stripeCentre(XR);
  ctx.fillStyle = BRAND.teal;
  ctx.fillRect(X(-1.1), Y(c + 0.075), X(1.1) - X(-1.1), 0.15 * ppm);
  ctx.fillStyle = BRAND.gold;
  ctx.fillRect(X(-1.1), Y(c + 0.118 + 0.016), X(1.1) - X(-1.1), 0.032 * ppm);
  // Logo split across the door seam: mark on the left door, wordmark on the right.
  const h = 0.26;
  const w = h * (img.naturalWidth / img.naturalHeight);
  const markFrac = 0.318; // gap between pictogram and "ODES" in the supplied artwork
  const left = -w * markFrac;
  ctx.drawImage(img, X(left), Y(0.93 + h / 2), w * ppm, h * ppm);
  ctx.restore();
}

function drawFront(ctx: CanvasRenderingContext2D, img: HTMLImageElement, S: number) {
  const r = FRONT;
  const ppm = (r.fw * S) / (ZSPAN[1] - ZSPAN[0]);
  const X = (z: number) => (r.fx0 + r.fw * ((ZSPAN[1] - z) / (ZSPAN[1] - ZSPAN[0]))) * S;
  const Y = (y: number) => (r.fy0 + r.fh * ((FRONT_Y1 - y) / (FRONT_Y1 - FRONT_Y0))) * S;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.fx0 * S, r.fy0 * S, r.fw * S, r.fh * S);
  ctx.clip();
  logo(ctx, img, X(0), Y(2.4), 0.3 * ppm);
  ctx.restore();
}

function drawLamps(ctx: CanvasRenderingContext2D, S: number) {
  const H = LAMP_H * S;
  const y0 = LAMP_Y0 * S;
  // --- Headlamp: smoked-chrome housing, twin projectors, C-shaped LED DRL
  {
    const r = LAMP_RECTS.head;
    const x0 = r.fx0 * S;
    const W = r.fw * S;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + H);
    g.addColorStop(0, "#5d676e");
    g.addColorStop(0.5, "#2b3237");
    g.addColorStop(1, "#14181b");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, W, H);
    for (const [u, rad] of [
      [0.33, 0.27],
      [0.63, 0.25],
    ]) {
      const cx = x0 + u * W;
      const cy = y0 + 0.55 * H;
      const rr = rad * H;
      const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      pg.addColorStop(0, "#ffffff");
      pg.addColorStop(0.28, "#e9eef1");
      pg.addColorStop(0.55, "#7d8890");
      pg.addColorStop(0.8, "#a9b3b9");
      pg.addColorStop(1, "#22282c");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineWidth = 0.075 * H;
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 0.06 * H;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.12 * W, y0 + 0.14 * H);
    ctx.lineTo(x0 + 0.86 * W, y0 + 0.12 * H);
    ctx.quadraticCurveTo(x0 + 0.95 * W, y0 + 0.13 * H, x0 + 0.94 * W, y0 + 0.32 * H);
    ctx.lineTo(x0 + 0.93 * W, y0 + 0.8 * H);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "#0b0d0e";
    ctx.lineWidth = 0.05 * H;
    ctx.strokeRect(x0, y0, W, H);
  }
  // --- Tail lamp: deep red lens with horizontal LED bars
  {
    const r = LAMP_RECTS.tail;
    const x0 = r.fx0 * S;
    const W = r.fw * S;
    const g = ctx.createLinearGradient(x0, 0, x0 + W, 0);
    g.addColorStop(0, "#3a0306");
    g.addColorStop(0.5, "#6e0a0f");
    g.addColorStop(1, "#3a0306");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, W, H);
    ctx.fillStyle = "#ff4a3d";
    for (let k = 0; k < 6; k++) ctx.fillRect(x0 + 0.15 * W, y0 + (0.08 + k * 0.15) * H, 0.7 * W, 0.06 * H);
  }
  // --- Fog / projector lens
  {
    const r = LAMP_RECTS.fog;
    const x0 = r.fx0 * S;
    const W = r.fw * S;
    ctx.fillStyle = "#1a1e21";
    ctx.fillRect(x0, y0, W, H);
    const cx = x0 + W / 2;
    const cy = y0 + H / 2;
    const rr = Math.min(W, H) / 2;
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    pg.addColorStop(0, "#ffffff");
    pg.addColorStop(0.35, "#dfe5e8");
    pg.addColorStop(0.75, "#6f7a81");
    pg.addColorStop(1, "#1a1e21");
    ctx.fillStyle = pg;
    ctx.fillRect(x0, y0, W, H);
  }
}

/** Build the livery atlas. `size` respects the per-device texture budget. */
export function createLiveryAtlas(img: HTMLImageElement, size: number, anisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = BRAND.paint;
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  drawSide(ctx, img, SIDE_R, 1, size);
  drawSide(ctx, img, SIDE_L, -1, size);
  drawRear(ctx, img, size);
  drawFront(ctx, img, size);
  drawLamps(ctx, size);
  for (const k of PALETTE_KEYS) {
    const r = paletteRect(k);
    ctx.fillStyle = PALETTE_HEX[k];
    // generous padding around each swatch keeps mip levels clean
    ctx.fillRect((r.fx - 0.004) * size, (r.fy - 0.004) * size, (r.fw + 0.008) * size, (r.fh + 0.008) * size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}


/** Baked soft ground shadow (top view): body footprint + darker tyre contacts. */
export function createShadowTexture(footprint: { length: number; width: number; wheels: [number, number][] }) {
  const W = 512;
  const H = 256;
  const pad = 1.0; // metres of falloff around the footprint
  const sx = W / (footprint.length + pad * 2);
  const sz = H / (footprint.width + pad * 2);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.filter = `blur(${Math.round(0.28 * sx)}px)`;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(pad * sx, pad * sz, footprint.length * sx, footprint.width * sz);
  ctx.filter = `blur(${Math.round(0.08 * sx)}px)`;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  for (const [x, z] of footprint.wheels) {
    const cx = (x + footprint.length / 2 + pad) * sx;
    const cz = (z + footprint.width / 2 + pad) * sz;
    ctx.beginPath();
    ctx.ellipse(cx, cz, 0.3 * sx, 0.14 * sz, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { texture: t, size: [footprint.length + pad * 2, footprint.width + pad * 2] as [number, number] };
}


/**
 * Studio turntable floor (top view, 1 texel ≈ 1.8 cm): teal glow, fine grid,
 * a gold dial ring with tick marks — all fading to transparent at the rim so the
 * disc melts into the CSS backdrop.
 */
export function createFloorTexture(size: number, radius: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const k = size / (radius * 2); // px per metre
  const cx = size / 2;
  ctx.translate(cx, cx);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, cx);
  glow.addColorStop(0, "rgba(20,140,130,0.30)");
  glow.addColorStop(0.45, "rgba(15,118,110,0.14)");
  glow.addColorStop(1, "rgba(15,118,110,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-cx, -cx, size, size);

  // fine grid (0.5 m), faded radially through a mask pass below
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = Math.max(1, size / 1024);
  for (let m = -radius; m <= radius; m += 0.5) {
    ctx.beginPath();
    ctx.moveTo(m * k, -cx);
    ctx.lineTo(m * k, cx);
    ctx.moveTo(-cx, m * k);
    ctx.lineTo(cx, m * k);
    ctx.stroke();
  }

  // turntable dial
  const R = 4.6 * k;
  ctx.lineWidth = Math.max(1.5, size / 600);
  ctx.strokeStyle = "rgba(217,164,65,0.55)";
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.arc(0, 0, R + 0.22 * k, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const major = i % 6 === 0;
    const r0 = R + 0.05 * k;
    const r1 = R + (major ? 0.2 : 0.11) * k;
    ctx.strokeStyle = major ? "rgba(217,164,65,0.6)" : "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.stroke();
  }

  // radial fade-out
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, cx);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(0.62, "rgba(0,0,0,0.85)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(-cx, -cx, size, size);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Tyre texture (u around the circumference, v across the profile): matte sidewalls
 * with a moulded ring, and a block tread with grooves and sipes. Used as map + bump.
 */
export function createTyreTexture() {
  const W = 1024;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2a2c2e"; // sidewall
  ctx.fillRect(0, 0, W, H);
  // moulded rings on both sidewalls
  ctx.fillStyle = "#34373a";
  for (const v of [0.08, 0.92]) ctx.fillRect(0, v * H - 2, W, 4);
  ctx.fillStyle = "#222426";
  for (const v of [0.14, 0.86]) ctx.fillRect(0, v * H - 1, W, 2);
  // tread band (profile points 7‥20 of 28)
  const t0 = 0.24 * H;
  const t1 = 0.76 * H;
  ctx.fillStyle = "#3a3d40";
  ctx.fillRect(0, t0, W, t1 - t0);
  const blocks = 64;
  for (let k = 0; k < blocks; k++) {
    const x = (k / blocks) * W;
    const bw = W / blocks;
    ctx.fillStyle = "#151617";
    // staggered lateral grooves
    const off = (k % 2) * 0.5 * bw;
    ctx.fillRect(x + off, t0, 2, (t1 - t0) * 0.32);
    ctx.fillRect(x + bw / 2 - off, t0 + (t1 - t0) * 0.68, 2, (t1 - t0) * 0.32);
    // fine sipes
    ctx.fillStyle = "#26282a";
    ctx.fillRect(x + bw * 0.25, t0 + (t1 - t0) * 0.36, 1, (t1 - t0) * 0.28);
    ctx.fillRect(x + bw * 0.75, t0 + (t1 - t0) * 0.36, 1, (t1 - t0) * 0.28);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
