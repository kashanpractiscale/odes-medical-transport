/**
 * Shared, mutable animation state read every frame by the 3D scene, plus a tiny
 * external store so React UI can reflect the user's toggles.
 */
import gsap from "gsap";
import { useSyncExternalStore } from "react";

export type RoadKind = "drive" | "park";

export type ToggleKey = "headlights" | "emergency" | "hazards" | "sideDoor" | "rearDoors";

export const rig = {
  /** Drive-in progress (linear time, 0‥1). */
  intro: 0,
  /** Scroll story progress (0‥1), scrubbed by ScrollTrigger. */
  story: 0,
  /** Hand-off from the hero turntable to the next section (0‥1), scrubbed on scroll. */
  exit: 0,
  /** Element the van floats into after leaving the hero (its screen rect is tracked). */
  slot: null as HTMLElement | null,
  /** Road band the van is on (mission scene, footer); while `driveOn` it is side-on there. */
  road: null as HTMLElement | null,
  roadKind: "drive" as RoadKind,
  driveOn: false,
  /** Arrival in the footer (0‥1): drives in from the left and parks. */
  park: 0,
  /** Progress through the mission scene (0‥1), scrubbed on scroll. */
  drive: 0,
  /** Van x (m) in the mission scene, written by the camera which knows the frame width. */
  driveX: 0,
  /** User drag rotation (radians). */
  userYaw: 0,
  dragging: false,
  // eased toggle progress (0‥1)
  headlights: 0,
  emergency: 0,
  hazards: 0,
  sideDoor: 0,
  rearDoors: 0,
  reducedMotion: false,
  /** Scene clock (s), written by the 3D loop so DOM effects can sync to the lamps. */
  clock: 0,
  /** Pointer target (−1‥1) and its smoothed value, shared by the camera and the copy. */
  ptr: { x: 0, y: 0 },
  ptrS: { x: 0, y: 0 },
  /** Headlamp centre projected to screen pixels, with its visible strength (0‥1). */
  lamp: { x: -9999, y: -9999, a: 0 },
  /** Requests a frame when the canvas renders on demand. Set by the stage. */
  invalidate: () => {},
};

const DURATION: Record<ToggleKey, number> = {
  headlights: 0.25,
  emergency: 0.3,
  hazards: 0.2,
  sideDoor: 1.6,
  rearDoors: 1.8,
};

let toggles: Record<ToggleKey, boolean> = {
  headlights: false,
  emergency: false,
  hazards: false,
  sideDoor: false,
  rearDoors: false,
};
const listeners = new Set<() => void>();

export function setToggle(key: ToggleKey, on: boolean) {
  if (toggles[key] === on) return;
  toggles = { ...toggles, [key]: on };
  listeners.forEach((l) => l());
  gsap.to(rig, {
    [key]: on ? 1 : 0,
    duration: rig.reducedMotion ? 0 : DURATION[key],
    ease: key === "sideDoor" || key === "rearDoors" ? "power2.inOut" : "power1.out",
    overwrite: "auto",
    onUpdate: () => rig.invalidate(),
  });
}

export const toggle = (key: ToggleKey) => setToggle(key, !toggles[key]);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => toggles;

export function useToggles() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** A section takes (or releases) the van: it switches to a side-on shot on that road. */
export function claimRoad(el: HTMLElement | null, kind: RoadKind, on: boolean) {
  if (on && el) {
    rig.road = el;
    rig.roadKind = kind;
    rig.driveOn = true;
  } else if (rig.road === el) {
    rig.driveOn = false;
  }
  rig.invalidate();
}
