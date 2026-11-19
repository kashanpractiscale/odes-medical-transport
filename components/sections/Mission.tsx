"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { DRIVE_DISTANCE } from "@/components/ambulance/animation";
import { claimRoad, rig } from "@/components/ambulance/rig";
import { L } from "@/components/ambulance/spec";
import { clamp, smoothstep } from "@/components/ambulance/surface";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { COMPANY, MISSION_SCENE } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BTN =
  "inline-flex h-12 items-center gap-2 rounded-full px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Parallax depth planes, far → near. `speed` is the fraction of the road's speed each
 * plane slides at (the tracking shot follows the van, so the world moves instead);
 * `rise` is how far (in % of its height) the plane starts below its resting place as the
 * section scrolls in, so nearer planes arrive faster. Tile aspect = SVG viewBox w / h.
 */
const PLANES = {
  mountains: { speed: 0.06, rise: 18, aspect: 2400 / 420 },
  words: { speed: 0, rise: 40, aspect: 0 },
  city: { speed: 0.22, rise: 28, aspect: 2400 / 360 },
  road: { speed: 1, rise: 0, aspect: 0 },
  palms: { speed: 1.6, rise: 60, aspect: 2400 / 1000 },
} as const;
type Plane = keyof typeof PLANES;

/** Van length as a share of screen width: must match the camera in AmbulanceStage. */
const vanShare = (w: number, h: number) => (w / h < 1 ? 0.8 : w / h < 1.4 ? 0.5 : 0.36);

const words = MISSION_SCENE.statement.split(" ");

/**
 * Mission. A pinned dusk-to-dawn drive through Los Angeles: the 3D van (drawn by the
 * page-level canvas between the back and front planes) cruises side-on while mountains,
 * skyline, road and palms slide past at their own depths, and the mission is told in
 * three beats. All of it is a pure function of one scrubbed progress value.
 */
export function Mission() {
  const root = useRef<HTMLElement>(null);
  const road = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // release the van if this section unmounts while it holds the road
  useEffect(() => {
    const el = road.current;
    return () => claimRoad(el, "drive", false);
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const one = (s: string) => q(s)[0] as HTMLElement | undefined;
      const plane = (k: Plane) => one(`[data-plane="${k}"]`);

      // The van takes over the road once the scene fills the screen (the Services slot,
      // where it was floating, is off-screen by then, so the switch is never seen).
      ScrollTrigger.create({
        trigger: root.current,
        start: reduced ? "top 15%" : "top top",
        end: "bottom top",
        onToggle: (s) => claimRoad(road.current, "drive", s.isActive),
      });

      if (reduced) {
        // Final, readable state; the van waits on the road. No travel, no parallax.
        rig.drive = 0.5;
        render(0.92, true);
        return;
      }

      // Tile widths depend on the viewport, so measure them on every refresh.
      let ppm = 1; // px per metre at the van, same as the 3D camera
      const tiles: Partial<Record<Plane, number>> = {};
      const measure = () => {
        const w = window.innerWidth;
        ppm = (vanShare(w, window.innerHeight) * w) / L;
        for (const k of ["mountains", "city", "palms"] as const) {
          const el = plane(k);
          if (!el) continue;
          const tw = el.offsetHeight * PLANES[k].aspect;
          tiles[k] = tw;
          el.style.width = `${Math.ceil(w + tw + 2)}px`;
        }
      };
      measure();
      ScrollTrigger.addEventListener("refreshInit", measure);

      // Scroll in: each plane rises from its own depth (nearer planes travel further).
      const enter = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "top top", scrub: 0.6 },
      });
      (Object.keys(PLANES) as Plane[]).forEach((k) => {
        const el = plane(k);
        if (el && PLANES[k].rise) enter.fromTo(el, { yPercent: PLANES[k].rise }, { yPercent: 0 }, 0);
      });

      // The drive: one scrubbed value feeds the 3D van and every DOM plane.
      gsap.fromTo(
        rig,
        { drive: 0 },
        {
          drive: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
          onUpdate: () => {
            render(rig.drive, false);
            rig.invalidate();
          },
        },
      );
      render(0, false);
      return () => ScrollTrigger.removeEventListener("refreshInit", measure);

      // hoisted helpers ------------------------------------------------------
      function slide(k: Plane, travel: number) {
        const el = plane(k);
        if (!el) return;
        const px = travel * ppm * PLANES[k].speed;
        const period = k === "road" ? 160 : (tiles[k] ?? 1);
        gsap.set(el, { x: -(px % period) });
      }

      function render(p: number, still: boolean) {
        const travel = p * DRIVE_DISTANCE;
        if (!still) (["mountains", "city", "road", "palms"] as const).forEach((k) => slide(k, travel));
        if (!still) {
          const kerb = one("[data-kerb]");
          if (kerb) gsap.set(kerb, { x: -((travel * ppm * 1.12) % 120) });
        }

        // sky: dusk → dawn, the sun climbs out from behind the hills
        const dawn = smoothstep(0.22, 0.8, p);
        gsap.set(q("[data-dawn]"), { opacity: dawn });
        gsap.set(q("[data-stars]"), { opacity: 1 - smoothstep(0.15, 0.5, p) });
        gsap.set(q("[data-sun]"), { yPercent: 120 - 150 * smoothstep(0.2, 0.92, p), opacity: 0.35 + 0.65 * dawn });
        gsap.set(q("[data-windows]"), { opacity: 1 - 0.75 * dawn });

        // beat 1: the problem
        const b1 = still ? 1 : 1 - smoothstep(0.24, 0.32, p);
        gsap.set(q("[data-beat='1']"), { autoAlpha: b1, y: (1 - b1) * -40 });

        // beat 2: the mission, revealed word by word
        const b2 = still ? 1 : smoothstep(0.3, 0.36, p) * (1 - smoothstep(0.68, 0.74, p));
        gsap.set(q("[data-beat='2']"), { autoAlpha: b2, y: (1 - smoothstep(0.3, 0.36, p)) * 40 });
        const ws = q("[data-word]");
        ws.forEach((w, i) => {
          const at = 0.36 + (0.26 * i) / ws.length;
          gsap.set(w, { opacity: still ? 1 : 0.16 + 0.84 * smoothstep(at, at + 0.03, p) });
        });

        // beat 3: one ride at a time rises between the hills and the skyline
        const b3 = still ? 1 : smoothstep(0.72, 0.86, p);
        gsap.set(q("[data-beat='3']"), { autoAlpha: b3, y: (1 - b3) * 30 });
        const big = one("[data-big]");
        // (reduced motion shows the line as a plain heading in the copy instead)
        if (big) gsap.set(big, { yPercent: (1 - b3) * 55, opacity: still ? 0 : clamp(b3 * 1.4, 0, 1) });
      }
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section
      id="mission"
      ref={root}
      aria-labelledby="mission-title"
      className={`relative text-white ${reduced ? "" : "h-[360svh] short:h-[300svh]"}`}
    >
      {/* BACK planes: beneath the fixed 3D canvas, so the van drives in front of them */}
      <div
        aria-hidden
        className={`${reduced ? "absolute inset-0" : "sticky top-0 h-svh"} overflow-hidden bg-[#040b14]`}
      >
        <div className="mission-sky-dusk absolute inset-0" />
        <div data-dawn className="mission-sky-dawn absolute inset-0 opacity-0" />
        <div data-stars className="mission-stars absolute inset-x-0 top-0 h-[55%]" />
        <div className="absolute left-[58%] top-[34%] aspect-square w-[min(34vw,420px)] -translate-x-1/2 sm:left-[64%]">
          <div data-sun className="mission-sun size-full rounded-full" />
        </div>

        <div className="absolute inset-x-0 bottom-[20%] h-[38%] sm:bottom-[22%]">
          <div
            data-plane="mountains"
            className="mission-tile absolute bottom-0 left-0 h-full w-[300%] bg-[url(/parallax/mountains.svg)]"
          />
        </div>

        {/* the closing line stands between the hills and the city */}
        <div data-plane="words" className="absolute inset-x-0 bottom-[31%] flex justify-center sm:bottom-[27%]">
          <p
            data-big
            className="opacity-0 text-center font-display text-[clamp(4.5rem,19vw,15rem)] sm:text-[clamp(4.5rem,16vw,15rem)] uppercase leading-[0.82] tracking-tight text-[#fff6e3]"
          >
            One ride
            <br />
            at a time
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-[20%] h-[22%] sm:bottom-[22%] sm:h-[26%]">
          <div data-plane="city" className="mission-tile absolute bottom-0 left-0 h-full w-[300%] bg-[url(/parallax/city.svg)]">
            <div data-windows className="mission-tile absolute inset-0 bg-[url(/parallax/city-windows.svg)]" />
          </div>
        </div>

        {/* road: the van's wheels sit on 56 % of this band (see the camera rig) */}
        <div ref={road} className="mission-road absolute inset-x-0 bottom-0 h-[20%] sm:h-[22%]">
          <div data-plane="road" className="mission-dashes absolute left-0 top-[22%] h-[3px] w-[calc(100%+160px)]" />
          <div data-kerb className="mission-kerb absolute left-0 top-[62%] h-[8%] w-[calc(100%+120px)]" />
        </div>
      </div>

      {/* FRONT planes: above the canvas — palms pass in front of the van, then the copy */}
      <div
        className={`mission-copy ${
          reduced ? "relative" : "pointer-events-none sticky top-0 z-10 -mt-[100svh] h-svh overflow-clip"
        }`}
      >
        {!reduced && (
          <div
            aria-hidden
            data-plane="palms"
            className="mission-tile absolute bottom-[-2%] left-0 h-[92%] w-[300%] bg-[url(/parallax/palms.svg)] opacity-95 max-sm:h-[62%] short:h-[88%]"
          />
        )}

        <div
          className={`mx-auto max-w-7xl px-5 sm:px-8 ${
            reduced ? "flex flex-col gap-16 pb-[52svh] pt-28" : "relative h-full"
          }`}
        >
          <div
            data-beat="1"
            className={`${reduced ? "" : "absolute inset-x-5 top-[14%] sm:inset-x-8 short:top-[16%]"} max-w-3xl`}
          >
            <p className="mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold short:mb-3">
              <span className="h-px w-10 bg-gold" />
              Why we exist
            </p>
            <h2
              id="mission-title"
              className="text-balance font-display text-[clamp(2.75rem,min(9vw,11vh),6.5rem)] uppercase leading-[0.88]"
            >
              Missed rides mean missed care
            </h2>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/80 short:mt-3 short:text-base">
              {MISSION_SCENE.problem}
            </p>
          </div>

          <div
            data-beat="2"
            className={`${reduced ? "" : "invisible absolute inset-x-5 top-[14%] sm:inset-x-8 short:top-[14%]"} max-w-4xl`}
          >
            <p className="mb-5 flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold short:mb-3">
              <span className="h-px w-10 bg-gold" />
              Our mission
            </p>
            <h3 className="text-pretty font-display text-[clamp(2rem,min(5.4vw,7.4vh),4.4rem)] uppercase leading-[1.02]">
              <span className="sr-only">{MISSION_SCENE.statement}</span>
              <span aria-hidden>
                {words.map((w, i) => (
                  <span key={i} data-word className="inline-block">
                    {w}
                    {i < words.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            </h3>
          </div>

          <div
            data-beat="3"
            className={`${
              reduced ? "" : "invisible absolute inset-x-5 top-[12%] text-center sm:inset-x-8 short:top-[14%]"
            }`}
          >
            <p className="font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold">
              {MISSION_SCENE.closing}
            </p>
            <h3 className={reduced ? "mt-4 font-display text-[clamp(3rem,10vw,7rem)] uppercase leading-[0.9]" : "sr-only"}>
              One ride at a time
            </h3>
            <div className={`mt-6 flex flex-wrap gap-3 ${reduced ? "" : "pointer-events-auto justify-center"}`}>
              <a href="#book" className={`${BTN} scene-cta bg-gold text-ink hover:bg-gold-light`}>
                Book a ride
              </a>
              <a
                href={COMPANY.phoneHref}
                className={`${BTN} border border-white/30 bg-black/20 text-white backdrop-blur-sm hover:border-white/70`}
              >
                Call {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
