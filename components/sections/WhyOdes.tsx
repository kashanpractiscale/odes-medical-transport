"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { promoteWhile } from "@/lib/motion";
import { COMMITMENT, COMPANY, TAGLINE, WHY } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2";
const TILE = "group relative isolate overflow-hidden rounded-[1.75rem] border p-7 sm:p-8";
const TITLE = "font-display uppercase leading-[0.92]";
const [ACCESS, NO_SHOWS, HAPPIER, EASY] = WHY;

/** Phrases from the services copy (direct routes, door-to-door rides, help with boarding). */
const RIDE_NOTES = ["Direct routes", "Door to door", "Help boarding", "Ride home arranged"];
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/* --- icons (24 px grid, 1.75 stroke) ------------------------------------------------ */
const Svg = ({ children, className = "size-6" }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {children}
  </svg>
);
const IconRoute = () => (
  <Svg>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16" />
  </Svg>
);
const IconCalendar = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" />
  </Svg>
);
const IconHeart = () => (
  <Svg>
    <path d="M12 20s-7.5-4.5-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.5 12 20 12 20Z" />
  </Svg>
);
const IconPhone = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M5.2 4h3l1.8 4.6-2.3 1.5a11 11 0 0 0 6.2 6.2l1.5-2.3 4.6 1.8v3a2 2 0 0 1-2.1 2A16 16 0 0 1 3.2 6.1 2 2 0 0 1 5.2 4Z" />
  </Svg>
);
const Check = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
    <path d="M3.5 8.4l2.9 2.8 6-6.4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Icon in a soft square, top of every tile. */
const Badge = ({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) => (
  <span
    className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
      tone === "light" ? "bg-gold/12 text-gold ring-1 ring-inset ring-gold/25" : "bg-ink/10 text-ink ring-1 ring-inset ring-ink/15"
    }`}
  >
    {children}
  </span>
);

/** Soft light that follows the pointer across a tile (mouse only; one CSS gradient). */
const Glow = () => (
  <span
    aria-hidden
    className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
    style={{ background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgb(217 164 65 / 0.10), transparent 45%)" }}
  />
);

/** Pickup → appointment, the route drawing itself in as the tile arrives. */
function RouteArt() {
  const D = "M18 96 C 96 96, 104 34, 186 50 S 292 104, 372 30";
  return (
    <div className="relative mt-8">
      <svg viewBox="0 0 390 124" className="block h-auto w-full overflow-visible" aria-hidden>
        <path d={D} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
        <path data-route d={D} fill="none" stroke="url(#why-route)" strokeWidth="3.5" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" />
        <defs>
          <linearGradient id="why-route" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#d9a441" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="96" r="7" fill="#0f766e" stroke="#5eead4" strokeOpacity=".5" strokeWidth="5" />
        <g data-route-pin transform="translate(372 30)">
          <circle r="15" fill="#d9a441" />
          <path d="M-2 -7h4v5h5v4h-5v5h-4v-5h-5v-4h5z" fill="#071211" />
        </g>
      </svg>
      <div className="mt-2 flex justify-between font-condensed text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
        <span>Pickup</span>
        <span>Your appointment</span>
      </div>
    </div>
  );
}

/**
 * Why choose Odes, as a bento grid. The tagline bands still slide against the scroll as the
 * opener; the tiles rise in, and each one's small illustration plays once (route draws,
 * the week's appointments tick off, ride notes pop in). Everything is visible by default:
 * the animations only run `from` a hidden state, so reduced motion simply skips them.
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

      const grid = q("[data-cards]")[0];
      const tl = gsap.timeline({
        scrollTrigger: { trigger: grid, start: "top 78%", once: true },
        ...promoteWhile(q("[data-tile], [data-day], [data-note]")),
      });
      tl.from(q("[data-tile]"), { autoAlpha: 0, y: 48, duration: 0.9, ease: "power3.out", stagger: 0.09 })
        .fromTo(q("[data-route]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, 0.35)
        .from(q("[data-route-pin]"), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.2)" }, 1.55)
        .from(q("[data-day]"), { scale: 0, autoAlpha: 0, duration: 0.45, ease: "back.out(2)", stagger: 0.08 }, 0.6)
        .from(q("[data-note]"), { y: 12, autoAlpha: 0, duration: 0.5, ease: "power3.out", stagger: 0.07 }, 0.7);
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  // pointer glow: one handler for the grid, writes two custom properties on the hovered tile
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const tile = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    tile.style.setProperty("--mx", `${e.clientX - r.left}px`);
    tile.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const band = (k: "a" | "b", outline: boolean) => (
    // Two copies are enough to cover the screen through the band's whole travel (it moves
    // 18 % of its width). Three made it so wide that Chrome kept re-recording and
    // re-rasterising it as it slid, instead of just moving one finished layer.
    <div data-band={k} className="flex w-max gap-10 whitespace-nowrap will-change-transform">
      {Array.from({ length: 2 }, (_, r) =>
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

      <div className="mx-auto mt-20 max-w-7xl px-5 sm:px-8 lg:mt-28">
        <p className="mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
          <span className="h-px w-10 bg-gold" />
          Why choose Odes
        </p>
        <h2 id="why-title" className="max-w-3xl text-balance font-display text-[clamp(2.6rem,min(6vw,9vh),5rem)] uppercase leading-[0.9]">
          The ride is part of the care
        </h2>

        <div data-cards onPointerMove={onPointerMove} className="mt-12 grid gap-4 sm:mt-14 sm:gap-5 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr]">
          {/* 01: the feature tile */}
          <article
            data-tile
            className={`${TILE} flex flex-col border-teal/30 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(15_118_110/0.38),transparent_60%),linear-gradient(180deg,rgb(255_255_255/0.05),rgb(255_255_255/0.015))] md:col-span-2 lg:col-span-1 lg:row-span-2`}
          >
            <Glow />
            <div className="flex items-start justify-between gap-6">
              <Badge>
                <IconRoute />
              </Badge>
              <span className="font-display text-2xl leading-none text-white/15">01</span>
            </div>
            <h3 className={`${TITLE} mt-8 text-[clamp(2.2rem,4.2vw,3.6rem)]`}>{ACCESS.name}</h3>
            <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-white/70">{ACCESS.body}</p>
            <RouteArt />
            <blockquote className="mt-auto border-t border-white/10 pt-6 text-pretty leading-relaxed text-white/60 max-lg:mt-8">
              <span aria-hidden className="block h-7 font-display text-6xl leading-none text-gold/70">
                “
              </span>
              {COMMITMENT}
            </blockquote>
          </article>

          {/* 02 */}
          <article data-tile className={`${TILE} border-white/10 bg-white/[0.035]`}>
            <Glow />
            <div className="flex items-start justify-between gap-6">
              <Badge>
                <IconCalendar />
              </Badge>
              <span className="font-display text-2xl leading-none text-white/15">02</span>
            </div>
            <h3 className={`${TITLE} mt-6 text-[clamp(1.8rem,2.8vw,2.4rem)]`}>{NO_SHOWS.name}</h3>
            <p className="mt-3 text-pretty leading-relaxed text-white/65">{NO_SHOWS.body}</p>
            <ul aria-hidden className="mt-6 flex justify-between gap-2">
              {WEEK.map((d) => (
                <li key={d} className="flex flex-col items-center gap-2">
                  <span data-day className="grid size-9 place-items-center rounded-full bg-gold text-ink shadow-[0_0_18px_-4px_rgb(217_164_65/0.7)]">
                    <Check />
                  </span>
                  <span className="font-condensed text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{d}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* 03 */}
          <article data-tile className={`${TILE} border-white/10 bg-white/[0.035]`}>
            <Glow />
            <div className="flex items-start justify-between gap-6">
              <Badge>
                <IconHeart />
              </Badge>
              <span className="font-display text-2xl leading-none text-white/15">03</span>
            </div>
            <h3 className={`${TITLE} mt-6 text-[clamp(1.8rem,2.8vw,2.4rem)]`}>{HAPPIER.name}</h3>
            <p className="mt-3 text-pretty leading-relaxed text-white/65">{HAPPIER.body}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {RIDE_NOTES.map((n) => (
                <li
                  key={n}
                  data-note
                  className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-condensed text-sm font-semibold uppercase tracking-[0.1em] text-white/80"
                >
                  <span className="size-1.5 rounded-full bg-gold" />
                  {n}
                </li>
              ))}
            </ul>
          </article>

          {/* 04: booking, in gold, with the actions right there */}
          <article
            data-tile
            className={`${TILE} border-gold bg-gold text-ink md:col-span-2 lg:flex lg:items-center lg:justify-between lg:gap-10`}
          >
            <div className="flex items-start gap-5 sm:gap-6">
              <Badge tone="dark">
                <IconPhone />
              </Badge>
              <div>
                <h3 className={`${TITLE} text-[clamp(1.8rem,2.8vw,2.4rem)]`}>
                  {EASY.name}
                  <span className="ml-3 align-middle font-display text-2xl text-ink/25">04</span>
                </h3>
                <p className="mt-2 max-w-xl text-pretty leading-relaxed text-ink/75">{EASY.body}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
              <a href={COMPANY.phoneHref} className={`${BTN} bg-ink text-white hover:bg-[#0d2422] focus-visible:outline-ink`}>
                <IconPhone className="size-4" />
                Call {COMPANY.phone}
              </a>
              <TransitionLink href="/book" className={`${BTN} border border-ink/25 hover:border-ink/60 hover:bg-ink/5 focus-visible:outline-ink`}>
                Request a ride
              </TransitionLink>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
