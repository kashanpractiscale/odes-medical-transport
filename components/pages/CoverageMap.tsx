"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { promoteWhile } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * Places across Los Angeles County, in miles east (x) and north (y) of the Gardena base
 * (33.888° N, 118.309° W; 1° lat ≈ 69 mi, 1° lon ≈ 57.3 mi at this latitude). Approximate,
 * for orientation only: the service area is the whole county.
 */
const PLACES: { name: string; x: number; y: number; side?: "l" | "r" }[] = [
  { name: "Downtown LA", x: 3.4, y: 11.2 },
  { name: "Westside", x: -10.4, y: 9.1, side: "l" },
  { name: "Malibu", x: -27, y: 9.8, side: "l" },
  { name: "LAX", x: -5.2, y: 3.6, side: "l" },
  { name: "South Bay", x: -1.8, y: -3.7, side: "l" },
  { name: "Long Beach", x: 6.8, y: -8.2 },
  { name: "Pasadena", x: 9.4, y: 18 },
  { name: "San Fernando Valley", x: -8.1, y: 20.9, side: "l" },
  { name: "Santa Clarita", x: -13.2, y: 34.7, side: "l" },
  { name: "San Gabriel Valley", x: 21, y: 12.6 },
  { name: "Pomona", x: 32, y: 11.5 },
  { name: "Antelope Valley", x: 9.7, y: 52 },
];
// viewBox in miles (x east, −y north): x −42…48, y −60…14
const VB = { x: -42, y: -60, w: 90, h: 74 };
const pct = (x: number, y: number) => ({ left: `${((x - VB.x) / VB.w) * 100}%`, top: `${((-y - VB.y) / VB.h) * 100}%` });
const RINGS = [10, 20, 30, 40, 50];

export function CoverageMap() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const pops = gsap.utils.toArray<HTMLElement>("[data-pop]", root.current);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
        ...promoteWhile(pops),
      });
      tl.fromTo("[data-route]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.06 })
        .from("[data-dot]", { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(2.4)", stagger: 0.06 }, 0.5)
        .from(pops, { autoAlpha: 0, y: 8, duration: 0.5, ease: "power3.out", stagger: 0.06 }, 0.55);
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  const c = pct(0, 0);
  return (
    <div
      ref={root}
      role="img"
      aria-label="Map of Los Angeles County centred on our Gardena base, showing approximate distances to areas across the county, from the South Bay and Long Beach to the San Fernando Valley, the San Gabriel Valley and the Antelope Valley."
      className="relative isolate aspect-[90/74] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#061111] bg-[radial-gradient(70%_80%_at_47%_80%,rgb(15_118_110/0.30),transparent_70%)]"
    >
      {/* sweep: one rotating gradient on its own layer */}
      <div
        aria-hidden
        className="radar-sweep absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ ...c, width: `${((2 * 50) / VB.w) * 100}%` }}
      />
      <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="absolute inset-0 size-full" aria-hidden>
        {RINGS.map((r) => (
          <circle key={r} r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={0.18} strokeDasharray="0.6 0.9" />
        ))}
        <path d="M-42 0H48M0 -60V14" stroke="rgb(255 255 255 / 0.06)" strokeWidth={0.15} />
        {PLACES.map((p) => (
          <path
            key={p.name}
            data-route
            d={`M0 0Q${p.x * 0.5 + p.y * 0.12} ${-p.y * 0.5 + p.x * 0.12} ${p.x} ${-p.y}`}
            fill="none"
            stroke="url(#cov-route)"
            strokeWidth={0.32}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
          />
        ))}
        <defs>
          <linearGradient id="cov-route" x1="0" x2="1">
            <stop offset="0" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#d9a441" />
          </linearGradient>
        </defs>
        {PLACES.map((p) => (
          <circle key={p.name} data-dot cx={p.x} cy={-p.y} r={0.9} fill="#fff6e3" />
        ))}
      </svg>

      {/* labels in HTML so they stay a readable size at any width */}
      {RINGS.map((r) => (
        <span
          key={r}
          aria-hidden
          className="absolute -translate-x-1/2 font-condensed text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 sm:text-xs"
          style={pct(0, r + 1.2)}
        >
          {r} mi
        </span>
      ))}
      {PLACES.map((p) => (
        <span
          key={p.name}
          data-pop
          aria-hidden
          className={`absolute -translate-y-1/2 whitespace-nowrap font-condensed text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85 sm:text-sm ${
            p.side === "l" ? "-translate-x-[calc(100%+10px)]" : "translate-x-[10px]"
          }`}
          style={pct(p.x, p.y)}
        >
          {p.name}
        </span>
      ))}
      {/* the base */}
      <span aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2" style={c}>
        <span className="loader-ping absolute inset-0 rounded-full bg-gold/60" />
        <span className="relative grid size-5 place-items-center rounded-full bg-gold shadow-[0_0_24px_rgb(217_164_65/0.8)] sm:size-6">
          <span className="size-2 rounded-full bg-ink" />
        </span>
      </span>
      <span
        aria-hidden
        className="absolute translate-x-5 translate-y-3 rounded-full bg-gold px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-[0.18em] text-ink sm:translate-x-6 sm:text-sm"
        style={c}
      >
        Gardena · our base
      </span>
    </div>
  );
}
