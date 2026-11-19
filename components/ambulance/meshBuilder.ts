import * as THREE from "three";

export type V3 = [number, number, number];
export type RGB = [number, number, number];

/**
 * Accumulates indexed triangles for one material bucket so that every static part
 * sharing a material ends up in a single BufferGeometry (= one draw call).
 */
export class MeshBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];
  private col: number[] = [];
  private idx: number[] = [];

  constructor(readonly withColor = false) {}

  get vertexCount() {
    return this.pos.length / 3;
  }

  vert(p: V3, n: V3, u = 0, v = 0, c: RGB = [1, 1, 1]) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.uv.push(u, v);
    if (this.withColor) this.col.push(c[0], c[1], c[2]);
    return this.pos.length / 3 - 1;
  }

  tri(a: number, b: number, c: number) {
    this.idx.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number) {
    this.idx.push(a, b, c, a, c, d);
  }

  /** Flat-shaded quad from four corner points (counter-clockwise when viewed from the front). */
  flatQuad(p0: V3, p1: V3, p2: V3, p3: V3, uv: [number, number] = [0, 0], c?: RGB) {
    const e1 = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    const e2 = new THREE.Vector3(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
    const n = e1.cross(e2).normalize();
    const nn: V3 = [n.x, n.y, n.z];
    const a = this.vert(p0, nn, uv[0], uv[1], c);
    const b = this.vert(p1, nn, uv[0], uv[1], c);
    const cc = this.vert(p2, nn, uv[0], uv[1], c);
    const d = this.vert(p3, nn, uv[0], uv[1], c);
    this.quad(a, b, cc, d);
  }

  /**
   * Append an existing geometry (already transformed). Optionally override UVs with a
   * constant (palette texel) and/or paint a constant vertex colour.
   */
  add(
    geo: THREE.BufferGeometry,
    opts: {
      uv?: [number, number];
      /** Remap the geometry's own 0‥1 UVs into this atlas rectangle [u0, v0, u1, v1]. */
      uvRect?: [number, number, number, number];
      color?: RGB;
      /** Per-vertex colour from position + normal (e.g. baked occlusion). */
      colorFn?: (p: V3, n: V3) => RGB;
    } = {},
  ) {
    if (!geo.getAttribute("normal")) geo.computeVertexNormals();
    const p = geo.getAttribute("position");
    const n = geo.getAttribute("normal");
    const t = geo.getAttribute("uv");
    const base = this.vertexCount;
    for (let i = 0; i < p.count; i++) {
      let u = opts.uv ? opts.uv[0] : t ? t.getX(i) : 0;
      let v = opts.uv ? opts.uv[1] : t ? t.getY(i) : 0;
      if (opts.uvRect && t) {
        const [u0, v0, u1, v1] = opts.uvRect;
        u = u0 + (u1 - u0) * Math.min(1, Math.max(0, u));
        v = v0 + (v1 - v0) * Math.min(1, Math.max(0, v));
      }
      const pp: V3 = [p.getX(i), p.getY(i), p.getZ(i)];
      const nn: V3 = [n.getX(i), n.getY(i), n.getZ(i)];
      this.vert(pp, nn, u, v, opts.colorFn ? opts.colorFn(pp, nn) : opts.color);
    }
    const index = geo.getIndex();
    if (index) for (let i = 0; i < index.count; i++) this.idx.push(base + index.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
    geo.dispose();
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.withColor) g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    const count = this.pos.length / 3;
    g.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

/** Apply position / rotation (XYZ euler) / scale to a geometry in place and return it. */
export function place(
  geo: THREE.BufferGeometry,
  position: V3 = [0, 0, 0],
  rotation: V3 = [0, 0, 0],
  scale: V3 = [1, 1, 1],
) {
  _q.setFromEuler(_e.set(rotation[0], rotation[1], rotation[2]));
  _m.compose(new THREE.Vector3(...position), _q, new THREE.Vector3(...scale));
  geo.applyMatrix4(_m);
  return geo;
}

/** Linear-space RGB from an sRGB hex string (vertex colours are linear). */
export const rgb = (hex: string): RGB => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
