/**
 * Pure, reversible motion functions. Every pose is a function of a progress value
 * (0‥1) or of time — never accumulated state — so scrubbing backwards always lands
 * on exactly the same pose.
 */
import { clamp, lerp, smoothstep } from "./surface";

export const DEG = Math.PI / 180;

/** Rises over [a,b], holds, falls over [c,d]. */
export const bump = (x: number, a: number, b: number, c: number, d: number) =>
  smoothstep(a, b, x) * (1 - smoothstep(c, d, x));

// ---------------------------------------------------------------------------
// Doors

/** Sliding door: pops outward on its track, then slides rearward. */
export function slidingDoorPose(p: number) {
  return { out: 0.115 * smoothstep(0, 0.28, p), back: -1.24 * smoothstep(0.14, 1, p) };
}

/** Rear barn doors open to 105°; the curb-side (right) door leads. */
export function rearDoorAngles(p: number) {
  const open = 105 * DEG;
  return { right: open * smoothstep(0, 0.8, p), left: open * smoothstep(0.2, 1, p) };
}

// ---------------------------------------------------------------------------
// Drive-in intro (t: 0‥1 linear time)

const INTRO_DISTANCE = 15;

export function introPose(t: number) {
  const k = clamp(t, 0, 1);
  const travel = 1 - Math.pow(1 - k, 3); // decelerating arrival
  const x = -INTRO_DISTANCE * (1 - travel);
  const braking = bump(k, 0.38, 0.55, 0.9, 1.0);
  // nose dips under braking, then settles with one small rebound
  const settle = k > 0.9 ? Math.sin(((k - 0.9) / 0.1) * Math.PI) * 0.0025 : 0;
  const pitch = -0.006 * braking + settle;
  const squat = -0.012 * braking;
  return { x, brake: braking, pitch, squat };
}

// ---------------------------------------------------------------------------
// Lamps

/**
 * Emergency warning-light pattern.
 * Returns intensities [groupA, groupB] in 0‥1 for time t in seconds.
 * Group A = red lenses (outer light-bar + rear roof), group B = white lenses (centre).
 *
 * TODO(you): shape the flash pattern. See the note in the hand-off message.
 */
export function flashPattern(t: number): [number, number] {
  // Placeholder: simple 1.5 Hz alternation.
  const phase = (t * 1.5) % 1;
  return phase < 0.5 ? [1, 0] : [0, 1];
}

/** Turn-signal / hazard blink (≈ 1.5 Hz, 50 % duty). */
export const blink = (t: number) => ((t * 1.5) % 1 < 0.5 ? 1 : 0);

// ---------------------------------------------------------------------------
// Scroll story → camera + vehicle demonstrations

export type View = { at: number; az: number; el: number; dist: number; ty: number; shift: number };

/** Keyframed camera orbit (degrees). Azimuth 0° = in front of the van, 90° = its right side. */
export const VIEWS: View[] = [
  { at: 0.0, az: 36, el: 8, dist: 12.4, ty: 1.2, shift: 1 }, // hero ¾ front
  { at: 0.17, az: 90, el: 3, dist: 15.5, ty: 1.3, shift: 1 }, // side profile — sliding door
  { at: 0.34, az: 143, el: 11, dist: 11.4, ty: 1.3, shift: 1 }, // ¾ rear — rear doors
  { at: 0.5, az: 180, el: 5, dist: 10.6, ty: 1.4, shift: 1 }, // rear — branding
  { at: 0.66, az: 250, el: 70, dist: 14.4, ty: 0.9, shift: 1 }, // top — warning lights
  { at: 0.83, az: 360, el: 4, dist: 10.4, ty: 1.15, shift: 1 }, // front — headlights + steering
  { at: 1.0, az: 396, el: 12, dist: 13.8, ty: 1.2, shift: 1 }, // closing ¾ front
];

/** Camera pose for story progress s. Reduced motion snaps to the nearest keyframe. */
export function cameraAt(s: number, reduced: boolean): Omit<View, "at"> {
  const p = clamp(s, 0, 1);
  if (reduced) {
    let best = VIEWS[0];
    for (const v of VIEWS) if (Math.abs(v.at - p) < Math.abs(best.at - p)) best = v;
    return best;
  }
  let i = 0;
  while (i < VIEWS.length - 2 && p > VIEWS[i + 1].at) i++;
  const a = VIEWS[i];
  const b = VIEWS[i + 1];
  // dwell near each keyframe so captions can be read
  const t = smoothstep(0.12, 0.88, (p - a.at) / (b.at - a.at));
  return {
    az: lerp(a.az, b.az, t),
    el: lerp(a.el, b.el, t),
    dist: lerp(a.dist, b.dist, t),
    ty: lerp(a.ty, b.ty, t),
    shift: lerp(a.shift, b.shift, t),
  };
}

/** Story-driven demonstrations, layered with the user's own toggles via max(). */
export function storyEffects(s: number) {
  return {
    sideDoor: bump(s, 0.12, 0.2, 0.27, 0.32),
    rearDoors: bump(s, 0.27, 0.34, 0.41, 0.46),
    emergency: bump(s, 0.6, 0.64, 0.74, 0.78),
    headlights: smoothstep(0.76, 0.82, s),
    steer: 0.42 * bump(s, 0.8, 0.86, 0.93, 0.98),
  };
}

// ---------------------------------------------------------------------------
// Hero → next section hand-off

export const easeInOut = (t: number) => {
  const k = clamp(t, 0, 1);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};

/**
 * The van lifts off the turntable and floats: a lift that arcs higher mid-flight, then a
 * gentle bob, pitch and roll once it has settled. Pure in (exit progress, time).
 */
export function floatPose(exit: number, t: number, reduced: boolean) {
  const e = easeInOut(exit);
  const arc = Math.sin(Math.PI * clamp(exit, 0, 1)) * 0.35; // extra height while travelling
  const bob = reduced ? 0 : Math.sin(t * 1.15) * 0.07 * e;
  return {
    e,
    lift: 0.32 * e + arc + bob,
    pitch: reduced ? 0 : Math.sin(t * 0.8) * 0.018 * e,
    roll: reduced ? 0 : Math.sin(t * 0.65 + 1.3) * 0.022 * e,
    sway: reduced ? 0 : Math.sin(t * 0.3) * 6 * e, // slow turn on the spot (degrees)
  };
}

// ---------------------------------------------------------------------------
// Mission scene: the van drives through the parallax landscape (p: 0‥1 scroll)

/** World distance (m) covered across the whole scene; sets wheel spin and road speed. */
export const DRIVE_DISTANCE = 140;

/**
 * Side-on tracking shot. `sx` is the van's centre in half-screen-widths (−1 left edge,
 * +1 right edge) and `F` is the van's length as a fraction of the screen width, so the
 * van starts and ends fully off-screen whatever the viewport.
 * Enters decelerating, cruises while the world scrolls past, then pulls away.
 */
export function drivePose(p: number, F: number, reduced: boolean) {
  const off = 1 + F + 0.06;
  const enter = 1 - Math.pow(1 - smoothstep(0, 0.16, p), 2);
  const leave = Math.pow(smoothstep(0.86, 1, p), 2);
  const cruise = clamp((p - 0.16) / 0.7, 0, 1);
  let sx = lerp(-off, -0.2, enter);
  if (p > 0.16) sx = lerp(-0.2, 0.12, cruise);
  if (p > 0.86) sx = lerp(0.12, off, leave);
  const travel = p * DRIVE_DISTANCE;
  return {
    sx,
    travel,
    head: 1 - smoothstep(0.35, 0.6, p), // dusk → dawn: lamps off as the sun comes up
    pitch: reduced ? 0 : Math.sin(travel * 1.7) * 0.0025 - 0.006 * (1 - enter) * enter * 4,
  };
}

/**
 * Footer arrival: the van drives in from off-screen left and brakes to a stop at `stop`
 * (half-screen-widths from the centre), lamps on. q: 0‥1 scroll.
 */
export function parkPose(q: number, F: number, stop: number, reduced: boolean) {
  const k = clamp(q, 0, 1);
  const arrive = 1 - Math.pow(1 - k, 3); // decelerating, like the hero drive-in
  const braking = bump(k, 0.55, 0.78, 0.9, 1);
  return {
    sx: lerp(-(1 + F + 0.06), stop, arrive),
    travel: 0, // wheels roll with the van's own movement
    head: 1,
    pitch: reduced ? 0 : -0.006 * braking,
  };
}

export function roadPose(kind: "drive" | "park", p: number, F: number, stop: number, reduced: boolean) {
  return kind === "park" ? parkPose(p, F, stop, reduced) : drivePose(p, F, reduced);
}
