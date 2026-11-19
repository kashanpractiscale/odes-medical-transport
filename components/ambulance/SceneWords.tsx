"use client";
/* eslint-disable react-hooks/immutability -- R3F: three.js objects are mutated per frame inside useFrame, outside React render, by design. */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DEG, VIEWS } from "./animation";
import { rig } from "./rig";
import { smoothstep } from "./surface";

const ROW = 292; // atlas row height (px) per word
const SIZE = 2048;
const HEIGHT = 3.4; // letter height in metres
const RADIUS = 8.6; // distance behind the van, opposite the camera

/**
 * Draws every chapter word into one atlas using the page's display font, so the 3D
 * lettering matches the HTML type exactly. Returns texture + per-word aspect ratios.
 */
async function buildWordAtlas(words: string[]) {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-anton").trim() || "Impact";
  const px = 250;
  try {
    await document.fonts.load(`${px}px ${family}`);
  } catch {
    /* fall back to whatever is available */
  }
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  ctx.font = `${px}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const aspects: number[] = [];
  words.forEach((w, i) => {
    const text = w.toUpperCase();
    const width = Math.min(SIZE - 40, ctx.measureText(text).width + 30);
    const scaleX = Math.min(1, (SIZE - 40) / (ctx.measureText(text).width + 30));
    aspects.push(width / ROW);
    const y = i * ROW + ROW * 0.86;
    ctx.save();
    ctx.translate(SIZE / 2, 0);
    ctx.scale(scaleX, 1);
    const g = ctx.createLinearGradient(0, i * ROW, 0, (i + 1) * ROW);
    g.addColorStop(0, "rgba(255,255,255,0.20)");
    g.addColorStop(0.55, "rgba(70,170,160,0.10)");
    g.addColorStop(1, "rgba(15,118,110,0.0)");
    ctx.fillStyle = g;
    ctx.fillText(text, 0, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.strokeText(text, 0, y);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, aspects };
}

/** Two quads: the word standing on the floor, and its fading reflection below the glossy floor. */
function makeGeometry() {
  const g = new THREE.BufferGeometry();
  const pos = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, -0.5, 0, 0, 0.5, 0, 0, 0.5, -1, 0, -0.5, -1, 0];
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(16).fill(0), 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(new Array(32).fill(1), 4));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6]);
  return g;
}

export function SceneWords({ words }: { words: string[] }) {
  const [atlas, setAtlas] = useState<{ tex: THREE.Texture; aspects: number[] } | null>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const current = useRef(-1);
  const geo = useMemo(() => makeGeometry(), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        toneMapped: false,
        side: THREE.DoubleSide,
        opacity: 0,
      }),
    [],
  );

  useEffect(() => {
    let alive = true;
    let made: THREE.Texture | null = null;
    buildWordAtlas(words).then((a) => {
      made = a.tex;
      if (!alive) return a.tex.dispose();
      mat.map = a.tex;
      mat.needsUpdate = true;
      setAtlas(a);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [words, mat]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame(() => {
    const m = mesh.current;
    if (!m || !atlas) return;
    const s = rig.story;
    // nearest chapter keyframe; the word lives there and fades during camera moves
    let k = 0;
    for (let i = 1; i < VIEWS.length; i++) if (Math.abs(VIEWS[i].at - s) < Math.abs(VIEWS[k].at - s)) k = i;
    const near = Math.abs(VIEWS[k].at - s);
    const fade = (1 - smoothstep(0.045, 0.085, near)) * (1 - smoothstep(0, 0.5, rig.exit));
    mat.opacity = fade;
    m.visible = fade > 0.01;

    if (k !== current.current) {
      current.current = k;
      const v = VIEWS[k];
      const az = v.az * DEG;
      const flat = v.el > 45;
      const yaw = Math.atan2(Math.cos(az), Math.sin(az));
      const aspect = atlas.aspects[k] ?? 4;
      m.scale.set(HEIGHT * aspect * 0.97, HEIGHT, 1);
      if (flat) {
        // top view: lay the word on the floor beside the van, reading across the screen
        m.position.set(Math.cos(az) * -4.4, 0.015, Math.sin(az) * -4.4);
        m.rotation.set(-Math.PI / 2, yaw, 0, "YXZ");
      } else {
        m.position.set(-Math.cos(az) * RADIUS, 0, -Math.sin(az) * RADIUS);
        m.rotation.set(0, yaw, 0, "YXZ");
      }
      // UVs for this word's atlas row (texture V is flipped)
      const u0 = 0.5 - (aspect * ROW) / SIZE / 2;
      const u1 = 0.5 + (aspect * ROW) / SIZE / 2;
      const vTop = 1 - (k * ROW) / SIZE;
      const vBot = 1 - ((k + 1) * ROW) / SIZE;
      const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
      uv.set([u0, vBot, u1, vBot, u1, vTop, u0, vTop, u0, vBot, u1, vBot, u1, vTop, u0, vTop]);
      uv.needsUpdate = true;
      // reflection: strong at the floor line, gone half-way down; none when lying flat
      const c = geo.getAttribute("color") as THREE.BufferAttribute;
      const r = flat ? 0 : 0.3;
      for (const i of [4, 5]) c.setW(i, r);
      for (const i of [6, 7]) c.setW(i, 0);
      c.needsUpdate = true;
    }

  });

  return <mesh ref={mesh} geometry={geo} material={mat} renderOrder={-1} visible={false} frustumCulled={false} />;
}
