/**
 * Procedural build of the Odes ambulance (Transit EL High Roof proportions).
 * Output is grouped by material so the whole vehicle renders in ~22 draw calls.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshBuilder, place, rgb, type RGB, type V3 } from "./meshBuilder";
import { UV, createLiveryAtlas, createShadowTexture } from "./livery";
import {
  ARCH_R,
  AX_F,
  AX_R,
  BELT,
  BPIL_X0,
  CABWIN_X0,
  CAP_X,
  COWL_X1,
  DOOR,
  DOOR_WINDOW,
  HEADER_X,
  HOOD_X,
  L,
  NOSE_X,
  PATIENT_WINDOWS,
  REAR_DOOR,
  REAR_R,
  ROOF,
  SPEC,
  WHEEL_Y,
  WIN_Y0,
  WIN_Y1,
  WS_X0,
  WS_X1,
  XF,
  XR,
} from "./spec";
import {
  N_RING,
  ROWS,
  TOP_FLAT,
  bodyAO,
  profile,
  smoothstep,
  ringIndex,
  ringRight,
  sideNormal,
  sidePoint,
  sideZ,
  zoneOf,
} from "./surface";

export type BodyBucket =
  | "paint"
  | "trim"
  | "glass"
  | "glassClear"
  | "chrome"
  | "interior"
  | "headlamp"
  | "tail"
  | "indicator"
  | "beaconA"
  | "beaconB";
export type HaloGroup = "head" | "tail" | "indicator" | "beaconA" | "beaconB";

export type DoorAssets = { paint: THREE.BufferGeometry; glass: THREE.BufferGeometry; hinge: V3 };

export const HALO_GROUPS: HaloGroup[] = ["head", "tail", "indicator", "beaconA", "beaconB"];

/** All lamp glows packed into one point buffer (one draw call). */
export type HaloBuffer = {
  position: Float32Array;
  color: Float32Array;
  size: Float32Array;
  group: Float32Array;
  dir: Float32Array;
};

export type AmbulanceAssets = {
  atlas: THREE.Texture;
  /** Headlight cones + low-beam floor pool + interior dome-light diffusers. */
  lightFX: THREE.BufferGeometry;
  /** Interior point-light position (patient compartment). */
  cabinLight: V3;
  shadow: { texture: THREE.Texture; size: [number, number] };
  body: Record<BodyBucket, THREE.BufferGeometry>;
  sideDoor: DoorAssets;
  rearDoorR: DoorAssets;
  rearDoorL: DoorAssets;
  tyre: THREE.BufferGeometry;
  rim: THREE.BufferGeometry;
  wheels: { x: number; y: number; z: number; front: boolean; left: boolean }[];
  halos: HaloBuffer;
  stats: { vertices: number; buildMs: number };
};

const inR = (v: number, a: number, b: number) => v >= a && v <= b;
/** Rounded box for visible hero parts; plain box (24 vertices) when the part is small. */
const box = (w: number, h: number, d: number, r = 0.01, seg = 1) =>
  Math.min(w, h, d) < 0.05 || r <= 0.006
    ? new THREE.BoxGeometry(w, h, d)
    : new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
const cube = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const aoColor = (p: V3, n: V3): RGB => {
  const a = bodyAO(p[0], p[1], n[1]);
  return [a, a, a];
};

function roundedRect(x0: number, y0: number, x1: number, y1: number, r: number) {
  const sh = new THREE.Shape();
  sh.moveTo(x0 + r, y0);
  sh.lineTo(x1 - r, y0);
  sh.quadraticCurveTo(x1, y0, x1, y0 + r);
  sh.lineTo(x1, y1 - r);
  sh.quadraticCurveTo(x1, y1, x1 - r, y1);
  sh.lineTo(x0 + r, y1);
  sh.quadraticCurveTo(x0, y1, x0, y1 - r);
  sh.lineTo(x0, y0 + r);
  sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  return sh;
}

/** Flat (x, y) shape projected onto the side wall of side s, offset along the normal. */
function onSide(shape: THREE.Shape, s: number, offset: number) {
  const g = new THREE.ShapeGeometry(shape, 5);
  const p = g.getAttribute("position");
  const n = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const q = sidePoint(x, y, s, offset);
    const nn = sideNormal(x, y, s);
    p.setXYZ(i, q[0], q[1], q[2]);
    n.set(nn, i * 3);
  }
  g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  if (s < 0) flipIndex(g);
  return g;
}

/** Rounded, gasketed flush window: black rubber surround + glass pane. */
function sideWindow(
  gasket: MeshBuilder,
  glass: MeshBuilder,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  s: number,
  gasketUV?: [number, number],
) {
  const m = 0.016;
  gasket.add(onSide(roundedRect(x0 - m, y0 - m, x1 + m, y1 + m, 0.085), s, 0.0025), gasketUV ? { uv: gasketUV } : {});
  glass.add(onSide(roundedRect(x0, y0, x1, y1, 0.07), s, 0.0055));
}

// ---------------------------------------------------------------------------
// Shell stations

function shellStations(): number[] {
  const breaks = [
    -2.55, -1.2, -1.05, 0.05, DOOR.x0, DOOR_WINDOW.x0, DOOR_WINDOW.x1, BPIL_X0, DOOR.x1, CABWIN_X0, CAP_X, HEADER_X,
    WS_X0, WS_X1, COWL_X1, 2.95, 3.0, 3.05, -1.15,
  ];
  const xs: number[] = [];
  for (const deg of [0, 30, 60, 90]) xs.push(XR + REAR_R * (1 - Math.cos((deg * Math.PI) / 180)));
  xs.push(...breaks);
  for (const ax of [AX_R, AX_F]) for (let k = 0; k <= 12; k++) xs.push(ax - ARCH_R * Math.cos((k * Math.PI) / 12));
  const extra: number[] = [];
  for (let k = 1; k < 8; k++) extra.push(CAP_X + ((HEADER_X - CAP_X) * k) / 8);
  for (let k = 1; k < 10; k++) extra.push(WS_X0 + ((WS_X1 - WS_X0) * k) / 10);
  for (let x = COWL_X1 + 0.08; x < HOOD_X; x += 0.09) extra.push(x);
  extra.push(3.1, 3.15, 3.19, 3.22, 3.25, 3.27, 3.285, 3.295, NOSE_X);
  for (let x = XR + 0.14; x < NOSE_X; x += 0.16) extra.push(x);
  for (const x of extra) if (xs.every((b) => Math.abs(b - x) > 0.018)) xs.push(x);
  return [...new Set(xs.map((x) => Math.round(x * 1e4) / 1e4))].filter((x) => x >= XR && x <= NOSE_X).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Region classification for a shell quad

type Region = {
  bucket: "paint" | "trim" | "headlamp" | null;
  uv: "side" | "front" | "white" | "lamp" | "none";
  glass?: boolean;
};

function classifyOuter(x: number, y: number, z: number, rLo: number): Region {
  const s = z >= 0 ? 1 : -1;
  const zone = zoneOf(rLo);
  if (zone === "bottom") return { bucket: "trim", uv: "none" };
  if (zone === "top") {
    if (inR(x, WS_X0, WS_X1) && rLo >= TOP_FLAT) return { bucket: null, uv: "none", glass: true };
    if (inR(x, WS_X1, COWL_X1) && rLo >= TOP_FLAT) return { bucket: "trim", uv: "none" };
    if (inR(x, CAP_X - 0.2, HEADER_X + 0.03)) return { bucket: "paint", uv: "front" };
    return { bucket: "paint", uv: "white" };
  }
  // side / lower arc / roof edge
  if (x > 3.0 && inR(y, 0.86, 1.05) && zone !== "edge") return { bucket: "headlamp", uv: "lamp" };
  if (s > 0 && inR(x, DOOR.x0, DOOR.x1) && inR(y, DOOR.y0, DOOR.y1)) return { bucket: null, uv: "none" };
  if (zone === "side" && inR(y, WIN_Y0, WIN_Y1) && inR(x, CABWIN_X0, 2.7))
    return { bucket: null, uv: "none", glass: true };
  if (zone !== "lowerArc" && inR(y, BELT, 2.02) && inR(x, BPIL_X0, CABWIN_X0) && !(s > 0 && x <= DOOR.x1))
    return { bucket: "trim", uv: "none" };
  // patient windows are rounded overlays (see sideWindow), so the skin stays painted
  return { bucket: "paint", uv: "side" };
}

// ---------------------------------------------------------------------------

export function buildAmbulance(
  logo: HTMLImageElement,
  opts: { atlasSize: number; anisotropy: number },
): AmbulanceAssets {
  const t0 = performance.now();

  const B: Record<BodyBucket, MeshBuilder> = {
    paint: new MeshBuilder(true), // vertex colours carry baked occlusion
    trim: new MeshBuilder(),
    glass: new MeshBuilder(),
    glassClear: new MeshBuilder(),
    chrome: new MeshBuilder(),
    interior: new MeshBuilder(true),
    headlamp: new MeshBuilder(),
    tail: new MeshBuilder(),
    indicator: new MeshBuilder(),
    beaconA: new MeshBuilder(),
    beaconB: new MeshBuilder(),
  };
  const halos: Record<HaloGroup, number[]> = { head: [], tail: [], indicator: [], beaconA: [], beaconB: [] };
  const white = UV.palette("white");

  // ---- Outer shell --------------------------------------------------------
  const xs = shellStations();
  const NX = xs.length;
  const P = new Float32Array(NX * N_RING * 3);
  for (let a = 0; a < NX; a++) {
    const rr = ringRight(xs[a]);
    for (let i = 0; i < N_RING; i++) {
      const { r, s } = ringIndex(i);
      const o = (a * N_RING + i) * 3;
      P[o] = xs[a];
      P[o + 1] = rr[r][1];
      P[o + 2] = s * rr[r][0];
    }
  }
  const N = gridNormals(P, NX, N_RING, false);

  const maps = new Map<MeshBuilder, Map<number, number>>();
  const vtx = (b: MeshBuilder, gi: number, mode: number, uv: [number, number], off = 0) => {
    let m = maps.get(b);
    if (!m) maps.set(b, (m = new Map()));
    const key = gi * 8 + mode;
    const hit = m.get(key);
    if (hit !== undefined) return hit;
    const o = gi * 3;
    const n: V3 = [N[o], N[o + 1], N[o + 2]];
    const ao = b.withColor ? bodyAO(P[o], P[o + 1], n[1]) : 1;
    const id = b.vert([P[o] + n[0] * off, P[o + 1] + n[1] * off, P[o + 2] + n[2] * off], n, uv[0], uv[1], [ao, ao, ao]);
    m.set(key, id);
    return id;
  };
  const uvFor = (mode: Region["uv"], gi: number, s: number): [number, number] => {
    const o = gi * 3;
    if (mode === "side") return UV.side(P[o], P[o + 1], s);
    if (mode === "front") return UV.front(P[o + 2], P[o + 1]);
    if (mode === "white") return white;
    if (mode === "lamp") return UV.lamp("head", 0.5, 0.94); // smoked-chrome upper edge
    return [0, 0];
  };
  const MODE = { side: 1, front: 2, white: 3, none: 0, lamp: 0 } as const;

  for (let a = 0; a < NX - 1; a++) {
    for (let i = 0; i < N_RING; i++) {
      const j = (i + 1) % N_RING;
      const g = [a * N_RING + i, (a + 1) * N_RING + i, (a + 1) * N_RING + j, a * N_RING + j];
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const gi of g) {
        cx += P[gi * 3] / 4;
        cy += P[gi * 3 + 1] / 4;
        cz += P[gi * 3 + 2] / 4;
      }
      const rLo = Math.min(ringIndex(i).r, ringIndex(j).r);
      const reg = classifyOuter(cx, cy, cz, rLo);
      const s = cz >= 0 ? 1 : -1;
      if (reg.bucket) {
        const b = B[reg.bucket];
        const ids = g.map((gi) => vtx(b, gi, MODE[reg.uv] + (s < 0 ? 4 : 0), uvFor(reg.uv, gi, s)));
        b.quad(ids[0], ids[1], ids[2], ids[3]);
      }
      if (reg.glass) {
        const ids = g.map((gi) => vtx(B.glassClear, gi, 0, [0, 0], 0.004));
        B.glassClear.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
  }

  // Rear face (flat panel around the rear door opening) and front fascia face.
  // Front face in body colour; the grille insert, lamps and bumper sit on top of it.
  B.paint.add(endCap(xs[NX - 1], 1, null), { uv: white, colorFn: aoColor });

  // Rounded, gasketed patient-compartment windows (privacy glass).
  for (const s of [1, -1])
    for (const [a, b] of s > 0 ? PATIENT_WINDOWS.right : PATIENT_WINDOWS.left)
      sideWindow(B.trim, B.glass, a, b, WIN_Y0, WIN_Y1, s);

  // ---- Inner shell (cabin + patient compartment lining) --------------------
  buildInterior(B);

  // ---- Seams, seals, trim --------------------------------------------------
  buildSeams(B.trim);
  buildFrontEnd(B, halos);
  buildRearEnd(B, halos);
  buildRoof(B, halos);
  buildSideDetails(B, halos);
  buildUnderbody(B.trim);

  // ---- Doors ---------------------------------------------------------------
  const sideDoor = buildSlidingDoor(xs);
  const rearDoorR = buildRearDoor(1);
  const rearDoorL = buildRearDoor(-1);

  // ---- Wheels --------------------------------------------------------------
  const tyre = buildTyre();
  const rim = buildRim();
  const wheels = [
    { x: AX_F, y: WHEEL_Y, z: SPEC.trackFront / 2, front: true, left: false },
    { x: AX_F, y: WHEEL_Y, z: -SPEC.trackFront / 2, front: true, left: true },
    { x: AX_R, y: WHEEL_Y, z: SPEC.trackRear / 2, front: false, left: false },
    { x: AX_R, y: WHEEL_Y, z: -SPEC.trackRear / 2, front: false, left: true },
  ];

  const body = Object.fromEntries(Object.entries(B).map(([k, b]) => [k, b.build()])) as Record<
    BodyBucket,
    THREE.BufferGeometry
  >;

  const atlas = createLiveryAtlas(logo, opts.atlasSize, opts.anisotropy);
  const shadow = createShadowTexture({
    length: L - 0.1,
    width: SPEC.width - 0.08,
    wheels: wheels.map((w) => [w.x, w.z]),
  });

  let vertices = 0;
  for (const g of Object.values(body)) vertices += g.getAttribute("position").count;
  for (const d of [sideDoor, rearDoorR, rearDoorL])
    vertices += d.paint.getAttribute("position").count + d.glass.getAttribute("position").count;
  vertices += 4 * (tyre.getAttribute("position").count + rim.getAttribute("position").count);

  return {
    atlas,
    lightFX: buildLightFX(),
    cabinLight: [-1.2, ROOF - 0.35, 0],
    shadow,
    body,
    sideDoor,
    rearDoorR,
    rearDoorL,
    tyre,
    rim,
    wheels,
    halos: packHalos(halos),
    stats: { vertices, buildMs: performance.now() - t0 },
  };
}

// ---------------------------------------------------------------------------
// Light effects

const HALO_STYLE: Record<HaloGroup, { color: string; size: number }> = {
  head: { color: "#fff1d6", size: 1.25 },
  tail: { color: "#ff2a1a", size: 0.55 },
  indicator: { color: "#ffa21a", size: 0.5 },
  beaconA: { color: "#ff2433", size: 0.95 },
  beaconB: { color: "#e8f0ff", size: 0.95 },
};

function packHalos(src: Record<HaloGroup, number[]>): HaloBuffer {
  const pos: number[] = [];
  const col: number[] = [];
  const size: number[] = [];
  const group: number[] = [];
  const dir: number[] = [];
  HALO_GROUPS.forEach((g, gi) => {
    const c = new THREE.Color(HALO_STYLE[g].color);
    const p = src[g];
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      col.push(c.r, c.g, c.b);
      size.push(HALO_STYLE[g].size);
      group.push(gi);
      // lamps throw light forward or rearward; roof beacons are omnidirectional
      if (g === "beaconA" || g === "beaconB") dir.push(0, 0, 0);
      else dir.push(p[i] > 0 ? 1 : -1, 0, 0);
    }
  });
  return {
    position: new Float32Array(pos),
    color: new Float32Array(col),
    size: new Float32Array(size),
    group: new Float32Array(group),
    dir: new Float32Array(dir),
  };
}

/** Geometry for the light-FX shader; aKind: 0 floor pool, 1 volumetric cone, 2 dome-light diffuser. */
function buildLightFX() {
  const parts: THREE.BufferGeometry[] = [];
  const tag = (g: THREE.BufferGeometry, kind: number) => {
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count).fill(kind), 1));
    parts.push(g);
  };
  // low-beam pool on the floor ahead of the bumper (u: forward, v: across)
  tag(new THREE.PlaneGeometry(7, 4.2, 1, 1).rotateX(-Math.PI / 2).translate(XF + 3.45, 0.012, 0), 0);
  // volumetric cones from each headlamp, aimed slightly down and out
  for (const s of [1, -1]) {
    const len = 7.5;
    const g = new THREE.CylinderGeometry(1.05, 0.07, len, 28, 1, true); // top (far) wide, bottom (lamp) narrow
    g.translate(0, len / 2, 0); // lamp end at the origin
    g.rotateZ(-Math.PI / 2 - 0.075); // +Y → forward (+X), tilted down
    g.rotateY(-0.035 * s); // toe out
    g.translate(NOSE_X + 0.03, 0.955, s * 0.64);
    tag(g, 1);
  }
  // dome-light diffusers + under-cabinet strip
  for (const x of INTERIOR_LIGHTS) tag(new THREE.PlaneGeometry(0.42, 0.2).rotateX(Math.PI / 2).translate(x, CEIL_Y - 0.022, 0), 2);
  tag(new THREE.PlaneGeometry(2.5, 0.035).rotateX(Math.PI / 2).translate(-1.75, 2.075, -0.75), 2);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

// ---------------------------------------------------------------------------
// Helpers

/** Area-weighted vertex normals over a closed ring grid. */
function gridNormals(P: Float32Array, NX: number, NR: number, inward: boolean) {
  const Nn = new Float32Array(P.length);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const add = (i0: number, i1: number, i2: number) => {
    a.fromArray(P, i0 * 3);
    b.fromArray(P, i1 * 3).sub(a);
    c.fromArray(P, i2 * 3).sub(a);
    b.cross(c);
    for (const i of [i0, i1, i2]) {
      Nn[i * 3] += b.x;
      Nn[i * 3 + 1] += b.y;
      Nn[i * 3 + 2] += b.z;
    }
  };
  for (let x = 0; x < NX - 1; x++)
    for (let i = 0; i < NR; i++) {
      const j = (i + 1) % NR;
      const g00 = x * NR + i;
      const g10 = (x + 1) * NR + i;
      const g11 = (x + 1) * NR + j;
      const g01 = x * NR + j;
      add(g00, g10, g11);
      add(g00, g11, g01);
    }
  for (let i = 0; i < Nn.length; i += 3) {
    const l = Math.hypot(Nn[i], Nn[i + 1], Nn[i + 2]) || 1;
    const k = inward ? -1 / l : 1 / l;
    Nn[i] *= k;
    Nn[i + 1] *= k;
    Nn[i + 2] *= k;
    if (Nn[i] === 0 && Nn[i + 1] === 0 && Nn[i + 2] === 0) Nn[i + 1] = 1;
  }
  return Nn;
}

/** Flat end panel built from the section outline at station x; dir = −1 faces rear, +1 faces front. */
function endCap(x: number, dir: number, hole: typeof REAR_DOOR | null, inset = 0) {
  const rr = ringRight(x, inset);
  const outline: [number, number][] = [];
  for (let i = 0; i < N_RING; i++) {
    const { r, s } = ringIndex(i);
    const p: [number, number] = [s * rr[r][0], rr[r][1]];
    const last = outline[outline.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 1e-4) outline.push(p);
  }
  if (Math.hypot(outline[0][0] - outline.at(-1)![0], outline[0][1] - outline.at(-1)![1]) < 1e-4) outline.pop();
  const shape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
  if (hole) {
    const h = new THREE.Path();
    const { halfW, y0, y1 } = hole;
    const r = 0.04;
    h.moveTo(-halfW + r, y0);
    h.lineTo(halfW - r, y0);
    h.quadraticCurveTo(halfW, y0, halfW, y0 + r);
    h.lineTo(halfW, y1 - r);
    h.quadraticCurveTo(halfW, y1, halfW - r, y1);
    h.lineTo(-halfW + r, y1);
    h.quadraticCurveTo(-halfW, y1, -halfW, y1 - r);
    h.lineTo(-halfW, y0 + r);
    h.quadraticCurveTo(-halfW, y0, -halfW + r, y0);
    shape.holes.push(h);
  }
  const g = new THREE.ShapeGeometry(shape, 4);
  // shape space (z, y) → world: dir −1 faces −X, +1 faces +X
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const z = p.getX(i);
    const y = p.getY(i);
    p.setXYZ(i, x, y, z);
  }
  const idx = g.getIndex()!;
  // Shape space (x→Z, y→Y) turns the +Z-facing winding into −X. Flip it for a front-facing cap.
  if (dir > 0)
    for (let i = 0; i < idx.count; i += 3) {
      const t = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, t);
    }
  g.deleteAttribute("normal");
  const n = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) n[i * 3] = dir;
  g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  return g;
}

/** Rear panel around the door opening, UV-projected onto the rear livery region. */
function rearCapGeometry(x: number) {
  const g = endCap(x, -1, REAR_DOOR);
  const p = g.getAttribute("position");
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const [u, v] = UV.rear(p.getZ(i), p.getY(i));
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

// ---------------------------------------------------------------------------

/** Ceiling dome-light stations in the patient compartment (x, metres). */
export const INTERIOR_LIGHTS = [-2.55, -1.55, -0.55, 0.45];
const CEIL_Y = ROOF - 0.02;

/** Baked interior light: dome lights on the ceiling, occlusion towards floor and corners. */
function interiorShade(p: V3, n: V3) {
  const [x, y, z] = p;
  if (x > 1.45) return 0.5 + 0.38 * smoothstep(0.7, 1.7, y) + 0.12 * Math.max(0, n[1]);
  let l = 0.38;
  for (const lx of INTERIOR_LIGHTS) {
    const dx = lx - x;
    const dy = CEIL_Y - y;
    const dz = -z;
    const d = Math.hypot(dx, dy, dz) || 1;
    const lam = Math.max(0.2, (n[0] * dx + n[1] * dy + n[2] * dz) / d);
    l += 0.62 * Math.exp(-(dx * dx + dy * dy * 0.6 + dz * dz * 0.5) / 1.5) * lam;
  }
  l *= 0.7 + 0.3 * smoothstep(0.72, 1.35, y);
  if (y < 0.9 && Math.abs(z) > 0.78) l *= 0.82;
  return Math.min(1.12, Math.max(0.25, l));
}

function buildInterior(B: Record<BodyBucket, MeshBuilder>) {
  const b = B.interior;
  const inset = 0.035;
  const x0 = XR + 0.035;
  const x1 = 2.53;
  const xs: number[] = [];
  const breaks = [DOOR.x0, DOOR.x1, CABWIN_X0, WS_X0, HEADER_X, CAP_X, AX_R - ARCH_R, AX_R + ARCH_R, AX_F - ARCH_R];
  for (let x = x0; x < x1; x += 0.22) xs.push(x);
  xs.push(...breaks, x1);
  for (let k = 1; k < 6; k++) xs.push(WS_X0 + ((x1 - WS_X0) * k) / 6);
  const st = [...new Set(xs.map((x) => Math.round(x * 1e4) / 1e4))].filter((x) => x >= x0 && x <= x1).sort((p, q) => p - q);
  const NX = st.length;
  const P = new Float32Array(NX * N_RING * 3);
  for (let a = 0; a < NX; a++) {
    const rr = ringRight(st[a], inset);
    for (let i = 0; i < N_RING; i++) {
      const { r, s } = ringIndex(i);
      const o = (a * N_RING + i) * 3;
      P[o] = st[a];
      P[o + 1] = rr[r][1];
      P[o + 2] = s * rr[r][0];
    }
  }
  const N = gridNormals(P, NX, N_RING, true);
  const ids = new Map<number, number>();
  const v = (gi: number, c: RGB, key: number) => {
    const k = gi * 4 + key;
    const hit = ids.get(k);
    if (hit !== undefined) return hit;
    const o = gi * 3;
    const pos: V3 = [P[o], P[o + 1], P[o + 2]];
    const nor: V3 = [N[o], N[o + 1], N[o + 2]];
    const sh = interiorShade(pos, nor);
    const id = b.vert(pos, nor, 0, 0, [c[0] * sh, c[1] * sh, c[2] * sh]);
    ids.set(k, id);
    return id;
  };
  const cabWall = rgb("#3a4044");
  const wall = rgb("#dde2e4");
  const ceiling = rgb("#eef1f2");
  for (let a = 0; a < NX - 1; a++)
    for (let i = 0; i < N_RING; i++) {
      const j = (i + 1) % N_RING;
      const g = [a * N_RING + i, (a + 1) * N_RING + i, (a + 1) * N_RING + j, a * N_RING + j];
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const gi of g) {
        cx += P[gi * 3] / 4;
        cy += P[gi * 3 + 1] / 4;
        cz += P[gi * 3 + 2] / 4;
      }
      const rLo = Math.min(ringIndex(i).r, ringIndex(j).r);
      const zone = zoneOf(rLo);
      if (zone === "bottom") continue; // floors are separate slabs
      const reg = classifyOuter(cx, cy, cz, rLo);
      if (reg.bucket === null) continue; // follow the outer holes (doors, windshield, cab glass)
      const top = zone === "top" || zone === "edge";
      const cab = cx > 1.45;
      const c = top ? (cab ? rgb("#9aa2a7") : ceiling) : cab ? cabWall : wall;
      const key = top ? (cab ? 0 : 1) : cab ? 2 : 3;
      const q = g.map((gi) => v(gi, c, key));
      b.quad(q[0], q[3], q[2], q[1]); // reversed winding: faces inward
    }

  /** Interior part with baked light; hex is the material's base colour. */
  const I = (geo: THREE.BufferGeometry, hex: string) => {
    const c = rgb(hex);
    b.add(geo, {
      colorFn: (p, n) => {
        const k = interiorShade(p, n);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
    });
  };
  const M = (geo: THREE.BufferGeometry) => B.chrome.add(geo); // brushed aluminium / chrome

  // firewall
  b.add(endCap(x1, -1, null, inset), { color: rgb("#1c2023") });

  // ---------------- Patient compartment ----------------
  const fx0 = XR + 0.04;
  const fx1 = 1.48;
  const fl = 0.7; // load floor
  // vinyl floor with darker coved edges
  I(place(cube(fx1 - fx0, 0.3, 1.95), [(fx0 + fx1) / 2, fl - 0.15, 0]), "#56666d");
  for (const zs of [1, -1]) I(place(cube(fx1 - fx0, 0.09, 0.05), [(fx0 + fx1) / 2, fl + 0.045, zs * 0.95]), "#3f4c52");
  // aluminium thresholds at the rear and side doors, side-door step tread
  M(place(cube(0.2, 0.008, REAR_DOOR.halfW * 2), [fx0 + 0.1, fl + 0.004, 0]));
  M(place(cube(DOOR.x1 - DOOR.x0 - 0.04, 0.008, 0.2), [(DOOR.x0 + DOOR.x1) / 2, fl + 0.004, 0.88]));
  M(place(cube(DOOR.x1 - DOOR.x0 - 0.06, 0.03, 0.2), [(DOOR.x0 + DOOR.x1) / 2, 0.585, 0.9]));
  // wheelchair L-track and anchors
  for (const z of [-0.18, 0.62]) {
    M(place(cube(2.6, 0.006, 0.04), [-1.55, fl + 0.003, z]));
    for (const x of [-2.6, -0.8]) M(place(cube(0.06, 0.02, 0.05), [x, fl + 0.01, z]));
  }
  // wheel housings
  for (const zs of [1, -1]) I(place(box(ARCH_R * 2, 0.18, 0.3, 0.05), [AX_R, 0.79, zs * 0.84]), "#b8c0c4");
  // lower kick panels and wall panel seams
  for (const zs of [1, -1]) {
    const runs: [number, number][] = zs > 0 ? [[fx0 + 0.25, DOOR.x0 - 0.02]] : [[fx0 + 0.25, 1.4]];
    for (const [a0, a1] of runs) {
      const z = zs * (sideZ((a0 + a1) / 2, 0.85) - 0.06);
      I(place(cube(a1 - a0, 0.3, 0.02), [(a0 + a1) / 2, fl + 0.15, z]), "#b1babf");
    }
    for (let x = fx0 + 0.6; x < 1.3; x += 0.62) {
      if (zs > 0 && x > DOOR.x0 - 0.05) continue;
      const z0 = zs * (sideZ(x, 1.05) - 0.037);
      const z1 = zs * (sideZ(x, 2.25) - 0.037);
      const pa: V3 = [x - 0.006, 1.02, z0];
      const pb: V3 = [x + 0.006, 1.02, z0];
      const pc: V3 = [x + 0.006, 2.28, z1];
      const pd: V3 = [x - 0.006, 2.28, z1];
      if (zs > 0) b.flatQuad(pa, pd, pc, pb, undefined, rgb("#8f999e"));
      else b.flatQuad(pa, pb, pc, pd, undefined, rgb("#8f999e"));
    }
  }
  // overhead cabinets (left full length, right over the rear windows) with door gaps + handles
  const cabinet = (zs: number, a0: number, a1: number) => {
    const zIn = zs * 0.6;
    const zw = zs * 0.93;
    I(place(box(a1 - a0, 0.4, Math.abs(zw - zIn), 0.03), [(a0 + a1) / 2, 2.28, (zw + zIn) / 2]), "#f0f3f4");
    const n = Math.max(2, Math.round((a1 - a0) / 0.62));
    for (let k = 1; k < n; k++) {
      const x = a0 + ((a1 - a0) * k) / n;
      I(place(cube(0.008, 0.36, 0.01), [x, 2.28, zIn - zs * 0.001]), "#7d878c");
    }
    for (let k = 0; k < n; k++) {
      const x = a0 + ((a1 - a0) * (k + 0.5)) / n;
      M(place(cube(0.12, 0.014, 0.014), [x, 2.13, zIn - zs * 0.012]));
    }
  };
  cabinet(-1, -3.05, -0.45);
  cabinet(1, -3.05, -1.3);
  // ceiling grab rails on stand-offs
  for (const z of [-0.4, 0.4]) {
    M(place(new THREE.CylinderGeometry(0.016, 0.016, 4.0, 10), [-1.0, CEIL_Y - 0.15, z], [0, 0, Math.PI / 2]));
    for (const x of [-2.8, -1.0, 0.8]) M(place(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), [x, CEIL_Y - 0.075, z]));
  }
  // dome-light bezels (the glowing diffusers are in the light-FX mesh)
  for (const x of INTERIOR_LIGHTS) I(place(box(0.48, 0.03, 0.26, 0.012), [x, CEIL_Y - 0.004, 0]), "#d9dee1");

  // Powered stretcher (cot) on the left, head towards the cab
  const cz = -0.42;
  for (const dz of [-0.24, 0.24]) M(place(cube(1.85, 0.035, 0.035), [-2.08, 0.84, cz + dz]));
  for (const dx of [-0.85, 0.85]) M(place(cube(0.035, 0.035, 0.5), [-2.08 + dx, 0.84, cz]));
  for (const dx of [-0.8, 0.8])
    for (const dz of [-0.22, 0.22]) {
      M(place(cube(0.03, 0.1, 0.03), [-2.08 + dx, 0.78, cz + dz]));
      I(place(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 12), [-2.08 + dx, 0.745, cz + dz], [Math.PI / 2, 0, 0]), "#202326");
    }
  I(place(box(1.86, 0.035, 0.56, 0.012), [-2.08, 0.88, cz]), "#3b4246");
  I(place(box(1.3, 0.12, 0.55, 0.055), [-2.35, 0.955, cz]), "#173544");
  I(place(box(0.62, 0.11, 0.55, 0.05), [-1.42, 1.08, cz], [0, 0, 0.62]), "#173544");
  I(place(box(0.3, 0.08, 0.38, 0.04), [-1.27, 1.23, cz], [0, 0, 0.62]), "#f2f4f5");
  for (const dz of [-0.3, 0.3]) M(place(new THREE.CylinderGeometry(0.012, 0.012, 1.05, 8), [-2.2, 1.06, cz + dz], [0, 0, Math.PI / 2]));
  for (const x of [-2.75, -2.25, -1.75]) {
    I(place(cube(0.05, 0.13, 0.57), [x, 0.97, cz]), "#121416");
    M(place(cube(0.06, 0.03, 0.05), [x, 1.035, cz + 0.12]));
  }
  // Oxygen cylinder in a wall bracket + outlet panel above the head of the cot
  I(place(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 16), [-1.0, 1.08, -0.86]), "#2c7a4b");
  M(place(new THREE.CylinderGeometry(0.03, 0.045, 0.08, 12), [-1.0, 1.43, -0.86]));
  for (const y of [0.95, 1.22]) I(place(cube(0.14, 0.03, 0.14), [-1.0, y, -0.86]), "#1a1d1f");
  I(place(box(0.42, 0.26, 0.03, 0.01), [-1.25, 1.62, -0.92]), "#30373b");
  for (const dx of [-0.1, 0.1]) M(place(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), [-1.25 + dx, 1.62, -0.905], [Math.PI / 2, 0, 0]));
  // Squad bench along the right wall (behind the attendant)
  I(place(box(1.6, 0.14, 0.42, 0.05), [-2.2, 1.12, 0.66]), "#173544");
  I(place(box(1.6, 0.48, 0.1, 0.045), [-2.2, 1.44, 0.86], [0.08, 0, 0]), "#173544");
  I(place(cube(1.6, 0.4, 0.38), [-2.2, 0.9, 0.7]), "#e4e8ea");
  // Attendant's captain chair at the head of the cot, facing rearward
  M(place(new THREE.CylinderGeometry(0.035, 0.07, 0.36, 12), [-0.62, 0.88, 0.3]));
  I(place(box(0.46, 0.11, 0.46, 0.05), [-0.65, 1.1, 0.3]), "#1f2b31");
  I(place(box(0.1, 0.56, 0.46, 0.045), [-0.42, 1.44, 0.3], [0, 0, 0.12]), "#1f2b31");
  I(place(box(0.08, 0.16, 0.3, 0.035), [-0.38, 1.8, 0.3], [0, 0, 0.12]), "#1f2b31");
  for (const dz of [-0.25, 0.25]) I(place(box(0.32, 0.05, 0.06, 0.02), [-0.6, 1.3, 0.3 + dz]), "#15191c");

  // ---------------- Cab ----------------
  I(place(cube(0.95, 0.08, 1.9), [2.0, 0.52, 0]), "#141618"); // floor mats
  // dashboard: lower dash, padded top following the windshield, instrument hood, centre screen
  I(place(box(0.44, 0.3, 1.92, 0.05), [2.33, 1.08, 0]), "#1c2023");
  I(place(box(0.4, 0.09, 1.9, 0.04), [2.36, 1.29, 0], [0, 0, -0.42]), "#24292c");
  I(place(box(0.2, 0.11, 0.44, 0.045), [2.18, 1.35, -0.45]), "#121416");
  B.glass.add(place(new THREE.PlaneGeometry(0.26, 0.17), [2.1, 1.2, 0.02], [0, -Math.PI / 2, -0.35]));
  I(place(cube(0.04, 0.2, 0.3), [2.115, 1.2, 0.02], [0, 0, -0.35]), "#0c0e0f");
  for (const z of [-0.78, -0.12, 0.16, 0.78]) M(place(cube(0.012, 0.05, 0.12), [2.115, 1.15, z]));
  I(place(box(0.55, 0.22, 0.24, 0.04), [1.85, 0.75, 0]), "#181b1d"); // centre console
  // steering wheel: rim, three spokes, hub, column
  const wheelPos: V3 = [2.03, 1.27, -0.45];
  const tilt: V3 = [0, Math.PI / 2, 0.42];
  I(place(new THREE.TorusGeometry(0.19, 0.02, 8, 32), wheelPos, tilt), "#131517");
  I(place(box(0.03, 0.09, 0.09, 0.02), wheelPos, [0, 0, 0.42]), "#202427");
  for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    const g = new THREE.BoxGeometry(0.02, 0.17, 0.035);
    g.translate(0, -0.085, 0);
    g.rotateX(a + Math.PI);
    I(place(g, wheelPos, [0, 0, 0.42]), "#202427");
  }
  I(place(new THREE.CylinderGeometry(0.035, 0.04, 0.34, 10), [2.18, 1.2, -0.45], [0, 0, 0.95]), "#121416");
  // cab seats with bolsters and headrests
  for (const z of [-0.45, 0.45]) {
    I(place(box(0.5, 0.14, 0.5, 0.05), [1.8, 0.98, z]), "#2a3034");
    I(place(box(0.13, 0.64, 0.5, 0.05), [1.53, 1.37, z], [0, 0, -0.18]), "#2a3034");
    for (const dz of [-0.24, 0.24]) I(place(box(0.16, 0.5, 0.06, 0.03), [1.56, 1.33, z + dz], [0, 0, -0.18]), "#22272a");
    I(place(box(0.1, 0.17, 0.27, 0.045), [1.45, 1.82, z], [0, 0, -0.18]), "#2a3034");
    I(place(cube(0.42, 0.4, 0.42), [1.8, 0.71, z]), "#1c2023");
    // seat belt
    I(place(cube(0.012, 0.75, 0.05), [1.62, 1.4, z + Math.sign(z) * 0.2], [0.45 * Math.sign(z), 0, -0.1]), "#111315");
  }
  // sun visors
  for (const z of [-0.45, 0.45]) I(place(box(0.16, 0.025, 0.42, 0.012), [1.86, 1.95, z], [0, 0, 0.5]), "#9aa2a7");
}

function buildSeams(trim: MeshBuilder) {
  // Thin dark strips that read as panel gaps, offset just proud of the skin.
  const strip = (pts: [number, number][], s: number, width = 0.006) => {
    const dense: [number, number][] = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.08));
      for (let t = 0; t < n; t++) dense.push([x0 + ((x1 - x0) * t) / n, y0 + ((y1 - y0) * t) / n]);
    }
    dense.push(pts[pts.length - 1]);
    for (let k = 0; k < dense.length - 1; k++) {
      const [x0, y0] = dense[k];
      const [x1, y1] = dense[k + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const l = Math.hypot(dx, dy) || 1;
      const ox = (-dy / l) * (width / 2);
      const oy = (dx / l) * (width / 2);
      const a = sidePoint(x0 - ox, y0 - oy, s, 0.0015);
      const b = sidePoint(x1 - ox, y1 - oy, s, 0.0015);
      const c = sidePoint(x1 + ox, y1 + oy, s, 0.0015);
      const d = sidePoint(x0 + ox, y0 + oy, s, 0.0015);
      if (s > 0) trim.flatQuad(a, b, c, d);
      else trim.flatQuad(a, d, c, b);
    }
  };
  for (const s of [1, -1]) {
    const arch: [number, number][] = [];
    for (let x = 1.97; x <= 2.41; x += 0.04) {
      const dx = x - AX_F;
      const R = ARCH_R + 0.06;
      arch.push([x, WHEEL_Y + Math.sqrt(Math.max(0, R * R - dx * dx))]);
    }
    strip([[CABWIN_X0, BELT], [CABWIN_X0, 0.52], [1.95, 0.52], ...arch, [2.47, 0.9], [2.47, BELT]], s);
    // cab door handle
    trim.add(place(box(0.15, 0.032, 0.03, 0.012), sidePoint(1.69, 1.17, s, 0.012)));
  }
  // sliding-door rail cover (right side, rear quarter)
  for (let x = -1.15; x < DOOR.x0; x += 0.15) {
    const x1 = Math.min(DOOR.x0, x + 0.15);
    const a = sidePoint(x, 1.265, 1, 0.006);
    const b = sidePoint(x1, 1.265, 1, 0.006);
    const c = sidePoint(x1, 1.3, 1, 0.006);
    const d = sidePoint(x, 1.3, 1, 0.006);
    trim.flatQuad(a, b, c, d);
  }
  // hood shut lines
  for (const z of [-0.8, 0.8]) {
    for (let x = COWL_X1 + 0.02; x < HOOD_X - 0.04; x += 0.08) {
      const x1 = Math.min(HOOD_X - 0.04, x + 0.08);
      const y0 = profile(x).yt + 0.0015;
      const y1 = profile(x1).yt + 0.0015;
      const w = 0.003;
      trim.flatQuad([x, y0, z + w], [x1, y1, z + w], [x1, y1, z - w], [x, y0, z - w]);
    }
  }
  // rubber seals inside the sliding-door opening (visible through the shut gap)
  const sealY = (y: number, x0: number, x1: number) => {
    const z = sideZ((x0 + x1) / 2, y) - 0.04;
    trim.add(place(box(x1 - x0, 0.025, 0.07, 0.005, 1), [(x0 + x1) / 2, y, z]));
  };
  sealY(DOOR.y0 + 0.012, DOOR.x0, DOOR.x1);
  sealY(DOOR.y1 - 0.012, DOOR.x0, DOOR.x1);
  for (const x of [DOOR.x0 + 0.012, DOOR.x1 - 0.012]) {
    for (let y = DOOR.y0; y < DOOR.y1; y += 0.3) {
      const y1 = Math.min(DOOR.y1, y + 0.3);
      const z = sideZ(x, (y + y1) / 2) - 0.04;
      trim.add(place(box(0.025, y1 - y, 0.07, 0.005, 1), [x, (y + y1) / 2, z]));
    }
  }
  // rear opening seals
  const { halfW, y0, y1 } = REAR_DOOR;
  trim.add(place(box(0.07, 0.025, halfW * 2, 0.005, 1), [XR + 0.04, y0 + 0.012, 0]));
  trim.add(place(box(0.07, 0.025, halfW * 2, 0.005, 1), [XR + 0.04, y1 - 0.012, 0]));
  for (const s of [1, -1]) trim.add(place(box(0.07, y1 - y0, 0.025, 0.005, 1), [XR + 0.04, (y0 + y1) / 2, s * (halfW - 0.012)]));
}

function buildFrontEnd(B: Record<BodyBucket, MeshBuilder>, halos: Record<HaloGroup, number[]>) {
  const white = UV.palette("white");
  /** Plan-view (x, z) rounded bumper shape extruded vertically between y0 and y1. */
  const bumper = (hw: number, xFront: number, rc: number, y0: number, y1: number, bevel: number) => {
    const x0 = 2.84;
    const sh = new THREE.Shape();
    sh.moveTo(x0, -hw);
    sh.lineTo(xFront - rc, -hw);
    sh.quadraticCurveTo(xFront, -hw, xFront, -hw + rc);
    sh.lineTo(xFront, hw - rc);
    sh.quadraticCurveTo(xFront, hw, xFront - rc, hw);
    sh.lineTo(x0, hw);
    sh.lineTo(x0, -hw);
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: y1 - y0 - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.rotateX(-Math.PI / 2); // (x, z) shape, extrusion → +Y
    g.translate(0, y0 + bevel, 0);
    return g;
  };
  // Body-colour upper bumper cover over a textured black lower valance.
  B.paint.add(bumper(1.005, XF, 0.32, 0.5, 0.69, 0.03), { uv: white, colorFn: aoColor });
  B.trim.add(bumper(0.975, XF - 0.03, 0.3, 0.29, 0.52, 0.02));
  // lower intake with a satin-chrome accent bar
  B.trim.add(place(box(0.04, 0.09, 1.1, 0.02), [XF - 0.015, 0.4, 0]));
  B.chrome.add(place(box(0.012, 0.018, 1.0, 0.006), [XF - 0.004, 0.462, 0]));

  // Grille: gloss-black surround, dark mesh insert, three satin-chrome bars.
  const outer: [number, number][] = [
    [-0.58, 0.69],
    [0.58, 0.69],
    [0.49, 1.0],
    [-0.49, 1.0],
  ];
  const ins: [number, number][] = [
    [-0.52, 0.725],
    [0.52, 0.725],
    [0.445, 0.965],
    [-0.445, 0.965],
  ];
  const g = new THREE.Shape(outer.map(([z, y]) => new THREE.Vector2(z, y)));
  g.holes.push(new THREE.Path(ins.map(([z, y]) => new THREE.Vector2(z, y))));
  const insert = new THREE.ShapeGeometry(new THREE.Shape(ins.map(([z, y]) => new THREE.Vector2(z, y))));
  const ip = insert.getAttribute("position");
  for (let i = 0; i < ip.count; i++) ip.setXYZ(i, NOSE_X - 0.02, ip.getY(i), -ip.getX(i));
  insert.deleteAttribute("normal");
  insert.computeVertexNormals();
  B.trim.add(insert);
  const grille = new THREE.ExtrudeGeometry(g, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 });
  grille.rotateY(Math.PI / 2);
  grille.translate(NOSE_X - 0.012, 0, 0);
  B.trim.add(grille);
  for (const [y, hw2, h] of [
    [0.785, 0.5, 0.05],
    [0.865, 0.475, 0.06],
    [0.935, 0.455, 0.045],
  ])
    B.chrome.add(place(box(0.03, h, hw2 * 2, 0.014), [NOSE_X + 0.006, y, 0]));

  // Headlamps: lens on the face maps onto the lamp artwork (projectors + LED DRL).
  for (const s of [1, -1]) {
    const pts: [number, number][] = [
      [0.46, 0.885],
      [0.79, 0.865],
      [0.79, 1.045],
      [0.51, 1.03],
    ];
    const lg = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))));
    const p = lg.getAttribute("position");
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const z = p.getX(i);
      const y = p.getY(i);
      const [u, v] = UV.lamp("head", (z - 0.46) / 0.33, (y - 0.865) / 0.18);
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
      p.setXYZ(i, NOSE_X + 0.004, y, s * z);
    }
    lg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    if (s > 0) flipIndex(lg);
    lg.deleteAttribute("normal");
    lg.computeVertexNormals();
    B.headlamp.add(lg);
    // clear outer lens cover
    const cover = lg.clone();
    cover.translate(0.006, 0, 0);
    B.glassClear.add(cover);
    // amber indicator strip under the lamp
    B.indicator.add(place(box(0.012, 0.04, 0.17, 0.006), [NOSE_X + 0.006, 0.84, s * 0.7]));
    // fog lamp: projector lens in a black bezel with a chrome ring
    const fu = UV.lamp("fog", 0, 0);
    const fv = UV.lamp("fog", 1, 1);
    B.headlamp.add(place(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 24), [XF - 0.004, 0.405, s * 0.68], [0, 0, -Math.PI / 2]), {
      uvRect: [fu[0], fu[1], fv[0], fv[1]],
    });
    B.chrome.add(place(new THREE.TorusGeometry(0.052, 0.007, 6, 28), [XF - 0.006, 0.405, s * 0.68], [0, Math.PI / 2, 0]));
    B.trim.add(place(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24), [XF - 0.02, 0.405, s * 0.68], [0, 0, Math.PI / 2]));
    halos.head.push(NOSE_X + 0.03, 0.96, s * 0.64, XF + 0.02, 0.405, s * 0.68);
    halos.indicator.push(NOSE_X + 0.03, 0.84, s * 0.72);
    // amber side marker on the bumper corner
    B.indicator.add(place(box(0.07, 0.03, 0.01, 0.004), [3.08, 0.6, s * 1.01]));
    // front mud flap
    B.trim.add(place(box(0.008, 0.26, 0.22, 0.003), [AX_F - 0.47, 0.3, s * 0.87]));
  }

  // Wipers resting on the windshield base
  for (const [z, yaw] of [
    [-0.34, 0.06],
    [0.3, -0.06],
  ]) {
    const x = 2.49;
    const y = profile(x).yt + 0.012;
    B.trim.add(place(box(0.018, 0.012, 0.64, 0.005), [x, y, z], [0, yaw, 0.7]));
  }

  // Mirrors: arm, housing, glass, indicator repeater
  for (const s of [1, -1]) {
    B.trim.add(place(box(0.09, 0.05, 0.2, 0.02), [2.36, 1.38, s * 1.1]));
    B.trim.add(place(box(0.11, 0.33, 0.22, 0.04), [2.33, 1.52, s * 1.24]));
    B.chrome.add(place(new THREE.PlaneGeometry(0.19, 0.29), [2.27, 1.52, s * 1.24], [0, -Math.PI / 2, 0]));
    B.indicator.add(place(box(0.03, 0.025, 0.12, 0.01), [2.39, 1.43, s * 1.27]));
    halos.indicator.push(2.41, 1.43, s * 1.28);
  }
}

function flipIndex(g: THREE.BufferGeometry) {
  const idx = g.getIndex();
  if (!idx) return;
  for (let i = 0; i < idx.count; i += 3) {
    const t = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, t);
  }
}

function buildRearEnd(B: Record<BodyBucket, MeshBuilder>, halos: Record<HaloGroup, number[]>) {
  const { halfW } = REAR_DOOR;
  // rear face paint (UV-mapped to the rear livery region)
  B.paint.add(rearCapGeometry(XR), { colorFn: aoColor });
  // step bumper
  B.trim.add(place(box(0.32, 0.2, 1.92, 0.04), [XR + 0.08, 0.48, 0]));
  // aluminium step plate
  B.chrome.add(place(box(0.24, 0.012, 1.0, 0.004), [XR - 0.0, 0.586, 0]));
  for (const s of [1, -1]) B.trim.add(place(box(0.008, 0.28, 0.24, 0.003), [AX_R - 0.47, 0.32, s * 0.86])); // mud flaps
  // tail lamps on the rear pillars: tail/brake (top), indicator (mid), reverse (bottom)
  for (const s of [1, -1]) {
    const zc = s * (halfW + 0.092);
    B.trim.add(place(box(0.03, 0.76, 0.15, 0.01), [XR - 0.008, 1.19, zc]));
    const tu = UV.lamp("tail", 0, 0);
    const tv = UV.lamp("tail", 1, 1);
    B.tail.add(place(cube(0.02, 0.33, 0.13), [XR - 0.022, 1.39, zc]), { uvRect: [tu[0], tu[1], tv[0], tv[1]] });
    B.indicator.add(place(box(0.02, 0.18, 0.13, 0.008), [XR - 0.022, 1.12, zc]));
    B.chrome.add(place(cube(0.012, 0.15, 0.11), [XR - 0.018, 0.92, zc]));
    B.glassClear.add(place(cube(0.02, 0.17, 0.13), [XR - 0.024, 0.92, zc]));
    halos.tail.push(XR - 0.05, 1.4, zc);
    halos.indicator.push(XR - 0.05, 1.12, zc);
    // red rear side marker
    B.tail.add(place(box(0.07, 0.03, 0.01, 0.004), [XR + 0.2, 0.62, s * (sideZ(XR + 0.2, 0.62) + 0.004)]));
    // rear roof warning lights
    B.beaconA.add(place(box(0.035, 0.085, 0.2, 0.012), [XR - 0.016, REAR_DOOR.y1 + 0.065, s * 0.6]));
    halos.beaconA.push(XR - 0.05, REAR_DOOR.y1 + 0.065, s * 0.6);
  }
  // centre high-mount stop lamp
  B.tail.add(place(box(0.02, 0.035, 0.3, 0.008), [XR - 0.012, REAR_DOOR.y1 + 0.07, 0]));
  halos.tail.push(XR - 0.04, REAR_DOOR.y1 + 0.07, 0);
}

function buildRoof(B: Record<BodyBucket, MeshBuilder>, halos: Record<HaloGroup, number[]>) {
  // Low-profile LED light bar on the front of the high roof.
  const x = 0.86;
  const y = ROOF;
  B.trim.add(place(box(0.3, 0.05, 1.26, 0.02), [x, y + 0.028, 0]));
  for (const z of [-0.5, 0.5]) B.trim.add(place(box(0.08, 0.03, 0.06, 0.01), [x, y + 0.006, z]));
  for (let i = 0; i < 8; i++) {
    const z = -0.525 + i * 0.15;
    const red = i < 2 || i > 5;
    (red ? B.beaconA : B.beaconB).add(place(box(0.29, 0.05, 0.138, 0.018), [x, y + 0.072, z]));
    (red ? halos.beaconA : halos.beaconB).push(x, y + 0.08, z);
  }
}

function buildSideDetails(B: Record<BodyBucket, MeshBuilder>, halos: Record<HaloGroup, number[]>) {
  // black belt mouldings under the cab door glass
  for (const s of [1, -1])
    for (let x = CABWIN_X0; x < 2.44; x += 0.1) {
      const x1 = Math.min(2.44, x + 0.1);
      const q = [sidePoint(x, 1.29, s, 0.004), sidePoint(x1, 1.29, s, 0.004), sidePoint(x1, 1.322, s, 0.004), sidePoint(x, 1.322, s, 0.004)];
      if (s > 0) B.trim.flatQuad(q[0], q[1], q[2], q[3]);
      else B.trim.flatQuad(q[0], q[3], q[2], q[1]);
    }
  // roof antenna
  B.trim.add(place(box(0.16, 0.05, 0.06, 0.02), [-2.6, ROOF + 0.03, 0]));
  // power step under the sliding door
  B.trim.add(place(box(1.2, 0.045, 0.24, 0.015), [(DOOR.x0 + DOOR.x1) / 2, 0.37, sideZ(0.85, 0.5) - 0.02]));
  void halos;
  // wheel-well liners
  for (const w of [
    [AX_F, 1],
    [AX_F, -1],
    [AX_R, 1],
    [AX_R, -1],
  ]) {
    const [ax, s] = w;
    const g = new THREE.CylinderGeometry(ARCH_R - 0.01, ARCH_R - 0.01, 0.34, 20, 1, true, -Math.PI / 2, Math.PI);
    // cylinder axis Y → Z; the theta range lands on the top half
    g.rotateX(-Math.PI / 2);
    g.translate(ax, WHEEL_Y, s * 0.82);
    B.trim.add(g);
  }
}

function buildUnderbody(trim: MeshBuilder) {
  trim.add(place(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10), [AX_R, WHEEL_Y, 0], [Math.PI / 2, 0, 0]));
  trim.add(place(new THREE.SphereGeometry(0.13, 12, 8), [AX_R, WHEEL_Y, 0]));
  trim.add(place(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), [XR + 0.6, 0.33, -0.55], [0, 0, Math.PI / 2]));
  trim.add(place(box(2.6, 0.08, 0.12, 0.02), [0.4, 0.38, 0.55]));
  trim.add(place(box(2.6, 0.08, 0.12, 0.02), [0.4, 0.38, -0.55]));
}

// ---------------------------------------------------------------------------
// Doors

function buildSlidingDoor(shellXs: number[]): DoorAssets {
  const paint = new MeshBuilder(true);
  const glass = new MeshBuilder();
  const g = 0.004;
  const xs = [DOOR.x0 + g, ...shellXs.filter((x) => x > DOOR.x0 + 0.01 && x < DOOR.x1 - 0.01), DOOR.x1 - g];
  const ys = [DOOR.y0 + g, ...ROWS.filter((y) => y > DOOR.y0 + 0.01 && y < DOOR.y1 - 0.01), DOOR.y1 - g];
  const NX = xs.length;
  const NY = ys.length;
  const black = UV.palette("black");
  const grey = UV.palette("grey");
  const dark = UV.palette("dark");
  const T = 0.05;

  // outer skin (shares the shell's side surface exactly)
  const id: number[][] = [];
  const idBlack: number[][] = [];
  for (let a = 0; a < NX; a++) {
    id[a] = [];
    idBlack[a] = [];
    for (let b = 0; b < NY; b++) {
      const p = sidePoint(xs[a], ys[b], 1);
      const n = sideNormal(xs[a], ys[b], 1);
      const uv = UV.side(xs[a], ys[b], 1);
      const ao = bodyAO(p[0], p[1], n[1]);
      id[a][b] = paint.vert(p, n, uv[0], uv[1], [ao, ao, ao]);
      idBlack[a][b] = id[a][b];
    }
  }
  for (let a = 0; a < NX - 1; a++)
    for (let b = 0; b < NY - 1; b++) {
      const cx = (xs[a] + xs[a + 1]) / 2;
      const cy = (ys[b] + ys[b + 1]) / 2;
      void cx;
      void cy;
      paint.quad(id[a][b], id[a + 1][b], id[a + 1][b + 1], id[a][b + 1]);
    }
  sideWindow(paint, glass, DOOR_WINDOW.x0, DOOR_WINDOW.x1, WIN_Y0, WIN_Y1, 1, black);
  // inner skin
  const inner = (x: number, y: number) => sidePoint(x, y, 1, -T);
  const ix = [xs[0], xs[NX - 1]];
  const iy = [ys[0], ys[NY - 1]];
  {
    const n: V3 = [0, 0, -1];
    const ids = [
      [ix[0], iy[0]],
      [ix[1], iy[0]],
      [ix[1], iy[1]],
      [ix[0], iy[1]],
    ].map(([x, y]) => paint.vert(inner(x, y), n, grey[0], grey[1]));
    paint.quad(ids[0], ids[3], ids[2], ids[1]);
  }
  // edges (outer → inner), sampled along y to follow the tumblehome
  const edgeV = (x: number, outward: number) => {
    for (let b = 0; b < NY - 1; b++) {
      const o0 = sidePoint(x, ys[b], 1);
      const o1 = sidePoint(x, ys[b + 1], 1);
      const i0 = inner(x, ys[b]);
      const i1 = inner(x, ys[b + 1]);
      if (outward > 0) paint.flatQuad(o0, i0, i1, o1, dark);
      else paint.flatQuad(o0, o1, i1, i0, dark);
    }
  };
  edgeV(xs[0], -1);
  edgeV(xs[NX - 1], 1);
  const edgeH = (y: number, up: number) => {
    for (let a = 0; a < NX - 1; a++) {
      const o0 = sidePoint(xs[a], y, 1);
      const o1 = sidePoint(xs[a + 1], y, 1);
      const i0 = inner(xs[a], y);
      const i1 = inner(xs[a + 1], y);
      if (up > 0) paint.flatQuad(o0, o1, i1, i0, dark);
      else paint.flatQuad(o0, i0, i1, o1, dark);
    }
  };
  edgeH(ys[0], -1);
  edgeH(ys[NY - 1], 1);
  // handle
  paint.add(place(box(0.17, 0.035, 0.032, 0.013), sidePoint(1.33, 1.16, 1, 0.013)), { uv: dark });
  return { paint: paint.build(), glass: glass.build(), hinge: [0, 0, 0] };
}

function buildRearDoor(s: number): DoorAssets {
  const paint = new MeshBuilder(true);
  const glass = new MeshBuilder();
  const { halfW, y0, y1 } = REAR_DOOR;
  const gap = 0.003;
  const hinge: V3 = [XR, 0, s * halfW];
  // door in world space (closed), z from seam to hinge edge
  const zIn = s * gap;
  const zOut = s * (halfW - gap);
  const xo = XR - 0.004; // outer face, slightly proud of the rear panel
  const xi = XR + 0.04;
  const ya = y0 + gap;
  const yb = y1 - gap;
  const win = { z0: s * 0.07, z1: s * (halfW - 0.08), y0: 1.62, y1: 2.24 };
  const zs = [zIn, win.z0, win.z1, zOut].sort((p, q) => p - q);
  const ys = [ya, 0.93, 1.2, win.y0, win.y1, yb];
  const black = UV.palette("black");
  const grey = UV.palette("grey");
  const dark = UV.palette("dark");
  const n: V3 = [-1, 0, 0];
  for (let a = 0; a < zs.length - 1; a++)
    for (let b = 0; b < ys.length - 1; b++) {
      const zc = (zs[a] + zs[a + 1]) / 2;
      const yc = (ys[b] + ys[b + 1]) / 2;
      const isWin = inR(zc, Math.min(win.z0, win.z1), Math.max(win.z0, win.z1)) && inR(yc, win.y0, win.y1);
      const c = [
        [zs[a], ys[b]],
        [zs[a + 1], ys[b]],
        [zs[a + 1], ys[b + 1]],
        [zs[a], ys[b + 1]],
      ];
      void isWin;
      const ids = c.map(([z, y]) => {
        const uv = UV.rear(z, y);
        const ao = 0.78 + 0.22 * Math.min(1, Math.max(0, (y - 0.7) / 0.8));
        return paint.vert([xo, y, z], n, uv[0], uv[1], [ao, ao, ao]);
      });
      paint.quad(ids[0], ids[1], ids[2], ids[3]);
    }
  // rounded, gasketed window in the plane of the door (shape space (z, y) faces −X)
  const wz0 = Math.min(win.z0, win.z1);
  const wz1 = Math.max(win.z0, win.z1);
  const pane = (m: number, r: number, x: number) => {
    const geo = new THREE.ShapeGeometry(roundedRect(wz0 - m, win.y0 - m, wz1 + m, win.y1 + m, r), 5);
    const p = geo.getAttribute("position");
    for (let i = 0; i < p.count; i++) p.setXYZ(i, x, p.getY(i), p.getX(i));
    geo.deleteAttribute("normal");
    const nn = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) nn[i * 3] = -1;
    geo.setAttribute("normal", new THREE.BufferAttribute(nn, 3));
    return geo;
  };
  paint.add(pane(0.016, 0.07, xo - 0.0025), { uv: black });
  glass.add(pane(0, 0.055, xo - 0.0055));
  // inner face
  {
    const ids = [
      [zs[0], ya],
      [zs[zs.length - 1], ya],
      [zs[zs.length - 1], yb],
      [zs[0], yb],
    ].map(([z, y]) => paint.vert([xi, y, z], [1, 0, 0], grey[0], grey[1]));
    paint.quad(ids[0], ids[3], ids[2], ids[1]);
  }
  // edges
  const z0 = zs[0];
  const z1 = zs[zs.length - 1];
  paint.flatQuad([xo, ya, z0], [xi, ya, z0], [xi, ya, z1], [xo, ya, z1], dark); // bottom
  paint.flatQuad([xo, yb, z0], [xo, yb, z1], [xi, yb, z1], [xi, yb, z0], dark); // top
  paint.flatQuad([xo, ya, z0], [xo, yb, z0], [xi, yb, z0], [xi, ya, z0], dark); // −z side
  paint.flatQuad([xo, ya, z1], [xi, ya, z1], [xi, yb, z1], [xo, yb, z1], dark); // +z side
  // centre seal on the left door, handle on the right door (curb side opens first)
  if (s < 0) paint.add(place(box(0.03, yb - ya - 0.02, 0.02, 0.006, 1), [XR + 0.01, (ya + yb) / 2, -0.012]), { uv: black });
  if (s > 0) paint.add(place(box(0.03, 0.035, 0.16, 0.013), [xo - 0.012, 1.42, 0.16]), { uv: dark });
  // hinges
  for (const y of [0.95, 1.8, 2.45])
    paint.add(place(box(0.04, 0.09, 0.05, 0.01), [xo - 0.006, y, s * (halfW - 0.01)]), { uv: dark });

  // re-centre on the hinge so the group can rotate about it
  const pg = paint.build();
  const gg = glass.build();
  pg.translate(-hinge[0], -hinge[1], -hinge[2]);
  gg.translate(-hinge[0], -hinge[1], -hinge[2]);
  return { paint: pg, glass: gg, hinge };
}

// ---------------------------------------------------------------------------
// Wheels

function buildTyre() {
  const tw = SPEC.tyreWidth / 2;
  const R = SPEC.tyreRadius;
  const g = 0.009; // tread groove depth
  const prof: [number, number][] = [
    [0.206, -tw * 0.8],
    [0.232, -tw * 0.93],
    [0.27, -tw * 0.99],
    [0.31, -tw],
    [0.334, -tw * 0.96],
    [0.348, -tw * 0.86],
    [R - 0.001, -tw * 0.7],
    [R, -0.075],
    [R, -0.052],
    [R - g, -0.05],
    [R - g, -0.038],
    [R, -0.036],
    [R, -0.01],
    [R - g, -0.008],
    [R - g, 0.008],
    [R, 0.01],
    [R, 0.036],
    [R - g, 0.038],
    [R - g, 0.05],
    [R, 0.052],
    [R, 0.075],
    [R - 0.001, tw * 0.7],
    [0.348, tw * 0.86],
    [0.334, tw * 0.96],
    [0.31, tw],
    [0.27, tw * 0.99],
    [0.232, tw * 0.93],
    [0.206, tw * 0.8],
  ];
  // LatheGeometry revolves around Y; profile runs bottom → top for outward normals.
  const geo = new THREE.LatheGeometry(
    prof.map(([r, h]) => new THREE.Vector2(r, h)),
    56,
  );
  geo.rotateX(Math.PI / 2); // axle along Z, outer sidewall at +Z
  return geo;
}

function buildRim() {
  const b = new MeshBuilder(true);
  const silver = rgb("#d5dadd");
  const dark = rgb("#3e444a");
  const disc = rgb("#7a8288");
  // barrel
  b.add(place(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 32, 1, true), [0, 0, -0.01], [Math.PI / 2, 0, 0]), { color: dark });
  // outer lip
  b.add(place(new THREE.TorusGeometry(0.205, 0.01, 5, 36), [0, 0, 0.092]), { color: silver });
  // spoke face: disc with six windows
  const face = new THREE.Shape();
  face.absarc(0, 0, 0.2, 0, Math.PI * 2, false);
  const spokes = 6;
  for (let k = 0; k < spokes; k++) {
    const a0 = (k / spokes) * Math.PI * 2;
    const a1 = ((k + 1) / spokes) * Math.PI * 2;
    const ro = 0.176;
    const ri = 0.086;
    const dO = 0.026 / ro;
    const dI = 0.022 / ri;
    const h = new THREE.Path();
    h.absarc(0, 0, ro, a0 + dO, a1 - dO, false);
    h.absarc(0, 0, ri, a1 - dI, a0 + dI, true);
    h.closePath();
    face.holes.push(h);
  }
  const fg = new THREE.ExtrudeGeometry(face, {
    depth: 0.02,
    bevelEnabled: false,
    curveSegments: 7,
  });
  fg.translate(0, 0, 0.064);
  b.add(fg, { color: silver });
  // hub, centre cap, lug nuts
  b.add(place(new THREE.CylinderGeometry(0.072, 0.08, 0.03, 20), [0, 0, 0.092], [Math.PI / 2, 0, 0]), { color: silver });
  b.add(place(new THREE.CylinderGeometry(0.042, 0.046, 0.014, 20), [0, 0, 0.112], [Math.PI / 2, 0, 0]), { color: dark });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    b.add(place(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 6), [Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.108], [Math.PI / 2, 0, 0]), {
      color: silver,
    });
  }
  // brake disc + caliper seen through the spokes
  b.add(place(new THREE.CylinderGeometry(0.155, 0.155, 0.024, 24), [0, 0, -0.03], [Math.PI / 2, 0, 0]), { color: disc });
  b.add(place(box(0.08, 0.12, 0.06, 0.015), [0.12, 0.08, -0.02], [0, 0, -0.6]), { color: rgb("#24282b") });
  return b.build();
}
