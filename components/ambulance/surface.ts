/**
 * Parametric body surface. The shell is a loft of rounded cross-sections along X.
 * Every section has the same point layout, so regions (windows, doors, livery)
 * can be addressed by (x, y) or by point index and cut out on grid lines.
 */
import {
  ARCH_R,
  AX_F,
  AX_R,
  BASE_X,
  BELT,
  CAP_X,
  HALF_W,
  HEADER_X,
  HOOD_X,
  LEAN,
  NOSE_X,
  REAR_R,
  ROOF,
  WHEEL_Y,
  XR,
} from "./spec";

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export type Profile = { w: number; yt: number; yb: number; rt: number; rb: number };

/** Section parameters at station x (outer skin). */
export function profile(x: number): Profile {
  let yt: number;
  let rt: number;
  if (x < CAP_X) {
    yt = ROOF;
    rt = 0.17;
  } else if (x < HEADER_X) {
    // high-roof front cap: full height falling into a brow over the windshield
    const t = (x - CAP_X) / (HEADER_X - CAP_X);
    yt = 2.02 + (ROOF - 2.02) * Math.pow(1 - Math.pow(t, 2.2), 0.55);
    rt = lerp(0.17, 0.12, t);
  } else if (x < BASE_X) {
    const t = (x - HEADER_X) / (BASE_X - HEADER_X);
    yt = lerp(2.02, 1.36, t) + 0.03 * Math.sin(Math.PI * t);
    rt = lerp(0.12, 0.1, t);
  } else if (x < HOOD_X) {
    const t = (x - BASE_X) / (HOOD_X - BASE_X);
    yt = lerp(1.36, 1.12, t) + 0.025 * Math.sin(Math.PI * t);
    rt = 0.1;
  } else {
    const t = Math.min(1, (x - HOOD_X) / (NOSE_X - HOOD_X));
    yt = 1.12 - 0.1 * (1 - Math.sqrt(1 - t * t));
    rt = 0.1;
  }

  let yb = 0.42;
  if (x > 2.85) yb = lerp(0.42, 0.34, smoothstep(2.85, 3.05, x));
  if (x < -3.0) yb = lerp(0.42, 0.5, smoothstep(-3.0, -3.25, x));
  for (const ax of [AX_F, AX_R]) {
    const dx = x - ax;
    if (Math.abs(dx) < ARCH_R) yb = Math.max(yb, WHEEL_Y + Math.sqrt(ARCH_R * ARCH_R - dx * dx));
  }

  let w = HALF_W;
  if (x > 2.15) w -= 0.045 * Math.pow(Math.min(1, (x - 2.15) / 0.9), 2);
  if (x > 3.05) {
    const t = Math.min(1, (x - 3.05) / (NOSE_X - 3.05));
    w -= 0.19 * (1 - Math.sqrt(1 - t * t));
  }

  if (x < XR + REAR_R) {
    const s = clamp((XR + REAR_R - x) / REAR_R, 0, 1);
    const k = REAR_R * (1 - Math.sqrt(1 - s * s));
    w -= k;
    yt -= k;
    yb += k;
  }
  return { w, yt, yb, rt, rb: 0.05 };
}

/** Fixed side rows (absolute heights). ±Infinity snap to the corner arcs. */
export const ROWS = [
  -Infinity, 0.47, 0.56, 0.62, 0.74, 0.86, 0.98, 1.05, 1.12, 1.17, 1.28, 1.32, 1.5, 1.7, 1.93, 2.02, 2.2, 2.38,
  2.58, Infinity,
];

// Ring layout (right half): bottom 0‥2, bottom arc 3‥5, side rows, top arc ×3, top edge ×3, top centre.
export const SIDE0 = 6;
export const TARC0 = SIDE0 + ROWS.length; // first top-arc point (22.5°)
export const N_HALF = TARC0 + 7;
export const N_RING = 2 * N_HALF - 2;
const TOP_CENTRE = N_HALF - 1;

/** Zone of the quad whose lower right-half index is rLo. */
export const zoneOf = (rLo: number) =>
  rLo <= 2
    ? "bottom"
    : rLo <= 5
      ? "lowerArc"
      : rLo < TARC0 - 2
        ? "side"
        : rLo === TARC0 - 2
          ? "side"
          : rLo === TARC0 - 1
            ? "edge"
            : "top";
/** Quads at or above this index lie on the windshield/roof proper (past the 45° arc point). */
export const TOP_FLAT = TARC0 + 1;

/**
 * Side-wall half width with real-vehicle sculpting: tumblehome above the belt,
 * a soft shoulder ridge, the rocker tucking under, and flared wheel lips.
 */
export function sideHalfWidth(x: number, y: number, p: Profile) {
  let z = y <= BELT ? p.w : p.w - (y - BELT) * LEAN;
  z += 0.011 * Math.exp(-(((y - 1.06) / 0.055) ** 2)); // shoulder crease highlight
  z -= 0.034 * (1 - smoothstep(0.4, 0.78, y)); // rocker tuck-under
  for (const ax of [AX_F, AX_R]) {
    const d = Math.hypot(x - ax, y - WHEEL_Y) - ARCH_R;
    if (d > -0.1 && d < 0.2) z += 0.026 * (1 - smoothstep(0.0, 0.18, Math.max(0, d)));
  }
  return z;
}

/** Gentle crown across the roof/hood: centre slightly higher than the edges. */
const crown = (z: number, half: number, x: number) => {
  const k = x < 1.7 ? 0.035 : x < 2.56 ? 0.0 : 0.018; // roof, windshield (flat), hood
  return k * (1 - Math.min(1, (z / Math.max(half, 0.01)) ** 2));
};

/** Right-half section points as [z, y], with an optional inward inset. */
export function ringRight(x: number, inset = 0): [number, number][] {
  const p = profile(x);
  const w = p.w - inset;
  const yt = p.yt - inset;
  const yb = p.yb + inset;
  const { rt, rb } = p;
  const yTopSide = Math.max(yt - rt, yb + rb);
  const q = { ...p, w };
  const zAt = (y: number) => sideHalfWidth(x, y, q);
  const wb = zAt(yb + rb);
  const wt = zAt(yTopSide);
  const pts: [number, number][] = [];
  for (let k = 0; k < 3; k++) pts.push([((wb - rb) * k) / 3, yb]);
  for (const deg of [-90, -60, -30]) {
    const a = (deg * Math.PI) / 180;
    pts.push([wb - rb + rb * Math.cos(a), yb + rb + rb * Math.sin(a)]);
  }
  for (const row of ROWS) {
    const y = clamp(row, yb + rb, yTopSide);
    pts.push([zAt(y), y]);
  }
  const half = wt - rt;
  for (const deg of [22.5, 45, 67.5]) {
    const a = (deg * Math.PI) / 180;
    const z = wt - rt + rt * Math.cos(a);
    pts.push([z, yTopSide + rt * Math.sin(a) + crown(Math.max(z, half), half, x) * (deg / 90)]);
  }
  for (let k = 0; k < 3; k++) {
    const z = half * (1 - k / 3);
    pts.push([z, yt + crown(z, half, x)]);
  }
  pts.push([0, yt + crown(0, half, x)]);
  return pts;
}

/** Map full-ring index → right-half index and side sign. */
export const ringIndex = (i: number) => (i <= TOP_CENTRE ? { r: i, s: 1 } : { r: N_RING - i, s: -1 });

/** Analytic side-wall z (positive, right side) at (x, y). */
export function sideZ(x: number, y: number) {
  const p = profile(x);
  const ys = clamp(y, p.yb + p.rb, p.yt - p.rt);
  return sideHalfWidth(x, ys, p);
}

/** Outward unit normal of the side wall at (x, y) for side s (+1 right, −1 left). */
export function sideNormal(x: number, y: number, s: number): [number, number, number] {
  const e = 0.002;
  const dzdx = (sideZ(x + e, y) - sideZ(x - e, y)) / (2 * e);
  const dzdy = (sideZ(x, y + e) - sideZ(x, y - e)) / (2 * e);
  const n: [number, number, number] = [-dzdx, -dzdy, s];
  const l = Math.hypot(n[0], n[1], n[2]);
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Point on the side wall, offset along its normal. */
export function sidePoint(x: number, y: number, s: number, offset = 0): [number, number, number] {
  const n = sideNormal(x, y, s);
  return [x + n[0] * offset, y + n[1] * offset, s * sideZ(x, y) + n[2] * offset];
}

/**
 * Baked ambient occlusion for body paint (0‥1). Cheap analytic terms that read like
 * a real ground-contact render: darker towards the sill, inside the wheel arches,
 * and on surfaces that face the ground.
 */
export function bodyAO(x: number, y: number, ny: number) {
  let ao = 0.7 + 0.3 * smoothstep(0.3, 1.25, y);
  if (ny < -0.15) ao *= 0.62 + 0.38 * (1 + ny);
  for (const ax of [AX_F, AX_R]) {
    const d = Math.hypot(x - ax, y - WHEEL_Y);
    ao *= 0.5 + 0.5 * smoothstep(ARCH_R - 0.03, ARCH_R + 0.32, d);
  }
  return Math.max(0.28, ao);
}
