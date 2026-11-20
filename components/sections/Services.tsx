"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { rig } from "@/components/ambulance/rig";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { promoteWhile } from "@/lib/motion";
import { ALSO_AVAILABLE, COMPANY, SERVICES, VALUES } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BTN =
  "inline-flex h-12 items-center gap-2 rounded-full px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Services. The 3D van leaves the hero turntable and floats into the slot on the right
 * (top on phones), staying with the section while the service list scrolls past.
 */
export function Services() {
  const root = useRef<HTMLElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Tell the 3D camera where the van should float.
  useEffect(() => {
    const el = slot.current;
    rig.slot = el;
    return () => {
      if (rig.slot === el) rig.slot = null;
    };
  }, []);

  useGSAP(
    () => {
      // Hand-off: scrubbed by the section's arrival, so it reverses exactly on scroll-up.
      gsap.fromTo(
        rig,
        { exit: 0 },
        {
          exit: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "top 8%",
            scrub: reduced ? true : 0.6,
            onUpdate: () => rig.invalidate(),
          },
        },
      );
      if (reduced) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root.current);
      gsap.set(items, { autoAlpha: 0, y: 36 });
      ScrollTrigger.batch(items, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true, ...promoteWhile(batch) }),
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section id="services" ref={root} aria-labelledby="services-title" className="relative text-white">
      {/* background sits beneath the fixed 3D layer; content sits above it */}
      <div aria-hidden className="services-backdrop absolute inset-0" />
      <div className="relative z-10 mx-auto grid max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 wide:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] wide:gap-16 wide:pt-28">
        {/* van slot: the floating ambulance is drawn here by the page-level 3D layer */}
        <div className="wide:order-2">
          <div
            ref={slot}
            data-van-slot
            aria-hidden
            className="relative h-[42svh] w-full sm:h-[46svh] wide:sticky wide:top-[12svh] wide:h-[76svh] short:h-[70svh]"
          >
            <div className="absolute inset-x-[12%] bottom-[10%] h-[16%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(15_118_110/0.45),transparent)] blur-2xl" />
          </div>
        </div>

        <div className="wide:order-1">
          <header data-reveal className="max-w-xl">
            <p className="mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
              <span className="h-px w-10 bg-gold" />
              Our services
            </p>
            <h2
              id="services-title"
              className="text-balance font-display text-[clamp(2.6rem,min(9vw,9vh),5.25rem)] uppercase leading-[0.9]"
            >
              Rides for every kind of care
            </h2>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-white/75">
              Non-emergency medical transportation across all of {COMPANY.serviceArea}, tailored to each
              patient’s needs — wheelchair or walking, a routine check-up or the ride home from hospital.
            </p>
          </header>

          <ol className="mt-14 border-t border-white/10">
            {SERVICES.map((s, i) => (
              <li
                key={s.name}
                data-reveal
                className="group grid grid-cols-[3rem_1fr] gap-x-4 border-b border-white/10 py-7 sm:grid-cols-[4rem_1fr] sm:py-8"
              >
                <span className="pt-1 font-condensed text-sm font-semibold tracking-[0.2em] text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-[clamp(1.6rem,3vw,2.25rem)] uppercase leading-none transition-colors duration-200 group-hover:text-gold-light">
                    {s.name}
                  </h3>
                  <p className="mt-3 max-w-lg text-pretty text-base leading-relaxed text-white/70">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div data-reveal className="mt-12">
            <h3 className="font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Also available</h3>
            <ul className="mt-5 flex flex-wrap gap-2">
              {ALSO_AVAILABLE.map((a) => (
                <li key={a} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-white/80">
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal className="mt-20">
            <p className="mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
              <span className="h-px w-10 bg-gold" />
              What guides every ride
            </p>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {VALUES.map((v) => (
                <div key={v.name} className="border-l-2 border-gold/60 pl-5">
                  <dt className="font-display text-2xl uppercase leading-none">{v.name}</dt>
                  <dd className="mt-3 text-pretty leading-relaxed text-white/70">{v.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-reveal className="scene-glass mt-20 rounded-3xl p-7 sm:p-10">
            <h3 className="font-display text-[clamp(1.9rem,3.4vw,2.75rem)] uppercase leading-[0.95]">
              Not sure which service you need?
            </h3>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-white/75">
              Call us and we’ll help you find the right transportation for your situation.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={COMPANY.phoneHref} className={`${BTN} scene-cta bg-gold text-ink hover:bg-gold-light`}>
                Call {COMPANY.phone}
              </a>
              <TransitionLink href="/book" className={`${BTN} border border-white/25 text-white hover:border-white/60 hover:bg-white/5`}>
                Book a ride
              </TransitionLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
