import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import SampleGallery from "@/components/landing/SampleGallery";
import CTASection from "@/components/landing/CTASection";

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <HeroSection />
      <FeatureGrid />
      <SampleGallery />
      <CTASection />
      <footer className="border-t border-border/60 py-10 text-center text-xs text-muted-foreground">
        <p>
          SONARA — Your Music. Your Aura. ·{" "}
          <Link href="/studio" className="text-primary hover:underline">
            Open Studio
          </Link>
        </p>
      </footer>
    </main>
  );
}
