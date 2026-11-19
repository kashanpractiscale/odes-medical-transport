import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Loader } from "@/components/loader/Loader";
import { Contact } from "@/components/sections/Contact";
import { SmoothScroll } from "@/components/SmoothScroll";
import { HeroStory } from "@/components/hero/HeroStory";
import { Mission } from "@/components/sections/Mission";
import { Services } from "@/components/sections/Services";
import { WhyOdes } from "@/components/sections/WhyOdes";

export default function Home() {
  return (
    <>
      <Loader />
      {/* without JavaScript nothing would ever open the loading screen */}
      <noscript>
        <style>{"#loader{display:none}html{overflow:auto!important}"}</style>
      </noscript>
      <SmoothScroll />
      <SiteHeader />

      <main>
        <HeroStory />
        <Services />
        <Mission />
        <WhyOdes />

        <Contact />
      </main>

      <SiteFooter />
    </>
  );
}
