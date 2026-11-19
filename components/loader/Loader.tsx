"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { COMPANY } from "@/lib/site";
import { boot, MILESTONES } from "./boot";

// Start downloading the 3D engine (~290 KB gzipped, the longest wait) the moment this
// script runs, rather than when React reaches the hero; next/dynamic reuses the request.
if (typeof window !== "undefined") void import("@/components/ambulance/AmbulanceStage");

const MIN_SHOW = 1200; // ms: long enough to read as intentional, never a flash
const GIVE_UP = 9000; // ms: open anyway (slow network, no WebGL) — the page works without the van
const TICK = 50; // ms: bookkeeping cadence (milestones, text); motion itself is on the compositor
const SAMPLES = 60; // keyframes per glide

const STATUS = [
  [0, "Preparing your ride"],
  [0.3, "Bringing the van round"],
  [0.65, "Checking everything’s ready"],
  [0.97, "Ready when you are"],
] as const;
const statusFor = (p: number) => STATUS.reduce<string>((m, [at, text]) => (p >= at ? text : m), STATUS[0][1]);

/*
 * Side-on van, drawn to the 3D model's Transit EL High Roof figures (18 units per metre,
 * ground at y = 52): 6.70 m long, 2.80 m tall, axles 1.96 m and 5.71 m from the rear,
 * 0.356 m tyres, roof cap at 4.40 m, windshield 5.13–5.91 m, hood edge 6.55 m.
 * The wheels are separate HTML elements (below) so they can spin on the compositor.
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
          className="loader-wheel absolute aspect-square"
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
    <span className="relative block h-[1.1em] overflow-hidden">
      <span data-drum data-dim={dim ? "" : undefined} className="block will-change-transform data-dim:text-white/15">
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
// Pure motion maths (shared by the keyframe builder and the bookkeeping loop)

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** A glide of the displayed progress from v0 to v1 (0‥1), started at t0 (ms). */
type Glide = { v0: number; v1: number; t0: number; dur: number };
const valueAt = (g: Glide, now: number) => {
  const k = g.dur <= 0 ? 1 : Math.min(1, Math.max(0, (now - g.t0) / g.dur));
  return g.v0 + (g.v1 - g.v0) * easeOut(k);
};

/** Drum positions (in digit cells) for a percentage: units roll continuously; tens and
 *  hundreds turn only while the drum below rolls over from 9, as on a real odometer. */
function drumPositions(pct: number): [number, number, number] {
  if (pct >= 100) return [1, 0, 0];
  const u = pct % 10;
  const tens = Math.floor(pct / 10) % 10;
  const carry = Math.max(0, u - 9);
  return [tens === 9 ? carry : 0, tens + carry, u];
}
const drumY = (cells: number) => `translateY(${(-cells * 100) / 11}%)`;

/**
 * Loading screen in the hero's studio light. A small side-on Odes van drives a route from
 * "Pickup" to "Your appointment" along the screen's centre line, passing a tick for each
 * real boot milestone (fonts, 3D engine, van model, first frame), while an odometer rolls
 * the percentage. When everything is ready the van drives off, the road flares and the
 * screen parts along it, top half up, bottom half down, as the 3D van drives in.
 *
 * Smoothness: the page's main thread is blocked several times while three.js parses and
 * the van is built, so nothing here is animated frame-by-frame from JavaScript. Each time
 * a milestone lands, the loader hands the compositor a complete glide (Web Animations
 * keyframes for the van, the gold line and every odometer drum; CSS for the wheels), and
 * the motion carries on through any freeze. JavaScript only does bookkeeping every 50 ms.
 */
export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    document.fonts?.ready.then(() => boot.mark("fonts"));
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (boot.revealed) {
      // already opened earlier in this session (e.g. a hot reload): stay out of the way
      el.style.display = "none";
      return;
    }
    const $ = (s: string) => el.querySelector<HTMLElement>(s)!;
    const $$ = (s: string) => [...el.querySelectorAll<HTMLElement>(s)];
    const html = document.documentElement;
    html.style.overflow = "hidden";

    const track = $("[data-track]");
    const bar = $("[data-bar]");
    const fill = $("[data-fill]");
    const van = $("[data-van]");
    const drums = $$("[data-drum]");
    const ticks = $$("[data-tick]");
    const status = $("[data-status]");
    const wheelSpin = $$("[data-wheel]").flatMap((w) => w.getAnimations());

    let W = 1;
    let vanW = 1;
    const measure = () => {
      W = track.offsetWidth;
      vanW = van.offsetWidth;
    };
    measure();

    const start = performance.now();
    let glide: Glide = { v0: 0, v1: 0, t0: start, dur: 0 };
    let running: Animation[] = [];
    let wheelStop = 0;
    let lastInt = -1;
    let leaving = false;

    /** Where the glide actually is on screen: the running animation's own clock, which
     *  starts a frame or more late on a busy page, rather than wall time. */
    const shownNow = () => {
      const a = running[0];
      if (!a || glide.dur <= 0) return valueAt(glide, performance.now());
      const k = Math.min(1, Math.max(0, Number(a.currentTime ?? 0) / glide.dur));
      return glide.v0 + (glide.v1 - glide.v0) * easeOut(k);
    };

    const xAt = (p: number) => p * (W - vanW);
    const fillAt = (p: number) => (xAt(p) + vanW * 0.55) / W;

    /** Static placement (reduced motion, and the resting state between glides). */
    const place = (p: number) => {
      van.style.transform = `translateX(${xAt(p)}px)`;
      fill.style.transform = `scaleX(${fillAt(p)})`;
      drumPositions(p * 100).forEach((c, i) => (drums[i].style.transform = drumY(c)));
    };

    /** Hand the compositor a full glide from the current value to `to`. */
    const glideTo = (to: number, now: number) => {
      const from = shownNow();
      const dur = reduced ? 0 : to >= 1 ? 350 : Math.min(3200, Math.max(900, 900 + (to - from) * 6000));
      glide = { v0: from, v1: to, t0: now, dur };
      place(to); // the resting state once the glide has played out
      if (reduced) return;

      const vanK: Keyframe[] = [];
      const fillK: Keyframe[] = [];
      const drumK: Keyframe[][] = [[], [], []];
      let prev: number[] | null = null;
      for (let i = 0; i <= SAMPLES; i++) {
        const k = i / SAMPLES;
        const p = from + (to - from) * easeOut(k);
        vanK.push({ offset: k, transform: `translateX(${xAt(p)}px)` });
        fillK.push({ offset: k, transform: `scaleX(${fillAt(p)})` });
        const cells = drumPositions(p * 100);
        cells.forEach((c, j) => {
          if (prev && c < prev[j] - 0.5) {
            // 9 → 0: roll on to the trailing "0" cell, then snap to the identical first cell
            const mid = (k + (i - 1) / SAMPLES) / 2;
            drumK[j].push({ offset: mid, transform: drumY(10) }, { offset: mid, transform: drumY(0) });
          }
          drumK[j].push({ offset: k, transform: drumY(c) });
        });
        prev = cells;
      }
      const opts: KeyframeAnimationOptions = { duration: dur, easing: "linear", fill: "forwards" };
      const next = [
        van.animate(vanK, opts),
        fill.animate(fillK, opts),
        ...drums.map((d, j) => d.animate(drumK[j], opts)),
      ];
      running.forEach((a) => a.cancel());
      running = next;

      // wheels turn while the van is moving
      wheelSpin.forEach((a) => a.play());
      window.clearTimeout(wheelStop);
      wheelStop = window.setTimeout(() => wheelSpin.forEach((a) => a.pause()), dur * 0.8);
    };

    const onResize = () => {
      measure();
      glideTo(glide.v1, performance.now());
    };
    window.addEventListener("resize", onResize);

    // Bookkeeping: new milestones retarget the glide; text, ticks and ARIA follow.
    const loop = window.setInterval(() => {
      const now = performance.now();
      if (now - start > GIVE_UP) (["fonts", "stage", "model", "frame"] as const).forEach((s) => boot.mark(s));
      const target = boot.progress();
      // aim a little past what has loaded so a slow download still creeps forward,
      // but never to 100 % before everything is actually ready
      const goal = target < 1 ? Math.min(target + 0.12, 0.99) : 1;
      if (goal > glide.v1 + 1e-4) glideTo(goal, now);

      const p = shownNow();
      const n = Math.round(p * 100);
      if (n !== lastInt) {
        lastInt = n;
        bar.setAttribute("aria-valuenow", String(n));
        drums[0].toggleAttribute("data-dim", n < 100);
        drums[1].toggleAttribute("data-dim", n < 10);
        ticks.forEach((t) => t.toggleAttribute("data-on", p >= Number(t.dataset.at) - 0.002));
        const s = statusFor(p);
        if (status.textContent !== s) status.textContent = s;
      }
      // leave only once the final glide has really finished on screen
      const arrived = glide.v1 >= 1 && (reduced || running[0]?.playState === "finished");
      if (arrived && now - start >= MIN_SHOW && !leaving) {
        leaving = true;
        leave();
      }
    }, TICK);

    const finish = () => {
      html.style.overflow = "";
      setGone(true);
    };

    /** Exit, also entirely on the compositor so the hero starting up cannot stutter it. */
    function leave() {
      window.clearInterval(loop);
      window.clearTimeout(wheelStop);
      if (reduced) {
        boot.reveal();
        el!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: "ease-out", fill: "forwards" }).finished.then(finish);
        return;
      }
      const f = (o: KeyframeAnimationOptions) => ({ fill: "forwards" as const, ...o });
      const IN = "cubic-bezier(0.55, 0.085, 0.68, 0.53)";
      const IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
      const x0 = xAt(1);
      // the van pulls away off the right edge, wheels spinning up…
      van.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${W + 80}px)` }], f({ duration: 500, easing: IN }));
      wheelSpin.forEach((a) => {
        a.playbackRate = 2.5;
        a.play();
      });
      $$("[data-out]").forEach((o, i) =>
        o.animate(
          [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${i % 2 ? 18 : -18}px)` }],
          f({ duration: 300, delay: i * 20, easing: IN }),
        ),
      );
      $$("[data-dashes], [data-tick]").forEach((o) => o.animate([{ opacity: 1 }, { opacity: 0 }], f({ duration: 250 })));
      // …the road flares, and the screen parts along it while the 3D van drives in
      fill.animate([{ transform: "scaleX(1) scaleY(1)" }, { transform: "scaleX(1) scaleY(3)" }], f({ duration: 180, delay: 300, easing: "ease-out" }));
      fill.animate([{ opacity: 1 }, { opacity: 0 }], f({ duration: 350, delay: 630 }));
      const OPEN_AT = 480;
      window.setTimeout(() => boot.reveal(), OPEN_AT);
      $("[data-panel='top']").animate([{ transform: "none" }, { transform: "translateY(-100%)" }], f({ duration: 950, delay: OPEN_AT, easing: IN_OUT }));
      $("[data-panel='bottom']")
        .animate([{ transform: "none" }, { transform: "translateY(100%)" }], f({ duration: 950, delay: OPEN_AT, easing: IN_OUT }))
        .finished.then(finish);
    }

    return () => {
      window.clearInterval(loop);
      window.clearTimeout(wheelStop);
      window.removeEventListener("resize", onResize);
      running.forEach((a) => a.cancel());
      html.style.overflow = "";
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
          {MILESTONES.slice(0, -1).map((at) => (
            <span
              key={at}
              data-tick
              data-at={at}
              style={{ left: `${at * 100}%` }}
              className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-white/25 transition-colors duration-300 data-on:bg-gold"
            />
          ))}
          {/* the van rides on the line; its beam lights the road ahead */}
          <div data-van className="absolute bottom-0 left-0 w-[clamp(84px,9vw,136px)] will-change-transform">
            {/* CSS (compositor) idle: engine shimmy and beam flicker */}
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

      {/* status, bottom-left (phones: above the odometer) */}
      <div data-out className="absolute bottom-[calc(17vw+2.5rem)] left-5 sm:bottom-10 sm:left-10 lg:left-16">
        <p data-status aria-live="polite" className="font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
          {STATUS[0][1]}
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
