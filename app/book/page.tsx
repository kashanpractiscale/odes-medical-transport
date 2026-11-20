import type { Metadata } from "next";
import { ICONS } from "@/components/pages/icons";
import { PageHero } from "@/components/pages/PageHero";
import { Reveal } from "@/components/pages/Reveal";
import { BTN_GHOST, BTN_GOLD, Eyebrow } from "@/components/pages/ui";
import { BookingForm } from "@/components/sections/BookingForm";
import { BOOKING_STEPS, COMPANY } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a ride",
  description: `Call ${COMPANY.phone} to schedule a non-emergency medical ride in Los Angeles County, or send a request online and we'll call you to confirm.`,
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageHero
        eyebrow="Book a ride"
        lines={["Tell us where", "you need", "to be"]}
        accent={1}
        watermark="Book"
        intro="We’ll take care of the journey. Call to schedule your ride, or send a request online and we’ll call you to confirm the pickup time and details."
      >
        <a href={COMPANY.phoneHref} className={BTN_GOLD}>
          <span className="[&_svg]:size-4">{ICONS.phone}</span>
          Call {COMPANY.phone}
        </a>
        <a href="#request" className={BTN_GHOST}>
          Request online
        </a>
      </PageHero>

      <Reveal>
        {/* how it works: three stops on one route */}
        <section aria-labelledby="steps-title" className="relative bg-ink pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div data-reveal>
              <Eyebrow>How booking works</Eyebrow>
              <h2 id="steps-title" className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
                Three steps, door to door
              </h2>
            </div>
            <ol className="relative mt-14 grid gap-5 md:grid-cols-3">
              {/* the route joining the stops (wide screens) */}
              <span aria-hidden className="loader-dashes absolute left-[8%] right-[8%] top-[2.1rem] hidden h-[2px] opacity-30 md:block" />
              {BOOKING_STEPS.map((s, i) => (
                <li key={s.name} data-reveal className="relative">
                  <span className="relative z-10 grid size-[4.2rem] place-items-center rounded-full border border-gold/50 bg-ink font-display text-3xl text-gold shadow-[0_0_0_8px_#071211]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-7">
                    <h3 className="font-display text-3xl uppercase leading-none">{s.name}</h3>
                    <p className="mt-3 text-pretty leading-relaxed text-white/65">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* the request form, on the closing paper sheet */}
        <section
          id="request"
          aria-labelledby="request-title"
          className="relative z-10 scroll-mt-24 overflow-clip rounded-b-[2.5rem] bg-paper text-ink shadow-[0_50px_90px_-30px_rgb(0_0_0/0.75)] lg:rounded-b-[4.5rem]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-[10%] top-[20%] size-[40rem] rounded-full bg-[radial-gradient(closest-side,rgb(217_164_65/0.16),transparent)]"
          />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-32 pt-24 sm:px-8 sm:pb-40 sm:pt-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow tone="teal">Request online</Eyebrow>
              <h2 id="request-title" className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
                Request
                <br />a ride
              </h2>
              <p className="mt-6 max-w-sm text-pretty text-lg leading-relaxed text-ink/70">
                Tell us about the trip and we’ll call you to confirm the pickup time and details.
              </p>
              <p className="mt-4 max-w-sm text-pretty text-ink/55">
                Riding today or tomorrow? Calling is fastest:{" "}
                <a href={COMPANY.phoneHref} className="whitespace-nowrap font-semibold text-teal underline-offset-4 hover:underline">
                  {COMPANY.phone}
                </a>
                .
              </p>
              <ul className="mt-10 space-y-3">
                <li>
                  <a
                    href={COMPANY.phoneHref}
                    className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 transition-colors hover:border-teal/40"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-teal text-white">{ICONS.phone}</span>
                    <span>
                      <span className="block font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">Call</span>
                      <span className="font-display text-2xl tracking-wide">{COMPANY.phone}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 transition-colors hover:border-teal/40"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal text-white">{ICONS.mail}</span>
                    <span className="min-w-0">
                      <span className="block font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">Email</span>
                      <span className="block break-all font-semibold">{COMPANY.email}</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-gold text-ink">{ICONS.pin}</span>
                  <span>
                    <span className="block font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                      Based in {COMPANY.base}
                    </span>
                    <span className="font-semibold">Serving {COMPANY.serviceArea}</span>
                  </span>
                </li>
              </ul>
            </div>
            <div
              data-reveal
              className="relative rounded-[2rem] border border-ink/10 bg-white/95 p-6 shadow-[0_30px_80px_-40px_rgb(7_18_17/0.45)] sm:p-10"
            >
              <BookingForm />
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
