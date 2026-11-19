"use client";
/* eslint-disable react-hooks/immutability -- R3F: three.js objects are mutated per frame inside useFrame, outside React render, by design. */

import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Ambulance, debugStats } from "./Ambulance";
import { DEG, cameraAt, floatPose, roadPose } from "./animation";
import { lerp, smoothstep } from "./surface";
import { createFloorTexture } from "./livery";
import { rig } from "./rig";
import { boot } from "@/components/loader/boot";
import { L } from "./spec";
import { SceneWords } from "./SceneWords";

/**
 * Gradient dome for the environment bake: bright soft sky, a crisp horizon and a dark
 * floor. On glossy paint this produces the horizon-line reflection seen in real photos.
 */
function SkyDome() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 48, 48);
    const p = g.getAttribute("position");
    const c = new Float32Array(p.count * 3);
    const sky = new THREE.Color("#c9d6d8");
    const zenith = new THREE.Color("#7f9396");
    const horizon = new THREE.Color("#f2f6f6");
    const ground = new THREE.Color("#1a2324");
    const deep = new THREE.Color("#070b0b");
    const col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y >= 0) col.copy(horizon).lerp(sky, Math.min(1, y * 3)).lerp(zenith, Math.max(0, y - 0.45) * 1.6);
      else col.copy(ground).lerp(deep, Math.min(1, -y * 2.2));
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} scale={40}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

/** Photographic studio lighting baked once into an environment map (no network HDR). */
function Studio() {
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={0.85}>
        <SkyDome />
        {/* overhead softbox */}
        <Lightformer form="rect" intensity={2.2} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[16, 7, 1]} />
        {/* long strip lights → crisp highlight lines along the flanks */}
        <Lightformer form="rect" intensity={4} position={[0, 4.2, 11]} rotation={[0, Math.PI, 0]} scale={[22, 0.5, 1]} />
        <Lightformer form="rect" intensity={3} position={[0, 4.2, -11]} scale={[22, 0.5, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 2.2, 12]} rotation={[0, Math.PI, 0]} scale={[22, 0.25, 1]} />
        {/* front / rear fill */}
        <Lightformer form="rect" intensity={1.4} position={[13, 3, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.0} position={[-13, 3, 0]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#9fe0d6" position={[7, 6, 8]} scale={2.5} target={[0, 1, 0]} />
      </Environment>
      <hemisphereLight args={["#eef5f4", "#0b1414", 0.25]} />
      {/* key from front-right, cool rim from behind for edge definition */}
      <directionalLight position={[8, 12, 7]} intensity={1.4} color="#fff8ee" />
      <directionalLight position={[-9, 5, -6]} intensity={0.6} color="#cfe9ff" />
    </>
  );
}

/** Turntable floor: one textured disc that fades into the CSS backdrop. */
function Floor() {
  const radius = 9;
  const { geo, mat } = useMemo(() => {
    const small = Math.min(window.screen.width, window.screen.height) < 768;
    const geo = new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map: createFloorTexture(small ? 1024 : 2048, radius),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    return { geo, mat };
  }, []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.map?.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const k = 1 - smoothstep(0, 0.6, rig.exit);
    mat.opacity = k;
    if (mesh.current) mesh.current.visible = k > 0.01;
  });
  return <mesh ref={mesh} geometry={geo} material={mat} renderOrder={-2} />;
}

/**
 * Scroll-driven orbit camera. In the hero it orbits the turntable; as the next section
 * arrives (rig.exit) it blends to a pose that fits the van inside that section's slot
 * element, tracking the slot's live screen rect so the van scrolls with the page.
 */
function CameraRig() {
  const target = useRef(new THREE.Vector3());
  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const aspect = width / Math.max(1, height);
    const v = cameraAt(rig.story, rig.reducedMotion);
    cam.fov = aspect < 1 ? 38 : 30;
    const tanV = Math.tan((cam.fov * DEG) / 2);
    const tanH = tanV * aspect;
    const fit = (aspect < 1 ? 3.7 : 4.2) / tanH + 1.2; // keep the van's length in frame
    // hero pose (pointer parallax shared with the HTML copy via rig.ptrS)
    let az = v.az + rig.ptrS.x * 3.2;
    let el = v.el - rig.ptrS.y * 1.6;
    let dist = Math.max(v.dist, fit);
    let ty = v.ty;
    // Compose around the copy: wide screens push the van right (captions on the left);
    // narrow screens lift it into the top of the frame (captions along the bottom).
    // landscape phones (short + wide) also use the side-by-side composition
    const wide = aspect > 1.2 && (width >= 1024 || height < 560);
    let shiftX = wide ? 0.3 * v.shift : 0;
    let shiftY = wide ? 0 : 0.4;

    // hand-off: fly into the next section's slot
    const f = floatPose(rig.exit, state.clock.elapsedTime, rig.reducedMotion);
    if (f.e > 0 && rig.slot) {
      const r = rig.slot.getBoundingClientRect();
      const fw = Math.max(0.15, r.width / width);
      const fh = Math.max(0.15, r.height / height);
      // ¾ view spans ≈7.6 m; portrait screens get extra margin so the nose never clips
      const slotDist = Math.max((aspect < 1 ? 9 : 7.6) / (2 * tanH * fw), 4.2 / (2 * tanV * fh));
      const cx = ((r.left + r.width / 2) / width) * 2 - 1;
      const cy = 1 - ((r.top + r.height / 2) / height) * 2;
      const e = f.e;
      az = lerp(az, v.az - 74 + f.sway, e); // swing round so the van faces into the content
      el = lerp(el, 13, e);
      dist = lerp(dist, slotDist, e);
      ty = lerp(ty, 1.35 + f.lift, e);
      shiftX = lerp(shiftX, cx, e);
      shiftY = lerp(shiftY, cy, e);
    }

    // road sections (mission drive, footer arrival): a side-on shot, wheels on the lane line
    if (rig.driveOn && rig.road) {
      const r = rig.road.getBoundingClientRect();
      const ds = rig.road.dataset;
      // van length / screen width, optionally scaled per road (data-van-scale)
      const F = (aspect < 1 ? 0.8 : aspect < 1.4 ? 0.5 : 0.36) * (Number(ds.vanScale) || 1);
      az = 90;
      el = 2.5;
      ty = 1.35;
      dist = L / (F * 2 * tanH);
      const ppm = height / (2 * tanV * dist); // pixels per metre at the van
      const laneY = r.top + r.height * 0.56;
      shiftX = 0;
      shiftY = 1 - (2 * (laneY - ty * ppm)) / height;
      const stop = wide ? Number(ds.parkAt) || 0 : 0; // where a parked van stops
      const p = rig.roadKind === "park" ? rig.park : rig.drive;
      rig.driveX = roadPose(rig.roadKind, p, F, stop, rig.reducedMotion).sx * tanH * dist;
    }

    const a = az * DEG;
    const b = el * DEG;
    target.current.set(0, ty, 0);
    cam.position.set(Math.cos(b) * Math.cos(a) * dist, ty + Math.sin(b) * dist, Math.cos(b) * Math.sin(a) * dist);
    cam.lookAt(target.current);
    // NDC shift in the projection, so perspective is unchanged
    cam.updateProjectionMatrix();
    cam.projectionMatrix.elements[8] = -shiftX;
    cam.projectionMatrix.elements[9] = -shiftY;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  });
  return null;
}

/**
 * Compiles every material's shader program before the first frame. With
 * KHR_parallel_shader_compile the driver compiles in the background, so the main thread
 * (and the loading screen) keeps running instead of freezing for the first render; without
 * the extension it behaves like a normal synchronous compile. Mounted last inside the
 * Suspense boundary, so the whole scene exists when it runs.
 */
function Warmup({ onDone }: { onDone: (done: true) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    const t0 = performance.now();
    gl.compileAsync(scene, camera)
      .catch(() => {}) // a failed warm-up only means the first frame compiles instead
      .finally(() => {
        if (!alive) return;
        performance.measure("boot:compile", { start: t0, end: performance.now() });
        onDone(true);
      });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, onDone]);
  return null;
}

function Invalidator() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    rig.invalidate = () => invalidate();
    invalidate();
    // On-demand rendering (reduced motion): the van tracks DOM slots (Services, the
    // mission road), so any scroll must redraw it or it would hang still on screen.
    const onScroll = () => invalidate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      rig.invalidate = () => {};
      window.removeEventListener("scroll", onScroll);
    };
  }, [invalidate]);
  return null;
}

function Stats({ out }: { out: React.RefObject<HTMLPreElement | null> }) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ t: 0, frames: 0 });
  useFrame((state, dt) => {
    (window as unknown as { __three: unknown }).__three = state;
    acc.current.t += dt;
    acc.current.frames++;
    if (acc.current.t < 0.5 || !out.current) return;
    const fps = acc.current.frames / acc.current.t;
    acc.current = { t: 0, frames: 0 };
    const r = gl.info.render;
    out.current.textContent =
      `fps        ${fps.toFixed(0)}\n` +
      `draw calls ${r.calls}\n` +
      `triangles  ${r.triangles}\n` +
      `model vtx  ${debugStats.vertices}\n` +
      `build ms   ${debugStats.buildMs.toFixed(1)}\n` +
      `dpr        ${gl.getPixelRatio().toFixed(2)}`;
  });
  return null;
}

export default function AmbulanceStage({
  active,
  reducedMotion,
  debug,
  words,
  eventSource,
  onReady,
}: {
  active: boolean;
  reducedMotion: boolean;
  debug: boolean;
  /** One word per camera keyframe, set into the scene as studio lettering. */
  words: string[];
  /** Element that receives pointer events for the 3D scene (the canvas itself is click-through). */
  eventSource?: React.RefObject<HTMLElement | null>;
  onReady?: () => void;
}) {
  const [maxDpr] = useState(() => Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1));
  const [dpr, setDpr] = useState(maxDpr);
  const statsRef = useRef<HTMLPreElement>(null);
  // Shaders compiled (off the main thread) yet? And has the loading screen opened?
  const [warm, setWarm] = useState(false);
  // Mount the van one task after the canvas: splits one long blocking commit (renderer +
  // studio, then the ~300 ms van build) in two, so the loading screen keeps animating.
  const [vanMounted, setVanMounted] = useState(false);
  const [revealed, setRevealed] = useState(() => boot.revealed);
  useEffect(() => boot.onReveal(() => setRevealed(true)), []);
  // after warm-up, draw one frame (the van is ready behind the loader); if the hero is
  // off-screen (a reload part-way down the page) no frame will draw, so count it as ready
  useEffect(() => {
    if (warm && !active) boot.mark("frame");
  }, [warm, active]);
  useEffect(() => {
    if (!warm) return;
    const id = requestAnimationFrame(() => rig.invalidate());
    return () => cancelAnimationFrame(id);
  }, [warm]);

  // Nothing renders until the shaders are compiled; behind the loading screen it renders
  // only on demand (one frame for the milestone), so the hidden scene never competes with
  // the loader for the GPU; then the normal loop takes over.
  const frameloop = !active || !warm ? "never" : reducedMotion || !revealed ? "demand" : "always";

  return (
    <>
      <Canvas
        className="!absolute inset-0"
        frameloop={frameloop}
        dpr={dpr}
        eventSource={eventSource as React.RefObject<HTMLElement> | undefined}
        eventPrefix="client"
        camera={{ fov: 30, near: 0.1, far: 150, position: [10, 3, 8] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping; // keeps white paint and brand colours true
          // Shader error checks query the GPU process synchronously for every program on its
          // first use; useful while developing, pure stall in production.
          gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
          gl.toneMappingExposure = 1.0;
          gl.domElement.setAttribute("role", "img");
          gl.domElement.setAttribute(
            "aria-label",
            "Interactive 3D model of the Odes Medical Transportation high-roof ambulance van in white with teal and gold livery.",
          );
          boot.mark("stage");
          window.setTimeout(() => setVanMounted(true), 0);
          onReady?.();
        }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} flipflops={3} onFallback={() => setDpr(1)} />
        <Invalidator />
        <CameraRig />
        <Suspense fallback={null}>
          <Studio />
          <Floor />
          <SceneWords words={words} />
          {vanMounted && (
            <>
              <Ambulance />
              <Warmup onDone={setWarm} />
            </>
          )}
        </Suspense>
        {debug && <Stats out={statsRef} />}
      </Canvas>
      {debug && (
        <pre
          ref={statsRef}
          className="pointer-events-none absolute right-3 top-20 z-30 rounded-md bg-black/70 px-3 py-2 font-mono text-[11px] leading-4 text-emerald-200"
        />
      )}
    </>
  );
}
