"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { lockScroll } from "@/components/scroll";
import { pageTransition } from "@/components/transition/store";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { COMPANY, NAV } from "@/lib/site";

const PAGES = NAV.filter((n) => n.href !== "/book");
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";

const PhoneIcon = ({ className = "size-[18px]" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

/**
 * Floating navigation pill. Page links carry a gold indicator that slides to the current
 * page (and previews whichever link the pointer is over); "Book a ride" is the primary
 * action. On phones the links move into a full-screen menu. The pill hides while scrolling
 * down and returns on scroll up, when the pointer nears the top edge, or on keyboard focus.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const focused = useRef(false);
  const list = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  const isActive = useCallback((href: string) => pathname === href || pathname.startsWith(`${href}/`), [pathname]);

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

  // a new page: show the bar, close the menu (adjusted during render, not in an effect)
  const [route, setRoute] = useState(pathname);
  if (route !== pathname) {
    setRoute(pathname);
    setHidden(false);
    setOpen(false);
  }

  // the sliding indicator: one element, moved with transform (compositor only)
  useLayoutEffect(() => {
    const place = () => {
      const ul = list.current;
      const el = bar.current;
      if (!ul || !el) return;
      const target = hover ?? PAGES.find((p) => isActive(p.href))?.href;
      const a = target ? ul.querySelector<HTMLElement>(`a[href="${target}"]`) : null;
      if (!a) {
        el.style.opacity = "0";
        return;
      }
      const inset = 16; // px-4 on the links
      el.style.opacity = "1";
      el.style.transform = `translateX(${a.offsetLeft + inset}px) scaleX(${(a.offsetWidth - inset * 2) / 100})`;
    };
    place();
    document.fonts?.ready.then(place);
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [hover, isActive]);

  // mobile menu: hold the page, Escape closes, focus moves in and back out
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const button = menuButton.current;
    return () => {
      // a menu link starts a page transition, which holds the scroll itself
      if (!pageTransition.busy) lockScroll(false);
      window.removeEventListener("keydown", onKey);
      button?.focus({ preventScroll: true });
    };
  }, [open]);

  const onBook = isActive("/book");

  return (
    <>
      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 short:pt-2 transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 sm:pt-4 ${
          hidden && !open ? "-translate-y-[130%] opacity-0" : "translate-y-0 opacity-100"
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
          className={`pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/40 bg-white/[0.96] pl-5 pr-2 short:h-12 shadow-[0_10px_40px_-12px_rgb(0_0_0/0.45)] ring-1 ring-black/5 transition-[background-color,box-shadow] duration-300 sm:h-16 sm:pl-6 ${
            scrolled ? "bg-white shadow-[0_14px_50px_-14px_rgb(0_0_0/0.6)]" : ""
          }`}
        >
          <TransitionLink href="/" aria-label="Odes Medical Transportation — home" className={`rounded-md ${FOCUS} focus-visible:outline-offset-4`}>
            <Image src="/brand/odes-logo.png" alt="Odes Medical Transportation" width={1789} height={573} priority className="h-8 w-auto sm:h-9 short:h-7" />
          </TransitionLink>

          <nav aria-label="Primary" className="flex items-center gap-1 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] text-ink">
            <ul ref={list} className="relative hidden items-center md:flex" onMouseLeave={() => setHover(null)}>
              {PAGES.map((p) => (
                <li key={p.href}>
                  <TransitionLink
                    href={p.href}
                    aria-current={isActive(p.href) ? "page" : undefined}
                    onMouseEnter={() => setHover(p.href)}
                    onFocus={() => setHover(p.href)}
                    onBlur={() => setHover(null)}
                    className={`inline-flex rounded-full px-4 py-2.5 transition-colors duration-200 hover:text-teal ${FOCUS} ${
                      isActive(p.href) ? "text-teal" : ""
                    }`}
                  >
                    {p.label}
                  </TransitionLink>
                </li>
              ))}
              <span
                ref={bar}
                aria-hidden
                className="pointer-events-none absolute bottom-1 left-0 h-[2px] w-[100px] origin-left rounded-full bg-gold opacity-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              />
            </ul>

            <a
              href={COMPANY.phoneHref}
              aria-label={`Call ${COMPANY.phone}`}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-3 text-teal transition-colors duration-200 hover:bg-teal/10 sm:h-12 sm:px-4 short:h-9 ${FOCUS}`}
            >
              <PhoneIcon />
              <span className="hidden xl:inline">{COMPANY.phone}</span>
            </a>
            <TransitionLink
              href="/book"
              aria-current={onBook ? "page" : undefined}
              className={`hidden h-10 items-center rounded-full px-5 text-white transition-[background-color,box-shadow] duration-200 hover:bg-teal-deep sm:inline-flex sm:h-12 sm:px-6 short:h-9 ${FOCUS} ${
                onBook ? "bg-teal-deep ring-2 ring-gold ring-offset-2" : "bg-teal"
              }`}
            >
              Book a ride
            </TransitionLink>
            {/* phones: the menu */}
            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
              className={`relative grid size-11 cursor-pointer place-items-center rounded-full bg-ink text-white md:hidden ${FOCUS}`}
            >
              <span aria-hidden className={`absolute h-[2px] w-5 rounded-full bg-current transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[4px]"}`} />
              <span aria-hidden className={`absolute h-[2px] w-5 rounded-full bg-current transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[4px]"}`} />
            </button>
          </nav>
        </div>
      </header>

      {/* full-screen menu (phones and small tablets) */}
      <div
        id="site-menu"
        inert={!open}
        className={`fixed inset-0 z-30 md:hidden ${open ? "visible" : "invisible delay-500"}`}
      >
        <div
          className={`absolute inset-0 bg-[#050d0d] bg-[radial-gradient(120%_70%_at_80%_0%,rgb(15_118_110/0.45),transparent_60%)] transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            open ? "translate-y-0" : "-translate-y-full"
          }`}
        />
        <nav aria-label="Menu" className="relative flex h-full flex-col justify-between px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-28">
          <ul className="space-y-1">
            {[{ label: "Home", href: "/" }, ...NAV].map((n, i) => (
              <li key={n.href} className="overflow-hidden">
                <TransitionLink
                  ref={i === 0 ? firstLink : undefined}
                  href={n.href}
                  aria-current={isActive(n.href) && (n.href !== "/" || pathname === "/") ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  style={{ transitionDelay: open ? `${180 + i * 60}ms` : "0ms" }}
                  className={`flex items-baseline gap-4 py-1.5 font-display text-[clamp(2.6rem,12vw,4rem)] uppercase leading-none transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-gold ${
                    open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                  } ${(n.href === "/" ? pathname === "/" : isActive(n.href)) ? "text-gold" : "text-white"}`}
                >
                  <span className="font-condensed text-sm font-semibold tracking-[0.2em] text-white/35">{String(i + 1).padStart(2, "0")}</span>
                  {n.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
          <div
            style={{ transitionDelay: open ? "480ms" : "0ms" }}
            className={`space-y-4 border-t border-white/10 pt-6 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
          >
            <a href={COMPANY.phoneHref} className="flex items-center gap-3 font-display text-3xl tracking-wide text-white">
              <PhoneIcon className="size-6 text-gold" />
              {COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`} className="block break-all text-white/60">
              {COMPANY.email}
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}
