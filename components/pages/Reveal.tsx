"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { promoteWhile } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Rises every [data-reveal] inside it into view as it scrolls in, in small batches (each
 * element gets its own compositor layer only while it moves). Visible by default: hidden
 * here, on mount, only when motion is allowed.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useGSAP(
    () => {
      if (reduced) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root.current);
      gsap.set(items, { autoAlpha: 0, y: 40 });
      ScrollTrigger.batch(items, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.95, ease: "power3.out", stagger: 0.08, overwrite: true, ...promoteWhile(batch) }),
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
