"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { COMMITMENT, TAGLINE, WHY } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Why choose Odes. The tagline band slides sideways against the scroll, and the two card
 * columns drift at different speeds (small offsets, never the reading text itself
 * moving fast) so the grid has depth as it passes.
 */
export function WhyOdes() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(root);
      const scrub = { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.6 };
      gsap.fromTo(q("[data-band='a']"), { xPercent: 0 }, { xPercent: -18, ease: "none", scrollTrigger: scrub });
      gsap.fromTo(q("[data-band='b']"), { xPercent: -18 }, { xPercent: 0, ease: "none", scrollTrigger: scrub });
      q("[data-speed]").forEach((el) => {
        const s = Number(el.dataset.speed);
        gsap.fromTo(el, { y: 70 * s }, { y: -70 * s, ease: "none", scrollTrigger: scrub });
      });
      gsap.from(q("[data-card]"), {
        autoAlpha: 0,
        y: 40,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: q("[data-cards]")[0], start: "top 80%", once: true },
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  const band = (k: "a" | "b", outline: boolean) => (
    <div data-band={k} className="flex w-max gap-10 whitespace-nowrap will-change-transform">
      {Array.from({ length: 3 }, (_, r) =>
        TAGLINE.map((t, i) => (
          <span
            key={`${r}-${i}`}
            className={`font-display text-[clamp(3.5rem,9vw,8.5rem)] uppercase leading-none ${
              outline ? "mission-outline" : (r + i) % 2 ? "text-white/10" : "text-gold/80"
            }`}
          >
            {t}
            <span className="ml-10 text-gold/60">•</span>
          </span>
        )),
      )}
    </div>
  );

  return (
    <section id="why" aria-labelledby="why-title" ref={root} className="relative z-10 overflow-clip bg-ink py-24 text-white sm:py-32">
      <div aria-hidden className="pointer-events-none select-none space-y-2">
        {band("a", false)}
        {band("b", true)}
      </div>

      <div className="mx-auto mt-20 grid max-w-7xl gap-14 px-5 sm:px-8 lg:mt-28 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
            <span className="h-px w-10 bg-gold" />
            Why choose Odes
          </p>
          <h2 id="why-title" className="text-balance font-display text-[clamp(2.6rem,min(6vw,9vh),5rem)] uppercase leading-[0.9]">
            The ride is part of the care
          </h2>
          <blockquote className="mt-8 max-w-md border-l-2 border-gold/60 pl-5 text-pretty text-lg leading-relaxed text-white/75">
            {COMMITMENT}
          </blockquote>
        </div>

        <div data-cards className="grid gap-5 sm:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} data-speed={col ? 0.6 : 0.15} className={`grid content-start gap-5 ${col ? "sm:mt-16" : ""}`}>
              {WHY.filter((_, i) => i % 2 === col).map((w) => {
                const n = WHY.indexOf(w) + 1;
                return (
                  <article
                    key={w.name}
                    data-card
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 transition-colors duration-300 hover:border-gold/40 sm:p-8"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-2 -top-6 font-display text-[7.5rem] leading-none text-white/[0.04] transition-colors duration-300 group-hover:text-gold/10"
                    >
                      {String(n).padStart(2, "0")}
                    </span>
                    <h3 className="relative font-display text-[clamp(1.6rem,2.6vw,2.1rem)] uppercase leading-none">{w.name}</h3>
                    <p className="relative mt-4 text-pretty leading-relaxed text-white/70">{w.body}</p>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
