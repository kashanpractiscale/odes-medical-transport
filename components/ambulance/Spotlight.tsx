"use client";
/* eslint-disable react-hooks/immutability -- R3F: three.js objects are mutated per frame inside useFrame, outside React render, by design. */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { boot } from "@/components/loader/boot";
import { rig } from "./rig";
import { smoothstep } from "./surface";

/** Lamp height above the turntable and the radius of its pool on the floor (m). */
const H = 11;
const POOL = 5.2; // just outside the 4.6 m turntable dial, so the whole van stands in the light
const APERTURE = 0.35;
const WARM = new THREE.Color("#ffe8c2");
/** Peak spotlight intensity (candela; physical lights, decay 2 → ≈ 1.8 lux on the roof). */
const POWER = 230;

/**
 * Light switching on: a short stutter, then it settles to full (t in seconds since the switch).
 * A stage lamp "clunk", over in about a second.
 */
function powerOn(t: number) {
  if (t <= 0) return 0;
  if (t < 0.05) return 0.75;
  if (t < 0.13) return 0.1;
  if (t < 0.19) return 0.9;
  if (t < 0.29) return 0.3;
  return Math.min(1, 0.65 + (t - 0.29) * 1.4);
}

/** Back faces of the cone, so the haze sits behind and around the van and never veils it. */
const shaftShader = {
  vertexShader: /* glsl */ `
    varying float vH;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vH = uv.y; // 0 at the floor, 1 at the lamp
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uPower;
    varying float vH;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      // light travels furthest through the middle of the beam and not at all at its edge
      float depth = pow(abs(dot(normalize(vN), normalize(vV))), 1.1);
      // strongest near the lamp, thinning towards the floor; hide the hard rim at the lamp
      float along = mix(0.25, 1.0, vH) * smoothstep(0.0, 0.35, vH) * (1.0 - smoothstep(0.9, 1.0, vH));
      gl_FragColor = vec4(uColor, depth * along * uPower);
    }
  `,
};

/** Pool of light on the floor (the floor itself is an unlit texture). */
const poolShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uPower;
    varying vec2 vUv;
    void main() {
      float d = length(vUv - 0.5) * 2.0; // 0 centre → 1 rim
      float pool = 1.0 - smoothstep(0.62, 1.0, d); // soft penumbra edge
      float hot = 1.0 - smoothstep(0.0, 0.7, d);   // brighter under the lamp
      gl_FragColor = vec4(uColor, (pool * 0.55 + hot * 0.3) * uPower);
    }
  `,
};

/**
 * Overhead stage spotlight for the hero turntable: a real (shadowless) SpotLight that lights
 * the van, plus a fake light shaft and floor pool. Cost: one extra light in the van's shaders
 * and two additive draw calls; no shadow map, no post-processing. Everything stays in the
 * scene from the first frame (only intensities change), so the shaders are compiled in the
 * warm-up and turning the light on never triggers a recompile. Switches on once the van has
 * parked (which also matches the unlit poster still used on slow devices), and fades out
 * with the turntable floor as the van leaves the hero.
 */
export function Spotlight() {
  const { light, shaft, pool } = useMemo(() => {
    const light = new THREE.SpotLight(WARM, 0, 0, Math.atan(POOL / H), 0.55, 2);
    light.position.set(0, H, 0);
    light.target.position.set(0, 0, 0);
    light.castShadow = false;

    const uniforms = () => ({ uColor: { value: WARM }, uPower: { value: 0 } });
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

    // open cone from the lamp aperture down to the pool (apex at the lamp)
    const shaftGeo = new THREE.CylinderGeometry(APERTURE, POOL, H, 48, 1, true).translate(0, H / 2, 0);
    const shaft = new THREE.Mesh(
      shaftGeo,
      new THREE.ShaderMaterial({ ...shaftShader, ...additive, uniforms: uniforms(), side: THREE.BackSide }),
    );
    shaft.renderOrder = 1;

    const poolGeo = new THREE.CircleGeometry(POOL, 64).rotateX(-Math.PI / 2).translate(0, 0.004, 0);
    const pool = new THREE.Mesh(poolGeo, new THREE.ShaderMaterial({ ...poolShader, ...additive, uniforms: uniforms() }));
    pool.renderOrder = -1; // over the floor disc (-2), under everything else
    return { light, shaft, pool };
  }, []);

  useEffect(
    () => () => {
      for (const m of [shaft, pool]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      light.dispose();
    },
    [light, shaft, pool],
  );

  const onAt = useRef<number | null>(null);
  useFrame((state) => {
    // switch on shortly after the van has parked (straight away for reduced motion)
    let on = 1;
    if (!rig.reducedMotion) {
      if (onAt.current === null && boot.revealed && rig.intro >= 1) onAt.current = state.clock.elapsedTime + 0.2;
      on = onAt.current === null ? 0 : powerOn(state.clock.elapsedTime - onAt.current);
    }
    // gone with the turntable as the van flies on to the next section
    const level = on * (1 - smoothstep(0, 0.6, rig.exit));
    light.intensity = POWER * level;
    rig.spot = level;
    (shaft.material as THREE.ShaderMaterial).uniforms.uPower.value = 0.5 * level;
    (pool.material as THREE.ShaderMaterial).uniforms.uPower.value = 0.55 * level;
    // skip the fill cost once the hero has gone (kept visible while dark at the start, so
    // the warm-up compiles their shaders before the first frame)
    const show = rig.exit < 0.6;
    shaft.visible = show;
    pool.visible = show;
  });

  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
      <primitive object={shaft} />
      <primitive object={pool} />
    </>
  );
}
