import type { ReactNode } from "react";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { COMPANY } from "@/lib/site";

export const BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2";
export const BTN_GOLD = `${BTN} bg-gold text-ink hover:bg-gold-light focus-visible:outline-white`;
export const BTN_GHOST = `${BTN} border border-white/25 text-white hover:border-white/60 hover:bg-white/5 focus-visible:outline-white`;

export function Eyebrow({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "teal" }) {
  const c = tone === "gold" ? "text-gold" : "text-teal";
  const b = tone === "gold" ? "bg-gold" : "bg-teal";
  return (
    <p className={`flex items-center gap-3 font-condensed text-sm font-semibold uppercase tracking-[0.3em] ${c}`}>
      <span className={`h-px w-10 ${b}`} />
      {children}
    </p>
  );
}

/** "Book a ride" + "Call" pair used on every page. */
export function BookActions({ book = true }: { book?: boolean }) {
  return (
    <>
      {book && (
        <TransitionLink href="/book" className={BTN_GOLD}>
          Book a ride
        </TransitionLink>
      )}
      <a href={COMPANY.phoneHref} className={BTN_GHOST}>
        Call {COMPANY.phone}
      </a>
    </>
  );
}

/**
 * Every inner page ends on this paper sheet with rounded corners; the footer slides out
 * from beneath it (it overlaps the sheet's bottom edge, hence the extra bottom padding).
 */
export function CtaCurtain({ title = "Ready when you are", body }: { title?: string; body?: string }) {
  return (
    <section className="relative z-10 overflow-clip rounded-b-[2.5rem] bg-paper text-ink shadow-[0_50px_90px_-30px_rgb(0_0_0/0.75)] lg:rounded-b-[4.5rem]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] -top-[30%] size-[44rem] rounded-full bg-[radial-gradient(closest-side,rgb(15_118_110/0.16),transparent)]"
      />
      <div data-reveal className="relative mx-auto flex max-w-7xl flex-col gap-10 px-5 pb-32 pt-24 sm:px-8 sm:pb-40 sm:pt-28 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Eyebrow tone="teal">Book a ride</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(2.8rem,min(8vw,12vh),6.5rem)] uppercase leading-[0.88]">{title}</h2>
          <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-ink/70">
            {body ?? "Call to schedule your ride, or send a request online and we’ll call you to confirm the pickup time and details."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TransitionLink href="/book" className={`${BTN} bg-teal text-white hover:bg-teal-deep focus-visible:outline-teal`}>
            Book a ride
          </TransitionLink>
          <a href={COMPANY.phoneHref} className={`${BTN} border border-ink/20 hover:border-teal hover:text-teal focus-visible:outline-teal`}>
            Call {COMPANY.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
