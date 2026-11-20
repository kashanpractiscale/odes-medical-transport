"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { boot } from "./loader/boot";
import { useReducedMotion } from "./hero/useReducedMotion";
import { scroller } from "./scroll";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so scroll position, ScrollTrigger
 * scrubs, the caption timeline and the 3D camera all advance on the same frame.
 * Disabled entirely for users who prefer reduced motion (native scrolling instead).
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.085, // lower = silkier glide, higher = snappier
      smoothWheel: true,
      wheelMultiplier: 0.9,
      anchors: { offset: 0, duration: 1.4 }, // in-page links glide instead of jumping
    });
    lenis.on("scroll", ScrollTrigger.update);
    scroller.lenis = lenis;
    // hold the page still behind the loading screen
    if (!boot.revealed) lenis.stop();
    const offReveal = boot.onReveal(() => lenis.start());
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // keep Lenis and GSAP on one clock, even after a stall
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      offReveal();
      if (scroller.lenis === lenis) scroller.lenis = null;
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}
