/**
 * Page-transition coordination. The layout-level <PageTransition> registers the runner;
 * <TransitionLink> asks it to travel; pages ask when to play their entrance (as the curtain
 * lifts after a transition, or straight away on a direct load).
 */
type Runner = (href: string) => boolean;

let runner: Runner | null = null;
let busy = false;
const enterListeners = new Set<() => void>();

export const pageTransition = {
  register(fn: Runner) {
    runner = fn;
    return () => {
      if (runner === fn) runner = null;
    };
  },
  /** Starts a transition to `href`; false if none could start (then navigate normally). */
  go(href: string) {
    return runner ? runner(href) : false;
  },
  get busy() {
    return busy;
  },
  setBusy(on: boolean) {
    busy = on;
  },
  /** Called by the runner as the curtain starts to lift off the new page. */
  entered() {
    enterListeners.forEach((f) => f());
    enterListeners.clear();
  },
  /**
   * Runs `f` when the page may play its entrance: now if no transition is covering the
   * screen, otherwise as the curtain lifts. Returns an unsubscribe.
   */
  onEnter(f: () => void) {
    if (!busy) {
      f();
      return () => {};
    }
    enterListeners.add(f);
    return () => enterListeners.delete(f);
  },
};
