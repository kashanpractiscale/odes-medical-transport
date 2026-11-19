/**
 * Boot progress for the loading screen: real milestones, weighted by how long they
 * usually take, plus a single "reveal" moment that the hero waits for (van drive-in,
 * headline entrance, smooth scrolling) so nothing plays behind the loader.
 */
const WEIGHTS = {
  fonts: 0.15, // display fonts ready (the 3D lettering is drawn with them)
  stage: 0.35, // three.js chunk downloaded and the WebGL canvas created
  model: 0.3, // van geometry built, livery and logo textures ready
  frame: 0.2, // first frame with the van rendered
} as const;
export type BootStep = keyof typeof WEIGHTS;

const done = new Set<BootStep>();
const waiting = new Set<() => void>();
let revealed = false;

export const boot = {
  mark(step: BootStep) {
    if (done.has(step)) return;
    done.add(step);
    performance.mark(`boot:${step}`); // visible in DevTools > Performance > Timings
  },
  /** 0‥1, the share of weighted milestones reached. */
  progress() {
    let p = 0;
    done.forEach((s) => (p += WEIGHTS[s]));
    return Math.min(1, p);
  },
  get revealed() {
    return revealed;
  },
  /** The loader is opening: start whatever was waiting. */
  reveal() {
    if (revealed) return;
    revealed = true;
    performance.mark("boot:reveal");
    waiting.forEach((f) => f());
    waiting.clear();
  },
  /** Runs `f` at the reveal (immediately if it already happened). Returns an unsubscribe. */
  onReveal(f: () => void) {
    if (revealed) {
      f();
      return () => {};
    }
    waiting.add(f);
    return () => {
      waiting.delete(f);
    };
  },
};
