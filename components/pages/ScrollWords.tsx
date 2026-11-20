"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { useReducedMotion } from "@/components/hero/useReducedMotion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * A paragraph that lights up word by word as it scrolls through the screen. Screen readers
 * get the plain sentence; the word spans are presentational. Fully lit for reduced motion.
 */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const root = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const words = text.split(" ");

  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        "[data-sw]",
        { opacity: 0.16 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.1,
          scrollTrigger: { trigger: root.current, start: "top 82%", end: "bottom 45%", scrub: 0.4 },
        },
      );
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <p ref={root} className={`will-change-transform ${className ?? ""}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={i} data-sw>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </p>
  );
}
