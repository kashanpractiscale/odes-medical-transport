"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { COMPANY } from "@/lib/site";
import { boot } from "./boot";

const DRIVE_MS = 1700; // the whole route, start to finish
const FONT_WAIT_MS = 1200; // longest we wait for the display fonts before driving
const SAMPLES = 90; // keyframes per track (linear between them, so ~19 ms apart)
const STOPS = [0.25, 0.5, 0.75]; // route stops that light up as the van passes

const STATUS = [
  [0, "Preparing your ride"],
  [0.3, "Bringing the van round"],
  [0.65, "Checking everything’s ready"],
  [0.97, "Ready when you are"],
] as const;

/*
 * Side-on van, drawn to the 3D model's Transit EL High Roof figures (18 units per metre,
 * ground at y = 52): 6.70 m long, 2.80 m tall, axles 1.96 m and 5.71 m from the rear,
 * 0.356 m tyres, roof cap at 4.40 m, windshield 5.13–5.91 m, hood edge 6.55 m.
 * The wheels are separate HTML elements so they can turn on the compositor.
 */
const VAN_W = 122;
const VAN_H = 54;
const AXLES = [35.3, 102.8];
const WHEEL_Y = 45.8;
const WHEEL_R = 6.4;
const BODY =
  "M1 44.4V4Q1 1.6 3.4 1.6H79Q86 2.5 92 10.6L106 25.4L118 31Q120.6 32 120.6 35V44.4H110.5A7.7 7.7 0 0 0 95.1 44.4H43A7.7 7.7 0 0 0 27.6 44.4Z";

function Van() {
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VAN_W} ${VAN_H}`} className="block h-auto w-full overflow-visible" aria-hidden>
        <defs>
          <clipPath id="loader-van-body">
            <path d={BODY} />
          </clipPath>
          <linearGradient id="loader-van-paint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#d5dedc" />
          </linearGradient>
        </defs>
        <ellipse cx="62" cy="52.4" rx="60" ry="2.2" fill="#000" opacity=".45" />
        <path d={BODY} fill="url(#loader-van-paint)" />
        <g clipPath="url(#loader-van-body)">
          <rect x="0" y="31.4" width="122" height="1.1" fill="#d9a441" />
          <rect x="0" y="33.2" width="122" height="3.6" fill="#0f766e" />
        </g>
        {/* patient windows, cab window, headlamp */}
        <g fill="#0b2422">
          <rect x="9" y="17.4" width="20" height="10.8" rx="1.6" />
          <rect x="33" y="17.4" width="20" height="10.8" rx="1.6" />
          <rect x="57" y="17.4" width="19" height="10.8" rx="1.6" />
          <path d="M84.5 13H91.4L102.6 25.2H84.5Z" />
        </g>
        <path d="M116.4 31.4L120.3 33V35.2H116.4Z" fill="#fff4d6" />
      </svg>
      {AXLES.map((cx) => (
        <div
          key={cx}
          data-wheel
          className="absolute aspect-square will-change-transform"
          style={{
            left: `${((cx - WHEEL_R) / VAN_W) * 100}%`,
            top: `${((WHEEL_Y - WHEEL_R) / VAN_H) * 100}%`,
            width: `${((WHEEL_R * 2) / VAN_W) * 100}%`,
          }}
        >
          <svg viewBox="-6.4 -6.4 12.8 12.8" className="block size-full" aria-hidden>
            <circle r="6.4" fill="#0b1212" />
            <circle r="3.7" fill="#c9d3d1" />
            <circle r="1.1" fill="#0b1212" />
            <rect x="-0.6" y="-3.6" width="1.2" height="2" fill="#0b1212" />
            <rect x="-0.6" y="1.6" width="1.2" height="2" fill="#0b1212" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/** One odometer drum: digits 0–9 and a trailing 0 so the wrap rolls instead of jumping. */
function Drum({ dim }: { dim?: boolean }) {
  return (
    <span data-drum-wrap className={`relative block h-[1.1em] overflow-hidden ${dim ? "opacity-15" : ""}`}>
      <span data-drum className="block will-change-transform">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
          <span key={i} className="block h-[1.1em] leading-[1.1em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pure motion maths: one easing curve drives every track, so they stay in sync.

/** Smooth start and finish (quintic-ish smootherstep), no stop-and-go. */
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** Time (0‥1) at which the eased progress reaches p (monotonic, so bisect). */
function timeOf(p: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Drum positions (digit cells) for a percentage: units roll continuously; tens and
 *  hundreds turn only while the drum below rolls over from 9, like a real odometer. */
function drumPositions(pct: number): [number, number, number] {
  if (pct >= 100) return [1, 0, 0];
  const u = pct % 10;
  const tens = Math.floor(pct / 10) % 10;
  const carry = Math.max(0, u - 9);
  return [tens === 9 ? carry : 0, tens + carry, u];
}
const drumY = (cells: number) => `translateY(${(-cells * 100) / 11}%)`;

/** Opacity keyframes: hidden, fade in at time a, fade out at time b (0‥1). */
function windowFrames(a: number, b: number, fade = 0.035): Keyframe[] {
  const f: Keyframe[] = [];
  const push = (offset: number, opacity: number) => f.push({ offset: Math.min(1, Math.max(0, offset)), opacity });
  push(0, a <= 0 ? 1 : 0);
  if (a > 0) {
    push(a, 0);
    push(a + fade, 1);
  }
  if (b < 1) {
    push(b - fade, 1);
    push(b, 0);
  }
  push(1, b < 1 ? 0 : 1);
  return f;
}
/** A one-way step (e.g. 0.15 → 1 opacity) at time t. */
const stepFrames = (t: number, from: number, to: number, fade = 0.03): Keyframe[] => [
  { offset: 0, opacity: from },
  { offset: Math.max(0, t - fade), opacity: from },
  { offset: Math.min(1, t), opacity: to },
  { offset: 1, opacity: to },
];

/**
 * Loading screen in the hero's studio light: a small side-on Odes van drives the route
 * from "Pickup" to "Your appointment" while an odometer rolls to 100 %, then drives off;
 * the road flares and the screen parts along it.
 *
 * Built to be perfectly smooth: the whole sequence is planned once, up front, as Web
 * Animations keyframes from one easing curve (van, gold line, wheels, odometer drums and
 * their dimming, route stops, status text), so it runs entirely on the compositor with no
 * JavaScript per frame. Nothing heavy happens underneath it either: the 3D scene does not
 * start loading until this has opened (see HeroStory), so the GPU is never shared with
 * shader compiles or texture uploads while it plays.
 */
export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (boot.revealed) {
      // already opened earlier in this session (e.g. a hot reload): stay out of the way
      // (`hidden` also releases the CSS scroll lock in globals.css)
      el.hidden = true;
      return;
    }
    const $ = (s: string) => el.querySelector<HTMLElement>(s)!;
    const $$ = (s: string) => [...el.querySelectorAll<HTMLElement>(s)];
    const anims: Animation[] = [];
    const timers: number[] = [];
    let idle = 0;
    let cancelled = false;

    const run = (target: Element, frames: Keyframe[], o: KeyframeAnimationOptions) => {
      const a = target.animate(frames, { fill: "forwards", ...o });
      anims.push(a);
      return a;
    };
    const finish = () => setGone(true);

    // Start on a quiet page: once the display fonts are in (so no text reflows mid-drive)
    // and the browser reports idle time after hydration (so the rest of the page setting
    // up — scroll effects, smooth scrolling — is done). Until then the van idles in place.
    const fontsReady = Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, FONT_WAIT_MS)),
    ]).then(() => boot.mark("fonts"));
    const quiet = new Promise<void>((r) => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(() => r(), { timeout: 400 });
      else timers.push(window.setTimeout(r, 0));
    });
    Promise.all([fontsReady, quiet]).then(() => {
      if (!cancelled) begin();
    });

    /**
     * Plans the entire sequence, drive and exit, in one go: after this call no
     * JavaScript runs until the reveal timer, so nothing on the main thread can
     * touch the motion.
     */
    function begin() {
      const track = $("[data-track]");
      const van = $("[data-van]");
      const fill = $("[data-fill]");
      const bar = $("[data-bar]");
      const drums = $$("[data-drum]");
      const drumWraps = $$("[data-drum-wrap]");
      const W = track.offsetWidth;
      const vanW = van.offsetWidth;
      const wheelPx = (vanW * WHEEL_R) / VAN_W;
      const xAt = (p: number) => p * (W - vanW);
      const deg = (x: number) => (x / wheelPx) * (180 / Math.PI);

      if (reduced) {
        // no travel: show the finished state briefly, then fade
        van.style.transform = `translateX(${xAt(1)}px)`;
        fill.style.transform = "scaleX(1)";
        drumPositions(100).forEach((c, i) => (drums[i].style.transform = drumY(c)));
        drumWraps.forEach((w) => (w.style.opacity = "1"));
        $$("[data-stop-on]").forEach((s) => (s.style.opacity = "1"));
        $$("[data-status-line]").forEach((s, i) => (s.style.opacity = i === STATUS.length - 1 ? "1" : "0"));
        bar.setAttribute("aria-valuenow", "100");
        timers.push(window.setTimeout(() => boot.reveal(), 400));
        run(el!, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: 400, easing: "ease-out" }).finished.then(finish);
        return;
      }

      // -- the drive: one plan, sampled from one curve ---------------------------------
      const vanK: Keyframe[] = [];
      const fillK: Keyframe[] = [];
      const wheelK: Keyframe[] = [];
      const drumK: Keyframe[][] = [[], [], []];
      let prev: number[] | null = null;
      for (let i = 0; i <= SAMPLES; i++) {
        const k = i / SAMPLES;
        const p = ease(k);
        const x = xAt(p);
        vanK.push({ offset: k, transform: `translateX(${x}px)` });
        fillK.push({ offset: k, transform: `scaleX(${(x + vanW * 0.55) / W})` });
        wheelK.push({ offset: k, transform: `rotate(${deg(x)}deg)` });
        const cells = drumPositions(p * 100);
        cells.forEach((c, j) => {
          if (prev && c < prev[j] - 0.5) {
            // 9 → 0: roll on to the trailing "0" cell, then snap to the identical first one
            const mid = (k + (i - 1) / SAMPLES) / 2;
            drumK[j].push({ offset: mid, transform: drumY(10) }, { offset: mid, transform: drumY(0) });
          }
          drumK[j].push({ offset: k, transform: drumY(c) });
        });
        prev = cells;
      }
      const o = { duration: DRIVE_MS, easing: "linear" };
      performance.mark("boot:intro"); // the loader's drive starts here (DevTools > Timings)
      run(van, vanK, o);
      run(fill, fillK, o);
      $$("[data-wheel]").forEach((w) => run(w, wheelK, o));
      drums.forEach((d, j) => run(d, drumK[j], o));
      // leading zeros brighten as they come into use; stops light as the van passes them
      run(drumWraps[1], stepFrames(timeOf(0.1), 0.15, 1), o);
      run(drumWraps[0], stepFrames(0.999, 0.15, 1, 0.02), o);
      $$("[data-stop-on]").forEach((s) => run(s, stepFrames(timeOf(Number(s.dataset.at)), 0, 1, 0.04), o));
      $$("[data-status-line]").forEach((s, i) => {
        const a = timeOf(STATUS[i][0]);
        const b = i < STATUS.length - 1 ? timeOf(STATUS[i + 1][0]) : 1;
        run(s, windowFrames(a, b), o);
      });
      // screen readers: a few coarse updates are plenty
      [25, 50, 75, 100].forEach((n) =>
        timers.push(window.setTimeout(() => bar.setAttribute("aria-valuenow", String(n)), timeOf(n / 100) * DRIVE_MS)),
      );

      // -- the exit, scheduled now with delays (no script runs at the hand-off) --------
      const T = DRIVE_MS;
      const IN = "cubic-bezier(0.55, 0.085, 0.68, 0.53)";
      const IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
      const x0 = xAt(1);
      const off = W + 80;
      // the van pulls away off the right edge, wheels turning with it…
      run(van, [{ transform: `translateX(${x0}px)` }, { transform: `translateX(${off}px)` }], { duration: 500, delay: T, easing: IN });
      $$("[data-wheel]").forEach((w) =>
        run(w, [{ transform: `rotate(${deg(x0)}deg)` }, { transform: `rotate(${deg(off)}deg)` }], { duration: 500, delay: T, easing: IN }),
      );
      $$("[data-out]").forEach((n, i) =>
        run(n, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${i % 2 ? 18 : -18}px)` }], {
          duration: 300,
          delay: T + i * 20,
          easing: IN,
        }),
      );
      $$("[data-dashes], [data-stop]").forEach((n) => run(n, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: T }));
      // …the road flares, and the screen parts along it
      run(fill, [{ transform: "scaleX(1) scaleY(1)" }, { transform: "scaleX(1) scaleY(3)" }], { duration: 180, delay: T + 300, easing: "ease-out" });
      run(fill, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: T + 630 });
      const OPEN_AT = T + 480;
      timers.push(window.setTimeout(() => boot.reveal(), OPEN_AT));
      run($("[data-panel='top']"), [{ transform: "none" }, { transform: "translateY(-100%)" }], { duration: 950, delay: OPEN_AT, easing: IN_OUT });
      run($("[data-panel='bottom']"), [{ transform: "none" }, { transform: "translateY(100%)" }], {
        duration: 950,
        delay: OPEN_AT,
        easing: IN_OUT,
      }).finished.then(finish);
    }

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      if (idle) window.cancelIdleCallback(idle);
      anims.forEach((a) => a.cancel());
    };
  }, [reduced]);

  if (gone) return null;

  const LABEL = "font-condensed text-xs font-semibold uppercase tracking-[0.28em] text-white/50 sm:text-sm";

  return (
    <div ref={root} id="loader" className="fixed inset-0 z-[100] select-none text-white">
      {/* two halves of one studio backdrop, so the split reads as the frame parting */}
      <div data-panel="top" className="absolute inset-x-0 top-0 h-1/2 overflow-hidden will-change-transform">
        <div className="studio-backdrop absolute inset-x-0 top-0 h-svh" />
        <div className="studio-vignette absolute inset-x-0 top-0 h-svh" />
      </div>
      <div data-panel="bottom" className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden will-change-transform">
        <div className="studio-backdrop absolute inset-x-0 bottom-0 h-svh" />
        <div className="studio-vignette absolute inset-x-0 bottom-0 h-svh" />
      </div>

      {/* identity */}
      <div data-out className="absolute left-5 top-5 sm:left-10 sm:top-8 lg:left-16">
        <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]">
          <Image src="/brand/odes-logo.png" alt="Odes Medical Transportation" width={1789} height={573} priority className="h-8 w-auto sm:h-10" />
        </div>
      </div>
      <p data-out className={`${LABEL} absolute right-5 top-8 hidden text-right sm:right-10 sm:block lg:right-16 lg:top-11`}>
        Non-emergency medical transportation
        <br />
        {COMPANY.serviceArea}
      </p>

      {/* the route along the seam */}
      <div
        data-bar
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        className="absolute inset-x-5 top-1/2 sm:inset-x-10 lg:inset-x-16"
      >
        <div data-track className="relative h-[2px]">
          <div data-dashes className="loader-dashes absolute inset-0 opacity-35" />
          {/* inline transform, not Tailwind's scale-x-0: v4 uses the separate `scale`
              property, which would multiply with the animated transform */}
          <div
            data-fill
            style={{ transform: "scaleX(0)" }}
            className="absolute inset-0 origin-left bg-gold shadow-[0_0_14px_rgb(217_164_65/0.75)] will-change-transform"
          />
          {STOPS.map((at) => (
            <span
              key={at}
              data-stop
              style={{ left: `${at * 100}%` }}
              className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-white/25"
            >
              <span data-stop-on data-at={at} className="absolute inset-0 bg-gold opacity-0" />
            </span>
          ))}
          {/* the van rides on the line; its beam lights the road ahead */}
          <div data-van className="absolute bottom-0 left-0 w-[clamp(84px,9vw,136px)] will-change-transform">
            <div className="loader-idle">
              <div className="loader-beam absolute bottom-[14%] left-[97%] h-[42%] w-[clamp(80px,12vw,180px)]" />
              <Van />
            </div>
          </div>
        </div>
        <div data-out className="mt-5 flex justify-between">
          <span className={LABEL}>Pickup</span>
          <span className={LABEL}>Your appointment</span>
        </div>
      </div>

      {/* status, bottom-left (phones: above the odometer); lines cross-fade on the compositor */}
      <div data-out className="absolute bottom-[calc(17vw+2.5rem)] left-5 sm:bottom-10 sm:left-10 lg:left-16">
        <p className="relative h-5 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
          <span className="sr-only">Loading</span>
          {STATUS.map(([, text], i) => (
            <span key={text} data-status-line aria-hidden className={`absolute left-0 top-0 whitespace-nowrap ${i ? "opacity-0" : ""}`}>
              {text}
            </span>
          ))}
        </p>
        <p className="mt-2 hidden max-w-[16rem] text-sm text-white/45 sm:block">Safe, reliable, on-time rides to medical care.</p>
      </div>

      {/* odometer, bottom-right */}
      <div
        data-out
        aria-hidden
        className="absolute bottom-4 right-5 flex items-start font-display text-[clamp(4.5rem,17vw,13rem)] leading-none sm:bottom-7 sm:right-10 lg:right-16"
      >
        <span className="flex tabular-nums">
          <Drum dim />
          <Drum dim />
          <Drum />
        </span>
        <span className="ml-[0.08em] mt-[0.12em] text-[0.24em] leading-none text-gold">%</span>
      </div>
    </div>
  );
}
