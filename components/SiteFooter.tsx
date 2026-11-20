"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { claimRoad, rig } from "@/components/ambulance/rig";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { COMPANY, NAV, TAGLINE } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LINK =
  "rounded-sm text-white/70 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold";
const HEAD = "font-condensed text-sm font-semibold uppercase tracking-[0.24em] text-gold";

/**
 * The journey's end. The booking sheet above lifts like a curtain; the footer underneath
 * scrolls slower than the page (so it feels revealed rather than pushed up), and the 3D
 * van drives in and parks under the street light: "your ride is here".
 */
export function SiteFooter() {
  const root = useRef<HTMLElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const road = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = road.current;
    return () => claimRoad(el, "park", false);
  }, []);

  useGSAP(
    () => {
      // The footer keeps the van from the moment it scrolls in until the very end of the page.
      // Not `onToggle`/`isActive`: ScrollTrigger counts a trigger as active only while
      // 0 < progress < 1, and with `end: "max"` progress hits exactly 1 at the bottom of the
      // page, which handed the road back and made the van vanish. Hold it while progress > 0
      // (onUpdate on every scroll change, onRefresh for loads and resizes at any position).
      const hold = (s: ScrollTrigger) => claimRoad(road.current, "park", s.progress > 0);
      ScrollTrigger.create({
        trigger: root.current,
        start: reduced ? "top 70%" : "top bottom",
        end: "max",
        onUpdate: hold,
        onRefresh: hold,
      });
      if (reduced) {
        rig.park = 1; // already parked; nothing travels
        return;
      }
      // curtain: the footer starts tucked up under the sheet and settles as it is revealed
      gsap.fromTo(
        inner.current,
        // capped in px: the footer is much taller on phones, and the heading must not stay hidden
        { y: () => -Math.min(260, (inner.current?.offsetHeight ?? 0) * 0.25) },
        {
          y: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
        },
      );
      // arrival: parks while the heading and the kerb are both in view
      gsap.fromTo(
        rig,
        { park: 0 },
        {
          park: 1,
          ease: "none",
          scrollTrigger: { trigger: road.current, start: "top bottom", end: "center 58%", scrub: 0.6 },
          onUpdate: () => rig.invalidate(),
        },
      );
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <footer id="site-footer" ref={root} className="relative -mt-[4.5rem] overflow-clip bg-[#050d0d] pt-[4.5rem] text-white">
      <div ref={inner} className="relative">
        {/* night sky over the destination */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="mission-stars absolute inset-x-0 top-0 h-[50%] opacity-60" />
          <div className="absolute left-1/2 top-0 h-[70%] w-[120%] -translate-x-1/2 bg-[radial-gradient(50%_60%_at_50%_0%,rgb(15_118_110/0.28),transparent_70%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pt-20 sm:px-8 lg:pt-24">
          <div className="max-w-xl">
            <p className="flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
              <span className="h-px w-10 bg-gold" />
              You’ve arrived
            </p>
            <h2 className="mt-5 font-display text-[clamp(3.2rem,min(9vw,13vh),7.5rem)] uppercase leading-[0.86]">
              Your ride
              <br />
              is here
            </h2>
            <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-white/70">
              Safe, reliable, on-time rides to medical care across {COMPANY.serviceArea}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#book"
                className="inline-flex h-12 items-center rounded-full bg-gold px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors duration-200 hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Book a ride
              </a>
              <a
                href={COMPANY.phoneHref}
                className="inline-flex h-12 items-center rounded-full border border-white/25 px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 hover:border-white/60 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Call {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>

        {/* the kerb where the van parks: wheels on 56 % of this band (camera rig), stopping
            right of centre on wide screens (data-park-at, half-screen-widths) */}
        <div
          ref={road}
          aria-hidden
          data-park-at="0.42"
          data-van-scale="0.85"
          className="mission-road relative mt-24 h-24 sm:h-28 wide:mt-12"
        >
          <div className="mission-dashes absolute inset-x-0 top-[22%] h-[3px] opacity-70" />
          <div className="mission-kerb absolute inset-x-0 top-[62%] h-[8%]" />
          {/* pool of light at the stop */}
          <div className="absolute bottom-0 left-1/2 h-[180%] w-[70%] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_60%,rgb(246_213_140/0.3),transparent_70%)] wide:left-[71%] wide:w-[36%]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr] lg:py-16">
          <div>
            <a
              href="#"
              aria-label="Odes Medical Transportation — back to top"
              className="inline-block rounded-2xl bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <Image src="/brand/odes-logo.png" alt="Odes Medical Transportation" width={1789} height={573} className="h-9 w-auto" />
            </a>
            <p className="mt-5 max-w-xs text-pretty leading-relaxed text-white/60">
              Non-emergency medical transportation. {TAGLINE.join(", ").replace("Always", "always")}.
            </p>
          </div>

          <nav aria-label="Footer">
            <h3 className={HEAD}>Explore</h3>
            <ul className="mt-5 space-y-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className={LINK}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className={HEAD}>Contact</h3>
            <ul className="mt-5 space-y-3">
              <li>
                <a href={COMPANY.phoneHref} className={`${LINK} font-display text-2xl tracking-wide text-white`}>
                  {COMPANY.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${COMPANY.email}`} className={`${LINK} break-all`}>
                  {COMPANY.email}
                </a>
              </li>
              <li className="text-white/60">{COMPANY.base}</li>
            </ul>
          </div>

          <div>
            <h3 className={HEAD}>Service area</h3>
            <p className="mt-5 font-display text-2xl uppercase leading-tight">{COMPANY.serviceArea}</p>
            <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent("Driver application")}`} className={`${LINK} mt-4 inline-block`}>
              Join our team →
            </a>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>© {COMPANY.legalName}</p>
            <a href="#" className={`${LINK} text-white/50`}>
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
