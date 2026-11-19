import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const IconHeadlights = () => (
  <svg {...base}>
    <path d="M10 5.5a6.5 6.5 0 0 0 0 13h1.5v-13z" />
    <path d="M15 8h6M15 12h6M15 16h6" />
  </svg>
);

export const IconBeacon = () => (
  <svg {...base}>
    <path d="M7 18v-5a5 5 0 0 1 10 0v5" />
    <path d="M5 18h14v3H5z" />
    <path d="M12 2.5v2M4.6 5.6l1.4 1.4M19.4 5.6 18 7" />
  </svg>
);

export const IconHazard = () => (
  <svg {...base}>
    <path d="M12 3.5 2.8 19.5h18.4z" />
    <path d="m12 10-3.4 6h6.8z" />
  </svg>
);

export const IconSideDoor = () => (
  <svg {...base}>
    <path d="M3 5h18v14H3z" />
    <path d="M9 5v14" />
    <path d="M13 12h5m-2.5-2.5L18 12l-2.5 2.5" />
  </svg>
);

export const IconRearDoors = () => (
  <svg {...base}>
    <path d="M4 4h16v16H4zM12 4v16" />
    <path d="M10 13v-2M14 13v-2" />
  </svg>
);

export const IconRotate = () => (
  <svg {...base} width={16} height={16}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);
