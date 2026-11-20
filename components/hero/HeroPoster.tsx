"use client";

import { useEffect, useRef } from "react";
import { VIEWS } from "@/components/ambulance/animation";
import { boot } from "@/components/loader/boot";

/*
 * Poster frames of the 3D van, rendered from the live scene at the hero's resting pose
 * (story 0, van parked, pointer centred) with the floor and lettering hidden, then cropped
 * to the van. Each crop is described in metres relative to the camera's target point, so it
 * can be placed at any viewport size with the same framing maths as the hero camera
 * (CameraRig in AmbulanceStage). Landscape screens use a 30° lens, portrait 38°, hence two.
 */
const LANDSCAPE = { src: "/hero/van-landscape.webp", left: -2.7503, top: -1.7425, width: 6.3941 };
const PORTRAIT = { src: "/hero/van-portrait.webp", left: -2.9332, top: -1.8996, width: 6.425 };
const PORTRAIT_MQ = "(orientation: portrait)";

/** Where the hero camera puts the van at story 0, mirroring CameraRig (no three.js). */
function placeFor(W: number, H: number, portrait: boolean) {
  const v = VIEWS[0];
  const aspect = W / Math.max(1, H);
  const tanV = Math.tan(((portrait ? 38 : 30) * Math.PI) / 360);
  const fit = (portrait ? 3.7 : 4.2) / (tanV * aspect) + 1.2;
  const dist = Math.max(v.dist, fit);
  const wide = aspect > 1.2 && (W >= 1024 || H < 560);
  const shiftX = wide ? 0.3 * v.shift : 0;
  const shiftY = wide ? 0 : 0.4;
  const s = H / (2 * dist * tanV); // px per metre at the target
  const X = (W / 2) * (1 + shiftX);
  const Y = (H / 2) * (1 - shiftY);
  const p = portrait ? PORTRAIT : LANDSCAPE;
  return { left: X + p.left * s, top: Y + p.top * s, width: p.width * s };
}

/**
 * Shows a still of the van the instant the loading screen opens if the live 3D scene isn't
 * ready yet (slower devices), then fades out once the live van has drawn its first frame —
 * the live van starts parked in exactly this pose, so the hand-over is invisible. On devices
 * where the 3D is ready in time it never appears and the van drives in live instead.
 */
export function HeroPoster() {
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = img.current;
    if (!el) return;
    const mq = window.matchMedia(PORTRAIT_MQ);
    let shown = false;
    let finished = false;

    const place = () => {
      const r = placeFor(window.innerWidth, window.innerHeight, mq.matches);
      el.style.left = `${r.left}px`;
      el.style.top = `${r.top}px`;
      el.style.width = `${r.width}px`;
    };
    const hide = () => {
      if (finished) return;
      finished = true;
      el.style.opacity = "0";
      const done = () => (el.style.display = "none");
      if (shown) el.addEventListener("transitionend", done, { once: true });
      else done();
    };
    const onScroll = () => window.scrollY > 40 && hide(); // the camera has moved on

    const off = boot.onReveal(() => {
      if (boot.has("frame") || window.scrollY > 40) return hide(); // live van ready: not needed
      place();
      shown = true;
      el.style.opacity = "1";
      window.addEventListener("resize", place);
      window.addEventListener("scroll", onScroll, { passive: true });
      // hand over once the live van has actually painted (two frames after its first)
      boot.whenMarked("frame").then(() => requestAnimationFrame(() => requestAnimationFrame(hide)));
    });
    return () => {
      off();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    // in the server HTML from the start, so the browser fetches the right still during the
    // loading screen (only the matching <source> is downloaded)
    <picture>
      <source media={PORTRAIT_MQ} srcSet={PORTRAIT.src} />
      {/* a plain <img>: sized and placed by the camera maths above, not by next/image */}
      <img
        ref={img}
        src={LANDSCAPE.src}
        alt=""
        aria-hidden
        decoding="async"
        fetchPriority="high"
        className="pointer-events-none absolute left-0 top-0 h-auto max-w-none opacity-0 transition-opacity duration-500 ease-out"
      />
    </picture>
  );
}
