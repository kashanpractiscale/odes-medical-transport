import type { Metadata } from "next";
import { CoverageMap } from "@/components/pages/CoverageMap";
import { ICONS, IconBadge } from "@/components/pages/icons";
import { PageHero } from "@/components/pages/PageHero";
import { Reveal } from "@/components/pages/Reveal";
import { BookActions, CtaCurtain, Eyebrow } from "@/components/pages/ui";
import { COMPANY } from "@/lib/site";

export const metadata: Metadata = {
  title: "Service area",
  description:
    "Based in Gardena, Odes Medical Transportation provides door-to-door, non-emergency medical rides anywhere in Los Angeles County.",
  alternates: { canonical: "/service-area" },
};

/** Where riders go, taken from the services list (appointments, dialysis, discharge, rehab, day care, airport). */
const DESTINATIONS = [
  { name: "Medical appointments", body: "Primary care, specialist, dental, vision and mental-health visits.", icon: ICONS.calendar },
  { name: "Dialysis centers", body: "Dependable rides to and from every session.", icon: ICONS.drop },
  { name: "Hospitals", body: "Discharge rides home, coordinated with the discharge team.", icon: ICONS.hospital },
  { name: "Rehabilitation centers", body: "Inpatient and outpatient rehab after a stroke, injury or surgery.", icon: ICONS.rehab },
  { name: "Adult day care centers", body: "Regular, unhurried rides for older riders.", icon: ICONS.home },
  { name: "The airport", body: "Rides to and from the airport.", icon: ICONS.plane },
];

export default function ServiceAreaPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageHero
        eyebrow="Service area"
        lines={["All of", "Los Angeles", "County"]}
        accent={1}
        watermark="LA County"
        intro={`Based in ${COMPANY.base.replace(/ \d+$/, "")}, we provide door-to-door, non-emergency medical rides anywhere in ${COMPANY.serviceArea}.`}
      >
        <BookActions />
      </PageHero>

      <Reveal>
        <section aria-labelledby="map-title" className="relative bg-ink pb-24 sm:pb-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-center lg:gap-16">
            <div data-reveal>
              <Eyebrow>Where we go</Eyebrow>
              <h2 id="map-title" className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
                From our base to the whole county
              </h2>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-white/70">
                From the South Bay to the Antelope Valley, and from Malibu to Pomona: wherever your appointment is in{" "}
                {COMPANY.serviceArea}, we’ll get you there and home again.
              </p>
              <p className="mt-6 text-sm text-white/40">Map positions are approximate.</p>
            </div>
            <div data-reveal>
              <CoverageMap />
            </div>
          </div>
        </section>

        <section aria-labelledby="dest-title" className="relative bg-ink pb-28 sm:pb-36">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div data-reveal className="max-w-2xl">
              <Eyebrow>Rides to and from</Eyebrow>
              <h2 id="dest-title" className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
                Everywhere care happens
              </h2>
            </div>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DESTINATIONS.map((d) => (
                <li
                  key={d.name}
                  data-reveal
                  className="flex gap-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-7 transition-colors duration-300 hover:border-gold/40"
                >
                  <IconBadge>{d.icon}</IconBadge>
                  <div>
                    <h3 className="font-display text-2xl uppercase leading-none">{d.name}</h3>
                    <p className="mt-2 text-pretty leading-relaxed text-white/65">{d.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CtaCurtain
          title="Not sure you’re covered?"
          body="Call us and ask, or send a request online with the pickup and drop-off, and we’ll call you to confirm."
        />
      </Reveal>
    </main>
  );
}
