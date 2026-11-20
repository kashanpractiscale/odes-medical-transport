"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { VanSide, wheelDeg } from "@/components/brand/VanSide";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { boot } from "@/components/loader/boot";
import { lockScroll, scroller } from "@/components/scroll";
import { ROUTES, type Route } from "@/lib/site";
import { pageTransition } from "./store";

const EASE = "cubic-bezier(0.76, 0, 0.24, 1)"; // power3.inOut
const OUT = "cubic-bezier(0.22, 1, 0.36, 1)"; // power4.out-ish
const COVER_MS = 720;
const LIFT_MS = 760;
const ROUTE_TIMEOUT_MS = 4000;
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * The page transition: the Odes van drives in from the left pulling a teal curtain across
 * the page (a deep-ink layer just ahead of it), the destination's name rises in big type and
 * the van drives on out of shot, then the curtain lifts off the new page.
 *
 * Next.js does the actual navigation (router.push) while the screen is covered; this waits
 * for the new route to commit, resets the scroll and ScrollTrigger, and only then lifts.
 * Every move is a Web Animation on transform/opacity, so it runs on the compositor even while
 * the incoming page mounts underneath. Reduced motion gets a short cross-fade instead.
 */
export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const arrived = useRef<(() => void) | null>(null);

  // Pages without the loading screen open the boot gate straight away (Lenis, 3D hand-offs).
  useEffect(() => {
    if (!document.getElementById("loader")) boot.reveal();
  }, []);

  // A route committed: finish the transition waiting for it, or (back/forward) just re-measure.
  useEffect(() => {
    if (arrived.current) {
      arrived.current();
      arrived.current = null;
    } else {
      requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
    }
  }, [pathname]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const $ = (s: string) => el.querySelector<HTMLElement>(s)!;
    const anims: Animation[] = [];
    const run = (t: Element, k: Keyframe[], o: KeyframeAnimationOptions) => {
      const a = t.animate(k, { fill: "forwards", ...o });
      anims.push(a);
      return a;
    };

    async function travel(href: string) {
      pageTransition.setBusy(true);
      const path = href.split(/[?#]/)[0] as Route;
      $("[data-label]").textContent = ROUTES[path] ?? "Odes";
      router.prefetch(href);
      lockScroll(true);
      anims.forEach((a) => a.cancel());
      anims.length = 0;
      el!.style.visibility = "visible";

      const ink = $("[data-layer='ink']");
      const teal = $("[data-layer='teal']");
      const van = $("[data-van]");
      const wheels = el!.querySelectorAll("[data-wheel]");
      const label = $("[data-label]");
      const eyebrow = $("[data-eyebrow]");
      const W = window.innerWidth;
      const vanW = van.offsetWidth;

      // ---- cover ----------------------------------------------------------------------
      let covered: Promise<unknown>;
      if (reduced) {
        [ink, teal].forEach((p) => (p.style.transform = "none"));
        covered = run(el!, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 }).finished;
        label.style.transform = "none";
        eyebrow.style.opacity = "1";
      } else {
        el!.style.opacity = "1";
        run(ink, [{ transform: "translateX(-101%)" }, { transform: "none" }], { duration: COVER_MS, easing: EASE });
        covered = run(teal, [{ transform: "translateX(-101%)" }, { transform: "none" }], { duration: COVER_MS, delay: 70, easing: EASE }).finished;
        // the van rides at the curtain's leading edge, so its wheels turn with the curtain
        wheels.forEach((w) =>
          run(w, [{ transform: "rotate(0deg)" }, { transform: `rotate(${wheelDeg(W, vanW)}deg)` }], { duration: COVER_MS, delay: 70, easing: EASE }),
        );
        run(eyebrow, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 450, delay: 520, easing: OUT });
        run(label, [{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 700, delay: 560, easing: OUT });
        // …and drives on out of shot while the name settles
        const off = W * 0.45;
        run(van, [{ transform: "none" }, { transform: `translateX(${off}px)` }], { duration: 900, delay: COVER_MS + 140, easing: "cubic-bezier(0.55, 0, 0.75, 0.3)" });
        wheels.forEach((w) =>
          run(w, [{ transform: `rotate(${wheelDeg(W, vanW)}deg)` }, { transform: `rotate(${wheelDeg(W + off, vanW)}deg)` }], {
            duration: 900,
            delay: COVER_MS + 140,
            easing: "cubic-bezier(0.55, 0, 0.75, 0.3)",
          }),
        );
      }
      await covered;

      // ---- swap the page under the curtain ---------------------------------------------
      const routed = new Promise<void>((r) => (arrived.current = r));
      router.push(href, { scroll: false });
      await Promise.race([routed, wait(ROUTE_TIMEOUT_MS)]);
      await frame();
      await frame();
      const hash = href.includes("#") ? document.getElementById(href.split("#")[1]) : null;
      window.scrollTo(0, 0);
      scroller.lenis?.scrollTo(hash ?? 0, { immediate: true, force: true, offset: hash ? -96 : 0 });
      ScrollTrigger.refresh();
      document.getElementById("main")?.focus({ preventScroll: true });
      if (!reduced) await wait(260); // let the name land

      // ---- lift --------------------------------------------------------------------------
      lockScroll(false);
      let lifted: Promise<unknown>;
      if (reduced) {
        pageTransition.setBusy(false);
        pageTransition.entered();
        lifted = run(el!, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).finished;
      } else {
        run(label, [{ transform: "none" }, { transform: "translateY(-110%)" }], { duration: 380, easing: "cubic-bezier(0.55, 0, 0.75, 0.3)" });
        run(eyebrow, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
        run(teal, [{ transform: "none" }, { transform: "translateY(-101%)" }], { duration: LIFT_MS, delay: 120, easing: EASE });
        lifted = run(ink, [{ transform: "none" }, { transform: "translateY(-101%)" }], { duration: LIFT_MS, delay: 200, easing: EASE }).finished;
        // the new page starts its entrance as the curtain clears it
        window.setTimeout(() => {
          pageTransition.setBusy(false);
          pageTransition.entered();
        }, 320);
      }
      await lifted;
      el!.style.visibility = "hidden";
      anims.forEach((a) => a.cancel());
      anims.length = 0;
      // back to the resting (off-screen) pose for next time
      [ink, teal].forEach((p) => (p.style.transform = "translateX(-101%)"));
      label.style.transform = "translateY(110%)";
      eyebrow.style.opacity = "";
    }

    return pageTransition.register((href) => {
      if (pageTransition.busy) return true; // swallow clicks mid-transition
      travel(href).catch(() => {
        // never leave the screen covered
        pageTransition.setBusy(false);
        pageTransition.entered();
        lockScroll(false);
        el.style.visibility = "hidden";
        window.location.assign(href);
      });
      return true;
    });
  }, [router, reduced]);

  return (
    <div ref={root} aria-hidden className="pointer-events-none invisible fixed inset-0 z-[90] overflow-hidden">
      <div data-layer="ink" style={{ transform: "translateX(-101%)" }} className="absolute inset-0 bg-[#050d0d] will-change-transform" />
      <div
        data-layer="teal"
        style={{ transform: "translateX(-101%)" }}
        className="absolute inset-0 overflow-hidden bg-[radial-gradient(90%_70%_at_50%_40%,#12665f,#0b4f4a_55%,#083a37)] will-change-transform"
      >
        <div className="studio-vignette absolute inset-0" />
        {/* gold leading edge */}
        <div className="absolute inset-y-0 right-0 w-[3px] bg-gold shadow-[0_0_24px_4px_rgb(217_164_65/0.55)]" />

        {/* destination */}
        <div className="absolute inset-x-0 top-[24%] px-6 text-center sm:top-[26%]">
          <p data-eyebrow className="font-condensed text-sm font-semibold uppercase tracking-[0.34em] text-gold opacity-0 sm:text-base">
            Next stop
          </p>
          <div className="mt-3 overflow-hidden pb-[0.06em]">
            <p
              data-label
              style={{ transform: "translateY(110%)" }}
              className="font-display text-[clamp(3.4rem,12vw,10.5rem)] uppercase leading-[0.9] text-[#fff6e3] will-change-transform"
            />
          </div>
        </div>

        {/* the road, with the van at the curtain's leading edge */}
        <div className="absolute inset-x-0 top-[68%]">
          <div className="loader-dashes h-[2px] opacity-25" />
          <div data-van className="absolute bottom-0 right-[5%] w-[clamp(120px,15vw,210px)] will-change-transform">
            <div className="loader-beam absolute bottom-[14%] left-[97%] h-[42%] w-[clamp(90px,14vw,220px)]" />
            <VanSide />
          </div>
        </div>
      </div>
    </div>
  );
}
