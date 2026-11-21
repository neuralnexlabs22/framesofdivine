import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { devotionalAssets } from "@/data/devotional";

export default function AboutPage() {
  return (
    <div className="theme-light min-h-screen pt-28">
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:py-24 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:items-center">
        <div>
          <p className="eyebrow text-grey-stone">About</p>
          <h1 className="section-title text-black-deep">A Premium Devotional Visual Archive</h1>
          <p className="mt-7 text-sm leading-8 text-black-charcoal/72">
            Frames of Divine presents Hindu deity imagery, South Indian temple architecture, and sacred devotional art with a refined editorial rhythm and museum-quality framing.
          </p>
          <Link href="/shop" className="mt-9 inline-flex items-center gap-3 border border-black-deep px-6 py-4 text-xs uppercase tracking-[0.22em] transition-cinematic hover:bg-black-deep hover:text-white">
            Explore The Gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative min-h-[560px] overflow-hidden border border-black-deep/15">
          <Image src={devotionalAssets.hero.src} alt={devotionalAssets.hero.alt} fill priority sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" />
        </div>
      </section>
    </div>
  );
}
