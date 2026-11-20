import type { ReactNode } from "react";

/** Line icons on a 24 px grid, 1.75 stroke (same family as the Why Odes tiles). */
function Svg({ children, className = "size-6" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export const ICONS = {
  wheelchair: (
    <Svg>
      <circle cx="10" cy="4" r="1.6" />
      <path d="M10 7v6h5l2.5 5M10 9.5h4.5" />
      <path d="M7.5 10.6A5.5 5.5 0 1 0 15 17.5" />
    </Svg>
  ),
  walk: (
    <Svg>
      <circle cx="13" cy="4" r="1.6" />
      <path d="M10 21l2-6 3 3v3M12 15l1-6 3 3h3M13 9l-4 2-1 4" />
    </Svg>
  ),
  calendar: (
    <Svg>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4" />
    </Svg>
  ),
  drop: (
    <Svg>
      <path d="M12 3.5s-6 6.6-6 10.8a6 6 0 0 0 12 0C18 10.1 12 3.5 12 3.5Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </Svg>
  ),
  hospital: (
    <Svg>
      <path d="M4 20.5V7.5L12 3l8 4.5v13" />
      <path d="M3 20.5h18M12 8.5v5M9.5 11h5M10 20.5v-3.5h4v3.5" />
    </Svg>
  ),
  rehab: (
    <Svg>
      <path d="M3 12h2M19 12h2M5 8.5v7M19 8.5v7M7.5 7v10M16.5 7v10M7.5 12h9" />
    </Svg>
  ),
  senior: (
    <Svg>
      <circle cx="11" cy="4" r="1.6" />
      <path d="M11 7v6l-2 7M11 13l3 7M8 9l3-1 3 2M16.5 11v9.5M16.5 11a1.5 1.5 0 0 1 3 0" />
    </Svg>
  ),
  award: (
    <Svg>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5M12 6.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" />
    </Svg>
  ),
  heart: (
    <Svg>
      <path d="M12 20s-7.5-4.5-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.5 12 20 12 20Z" />
    </Svg>
  ),
  clock: (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  ),
  shield: (
    <Svg>
      <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </Svg>
  ),
  plane: (
    <Svg>
      <path d="M10.5 13.5L3 11l1.5-1.5 7 1 4.5-4.5a1.8 1.8 0 0 1 2.5 2.5L14 13l1 7-1.5 1.5-2.5-7.5" />
    </Svg>
  ),
  home: (
    <Svg>
      <path d="M4 11l8-6.5 8 6.5M6 9.5v10.5h12V9.5M10 20v-5h4v5" />
    </Svg>
  ),
  check: (
    <Svg className="size-4">
      <path d="M5 12.5l4.2 4L19 7" />
    </Svg>
  ),
  pin: (
    <Svg>
      <path d="M12 21s-6.5-6-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </Svg>
  ),
  mail: (
    <Svg>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </Svg>
  ),
  phone: (
    <Svg>
      <path d="M5.2 4h3l1.8 4.6-2.3 1.5a11 11 0 0 0 6.2 6.2l1.5-2.3 4.6 1.8v3a2 2 0 0 1-2.1 2A16 16 0 0 1 3.2 6.1 2 2 0 0 1 5.2 4Z" />
    </Svg>
  ),
} as const;

/** Icon for each service in lib/site SERVICES, in order. */
export const SERVICE_ICONS = [ICONS.wheelchair, ICONS.walk, ICONS.calendar, ICONS.drop, ICONS.hospital, ICONS.rehab, ICONS.senior];
/** Icon for each value in lib/site VALUES, in order. */
export const VALUE_ICONS = [ICONS.award, ICONS.heart, ICONS.clock, ICONS.shield];

export function IconBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gold/12 text-gold ring-1 ring-inset ring-gold/25 ${className}`}>
      {children}
    </span>
  );
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
