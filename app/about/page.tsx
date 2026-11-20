import type { Metadata } from "next";
import { ICONS, IconBadge, VALUE_ICONS } from "@/components/pages/icons";
import { PageHero } from "@/components/pages/PageHero";
import { Reveal } from "@/components/pages/Reveal";
import { ScrollWords } from "@/components/pages/ScrollWords";
import { BookActions, CtaCurtain, Eyebrow } from "@/components/pages/ui";
import { COMMITMENT, MISSION, MISSION_SCENE, VALUES, WHY } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Odes Medical Transportation was founded to remove the barriers that keep patients from the medical care they need: safe, reliable, timely rides across Los Angeles County.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageHero
        eyebrow="About Odes"
        lines={["Removing the", "barriers", "to care"]}
        accent={2}
        watermark="Odes"
        intro={MISSION_SCENE.problem}
      >
        <BookActions />
      </PageHero>

      <Reveal>
        {/* the story */}
        <section aria-labelledby="story-title" className="relative bg-ink py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-20">
            <div data-reveal className="lg:sticky lg:top-32 lg:self-start">
              <Eyebrow>Why we exist</Eyebrow>
              <h2 id="story-title" className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
                Missed rides mean missed care
              </h2>
            </div>
            <ScrollWords text={MISSION} className="text-pretty font-display text-[clamp(1.8rem,3.6vw,3.2rem)] uppercase leading-[1.08] text-white" />
          </div>
        </section>

        {/* the mission */}
        <section aria-labelledby="mission-title" className="relative bg-ink pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div
              data-reveal
              className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(110%_90%_at_0%_0%,#14857b,#0b4f4a_55%,#083a37)] p-8 sm:p-14 lg:p-20"
            >
              <span aria-hidden className="pointer-events-none absolute -right-6 -top-16 font-display text-[16rem] leading-none text-white/[0.06]">
                “
              </span>
              <Eyebrow>Our mission</Eyebrow>
              <h2 id="mission-title" className="sr-only">
                Our mission
              </h2>
              <p className="relative mt-6 max-w-5xl text-pretty font-display text-[clamp(2rem,4.6vw,4.2rem)] uppercase leading-[1.02]">
                {MISSION_SCENE.statement}
              </p>
              <p className="relative mt-8 font-condensed text-sm font-semibold uppercase tracking-[0.3em] text-gold-light">
                {MISSION_SCENE.closing} — one ride at a time
              </p>
            </div>
          </div>
        </section>

        {/* values */}
        <section aria-labelledby="values-title" className="relative bg-ink pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div data-reveal className="max-w-2xl">
              <Eyebrow>What guides every ride</Eyebrow>
              <h2 id="values-title" className="mt-5 font-display text-[clamp(2.4rem,5vw,4.25rem)] uppercase leading-[0.9]">
                Our values
              </h2>
            </div>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v, i) => (
                <li
                  key={v.name}
                  data-reveal
                  className="group relative flex flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-7 transition-colors duration-300 hover:border-gold/40"
                >
                  <div className="flex items-start justify-between">
                    <IconBadge>{VALUE_ICONS[i]}</IconBadge>
                    <span className="font-display text-2xl leading-none text-white/15">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-10 font-display text-3xl uppercase leading-none">{v.name}</h3>
                  <p className="mt-4 text-pretty leading-relaxed text-white/65">{v.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* commitment + why */}
        <section aria-labelledby="commitment-title" className="relative bg-ink pb-28 sm:pb-36">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
            <figure data-reveal className="border-l-2 border-gold pl-6 sm:pl-10">
              <Eyebrow>Our commitment to excellence</Eyebrow>
              <h2 id="commitment-title" className="sr-only">
                Our commitment to excellence
              </h2>
              <blockquote className="mt-6 text-pretty font-display text-[clamp(1.8rem,3.4vw,3rem)] uppercase leading-[1.05]">
                {COMMITMENT}
              </blockquote>
              <figcaption className="mt-6 text-white/55">The Odes team</figcaption>
            </figure>
            <div data-reveal>
              <Eyebrow>Why choose Odes</Eyebrow>
              <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {WHY.map((w) => (
                  <li key={w.name} className="flex gap-5 py-6">
                    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-gold text-ink">{ICONS.check}</span>
                    <div>
                      <h3 className="font-display text-2xl uppercase leading-none">{w.name}</h3>
                      <p className="mt-2 text-pretty leading-relaxed text-white/65">{w.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                <BookActions />
              </div>
            </div>
          </div>
        </section>

        <CtaCurtain />
      </Reveal>
    </main>
  );
}
