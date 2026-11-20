"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { promoteWhile } from "@/lib/motion";
import { BOOKING_STEPS, COMPANY } from "@/lib/site";
import { BookingForm } from "./BookingForm";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const Arrow = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

/**
 * Book a ride. A light "paper" sheet that sits over the footer like a curtain: its
 * rounded bottom edge lifts away to reveal the footer (and the van parking there).
 * Parallax: the headline's two lines slide in from opposite sides, the colour fields
 * drift slower than the page, and the step cards sit at different depths.
 */
export function Contact() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(root);
      const scrub = (start = "top bottom", end = "bottom top") => ({ trigger: root.current, start, end, scrub: 0.6 });
      gsap.fromTo(q("[data-line='a']"), { xPercent: -14 }, { xPercent: 0, ease: "none", scrollTrigger: scrub("top bottom", "top 25%") });
      gsap.fromTo(q("[data-line='b']"), { xPercent: 14 }, { xPercent: 0, ease: "none", scrollTrigger: scrub("top bottom", "top 25%") });
      q("[data-speed]").forEach((el) => {
        const s = Number(el.dataset.speed);
        gsap.fromTo(el, { y: 90 * s }, { y: -90 * s, ease: "none", scrollTrigger: scrub() });
      });
      gsap.from(q("[data-rise]"), {
        ...promoteWhile(q("[data-rise]")),
        autoAlpha: 0,
        y: 36,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: q("[data-rise]")[0], start: "top 85%", once: true },
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section
      id="contact"
      ref={root}
      aria-labelledby="contact-title"
      className="relative z-10 overflow-clip rounded-b-[2.5rem] bg-paper text-ink shadow-[0_50px_90px_-30px_rgb(0_0_0/0.75)] lg:rounded-b-[4.5rem]"
    >
      {/* slow colour fields behind the sheet */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* own layers (will-change), so drifting them never repaints the sheet */}
        <div
          data-speed="-0.8"
          className="absolute -right-[12%] top-[6%] size-[46rem] rounded-full bg-[radial-gradient(closest-side,rgb(15_118_110/0.16),transparent)] will-change-transform"
        />
        <div
          data-speed="0.5"
          className="absolute -left-[10%] bottom-[8%] size-[38rem] rounded-full bg-[radial-gradient(closest-side,rgb(217_164_65/0.18),transparent)] will-change-transform"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-24 sm:px-8 sm:pb-32 sm:pt-32">
        <p className="flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-teal">
          <span className="h-px w-10 bg-teal" />
          Book a ride
        </p>
        <h2
          id="contact-title"
          className="mt-6 font-display text-[clamp(3rem,min(10.5vw,14vh),10rem)] uppercase leading-[0.86] tracking-tight"
        >
          <span data-line="a" className="block will-change-transform">
            Tell us where
          </span>
          <span data-line="b" className="block text-teal will-change-transform sm:pl-[12%]">
            you need to be
          </span>
        </h2>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <p data-rise className="max-w-md text-pretty text-lg leading-relaxed text-ink/70">
            We’ll take care of the journey. Call to schedule your ride, or email us with any questions — not sure which
            service you need? We’ll help you work it out.
          </p>

          {/* the primary action, set as large as the headline's second voice */}
          <a
            data-rise
            href={COMPANY.phoneHref}
            className="group flex items-center justify-between gap-6 rounded-[2rem] bg-teal p-6 text-white shadow-[0_24px_50px_-20px_rgb(15_118_110/0.8)] transition-colors duration-300 hover:bg-teal-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal sm:p-8"
          >
            <span>
              <span className="block font-condensed text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
                Call to book
              </span>
              <span className="mt-2 block font-display text-[clamp(2.2rem,5.4vw,4.5rem)] leading-none">{COMPANY.phone}</span>
            </span>
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gold text-ink transition-transform duration-300 group-hover:rotate-45 sm:size-16">
              <Arrow />
            </span>
          </a>
        </div>

        <ol className="mt-20 grid gap-5 md:grid-cols-3 lg:mt-28">
          {BOOKING_STEPS.map((s, i) => (
            // outer element carries the depth parallax, inner one the entrance (both move y)
            <li key={s.name} data-speed={[0.1, 0.35, 0.6][i]} className="will-change-transform">
              {/* solid card: a backdrop blur here re-blurred every frame as the fields drift behind */}
              <div data-rise className="h-full rounded-3xl border border-ink/10 bg-white/90 p-7 sm:p-8">
                <span className="font-display text-5xl leading-none text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-display text-2xl uppercase leading-none">{s.name}</h3>
                <p className="mt-3 text-pretty leading-relaxed text-ink/65">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* online request: intro on the left (sticky on wide screens), the form on a card */}
        <div id="book" className="mt-24 grid scroll-mt-24 gap-10 lg:mt-32 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div data-rise className="lg:sticky lg:top-28 lg:self-start">
            <p className="flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-teal">
              <span className="h-px w-10 bg-teal" />
              Request online
            </p>
            <h3 className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
              Request
              <br />a ride
            </h3>
            <p className="mt-6 max-w-sm text-pretty text-lg leading-relaxed text-ink/70">
              Tell us about the trip and we’ll call you to confirm the pickup time and details.
            </p>
            <p className="mt-4 max-w-sm text-pretty text-ink/55">
              Riding today or tomorrow? Calling is fastest:{" "}
              <a href={COMPANY.phoneHref} className="whitespace-nowrap font-semibold text-teal underline-offset-4 hover:underline">
                {COMPANY.phone}
              </a>
              .
            </p>
          </div>
          <div
            data-rise
            className="relative rounded-[2rem] border border-ink/10 bg-white/95 p-6 shadow-[0_30px_80px_-40px_rgb(7_18_17/0.45)] sm:p-10"
          >
            <BookingForm />
          </div>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-2 lg:mt-28">
          <a
            data-rise
            href={`mailto:${COMPANY.email}`}
            className="group rounded-3xl border border-ink/10 bg-white p-7 transition-colors duration-200 hover:border-teal/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal sm:p-8"
          >
            <span className="font-condensed text-sm font-semibold uppercase tracking-[0.24em] text-ink/55">Email</span>
            <span className="mt-3 block break-all text-lg font-semibold group-hover:text-teal sm:text-xl">{COMPANY.email}</span>
            <span className="mt-3 block text-ink/60">Questions about rides, scheduling or services.</span>
          </a>
          <div data-rise className="rounded-3xl border border-ink/10 bg-white p-7 sm:p-8">
            <span className="font-condensed text-sm font-semibold uppercase tracking-[0.24em] text-ink/55">Service area</span>
            <span className="mt-3 block font-display text-[clamp(1.8rem,3vw,2.4rem)] uppercase leading-none">
              {COMPANY.serviceArea}
            </span>
            <span className="mt-3 block text-ink/60">Based in {COMPANY.base}.</span>
          </div>
        </div>

        <div
          data-rise
          className="mt-16 flex flex-col gap-5 rounded-3xl bg-ink p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10"
        >
          <div>
            <h3 className="font-display text-3xl uppercase leading-none">Join our team</h3>
            <p className="mt-3 max-w-lg text-pretty text-white/70">
              We’re looking for compassionate, reliable drivers to help patients and seniors get where they need to go.
              Call or email us to apply.
            </p>
          </div>
          <a
            href={`mailto:${COMPANY.email}?subject=${encodeURIComponent("Driver application")}`}
            className="inline-flex h-12 shrink-0 items-center rounded-full bg-gold px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors duration-200 hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Become a driver
          </a>
        </div>
      </div>
    </section>
  );
}
