"use client";
/* eslint-disable react-hooks/immutability -- R3F: three.js objects are mutated per frame inside useFrame, outside React render, by design. */

import { useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { blink, flashPattern, floatPose, introPose, rearDoorAngles, slidingDoorPose, roadPose, storyEffects } from "./animation";
import { HALO_GROUPS, buildAmbulance, type AmbulanceAssets, type BodyBucket, type HaloGroup } from "./buildAmbulance";
import { createTyreTexture } from "./livery";
import { rig, toggle, type ToggleKey } from "./rig";
import { boot } from "@/components/loader/boot";
import { NOSE_X, SPEC } from "./spec";
import { smoothstep } from "./surface";

export const debugStats = { vertices: 0, buildMs: 0 };

// 1024 px WebP of the official logo (75 KB vs the 205 KB 1789 px PNG): the livery draws it
// at most ~750 px wide even on the 3072 px desktop atlas.
const LOGO_URL = "/brand/odes-logo-livery.webp";

function useMaterials(assets: AmbulanceAssets) {
  return useMemo(() => {
    const lamp = (color: string, emissive: string, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
      new THREE.MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: 0,
        roughness: 0.18,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        toneMapped: false,
        ...extra,
      });
    /**
     * Real glass mostly shows reflections: alpha rises with the reflected luminance and
     * towards grazing angles (Fresnel), so panes read as glass without a transmission pass.
     */
    const glassMat = (params: THREE.MeshPhysicalMaterialParameters, reflAlpha: number) => {
      const m = new THREE.MeshPhysicalMaterial({ transparent: true, roughness: 0.02, metalness: 0, ior: 1.52, ...params });
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <opaque_fragment>",
          `float odesFres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
          float odesRefl = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
          diffuseColor.a = clamp(diffuseColor.a + odesRefl * ${reflAlpha.toFixed(2)} + odesFres * 0.55, 0.0, 1.0);
          #include <opaque_fragment>`,
        );
      };
      m.customProgramCacheKey = () => `odes-glass-${reflAlpha}`;
      return m;
    };
    const body: Record<BodyBucket, THREE.Material> = {
      paint: new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        map: assets.atlas,
        vertexColors: true, // baked occlusion
        roughness: 0.28,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.15,
      }),
      trim: new THREE.MeshPhysicalMaterial({
        color: "#15181a",
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        side: THREE.DoubleSide,
      }),
      glass: glassMat({ color: "#05090b", opacity: 0.9, envMapIntensity: 1.6 }, 0.6),
      glassClear: glassMat({ color: "#24343a", opacity: 0.2, envMapIntensity: 2.2 }, 0.9),
      chrome: new THREE.MeshStandardMaterial({ color: "#d9dee2", metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }),
      interior: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, envMapIntensity: 0.55 }),
      headlamp: lamp("#ffffff", "#ffffff", {
        map: assets.atlas,
        emissiveMap: assets.atlas,
        metalness: 0.5,
        roughness: 0.14,
        toneMapped: true,
      }),
      tail: lamp("#ffffff", "#ffffff", { map: assets.atlas, emissiveMap: assets.atlas, roughness: 0.12 }),
      indicator: lamp("#6b3c08", "#ffa21a"),
      beaconA: lamp("#5e0b12", "#ff1f2e", { transparent: true, opacity: 0.94 }),
      beaconB: lamp("#c5ced4", "#f4f8ff", { transparent: true, opacity: 0.94 }),
    };
    /**
     * Pure additive light on a transparent canvas: add RGB, keep the destination alpha.
     * (Writing alpha would turn every covered pixel into an opaque dark slab over the page.)
     */
    const lightBlend = {
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      toneMapped: false,
    } as const;
    // All lamp glows in one point cloud: soft core + halo, plus an anamorphic streak on the
    // headlamps. Intensity follows each lamp's facing, so flares bloom only when aimed at you.
    const halos = new THREE.ShaderMaterial({
      uniforms: { uLevel: { value: [0, 0, 0, 0, 0] }, uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aGroup; attribute vec3 aDir; attribute vec3 aColor;
        uniform float uLevel[5]; uniform float uScale;
        varying vec3 vColor; varying float vStreak;
        void main() {
          int g = int(aGroup + 0.5);
          float level = g == 0 ? uLevel[0] : g == 1 ? uLevel[1] : g == 2 ? uLevel[2] : g == 3 ? uLevel[3] : uLevel[4];
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float facing = 1.0;
          if (dot(aDir, aDir) > 0.0) {
            float f = clamp(dot(normalize(normalMatrix * aDir), normalize(-mv.xyz)), 0.0, 1.0);
            facing = mix(0.08, 1.0, pow(f, 1.6));
          }
          float k = level * facing;
          vColor = aColor * k;
          vStreak = g == 0 ? facing * facing : 0.0;
          gl_PointSize = k > 0.002 ? aSize * (1.0 + vStreak * 1.6) * uScale / -mv.z : 0.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vStreak;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float r2 = dot(c, c);
          float glow = exp(-r2 * 60.0) * 1.2 + exp(-r2 * 14.0) * 0.35;
          float streak = vStreak * exp(-pow(c.y * 46.0, 2.0)) * (1.0 - smoothstep(0.05, 0.5, abs(c.x))) * 0.8;
          gl_FragColor = vec4(vColor * (glow + streak), 1.0);
        }`,
      ...lightBlend,
    });
    // Headlight cones, low-beam pool and dome-light diffusers in one additive pass.
    const lightFX = new THREE.ShaderMaterial({
      uniforms: { uHead: { value: 0 }, uInterior: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aKind;
        varying vec2 vUv; varying float vKind; varying vec3 vN; varying vec3 vV; varying float vY;
        void main() {
          vUv = uv; vKind = aKind;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vY = wp.y;
          vec4 mv = viewMatrix * wp;
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uHead; uniform float uInterior;
        varying vec2 vUv; varying float vKind; varying vec3 vN; varying vec3 vV; varying float vY;
        const vec3 WARM = vec3(1.0, 0.93, 0.8);
        void main() {
          vec3 col = vec3(0.0);
          if (vKind < 0.5) {
            // low-beam pattern: two lobes widening with distance, hot spot, soft far cut-off
            float f = vUv.x;
            float lat = vUv.y * 2.0 - 1.0;
            float spread = mix(0.16, 0.62, f);
            float l1 = exp(-pow((lat - 0.3) / spread, 2.0));
            float l2 = exp(-pow((lat + 0.3) / spread, 2.0));
            float lobes = max(l1, l2) * 0.65 + (l1 + l2) * 0.35;
            float along = smoothstep(0.0, 0.07, f) * (1.0 - smoothstep(0.5, 0.97, f));
            float hot = exp(-pow((f - 0.24) / 0.16, 2.0));
            col = WARM * lobes * along * (0.45 + 1.1 * hot) * uHead * 0.95;
          } else if (vKind < 1.5) {
            // volumetric cone: brightest near the lamp, soft at the silhouette, fades out
            float t = vUv.y;
            float face = pow(abs(dot(vN, vV)), 1.8);
            float a = face * pow(1.0 - t, 1.7) * smoothstep(0.0, 0.04, t) * smoothstep(0.0, 0.45, vY);
            col = WARM * a * uHead * 0.42;
          } else {
            // dome-light diffuser with soft rounded falloff
            float e = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
            col = vec3(1.0, 0.97, 0.92) * e * (0.1 + 1.6 * uInterior);
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
      ...lightBlend,
      side: THREE.DoubleSide,
    });
    const tyreTex = createTyreTexture();
    tyreTex.repeat.set(1, 1);
    const tyre = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: tyreTex,
      bumpMap: tyreTex,
      bumpScale: 2.2,
      roughness: 0.9,
      metalness: 0,
    });
    const rim = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.9, roughness: 0.28, side: THREE.DoubleSide });
    const shadow = new THREE.MeshBasicMaterial({
      map: assets.shadow.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      color: "#000000",
    });
    return { body, halos, lightFX, tyre, rim, shadow };
  }, [assets]);
}

export function Ambulance() {
  const logo = useLoader(THREE.ImageLoader, LOGO_URL);
  const gl = useThree((s) => s.gl);

  const assets = useMemo(() => {
    const small = Math.min(window.screen.width, window.screen.height) < 768;
    const budget = small ? 1536 : 2048; // ≤1536 px on phones, ≤3072 px on desktop
    const atlasSize = Math.min(budget, gl.capabilities.maxTextureSize);
    const a = buildAmbulance(logo, { atlasSize, anisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()) });
    debugStats.vertices = a.stats.vertices;
    debugStats.buildMs = a.stats.buildMs;
    return a;
  }, [logo, gl]);
  const m = useMaterials(assets);

  const vehicle = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const sideDoor = useRef<THREE.Group>(null);
  const rearR = useRef<THREE.Group>(null);
  const rearL = useRef<THREE.Group>(null);
  const haloPoints = useRef<THREE.Points>(null);
  const shadowMesh = useRef<THREE.Mesh>(null);
  const cabin = useRef<THREE.PointLight>(null);

  const { tyres, rims } = useMemo(() => {
    const tyres = new THREE.InstancedMesh(assets.tyre, m.tyre, 4);
    const rims = new THREE.InstancedMesh(assets.rim, m.rim, 4);
    tyres.frustumCulled = rims.frustumCulled = false;
    return { tyres, rims };
  }, [assets, m]);

  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const h = assets.halos;
    g.setAttribute("position", new THREE.BufferAttribute(h.position, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(h.color, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(h.size, 1));
    g.setAttribute("aGroup", new THREE.BufferAttribute(h.group, 1));
    g.setAttribute("aDir", new THREE.BufferAttribute(h.dir, 3));
    return g;
  }, [assets]);

  const shadowGeo = useMemo(() => new THREE.PlaneGeometry(assets.shadow.size[0], assets.shadow.size[1]).rotateX(-Math.PI / 2), [assets]);

  // Model is built (this component only mounts once its textures have loaded). The stage
  // marks the first frame; this is only a safety net if that frame never comes.
  useEffect(() => {
    boot.mark("model");
    const id = window.setTimeout(() => boot.mark("frame"), 3000);
    return () => window.clearTimeout(id);
  }, []);

  // Drive-in: waits off-screen and starts once the first frame has actually been drawn
  // (shaders compiled, textures uploaded), so the heavy first render can never eat into
  // it and the van always enters smoothly from the left. Skipped with reduced motion.
  const driveIn = useRef<gsap.core.Tween | null>(null);
  const offDrive = useRef<() => void>(() => {});
  useEffect(() => {
    rig.intro = rig.reducedMotion ? 1 : 0;
    rig.invalidate();
    return () => {
      offDrive.current();
      driveIn.current?.kill();
      rig.intro = 1;
    };
  }, []);

  // Dispose GPU resources on unmount.
  useEffect(
    () => () => {
      Object.values(assets.body).forEach((g) => g.dispose());
      [assets.sideDoor, assets.rearDoorR, assets.rearDoorL].forEach((d) => {
        d.paint.dispose();
        d.glass.dispose();
      });
      assets.tyre.dispose();
      assets.rim.dispose();
      assets.lightFX.dispose();
      [assets.atlas, assets.shadow.texture].forEach((t) => t.dispose());
      Object.values(m.body).forEach((x) => x.dispose());
      m.tyre.map?.dispose();
      [m.tyre, m.rim, m.shadow, m.halos, m.lightFX].forEach((x) => x.dispose());
      haloGeo.dispose();
      shadowGeo.dispose();
      tyres.dispose();
      rims.dispose();
    },
    [assets, m, haloGeo, shadowGeo, tyres, rims],
  );

  const mat4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const qs = useMemo(() => new THREE.Quaternion(), []);
  const v3 = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const Y = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const Z = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const lampW = useMemo(() => new THREE.Vector3(), []);
  const toCam = useMemo(() => new THREE.Vector3(), []);

  const firstFrame = useRef(true);
  useFrame((state) => {
    if (firstFrame.current) {
      firstFrame.current = false;
      requestAnimationFrame(() => {
        // this frame has been drawn
        boot.mark("frame");
        if (rig.reducedMotion) return;
        // The screen already opened before the van was ready (slower devices): the hero is
        // showing the poster still of the parked van, so stay parked and let the poster
        // fade over this identical pose (HeroPoster) instead of driving in.
        if (boot.revealed) {
          rig.intro = 1;
          return;
        }
        // drive in as the loading screen parts
        offDrive.current = boot.onReveal(() => {
          driveIn.current = gsap.fromTo(rig, { intro: 0 }, { intro: 1, duration: 3.1, ease: "none", delay: 0.05 });
        });
      });
    }
    const t = state.clock.elapsedTime;
    rig.clock = t;
    const reduced = rig.reducedMotion;
    const intro = introPose(rig.intro);
    const fx = storyEffects(rig.story);
    const float = floatPose(rig.exit, t, reduced);
    const studio = 1 - float.e; // turntable effects fade as the van leaves the hero
    // mission scene: back on the ground, driving side-on through the landscape
    const road = rig.driveOn && rig.road;
    const drive = roadPose(rig.roadKind, rig.roadKind === "park" ? rig.park : rig.drive, 0, 0, reduced);
    const lift = road ? 0 : float.lift;
    const head = Math.max(rig.headlights, fx.headlights * studio, road ? drive.head : 0);
    const emergency = Math.max(rig.emergency, fx.emergency);

    if (vehicle.current) {
      if (road) {
        vehicle.current.position.set(rig.driveX, 0, 0);
        vehicle.current.rotation.set(0, 0, drive.pitch);
      } else {
        vehicle.current.position.set(intro.x, float.lift, 0);
        vehicle.current.rotation.set(float.roll, rig.userYaw, float.pitch);
      }
    }
    // the contact shadow stays on the ground and softens as the van rises
    if (shadowMesh.current) {
      shadowMesh.current.position.y = 0.004 - lift;
      const sc = 1 + lift * 0.6;
      shadowMesh.current.scale.set(sc, 1, sc);
      m.shadow.opacity = Math.max(0, 1 - lift * 1.1) * (0.45 + 0.55 * studio);
    }
    if (body.current && !reduced) {
      body.current.position.y = intro.squat;
      body.current.rotation.z = intro.pitch;
    }

    // Wheels: spin follows distance travelled; front wheels steer.
    const roll = (road ? rig.driveX + drive.travel : intro.x) / SPEC.tyreRadius;
    assets.wheels.forEach((w, i) => {
      q.setFromAxisAngle(Y, (w.front ? fx.steer : 0) + (w.left ? Math.PI : 0));
      qs.setFromAxisAngle(Z, w.left ? roll : -roll);
      q.multiply(qs);
      mat4.compose(v3.set(w.x, w.y, w.z), q, one);
      tyres.setMatrixAt(i, mat4);
      rims.setMatrixAt(i, mat4);
    });
    tyres.instanceMatrix.needsUpdate = true;
    rims.instanceMatrix.needsUpdate = true;

    // Doors
    const sd = slidingDoorPose(Math.max(rig.sideDoor, fx.sideDoor));
    sideDoor.current?.position.set(sd.back, 0, sd.out);
    const rd = rearDoorAngles(Math.max(rig.rearDoors, fx.rearDoors));
    if (rearR.current) rearR.current.rotation.y = rd.right;
    if (rearL.current) rearL.current.rotation.y = -rd.left;

    // Lamps
    const [fa, fb] = emergency > 0 ? (reduced ? [1, 1] : flashPattern(t)) : [0, 0];
    const ind = rig.hazards * (reduced ? 1 : blink(t));
    const tail = Math.min(1, 0.3 * head + intro.brake);
    const level: Record<HaloGroup, number> = {
      head,
      tail,
      indicator: ind,
      beaconA: fa * emergency,
      beaconB: fb * emergency,
    };
    (m.body.headlamp as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.55 + head * 2.4; // LED DRL always on
    (m.body.tail as THREE.MeshPhysicalMaterial).emissiveIntensity = tail * 2.6;
    (m.body.indicator as THREE.MeshPhysicalMaterial).emissiveIntensity = ind * 2.4;
    (m.body.beaconA as THREE.MeshPhysicalMaterial).emissiveIntensity = level.beaconA * 3.2;
    (m.body.beaconB as THREE.MeshPhysicalMaterial).emissiveIntensity = level.beaconB * 2.4;
    const lv = m.halos.uniforms.uLevel.value as number[];
    HALO_GROUPS.forEach((k, i) => (lv[i] = level[k] * (k === "head" ? 0.85 : 0.95)));
    m.halos.uniforms.uScale.value = (state.size.height * state.gl.getPixelRatio()) / 2;
    if (haloPoints.current) haloPoints.current.visible = lv.some((x) => x > 0.002);
    m.lightFX.uniforms.uHead.value = head * studio;
    // cabin dome lights come on with any open door, like the real vehicle
    const doorsOpen = Math.max(rig.sideDoor, fx.sideDoor, rig.rearDoors, fx.rearDoors);
    m.lightFX.uniforms.uInterior.value = doorsOpen;
    if (cabin.current) cabin.current.intensity = doorsOpen * 9;

    // Project the headlamp centre to screen so the HTML copy can be lit and shadowed by it.
    if (body.current) {
      body.current.localToWorld(lampW.set(NOSE_X + 0.05, 0.96, 0));
      toCam.copy(state.camera.position).sub(lampW).normalize();
      const yaw = rig.userYaw;
      const facing = Math.cos(yaw) * toCam.x - Math.sin(yaw) * toCam.z; // vehicle forward · view
      lampW.project(state.camera);
      const onScreen = lampW.z < 1 && Math.abs(lampW.x) < 1.6 && Math.abs(lampW.y) < 1.6;
      rig.lamp.x = ((lampW.x + 1) / 2) * state.size.width;
      rig.lamp.y = ((1 - lampW.y) / 2) * state.size.height;
      rig.lamp.a = onScreen ? (0.35 + 0.9 * head) * smoothstep(0.05, 0.75, facing) : 0;
    }

    // Idle: let studio reflections drift slowly across the paint.
    if (!reduced) state.scene.environmentRotation.y = t * 0.025;
  });

  const click = (key: ToggleKey) => (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // was a drag
    e.stopPropagation();
    toggle(key);
  };
  const hover = (on: boolean) => () => {
    document.body.style.cursor = on ? "pointer" : "";
  };

  return (
    <group ref={vehicle}>
      <mesh ref={shadowMesh} geometry={shadowGeo} material={m.shadow} position={[0, 0.004, 0]} renderOrder={-1} />
      <group ref={body}>
        {(Object.keys(assets.body) as BodyBucket[]).map((k) => (
          <mesh
            key={k}
            geometry={assets.body[k]}
            material={m.body[k]}
            renderOrder={k === "glass" || k === "glassClear" ? 2 : 0}
          />
        ))}
        <group ref={sideDoor} onClick={click("sideDoor")} onPointerOver={hover(true)} onPointerOut={hover(false)}>
          <mesh geometry={assets.sideDoor.paint} material={m.body.paint} />
          <mesh geometry={assets.sideDoor.glass} material={m.body.glass} renderOrder={2} />
        </group>
        {[
          { ref: rearR, d: assets.rearDoorR },
          { ref: rearL, d: assets.rearDoorL },
        ].map(({ ref, d }, i) => (
          <group
            key={i}
            ref={ref}
            position={d.hinge}
            onClick={click("rearDoors")}
            onPointerOver={hover(true)}
            onPointerOut={hover(false)}
          >
            <mesh geometry={d.paint} material={m.body.paint} />
            <mesh geometry={d.glass} material={m.body.glass} renderOrder={2} />
          </group>
        ))}
        <points ref={haloPoints} geometry={haloGeo} material={m.halos} visible={false} renderOrder={3} frustumCulled={false} />
        <mesh geometry={assets.lightFX} material={m.lightFX} renderOrder={4} frustumCulled={false} />
        <pointLight ref={cabin} position={assets.cabinLight} intensity={0} distance={5.5} decay={2} color="#fff3e2" />
      </group>
      <primitive object={tyres} />
      <primitive object={rims} />
    </group>
  );
}

useLoader.preload(THREE.ImageLoader, LOGO_URL);
