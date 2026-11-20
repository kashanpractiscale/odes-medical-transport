import type Lenis from "lenis";

/** The page's Lenis instance (null under reduced motion, where native scrolling is used). */
export const scroller: { lenis: Lenis | null } = { lenis: null };

export function scrollToTop(immediate = false) {
  if (scroller.lenis) scroller.lenis.scrollTo(0, { immediate, force: true });
  else window.scrollTo({ top: 0, behavior: immediate ? "instant" : "smooth" });
}

/** Holds the page still (e.g. under the transition curtain or the mobile menu). */
export function lockScroll(on: boolean) {
  if (scroller.lenis) {
    if (on) scroller.lenis.stop();
    else scroller.lenis.start();
  }
  document.documentElement.style.overflow = on ? "hidden" : "";
}
