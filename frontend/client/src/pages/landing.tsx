import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Studio from "../components/sections/Studio";
import HowItWorks from "../components/sections/HowItWorks";
import Pricing from "../components/sections/Pricing";
import FAQ from "../components/sections/FAQ";
import CTA from "../components/sections/CTA";
import Footer from "../components/sections/Footer";

export default function LandingPage() {
  return (
    <div className="noise-overlay">
      <Navbar />
      <main>
        <Hero />
        <Studio />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
