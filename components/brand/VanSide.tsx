import { useId } from "react";

/*
 * Side-on Odes van, drawn to the 3D model's Transit EL High Roof figures (18 units per
 * metre, ground at y = 52): 6.70 m long, 2.80 m tall, axles 1.96 m and 5.71 m from the rear,
 * 0.356 m tyres, roof cap at 4.40 m, windshield 5.13–5.91 m, hood edge 6.55 m.
 * The wheels are separate HTML elements ([data-wheel]) so they can turn on the compositor.
 * Used by the loading screen, the page transition and the footer on inner pages.
 */
export const VAN_W = 122;
export const VAN_H = 54;
export const WHEEL_R = 6.4;
const AXLES = [35.3, 102.8];
const WHEEL_Y = 45.8;
const BODY =
  "M1 44.4V4Q1 1.6 3.4 1.6H79Q86 2.5 92 10.6L106 25.4L118 31Q120.6 32 120.6 35V44.4H110.5A7.7 7.7 0 0 0 95.1 44.4H43A7.7 7.7 0 0 0 27.6 44.4Z";

/** Degrees a wheel turns when the van (rendered `vanPx` wide) travels `px`. */
export const wheelDeg = (px: number, vanPx: number) => (px / ((vanPx * WHEEL_R) / VAN_W)) * (180 / Math.PI);

export function VanSide() {
  // unique ids: several vans can be on the page at once (loader, transition, footer)
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VAN_W} ${VAN_H}`} className="block h-auto w-full overflow-visible" aria-hidden>
        <defs>
          <clipPath id={`${id}-body`}>
            <path d={BODY} />
          </clipPath>
          <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#d5dedc" />
          </linearGradient>
        </defs>
        <ellipse cx="62" cy="52.4" rx="60" ry="2.2" fill="#000" opacity=".45" />
        <path d={BODY} fill={`url(#${id}-paint)`} />
        <g clipPath={`url(#${id}-body)`}>
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
