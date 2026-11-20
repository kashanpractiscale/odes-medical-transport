"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { pageTransition } from "@/components/transition/store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Opening of every inner page, in the home hero's studio light: an eyebrow, a big
 * line-by-line title, an intro and actions, with a huge outlined watermark word drifting
 * behind. The entrance is CSS (see .ph-* in globals.css): it plays from the first paint on a
 * direct load, and waits for the curtain to lift after a page transition.
 */
export function PageHero({
  eyebrow,
  lines,
  accent,
  intro,
  watermark,
  children,
}: {
  eyebrow: string;
  /** Title, one entry per line. */
  lines: string[];
  /** Index of the line set in gold. */
  accent?: number;
  intro: ReactNode;
  watermark: string;
  /** Actions (buttons) under the intro. */
  children?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Arrived by page transition: hold the entrance at its first frame under the curtain and
  // play it as the curtain lifts (layout effect: before the browser paints this page).
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !pageTransition.busy) return;
    const anims = el.getAnimations({ subtree: true });
    anims.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    return pageTransition.onEnter(() => anims.forEach((a) => a.play()));
  }, []);

  useGSAP(
    () => {
      if (reduced) return;
      // the watermark drifts slower than the page, the copy a touch faster: depth
      gsap.to("[data-watermark]", {
        yPercent: 35,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to("[data-hero-copy]", {
        y: -60,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className="relative isolate flex min-h-[86svh] items-end overflow-clip bg-ink pb-16 pt-36 sm:pb-24 sm:pt-44">
      <div aria-hidden className="studio-backdrop absolute inset-0 -z-10" />
      <p
        aria-hidden
        data-watermark
        className="mission-outline pointer-events-none absolute -right-[4vw] top-[12%] -z-10 select-none whitespace-nowrap font-display text-[clamp(8rem,26vw,24rem)] uppercase leading-none will-change-transform"
      >
        {watermark}
      </p>

      <div data-hero-copy className="mx-auto w-full max-w-7xl px-5 will-change-transform sm:px-8">
        <p className="ph-fade mb-6 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold" style={{ "--i": -2 } as React.CSSProperties}>
          <span className="ph-rule h-px w-10 bg-gold" />
          {eyebrow}
        </p>
        <h1 className="font-display text-[clamp(3.3rem,min(12vw,15vh),9.5rem)] uppercase leading-[0.86]">
          <span className="sr-only">{lines.join(" ")}</span>
          {lines.map((l, i) => (
            <span key={l} aria-hidden className="block overflow-hidden pb-[0.04em]">
              <span className={`ph-line block ${i === accent ? "text-gold" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                {l}
              </span>
            </span>
          ))}
        </h1>
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="ph-fade max-w-xl text-pretty text-lg leading-relaxed text-white/75 sm:text-xl" style={{ "--i": lines.length } as React.CSSProperties}>
            {intro}
          </div>
          {children && (
            <div className="ph-fade flex flex-wrap gap-3" style={{ "--i": lines.length + 1 } as React.CSSProperties}>
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
