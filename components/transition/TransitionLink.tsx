"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { scrollToTop } from "@/components/scroll";
import { pageTransition } from "./store";

/**
 * next/link that travels with the page transition (the van drive-through). Anything that
 * shouldn't animate behaves exactly like a normal link: modified clicks (new tab/window),
 * other origins, `target` links, and in-page anchors. A link to the page you're already on
 * glides back to the top instead.
 */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (props.target && props.target !== "_self") return;
        const url = new URL(typeof href === "string" ? href : String(href.pathname ?? ""), window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname) {
          if (url.hash) return; // in-page anchor: Lenis glides to it
          e.preventDefault();
          scrollToTop();
          return;
        }
        if (pageTransition.go(url.pathname + url.search + url.hash)) e.preventDefault();
      }}
    />
  );
}
