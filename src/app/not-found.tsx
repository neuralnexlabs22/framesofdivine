import Link from "next/link";
import { ArrowLeft, Sparkles, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#f4f0e8] text-black-deep px-4 py-28">
      <div className="max-w-xl w-full text-center space-y-6 bg-white-pure p-8 md:p-12 border border-black-deep/15 shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c9a227]/10 text-[#c9a227] mx-auto">
          <Sparkles className="w-8 h-8" />
        </div>
        <p className="eyebrow text-[#c9a227] font-bold">Frames of Divine</p>
        <h1 className="font-serif text-4xl md:text-5xl uppercase tracking-tight text-black-deep">
          Sacred Page Not Found
        </h1>
        <p className="text-sm leading-relaxed text-black-charcoal/70">
          The devotional print, temple gallery, or sanctum collection you are looking for may have been moved or updated.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#c9a227] hover:brightness-110 text-black font-bold uppercase text-xs tracking-wider transition-all shadow-md"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore All Paintings</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-black-deep/30 hover:border-black-deep text-black-deep font-semibold uppercase text-xs tracking-wider transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

