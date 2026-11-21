import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import DevotionalProductCard from "@/components/DevotionalProductCard";
import { getDevotionalProductsAsync } from "@/lib/devotionalServer";
import { getDeliverySettingsAsync, calculateDeliveryDates } from "@/lib/deliverySettings";

export const dynamic = "force-dynamic";

export default async function ReadyStockPage() {
  const [products, deliverySettings] = await Promise.all([
    getDevotionalProductsAsync("ready-stock"),
    getDeliverySettingsAsync(),
  ]);

  const deliveryEstimate = calculateDeliveryDates(
    deliverySettings.min_delivery_days,
    deliverySettings.max_delivery_days,
    deliverySettings.calculation_type,
    deliverySettings.non_delivery_days
  );

  return (
    <div className="theme-light min-h-screen pt-28">
      {/* Header Banner */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-grey-stone hover:text-black-deep transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back To All Paintings
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black-deep/10 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#c9a227]/15 border border-[#c9a227]/40 px-3 py-1 text-[10px] uppercase font-bold tracking-[0.25em] text-[#8c6d12] mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#c9a227]" />
              Physical Stock Ready For Immediate Sanctum Dispatch
            </div>
            <h1 className="section-title text-black-deep uppercase">
              Ready Stock Devotional Paintings
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black-charcoal/70">
              Handcrafted 22KT gold Tanjore paintings and sacred deity artworks physically in stock, authenticated by master temple artisans, and ready for swift, insured Pan-India dispatch.
            </p>
          </div>

          {/* Delivery Window Highlight */}
          <div className="bg-[#ede7db] border border-black-deep/15 p-4 rounded-none max-w-sm shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black-deep">
              <Clock className="w-4 h-4 text-[#c9a227]" />
              <span>Current Delivery Window</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-black-deep">
              {deliveryEstimate.displayText}
            </p>
            <p className="mt-0.5 text-[11px] text-black-charcoal/65">
              Calculated dynamically from order date. Insured wooden crate packing.
            </p>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="mb-6 flex items-center justify-between text-xs text-grey-stone">
          <p>
            Showing <span className="font-bold text-black-deep">{products.length}</span> physically available ready stock paintings
          </p>
          <span className="text-[11px] uppercase tracking-wider text-[#c9a227] font-semibold">
            ✓ Genuine 22KT Gold Leaves
          </span>
        </div>

        {products.length === 0 ? (
          <div className="py-20 text-center border border-black-deep/10 bg-white-pure p-8">
            <Sparkles className="mx-auto h-8 w-8 text-[#c9a227] mb-3" />
            <h3 className="font-serif text-2xl uppercase text-black-deep mb-2">
              No Ready Stock Artworks Available Today
            </h3>
            <p className="text-xs text-black-charcoal/70 mb-6 max-w-md mx-auto leading-relaxed">
              All ready stock Tanjore artworks have been currently allocated to devotees. You can commission any devotional deity through custom order or browse made-to-order catalog paintings.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/shop"
                className="px-6 py-3 bg-[#c9a227] text-black font-bold uppercase text-xs tracking-wider hover:brightness-110 shadow-md shadow-[#c9a227]/20 transition-all"
              >
                Browse All Paintings
              </Link>
              <Link
                href="/custom-order"
                className="px-6 py-3 border border-black-deep text-black-deep font-bold uppercase text-xs tracking-wider hover:bg-black-deep hover:text-white transition-all"
              >
                Custom Devotional Order
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 items-stretch">
            {products.map((product) => (
              <DevotionalProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
