"use client";

import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { COMPANY } from "@/lib/site";
import { boot, MILESTONES } from "./boot";

// Start downloading the 3D engine (~290 KB gzipped, the longest wait) the moment this
// script runs, rather than when React reaches the hero; next/dynamic reuses the request.
if (typeof window !== "undefined") void import("@/components/ambulance/AmbulanceStage");

const MIN_SHOW = 1.2; // s: long enough to read as intentional, never a flash
const GIVE_UP = 9; // s: open anyway (slow network, no WebGL) — the page works without the van

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
 */
const VAN_W = 122;
const AXLES = [35.3, 102.8];
const WHEEL_Y = 45.8;
const BODY =
  "M1 44.4V4Q1 1.6 3.4 1.6H79Q86 2.5 92 10.6L106 25.4L118 31Q120.6 32 120.6 35V44.4H110.5A7.7 7.7 0 0 0 95.1 44.4H43A7.7 7.7 0 0 0 27.6 44.4Z";

function Van() {
  return (
    <svg viewBox={`0 0 ${VAN_W} 54`} className="block h-auto w-full overflow-visible" aria-hidden>
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
      {AXLES.map((cx) => (
        <g key={cx} data-wheel>
          <circle cx={cx} cy={WHEEL_Y} r="6.4" fill="#0b1212" />
          <circle cx={cx} cy={WHEEL_Y} r="3.7" fill="#c9d3d1" />
          <circle cx={cx} cy={WHEEL_Y} r="1.1" fill="#0b1212" />
          <rect x={cx - 0.6} y={WHEEL_Y - 3.6} width="1.2" height="2" fill="#0b1212" />
          <rect x={cx - 0.6} y={WHEEL_Y + 1.6} width="1.2" height="2" fill="#0b1212" />
        </g>
      ))}
    </svg>
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

/**
 * Loading screen in the hero's studio light. A small side-on Odes van drives a route from
 * "Pickup" to "Your appointment" along the screen's centre line, passing a tick for each
 * real boot milestone (fonts, 3D engine, van model, first frame), while an odometer rolls
 * the percentage. When everything is ready the van drives off, the road flares and the
 * screen parts along it, top half up, bottom half down, as the 3D van drives in.
 *
 * Cost: per frame it writes only transforms (and only when a value moved); text and ARIA
 * change a few times in total; React never re-renders during the load.
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
    const q = gsap.utils.selector(el);
    const html = document.documentElement;
    html.style.overflow = "hidden";

    const track = q("[data-track]")[0] as HTMLElement;
    const bar = q("[data-bar]")[0] as HTMLElement;
    const fill = q("[data-fill]")[0] as HTMLElement;
    const van = q("[data-van]")[0] as HTMLElement;
    const wheels = q("[data-wheel]");
    const drums = q("[data-drum]") as HTMLElement[];
    const ticks = q("[data-tick]") as HTMLElement[];
    const status = q("[data-status]")[0] as HTMLElement;

    const setVanX = gsap.quickSetter(van, "x", "px");
    const setFill = gsap.quickSetter(fill, "scaleX");
    const setWheels = gsap.quickSetter(wheels, "rotation", "deg");
    const setDrum = drums.map((d) => gsap.quickSetter(d, "yPercent"));
    gsap.set(wheels, { transformOrigin: "50% 50%" });

    let W = 1;
    let vanW = 1;
    const measure = () => {
      W = track.offsetWidth;
      vanW = van.offsetWidth;
    };
    measure();
    window.addEventListener("resize", measure);

    const start = performance.now();
    let shown = 0;
    let last = -1;
    let lastInt = -1;
    let lastStatus = "";
    let leaving = false;

    const draw = (p: number) => {
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const x = p * (W - vanW);
      setVanX(x);
      setFill((x + vanW * 0.55) / W);
      setWheels(((x / (vanW * (6.4 / VAN_W))) * 180) / Math.PI);
      // odometer: each digit rests, then rolls over in the last 35 % of its step; a higher
      // drum turns only while every drum below it is rolling over from 9
      const v = p * 100;
      const whole = Math.floor(v);
      const f = v - whole;
      const roll = f < 0.65 ? 0 : ((f - 0.65) / 0.35) ** 2 * (3 - 2 * ((f - 0.65) / 0.35));
      const u = whole % 10;
      const t10 = Math.floor(whole / 10) % 10;
      const pos =
        v >= 100
          ? [1, 0, 0]
          : [u === 9 && t10 === 9 ? roll : 0, t10 + (u === 9 ? roll : 0), u + roll];
      setDrum.forEach((set, i) => set((-pos[i] * 100) / 11));

      const n = Math.round(v);
      if (n === lastInt) return;
      lastInt = n;
      bar.setAttribute("aria-valuenow", String(n));
      drums[0].toggleAttribute("data-dim", n < 100);
      drums[1].toggleAttribute("data-dim", n < 10);
      ticks.forEach((t) => t.toggleAttribute("data-on", p >= Number(t.dataset.at) - 0.002));
      const s = statusFor(p);
      if (s !== lastStatus) {
        lastStatus = s;
        status.textContent = s;
      }
    };

    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (t > GIVE_UP) (["fonts", "stage", "model", "frame"] as const).forEach((s) => boot.mark(s));
      const target = boot.progress();
      // ease toward the real value, and creep a little inside the current milestone so a
      // slow download still feels alive — but never past what has actually loaded
      const ceiling = target < 1 ? Math.min(target + 0.12, 0.99) : 1;
      // time-based (deltaRatio = frames' worth of time at 60 fps), so a slow device that
      // only manages a few fps still sees the same pace; only ever moves forward
      const k = gsap.ticker.deltaRatio(60);
      const rate = target >= 1 ? 0.2 : 0.09; // finish briskly once everything is ready
      shown += Math.max(0, target - shown) * (1 - Math.pow(1 - rate, k));
      if (shown < ceiling && target < 1) shown += 0.0009 * k;
      shown = Math.min(shown, ceiling);
      const p = target >= 1 && shown > 0.995 ? 1 : shown;
      draw(p);
      if (p >= 1 && t >= MIN_SHOW && !leaving) {
        leaving = true;
        leave();
      }
    };
    gsap.ticker.add(tick);

    const finish = () => {
      html.style.overflow = "";
      setGone(true);
    };

    function leave() {
      gsap.ticker.remove(tick);
      if (reduced) {
        boot.reveal();
        gsap.to(el!, { autoAlpha: 0, duration: 0.35, ease: "power1.out", onComplete: finish });
        return;
      }
      const tl = gsap.timeline({ onComplete: finish });
      // the van pulls away off the right edge…
      tl.to(van, { x: W + 80, duration: 0.5, ease: "power2.in" })
        .to(wheels, { rotation: "+=600", duration: 0.5, ease: "power2.in" }, "<")
        .to(fill, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, "<")
        .to(q("[data-out]"), { autoAlpha: 0, y: (i) => (i % 2 ? 18 : -18), duration: 0.3, ease: "power2.in", stagger: 0.02 }, "<")
        .to(q("[data-dashes], [data-tick]"), { opacity: 0, duration: 0.25 }, "<")
        // …the road flares, and the screen parts along it while the 3D van drives in
        .to(fill, { scaleY: 3, duration: 0.18, ease: "power2.out" }, "-=0.2")
        .add(() => boot.reveal())
        .to(q("[data-panel='top']"), { yPercent: -100, duration: 0.95, ease: "power4.inOut" })
        .to(q("[data-panel='bottom']"), { yPercent: 100, duration: 0.95, ease: "power4.inOut" }, "<")
        .to(fill, { opacity: 0, duration: 0.35 }, "<0.15");
    }

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", measure);
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
          <div data-fill className="absolute inset-0 origin-left scale-x-0 bg-gold shadow-[0_0_14px_rgb(217_164_65/0.75)] will-change-transform" />
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
            {/* CSS (compositor) idle: engine shimmy and beam flicker keep moving even while
                the main thread is busy parsing three.js or building the van */}
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
