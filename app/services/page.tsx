import type { Metadata } from "next";
import { ICONS, IconBadge, SERVICE_ICONS, slug } from "@/components/pages/icons";
import { PageHero } from "@/components/pages/PageHero";
import { Reveal } from "@/components/pages/Reveal";
import { BookActions, CtaCurtain, Eyebrow } from "@/components/pages/ui";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { ALSO_AVAILABLE, COMPANY, SERVICES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Wheelchair and ambulatory transportation, medical appointments, dialysis, hospital discharge, rehabilitation and senior rides across Los Angeles County.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageHero
        eyebrow="Our services"
        lines={["Rides for", "every kind", "of care"]}
        accent={2}
        watermark="Services"
        intro={
          <>
            Non-emergency medical transportation across all of {COMPANY.serviceArea}, tailored to each patient’s needs — wheelchair
            or walking, a routine check-up or the ride home from hospital.
          </>
        }
      >
        <BookActions />
      </PageHero>

      <Reveal>
        <section aria-labelledby="services-list" className="relative bg-ink pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <h2 id="services-list" className="sr-only">
              All services
            </h2>
            <ol className="border-t border-white/10">
              {SERVICES.map((s, i) => (
                <li
                  key={s.name}
                  id={slug(s.name)}
                  data-reveal
                  className="group relative grid scroll-mt-28 gap-6 border-b border-white/10 py-10 transition-colors duration-300 hover:bg-white/[0.025] sm:py-12 lg:grid-cols-[7rem_minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-10"
                >
                  <span className="font-display text-5xl leading-none text-white/15 transition-colors duration-300 group-hover:text-gold sm:text-6xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-5">
                    <IconBadge>{SERVICE_ICONS[i]}</IconBadge>
                    <h3 className="font-display text-[clamp(2rem,4vw,3.4rem)] uppercase leading-[0.92]">{s.name}</h3>
                  </div>
                  <p className="max-w-xl text-pretty text-lg leading-relaxed text-white/70">{s.body}</p>
                  <TransitionLink
                    href="/book"
                    aria-label={`Book ${s.name.toLowerCase()}`}
                    className="grid size-14 place-items-center rounded-full border border-white/15 text-white transition-[background-color,border-color,color,rotate] duration-300 group-hover:rotate-[-45deg] group-hover:border-gold group-hover:bg-gold group-hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </TransitionLink>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="also-title" className="relative bg-ink pb-28 sm:pb-36">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
            <div data-reveal>
              <Eyebrow>Also available</Eyebrow>
              <h2 id="also-title" className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
                Wherever the day takes you
              </h2>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-white/70">
                Not sure which service you need? Call us and we’ll help you work it out.
              </p>
              <a
                href={COMPANY.phoneHref}
                className="mt-6 inline-flex items-center gap-3 font-display text-3xl tracking-wide text-white transition-colors hover:text-gold"
              >
                <span className="text-gold">{ICONS.phone}</span>
                {COMPANY.phone}
              </a>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ALSO_AVAILABLE.map((a) => (
                <li
                  key={a}
                  data-reveal
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-lg text-white/85"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold text-ink">{ICONS.check}</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CtaCurtain />
      </Reveal>
    </main>
  );
}
