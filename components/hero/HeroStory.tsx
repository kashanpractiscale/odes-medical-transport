"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { VIEWS, cameraAt } from "@/components/ambulance/animation";
import { boot } from "@/components/loader/boot";
import { rig, toggle, useToggles, type ToggleKey } from "@/components/ambulance/rig";
import { IconBeacon, IconHazard, IconHeadlights, IconRearDoors, IconRotate, IconSideDoor } from "./icons";
import { HeroPoster } from "./HeroPoster";
import { useReducedMotion } from "./useReducedMotion";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { COMPANY } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const AmbulanceStage = dynamic(() => import("@/components/ambulance/AmbulanceStage"), { ssr: false });

type Chapter = { at: number; eyebrow: string; title: string; body: string; word: string };

// Placeholder marketing copy — replace with approved Odes copy before launch.
const CHAPTERS: Chapter[] = [
  {
    at: VIEWS[1].at,
    eyebrow: "01 / Side access",
    title: "Step in without the strain",
    body: "A wide sliding side door and a fixed step open the whole patient compartment for calm, unhurried boarding.",
    word: "Access",
  },
  {
    at: VIEWS[2].at,
    eyebrow: "02 / Rear access",
    title: "Room to load with care",
    body: "Twin rear doors swing wide, giving stretchers and mobility devices a clear, level path in.",
    word: "Space",
  },
  {
    at: VIEWS[3].at,
    eyebrow: "03 / Recognizable",
    title: "Families know who’s arriving",
    body: "Clean white bodywork and the Odes mark on every side make our vehicle easy to spot at the curb.",
    word: "Odes",
  },
  {
    at: VIEWS[4].at,
    eyebrow: "04 / Visibility",
    title: "Seen clearly, never loudly",
    body: "A low-profile roof light bar and full exterior lighting keep every journey visible to the traffic around it.",
    word: "Seen",
  },
  {
    at: VIEWS[5].at,
    eyebrow: "05 / The vehicle",
    title: "A high-roof van built around people",
    body: "An extended high-roof body gives patients headroom to stand, and space for a companion to ride along.",
    word: "Comfort",
  },
];
const BG_WORDS = ["Care", ...CHAPTERS.map((c) => c.word), "Ready"];

/**
 * Headline split into masked words for staggered reveals; "|" forces a line break.
 * Screen readers get the plain text once.
 */
function Words({ text, accent = [] }: { text: string; accent?: number[] }) {
  let n = 0;
  return (
    <>
      <span className="sr-only">{text.replaceAll("|", " ")}</span>
      {text.split("|").map((line, li) => (
        <span key={li} aria-hidden className="block">
          {line.split(" ").map((w, wi, arr) => {
            const i = n++;
            return (
              <span key={wi}>
                <span className="-mb-[0.08em] inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <span data-w className={`inline-block origin-bottom-left ${accent.includes(i) ? "text-gold" : ""}`}>
                    {w}
                  </span>
                </span>
                {wi < arr.length - 1 ? " " : null}
              </span>
            );
          })}
        </span>
      ))}
    </>
  );
}

const BTN =
  "inline-flex h-12 short:h-10 items-center rounded-full px-4 font-condensed text-[14px] font-semibold uppercase tracking-[0.1em] sm:px-7 sm:text-[15px] sm:tracking-[0.14em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const CONTROLS: { key: ToggleKey; label: string; icon: () => ReactNode }[] = [
  { key: "headlights", label: "Headlights", icon: IconHeadlights },
  { key: "emergency", label: "Warning lights", icon: IconBeacon },
  { key: "hazards", label: "Hazards", icon: IconHazard },
  { key: "sideDoor", label: "Side door", icon: IconSideDoor },
  { key: "rearDoors", label: "Rear doors", icon: IconRearDoors },
];

class StageBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function HeroStory() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const toggles = useToggles();
  const [active, setActive] = useState(true);
  const [debug, setDebug] = useState(false);
  const [hinted, setHinted] = useState(false);

  useEffect(() => {
    rig.reducedMotion = reduced;
    rig.invalidate();
  }, [reduced]);

  useEffect(() => {
    // Debug readout via ?debug — read once after mount, outside render.
    const id = requestAnimationFrame(() => {
      const on = new URLSearchParams(window.location.search).has("debug");
      if (on) (window as unknown as { __rig: typeof rig }).__rig = rig;
      setDebug(on);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Pointer parallax target for camera + copy (mouse / pen only; touch keeps the frame steady).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      rig.ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
      rig.ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      rig.ptr.x = 0;
      rig.ptr.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Pause rendering entirely while the story is off-screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        }
        setActive(seen.size > 0);
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    // the van keeps flying through the sections that follow
    for (const id of ["services", "mission", "site-footer"]) {
      const next = document.getElementById(id);
      if (next) io.observe(next);
    }
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      let scrolledAt = 0;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          // Lenis already smooths the scroll itself; a light scrub adds weight without lag.
          scrub: reduced ? true : 0.45,
          onUpdate: () => {
            rig.invalidate();
            scrolledAt = performance.now();
          },
        },
      });
      tl.to(rig, { story: 1, duration: 1 }, 0);
      tl.fromTo(q("[data-progress]"), { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);

      // Captions travel with the orbit: in from the right, a slow drift while held,
      // out to the left with a slight 3D turn — the direction the scene moves on screen.
      const M = !reduced;
      // travel scales with the viewport so phones never push copy off-screen
      const vw = window.innerWidth;
      const amp = Math.min(1, vw / 1100);
      const X = M ? Math.min(150, vw * 0.14) : 0;
      const R = M ? 18 : 0;
      const W = M ? 118 : 0;
      const sel = (el: Element, s: string) => el.querySelectorAll(s);
      const later = { immediateRender: false };

      const enter = (el: Element, at: number) => {
        tl.fromTo(
          el,
          { autoAlpha: 0, x: X, rotationY: -R, transformPerspective: 1100, transformOrigin: "0% 50%" },
          { autoAlpha: 1, x: 0, rotationY: 0, duration: 0.04, ease: "power3.out" },
          at,
        );
        if (M)
          tl.fromTo(sel(el, "[data-w]"), { yPercent: W, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 0.032, stagger: 0.0035, ease: "power3.out" }, at + 0.004);
        tl.fromTo(sel(el, "[data-eyebrow]"), { autoAlpha: 0, x: M ? 60 : 0 }, { autoAlpha: 1, x: 0, duration: 0.03, ease: "power2.out" }, at + 0.006);
        tl.fromTo(sel(el, "[data-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 0.035, ease: "power2.out" }, at + 0.01);
        tl.fromTo(sel(el, "[data-fade]"), { autoAlpha: 0, y: M ? 18 : 0 }, { autoAlpha: 1, y: 0, duration: 0.03, stagger: 0.006, ease: "power2.out" }, at + 0.014);
      };
      const drift = (el: Element, from: number, to: number) => {
        if (M) tl.fromTo(el, { x: 0 }, { x: -30, duration: to - from, ...later }, from);
      };
      const exit = (el: Element, at: number) => {
        if (M)
          tl.fromTo(sel(el, "[data-w]"), { yPercent: 0 }, { yPercent: -W, duration: 0.026, stagger: 0.003, ease: "power2.in", ...later }, at);
        tl.fromTo(
          el,
          { autoAlpha: 1, x: M ? -30 : 0, rotationY: 0 },
          { autoAlpha: 0, x: -X * 1.25, rotationY: R, duration: 0.034, ease: "power2.in", ...later },
          at + 0.004,
        );
      };

      const hero = q("[data-hero]")[0];
      drift(hero, 0, 0.05);
      exit(hero, 0.05);
      q("[data-chapter]").forEach((el, i) => {
        const at = CHAPTERS[i].at;
        enter(el, at - 0.08);
        drift(el, at - 0.04, at + 0.045);
        exit(el, at + 0.045);
      });
      enter(q("[data-final]")[0], 0.92);

      // Colour washes tied to the lighting demos.
      tl.fromTo(q("[data-wash=red]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, 0.6);
      tl.fromTo(q("[data-wash=red]"), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.04, ...later }, 0.75);
      tl.fromTo(q("[data-wash=gold]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.76);

      // Captions belong to the scene: they turn with the camera orbit, and their shadows
      // fall away from the strongest light (studio key, or the van's headlamps).
      const layer = q("[data-scene-text]")[0] as HTMLElement | undefined;
      const lit = q("[data-hero], [data-chapter], [data-final]") as HTMLElement[];
      const litKey = new WeakMap<HTMLElement, string>();
      let last = "";
      // Studio key light comes from the upper right: default shadow falls down-left.
      const KEY = { x: -0.42, y: 0.9 };
      // This runs on GSAP's ticker, i.e. every frame of the whole page, so it does nothing
      // once the hero is off screen, and it never writes a style before it reads layout
      // (a write followed by getBoundingClientRect forces a style recalc mid-frame).
      let heroOn = true;
      const io = new IntersectionObserver(([e]) => (heroOn = e.isIntersecting));
      if (root.current) io.observe(root.current);
      let lastPtr = "";
      const shadows: [HTMLElement, number, number][] = [];
      // Pointer parallax per depth plane (px per unit of pointer travel). Written straight
      // onto each element's `translate`: an inherited custom property on the layer would
      // restyle the whole caption subtree on every pointer frame.
      const DEPTH = [
        ["depth-far", -5, -3],
        ["depth-mid", -11, -6],
        ["depth-near", -16, -9],
        ["depth-front", -22, -12],
      ] as const;
      const depthEls = DEPTH.flatMap(([c, fx, fy]) => (q(`.${c}`) as HTMLElement[]).map((el) => [el, fx, fy] as const));
      const couple = (_time: number, deltaMs: number) => {
        if (!layer || !heroOn) return;
        const dt = Math.min(0.1, deltaMs / 1000);
        // frame-rate independent easing (same feel at 60, 120 or 144 Hz)
        const ease = (rate: number) => 1 - Math.exp(-rate * dt);
        // shared, smoothed pointer parallax (the 3D camera reads rig.ptrS too)
        const tgt = M ? rig.ptr : { x: 0, y: 0 };
        rig.ptrS.x += (tgt.x - rig.ptrS.x) * ease(4.5);
        rig.ptrS.y += (tgt.y - rig.ptrS.y) * ease(4.5);
        // while the page scrolls, ease any drag rotation home so each chapter frames its view
        if (!rig.dragging && performance.now() - scrolledAt < 250 && Math.abs(rig.userYaw) > 0.0005) {
          rig.userYaw *= reduced ? 0 : 1 - ease(3.2);
          rig.invalidate();
        }

        // READ: shadow direction blends from the studio key light towards "away from the
        // headlamps". With the lamps dark it is simply the key light: no layout reads at all.
        const L = rig.lamp;
        shadows.length = 0;
        for (const el of lit) {
          if (el.style.visibility === "hidden") continue;
          let sx = KEY.x;
          let sy = KEY.y;
          if (L.a > 0.001) {
            const r = el.getBoundingClientRect();
            let dx = r.left + r.width / 2 - L.x;
            let dy = r.top + r.height / 2 - L.y;
            const dist = Math.hypot(dx, dy) || 1;
            const reach = Math.max(0, 1 - dist / (window.innerWidth * 1.25));
            const w = Math.min(1, L.a * reach * 2.3);
            dx /= dist;
            dy /= dist;
            sx = KEY.x + (dx - KEY.x) * w;
            sy = KEY.y + (dy - KEY.y) * w;
          }
          shadows.push([el, sx, sy]);
        }

        // WRITE (only what changed)
        const ptr = `${rig.ptrS.x.toFixed(3)}|${rig.ptrS.y.toFixed(3)}`;
        if (ptr !== lastPtr) {
          lastPtr = ptr;
          const { x, y } = rig.ptrS;
          for (const [el, fx, fy] of depthEls) el.style.translate = `${(x * fx).toFixed(2)}px ${(y * fy).toFixed(2)}px`;
        }
        for (const [el, sx, sy] of shadows) {
          const key = `${sx.toFixed(2)}|${sy.toFixed(2)}`;
          if (litKey.get(el) === key) continue;
          litKey.set(el, key);
          el.style.setProperty("--sx", sx.toFixed(3));
          el.style.setProperty("--sy", sy.toFixed(3));
        }
        const v = cameraAt(rig.story, reduced);
        let k = 0;
        for (let i = 1; i < VIEWS.length; i++) if (Math.abs(VIEWS[i].at - rig.story) < Math.abs(VIEWS[k].at - rig.story)) k = i;
        const dAz = v.az - VIEWS[k].az;
        const yaw = M ? Math.max(-14, Math.min(14, dAz * 0.22)) * amp : 0;
        const tx = M ? Math.max(-70, Math.min(70, -dAz * 2.4)) * amp : 0;
        const key = `${yaw.toFixed(2)}|${tx.toFixed(1)}`;
        if (key === last) return;
        last = key;
        // the layer's own transform (not inherited custom properties: those would restyle
        // every caption element on each scroll frame)
        layer.style.transform = `perspective(1400px) rotateY(${yaw.toFixed(2)}deg) translateX(${tx.toFixed(1)}px)`;
      };
      gsap.ticker.add(couple);

      // One-off entrance for the hero copy on load (time-based, not scrubbed).
      // Runs on the compositor (Web Animations), not GSAP, because it plays while the
      // loading screen splits open — exactly when the rest of the page is busiest. Each
      // animation holds its start pose through its delay (fill: backwards) and then hands
      // back to the element's resting style, so the scroll timeline above stays in charge.
      let offReveal = () => {};
      const introAnims: Animation[] = [];
      if (M && (ScrollTrigger.getAll()[0]?.progress ?? 0) < 0.02) {
        const QUINT_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"; // GSAP power4.out
        const QUART_OUT = "cubic-bezier(0.25, 1, 0.5, 1)"; // power3.out
        const QUART_IN_OUT = "cubic-bezier(0.76, 0, 0.24, 1)"; // power3.inOut
        const at = 300; // ms after the screen starts to part
        const play = (nodes: NodeListOf<Element>, frames: Keyframe[], duration: number, delay: number, easing: string, stagger = 0) =>
          nodes.forEach((n, i) => introAnims.push(n.animate(frames, { duration, delay: at + delay + i * stagger, easing, fill: "backwards" })));
        offReveal = boot.onReveal(() => {
          play(sel(hero, "[data-w]"), [{ transform: "translateY(118%) rotate(6deg)" }, { transform: "none" }], 1100, 0, QUINT_OUT, 70);
          play(sel(hero, "[data-eyebrow]"), [{ opacity: 0, transform: "translateX(40px)" }, { opacity: 1, transform: "none" }], 800, 100, QUART_OUT);
          play(sel(hero, "[data-rule]"), [{ transform: "scaleX(0)" }, { transform: "none" }], 900, 350, QUART_IN_OUT);
          play(sel(hero, "[data-fade]"), [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }], 800, 500, QUART_OUT, 100);
        });
      }
      return () => {
        gsap.ticker.remove(couple);
        io.disconnect();
        offReveal();
        introAnims.forEach((a) => a.cancel());
      };
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  // Drag to rotate (horizontal); vertical pans still scroll the page on touch.
  const drag = useRef({ x: 0, t: 0, v: 0, id: -1 });
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, t: performance.now(), v: 0, id: e.pointerId };
    rig.dragging = true;
    gsap.killTweensOf(rig, "userYaw");
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!rig.dragging || e.pointerId !== d.id) return;
    const now = performance.now();
    const dx = e.clientX - d.x;
    rig.userYaw += dx * 0.0085;
    // rad/ms, smoothed; a 16 ms floor keeps bursts of coalesced events from spiking it
    const inst = (dx * 0.0085) / Math.max(16, now - d.t);
    d.v = d.v * 0.6 + inst * 0.4;
    d.x = e.clientX;
    d.t = now;
    if (Math.abs(dx) > 2 && !hinted) setHinted(true);
    rig.invalidate();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!rig.dragging || e.pointerId !== drag.current.id) return;
    rig.dragging = false;
    const stale = performance.now() - drag.current.t > 90; // pointer rested before release
    const fling = reduced || stale ? 0 : gsap.utils.clamp(-1.2, 1.2, drag.current.v * 220);
    if (fling) gsap.to(rig, { userYaw: rig.userYaw + fling, duration: 1.1, ease: "power3.out", onUpdate: () => rig.invalidate() });
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowLeft" ? -0.35 : e.key === "ArrowRight" ? 0.35 : 0;
    if (e.key === "Home") gsap.to(rig, { userYaw: 0, duration: reduced ? 0 : 0.6, onUpdate: () => rig.invalidate() });
    if (!step) return;
    e.preventDefault();
    gsap.to(rig, {
      userYaw: rig.userYaw + step,
      duration: reduced ? 0 : 0.45,
      ease: "power2.out",
      overwrite: "auto",
      onUpdate: () => rig.invalidate(),
    });
  };

  return (
    <section ref={root} id="vehicle" aria-label="The Odes vehicle" className="relative h-[720svh] bg-ink">
      {/* Page-level 3D layer: fixed so the van can leave the hero and float into the next
          section. Click-through; pointer events reach the scene via the hero stage below. */}
      <div className={`pointer-events-none fixed inset-0 z-[5] ${active ? "" : "invisible"}`}>
        <StageBoundary
          fallback={
            <p className="absolute inset-x-0 bottom-40 text-center text-sm text-white/70">
              The 3D view needs WebGL, which isn’t available in this browser.
            </p>
          }
        >
          {/* mounts straight away: the van builds behind the loading screen, which waits at
              "Pickup" until its first frame is drawn (see Loader) */}
          <AmbulanceStage active={active} reducedMotion={reduced} debug={debug} words={BG_WORDS} eventSource={stage} />
          {/* a still of the parked van, shown only if the screen opens before the live van is ready */}
          <HeroPoster />
        </StageBoundary>
      </div>

      {/* studio backdrop (beneath the 3D layer) */}
      <div aria-hidden className="sticky top-0 h-svh overflow-hidden">
        <div className="studio-backdrop absolute inset-0" />
        <div className="studio-beam absolute inset-0" />
        <div data-wash="red" className="wash-red invisible absolute inset-0 opacity-0" />
        <div data-wash="gold" className="wash-gold invisible absolute inset-0 opacity-0" />
      </div>

      {/* drag surface + copy: BENEATH the 3D layer (z-5), so the van passes in front of the
          words. The canvas ignores pointer events, so drags and CTA taps still land here. */}      <div className="sticky top-0 z-[4] -mt-[100svh] h-svh overflow-clip">
        <div
          ref={stage}
          tabIndex={0}
          aria-label="3D vehicle viewer. Drag or use the left and right arrow keys to rotate. Home resets the view."
          className="absolute inset-0 cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/70"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        />

        {/* captions */}
        <div
          data-scene-text
          className="scene-text pointer-events-none absolute inset-0 mx-auto flex max-w-7xl items-end px-5 pb-36 pt-24 sm:px-8 wide:items-center wide:pb-36 wide:pt-28 short:items-center short:pb-24 short:pt-20"
        >
          <div data-hero className="pointer-events-auto max-w-2xl will-change-transform short:max-w-[48%]">
            <p data-eyebrow className="depth-far mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold compact:mb-4 short:mb-2 short:text-xs">
              <span data-rule className="h-px w-10 origin-left bg-gold" />
              <span className="sm:hidden short:inline">Non-emergency transport</span>
              <span className="max-sm:hidden short:hidden">Non-emergency medical transportation</span>
            </p>
            <h1 className="depth-mid font-display text-[clamp(2.4rem,min(12.5vw,6.2vh),3.6rem)] uppercase leading-[0.88] text-white sm:text-[clamp(3rem,min(9vw,7vh),5rem)] lg:text-[clamp(3rem,min(7.4vw,10.5vh),7.5rem)] short:text-[clamp(1.9rem,11vh,3.2rem)]">
              <Words text="Care that|travels|with you." accent={[2]} />
            </h1>
            <p data-fade className="depth-near mt-5 max-w-md text-pretty text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg compact:mt-4 compact:text-base short:hidden tiny:hidden">
              Safe, reliable, on-time rides to medical care across {COMPANY.serviceArea} — so every patient can
              reach their appointment without the stress of getting there.
            </p>
            <div data-fade className="depth-front mt-6 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3 compact:mt-6 short:mt-4">
              <TransitionLink href="/book" className={`${BTN} scene-cta bg-gold text-ink hover:bg-gold-light`}>
                Book a ride
              </TransitionLink>
              <a href={COMPANY.phoneHref} className={`${BTN} scene-cta scene-glass text-white short:hidden`}>
                Call {COMPANY.phone}
              </a>
            </div>
          </div>

          {CHAPTERS.map((c) => (
            <article key={c.title} data-chapter className="invisible absolute inset-x-5 max-w-lg opacity-0 will-change-transform sm:inset-x-8 wide:right-auto short:right-auto short:max-w-[46%]">
              <p data-eyebrow className="depth-far mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold compact:mb-4 short:mb-2 short:text-xs">
                <span data-rule className="h-px w-10 origin-left bg-gold" />
                {c.eyebrow}
              </p>
              <h2 className="depth-mid font-display text-[clamp(2.1rem,min(10vw,5.4vh),2.9rem)] uppercase leading-[0.9] text-white sm:text-[clamp(2.4rem,min(7vw,5.6vh),3.6rem)] lg:text-[clamp(2.6rem,min(4.6vw,8.5vh),4.75rem)] short:text-[clamp(1.6rem,9vh,2.4rem)]">
                <Words text={c.title} />
              </h2>
              <p data-fade className="depth-near mt-5 max-w-sm text-pretty text-base leading-relaxed text-white/75 sm:text-lg compact:mt-4 short:mt-2 short:line-clamp-2 short:text-sm tiny:line-clamp-3">
                {c.body}
              </p>
            </article>
          ))}

          <div data-final className="pointer-events-auto invisible absolute inset-x-5 max-w-xl opacity-0 will-change-transform sm:inset-x-8 wide:right-auto short:right-auto short:max-w-[48%]">
            <p data-eyebrow className="depth-far mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold compact:mb-4 short:mb-2 short:text-xs">
              <span data-rule className="h-px w-10 origin-left bg-gold" />
              Odes Medical Transportation
            </p>
            <h2 className="depth-mid font-display text-[clamp(2.4rem,min(12vw,6vh),3.6rem)] uppercase leading-[0.88] text-white sm:text-[clamp(3rem,min(9vw,7vh),5rem)] lg:text-[clamp(3rem,min(7vw,10vh),7rem)] short:text-[clamp(1.9rem,11vh,3.2rem)]">
              <Words text="Ready|when you are." accent={[3]} />
            </h2>
            <div data-fade className="depth-front mt-8 compact:mt-6 short:mt-4">
              <TransitionLink href="/book" className={`${BTN} scene-cta bg-gold text-ink hover:bg-gold-light`}>
                Book a ride
              </TransitionLink>
            </div>
          </div>
        </div>

      </div>

      {/* film (vignette, grain) and the control dock: also BENEATH the 3D layer, so the van
          is the top-most thing in the hero. Same z as the copy layer and later in the DOM,
          so it still stacks above the copy. The page-level 3D layer itself stays at z-5:
          later sections (the Mission palms at z-10) rely on passing in front of the van.
          The canvas is click-through, so the controls stay usable under the van. */}
      <div className="pointer-events-none sticky top-0 z-[4] -mt-[100svh] h-svh overflow-clip">
        <div aria-hidden className="studio-vignette absolute inset-0" />
        <div aria-hidden className="studio-grain absolute inset-0" />

        {/* controls */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p
            className={`flex items-center gap-2 font-condensed text-xs uppercase tracking-[0.16em] text-white/55 transition-opacity duration-500 short:hidden ${hinted ? "opacity-0" : "opacity-100"}`}
          >
            <IconRotate /> Drag to rotate · tap a door to open it
          </p>
          <div
            role="toolbar"
            aria-label="Vehicle controls"
            className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-ink/90 p-1.5 shadow-2xl"
          >
            {CONTROLS.map(({ key, label, icon: Icon }) => {
              const on = toggles[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(key)}
                  className={`flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 font-condensed text-[15px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-4 ${
                    on ? "bg-white text-ink" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon />
                  <span className="max-sm:sr-only short:sr-only">{label}</span>
                </button>
              );
            })}
          </div>
          <div aria-hidden className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
            <div data-progress className="h-full origin-left scale-x-0 bg-gold" />
          </div>
        </div>
      </div>
      <span id="vehicle-tour" className="absolute top-[118svh]" aria-hidden />
    </section>
  );
}
