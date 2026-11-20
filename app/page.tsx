import { Loader } from "@/components/loader/Loader";
import { Contact } from "@/components/sections/Contact";
import { StructuredData } from "@/components/StructuredData";
import { HeroStory } from "@/components/hero/HeroStory";
import { Mission } from "@/components/sections/Mission";
import { Services } from "@/components/sections/Services";
import { WhyOdes } from "@/components/sections/WhyOdes";

// Header, footer, smooth scrolling and the page transition live in the root layout.
export default function Home() {
  return (
    <>
      <StructuredData />
      <Loader />
      {/* without JavaScript nothing would ever open the loading screen */}
      <noscript>
        <style>{"#loader{display:none}html{overflow:auto!important}"}</style>
      </noscript>

      <main id="main" tabIndex={-1} className="outline-none">
        <HeroStory />
        <Services />
        <Mission />
        <WhyOdes />

        <Contact />
      </main>
    </>
  );
}
