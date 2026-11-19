"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { COMPANY } from "@/lib/site";

/**
 * Floating glass navigation pill. Hides while scrolling down so the 3D scene has the
 * whole frame, and returns on scroll up, when the pointer nears the top edge, or when
 * anything inside it receives keyboard focus.
 */
export function SiteHeader() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const dy = y - lastY;
        setScrolled(y > 8);
        if (Math.abs(dy) < 8) return; // ignore jitter
        lastY = y;
        if (!focused.current) setHidden(dy > 0 && y > 160);
      });
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.clientY < 88) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 short:pt-2 transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 sm:pt-4 ${
        hidden ? "-translate-y-[130%] opacity-0" : "translate-y-0 opacity-100"
      }`}
      onFocusCapture={() => {
        focused.current = true;
        setHidden(false);
      }}
      onBlurCapture={() => {
        focused.current = false;
      }}
    >
      <div
        className={`pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/40 bg-white/80 pl-5 pr-2 short:h-12 shadow-[0_10px_40px_-12px_rgb(0_0_0/0.45)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow] duration-300 sm:h-16 sm:pl-6 ${
          scrolled ? "bg-white/90 shadow-[0_14px_50px_-14px_rgb(0_0_0/0.6)]" : ""
        }`}
      >
        <a href="#" aria-label="Odes Medical Transportation — home" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
          <Image src="/brand/odes-logo.png" alt="Odes Medical Transportation" width={1789} height={573} priority className="h-8 w-auto sm:h-9 short:h-7" />
        </a>
        <nav aria-label="Primary" className="flex items-center gap-1 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] text-ink">
          <a
            href="#services"
            className="hidden rounded-full px-4 py-2.5 transition-colors duration-200 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-teal md:inline-flex"
          >
            Services
          </a>
          <a
            href="#mission"
            className="hidden rounded-full px-4 py-2.5 transition-colors duration-200 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-teal md:inline-flex"
          >
            About
          </a>
          <a
            href="#contact"
            className="hidden rounded-full px-4 py-2.5 transition-colors duration-200 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-teal md:inline-flex"
          >
            Contact
          </a>
          <a
            href={COMPANY.phoneHref}
            aria-label={`Call ${COMPANY.phone}`}
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-teal transition-colors duration-200 hover:bg-teal/10 focus-visible:outline-2 focus-visible:outline-teal sm:h-12 sm:px-4 short:h-9"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
            </svg>
            <span className="hidden lg:inline">{COMPANY.phone}</span>
          </a>
          <a
            href="#book"
            className="inline-flex h-10 items-center rounded-full bg-teal px-5 text-white transition-colors duration-200 hover:bg-teal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal sm:h-12 sm:px-6 short:h-9"
          >
            Book a ride
          </a>
        </nav>
      </div>
    </header>
  );
}
